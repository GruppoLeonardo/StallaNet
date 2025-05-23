import React, { useEffect, useState } from 'react'; //hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom'; //hook per navigare fra le pagine 
import '../../style/HomeOperaio.css'; 


function HomeOperaio() {
  // Variabili di stato
  const nomeUtente = localStorage.getItem('nomeUtente'); //prese dal browser
  const idUtente = localStorage.getItem('idUtente');
  const [oraIngresso, setOraIngresso] = useState(null);
  const [tempoLavorato, setTempoLavorato] = useState('00:00');
  const [oreLavoro, setOreLavoro] = useState('0');
  const [capiBestiame, setCapiBestiame] = useState([]);
  const [mansioniAccessorie, setMansioniAccessorie] = useState([]);
  const [segnalazione, setSegnalazione] = useState('');
  const [nomeGestore, setNomeGestore] = useState(null);

  const navigate = useNavigate();

  // Carica dal server i dati utente (aggiorna ogni 5 secondi)
  useEffect(() => {
    fetchData();
    fetchNomeGestore();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [idUtente]);
  
  // Calcola le ore lavorate in giornata per aggiornare il counter (aggiorna ogni minuto)
  useEffect(() => {
    if (!oraIngresso) return; // se non c'e oraIngresso returna nulla .
      const aggiornaTempoLavorato = () => {
      const inizio = new Date(oraIngresso);

      if (isNaN(inizio.getTime())) return; // se orario non e' valido returna nulla .

      const adesso = new Date();
      const diffSec = Math.floor((adesso - inizio) / 1000); //calcola secondi passati
      const ore = String(Math.floor(diffSec / 3600)).padStart(2, '0'); //conversione ore 
      const min = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0'); //conversione minuti

      setTempoLavorato(`${ore}:${min}`);
    };

    aggiornaTempoLavorato(); // calcola subito il tempo lavorato 
    const timer = setInterval(aggiornaTempoLavorato, 60000); // aggiorna ogni minuto 

    return () => clearInterval(timer);
  }, [oraIngresso]);

  



  // ----------------- LOGICA DI HOMEOPERAIO -----------------

  //Carica dati relativi l'operaio (ore lavorate , quotidiane , mansioni accessorie)
  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/home-operaio/${idUtente}`);
      const data = await res.json(); //carica dati da json
      setOraIngresso(data.oraIngresso);
      setCapiBestiame(data.capiBestiame);
      setMansioniAccessorie(data.mansioniAccessorie);
    } catch (err) {
      console.error('Errore durante il recupero dei dati', err);
    }
  };

  // Carica nome del gestore dell'operaio 
  const fetchNomeGestore = async () => {
    try {
      const res = await fetch(`http://localhost:3001/home-operaio/gestore/${idUtente}`);
      if (!res.ok) throw new Error("Errore nella richiesta");
      const data = await res.json(); //carica dati da json
      setNomeGestore(data.NomeGestore);
    } catch (error) {
      console.error("Errore nel recupero del nome del gestore:", error);
    }
  };

  // TABELLA QUOTIDIANE : Quando si preme su una quotidiana si aggiorna il DB e si aggiorna la tabella quotidiane 
  const toggleMansione = async (idQuotidiana, campo, valore) => {
    try {
      await fetch('http://localhost:3001/update-quotidiana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idQuotidiana, 
          campo,
          valore: valore ? 0 : 1 }) 
      });
      fetchData(); // ricarica da server i dati per rifletteri in IU 
    } catch (err) {
      console.error('Errore aggiornamento mansione', err);
    }
  };

  // TABELLA MANSIONI ACCESSORIE : Quando si segna come completata una mansione si aggiorna il db e si aggiorna lo stato "Eseguita"
  const spuntaMansioneAccessoria = async (idComunicazione, statoAttuale) => {
    const nuovoStato = statoAttuale === 1 ? 0 : 1;
    try {
      await fetch('http://localhost:3001/segna-mansione-accessoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idComunicazione, nuovoStato })
      });
  
      fetchData(); // ricarica da server dati per rifletterli su UI 
    } catch (err) {
      console.error('Errore aggiornamento comunicazione', err);
    }
  };
  
// INVIA UNA SEGNALAZIONE : Inserisce in DB una segnaalzione , passando da server 
  const inviaSegnalazione = async () => {
    if (!segnalazione.trim()) { //controlla se la text area e' vuota
    alert("Non è stato scritto nessun messaggio da inviare.");
    return;}
    try {
      const res = await fetch('http://localhost:3001/invia-segnalazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMittente: idUtente, testo: segnalazione })
      });
  
      const data = await res.json(); // carica dati da json
      if (data.success) {
        alert('Segnalazione inviata!');
        setSegnalazione('');
      } else {
        alert('Errore invio segnalazione');
      }
    } catch (err) {
      console.error('Errore invio segnalazione', err);
    }
  };
  







// -------------------- INTERFACCIA UTENTE ------------------------
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
              {capiBestiame.map(item => (
                <tr key={item.ID}>
                  <td className="no-hover">{item.idAnimale}</td>
                  {['Pulizia', 'Mungitura1', 'Mungitura2', 'Alimentazione'].map(campo => (
                    <td
                      key={campo}
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => toggleMansione(item.ID, campo, item[campo])} // rende tabella "interattiva"
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
          {mansioniAccessorie.map(m => (
            <tr key={m.ID}>
              <td className="no-hover">{m.Testo}</td>
              <td>
                <input
                  type="checkbox"
                  checked={m.Stato === 1}
                  onChange={() => spuntaMansioneAccessoria(m.ID, m.Stato)} 
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
          onChange={e => setSegnalazione(e.target.value)}
          placeholder="Scrivi qui la tua segnalazione..."
        />
              <div className="segnalazione-actions">
              <button className="invia-button" onClick={inviaSegnalazione}>Invia Segnalazione</button>
      </div>

      <div className="termina-turno-container">
        <button className="termina-turno-button" onClick={() => navigate('/TimbraUscita')}>
          Termina Turno
        </button>
      </div>
    </div>
    
  );
}

export default HomeOperaio; 