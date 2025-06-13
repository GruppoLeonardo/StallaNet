import { useEffect, useState } from 'react'; //useEffect = far girare codice secondario , useState = local state reattivo
import { useNavigate } from 'react-router-dom'; //per navigare fra le pagine 
import '../../style/HomeOperaio.css'; 
import { SERVER_URL } from '../../config';
import { calcolaTempoTrascorso } from '../../utils/utilsFrontend';

function HomeOperaio() {
  // Variabili di stato
  const [nomeUtente, setNomeUtente] = useState('');
  const [oraIngresso, setOraIngresso] = useState(null);
  const [tempoLavorato, setTempoLavorato] = useState('00:00');
  const [capiBestiame, setCapiBestiame] = useState([]);
  const [mansioniAccessorie, setMansioniAccessorie] = useState([]);
  const [segnalazione, setSegnalazione] = useState('');
  const [nomeGestore, setNomeGestore] = useState(null);

  const navigate = useNavigate();

  //---------------------------------------------- LOGICA ----------------------------------------------

  //VALIDAZIONE DEL TOKEN
  useEffect(() => {
  const caricaUtente = async () => {
    try {
      // Richiede dati utente presenti nel token 
      const res = await fetch(`${SERVER_URL}/informazioni-utente`, {
        credentials: 'include'
      });
      const data = await res.json();
      // Controllo : se token e' assente o non e' un operaio si redirecta ad Accesso
      if (!data.success || data.utente.Ruolo !== 'operaio') {
        navigate('/');
        return;
      }
      //Se token valido : 
      setNomeUtente(data.utente.NomeUtente);
      fetchData(); // salva dati utente
      fetchNomeGestore(); //carica il nome del suo gestore
        const interval = setInterval(fetchData, 5000); // aggiorna i dati dal server ogni 5 secondi
        return () => clearInterval(interval);
    } catch (err) {
      console.error('Errore durante il controllo token/ruolo', err);
      navigate('/');
    }
  };
  caricaUtente();
  }, []);

  // CALCOLA LE ORE LAVORATE IN GIORNATA (per il counter)
  useEffect(() => {
    if (!oraIngresso) return; // se oraIngresso non e' ancora disponibile interrompe effetto
    
    const aggiornaTempo = () => {
      const tempo = calcolaTempoTrascorso(oraIngresso); //calcola tempo trascorso
      setTempoLavorato(tempo); //aggiorna lo stato
    };

    aggiornaTempo(); // fa il calcolo appena si carica la pag
    const timer = setInterval(aggiornaTempo, 60000); // poi aggiorna ogni 1 minuto.
    return () => clearInterval(timer);
  }, [oraIngresso]);

  //CARICA I DATI DELL'OPERAIO (ora ingresso , mansioni quotidiane , mansioni accessorie)
  const fetchData = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-operaio/dati-operaio`, {
        credentials: 'include' //invia i cookie nella richiesta al server
      });
      const data = await res.json(); 
      setOraIngresso(data.oraIngresso); 
      setCapiBestiame(data.capiBestiame);
      setMansioniAccessorie(data.mansioniAccessorie);
    } catch (err) {
      console.error('Errore durante il recupero dei dati', err);
    }
  };

  // RECUPERA NOME GESTORE DELL'OPERAIO
  const fetchNomeGestore = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-operaio/nome-gestore`, {
        credentials: 'include' //invia i cookie nella richiesta al server
      });
      if (!res.ok) throw new Error("Errore nella richiesta");
      const data = await res.json();
      setNomeGestore(data.NomeGestore);
    } catch (error) {
      console.error("Errore nel recupero del nome del gestore:", error);
    }
  };

  //AGGIORNA LE SPUNTE IN QUOTIDIANE : Quando si preme su una quotidiana si aggiorna il DB e si aggiorna la tabella quotidiane 
  const toggleMansione = async (idQuotidiana, campo, valore) => {
    try {
      await fetch(`${SERVER_URL}/home-operaio/aggiorna-quotidiane`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idQuotidiana, 
          campo,
          valore: valore ? 0 : 1 }) //invertitore
      });
      fetchData(); // ricarica da server i dati per rifletteri in IU 
    } catch (err) {
      console.error('Errore aggiornamento mansione', err);
    }
  };

  // AGGIORNA LE SPUNTE IN MANSIONI ACCESSORIE Quando si segna come completata una mansione si aggiorna il db e si aggiorna lo stato "Eseguita"
  const spuntaMansioneAccessoria = async (idComunicazione, statoAttuale) => {
    const nuovoStato = statoAttuale === 1 ? 0 : 1; //invertitore
    try {
      await fetch(`${SERVER_URL}/home-operaio/aggiorna-mansione-accessoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idComunicazione, nuovoStato })
      });
  
      fetchData(); // ricarica da server dati per rifletterli su UI 
    } catch (err) {
      console.error('Errore aggiornamento comunicazione', err);
    }
  };
  
  // INVIA UNA SEGNALAZIONE
  const inviaSegnalazione = async () => {
    if (!segnalazione.trim()) {   //controlla se la text area e' vuota
    alert("Non è stato scritto nessun messaggio da inviare.");
    return;}
    try {
      const res = await fetch(`${SERVER_URL}/home-operaio/invia-segnalazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testo: segnalazione }),
        credentials: 'include'
      });
      const data = await res.json(); 
      if (data.success) {
        alert('Segnalazione inviata!');
        setSegnalazione(''); // svuola la casella di testo
      } else {
        alert('Errore invio segnalazione');
      }
    } catch (err) {
      console.error('Errore invio segnalazione', err);
    }
  };
  
// -------------------------------------------- INTERFACCIA UTENTE -------------------------------------
  return (
    <div className="home-container">
      {/* BARRA SUPERIORE */}
      <div className="home-header"> 
        <span><strong>Utente:</strong> {nomeUtente}</span>
        <span><strong>Ore lavorate oggi:</strong> {tempoLavorato}</span>
      </div>

      {/* MANSIONI QUOTIDIANE*/}
      <h3>Capi di bestiame</h3>
        <div className="tabella-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Pulizia</th>
                <th>Mungitura1</th>
                <th>Mungitura2</th>
                <th>Alimentazione</th>
              </tr>
              </thead>
            <tbody>
              {capiBestiame.map(item => ( //mappa le varie quotidiane per mostrarle in tabella
                <tr key={item.ID}>
                  <td className="no-hover">{item.idAnimale}</td>
                  {['Pulizia', 'Mungitura1', 'Mungitura2', 'Alimentazione'].map(campo => (
                    <td
                      key={campo}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => toggleMansione(item.ID, campo, item[campo])} // rende tabella aggiornata in tempo reale
                    >
                      {item[campo] === 1 ? '✓' : ''}
                    </td>
                ))}
              </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      {/* MANSIONI ACCESSORIE */}
      <h3>Mansioni Accessorie</h3>
      <div className="tabella-scroll">
        <table>
        <thead>
          <tr>
            <th>Messaggio</th>
            <th>Eseguita</th>
          </tr>
        </thead>
        <tbody>
          {mansioniAccessorie.map(m => ( //mappa le varie Mansioni accessorie per mostrarle in tabella
            <tr key={m.ID}>
              <td className="no-hover">{m.Testo}</td>
              <td>
                <input
                  type="checkbox"
                  checked={m.Stato === 1}
                  onChange={() => spuntaMansioneAccessoria(m.ID, m.Stato)} // rende tabella aggiornata in tempo reale
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* INVIA UNA SEGNALAZIONE*/}
      <h3>Invia una segnalazione a : {nomeGestore && <span> {nomeGestore}</span>}</h3>
        <textarea
          rows="4"
          cols="50"
          value={segnalazione}
          onChange={e => setSegnalazione(e.target.value)} // quando utente scrive qualcosa in casella , prendi quel valore e aggiorna Segnalazione con quel valore
          placeholder="Scrivi qui la tua segnalazione..."
        />
              <div className="segnalazione-actions">
              <button className="invia-button" onClick={inviaSegnalazione}>Invia Segnalazione</button>
      </div>

      {/* PULSANTE TERMINA TURNO*/}
      <div className="termina-turno-container">
        <button className="termina-turno-button" onClick={() => navigate('/TimbraUscita')}>
          Termina Turno
        </button>
      </div>
    </div>
    
  );
}

export default HomeOperaio; 