import { useEffect, useState } from 'react'; //useEffect : far girare codice secondario , useState = usare stati locali .
import { useNavigate } from 'react-router-dom';
import '../../style/HomeDirettore.css'; 
import { SERVER_URL } from '../../config';

function HomeDirettore() {
  //Stati iniziali
  const [utente, setUtente] = useState(null); 
  const [statoAzienda, setStatoAzienda] = useState({});
  const [stalle, setStalle] = useState([]);
  const [messaggi, setMessaggi] = useState({});

  const navigate = useNavigate();

  //------------------------------------- LOGICA ----------------------------------------------------- 

  //VERIFICA DEL TOKEN 
  useEffect(() => {
  const caricaUtente = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/informazioni-utente`, {
        credentials: 'include'
      });
      const data = await res.json();
      // Controllo : se token non valido o non e' Direttore , redirecta a Accesso.
      if (!data.success || data.utente.Ruolo !== 'direttore') {
        navigate('/');
        return;
      }
      setUtente(data.utente); // salva dati dell'utente
      //Carica i dati da mostrare
      fetchStatoAzienda(); 
      fetchStalle();
      //Ricarica i dati ogni 5 secondi
      const interval = setInterval(() => {
        fetchStatoAzienda();
        fetchStalle();
      }, 5000);
      return () => clearInterval(interval);
    } catch (err) {
      console.error('Errore durante la verifica del token/ruolo', err);
      navigate('/');
    }
  };
  caricaUtente();
  }, []);

  //RECUPERA INFORMAZIONI SU INTERA AZIENDA
  const fetchStatoAzienda = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-direttore/stato-azienda`);
      const data = await res.json();
      setStatoAzienda(data); //salva dati
    } catch (err) {
      console.error('Errore caricamento stato azienda', err);
    }
  };

  //RECUPERA INFORMAZIONI SU SINGOLE STALLE
  const fetchStalle = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-direttore/singole-stalle`);
      const data = await res.json();
      setStalle(data); //salva dati 
    } catch (err) {
      console.error('Errore caricamento stalle', err);
    }
  };

  // INVIA MESSAGGIO AD UNO DEI GESTORI
  const inviaMessaggio = async (idDestinatario, testo) => {
    if (!testo || testo.trim() === '') { // controlla che casella di testo non sia vuota.
      alert('Non è stato scritto nessun messaggio da inviare.');
      return;
    }
    try {
      await fetch(`${SERVER_URL}/home-direttore/invia-comunicazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idMittente: utente.ID,
          idDestinatario,
          testo: testo.trim()
        })
      });
      alert('Messaggio inviato!');
      setMessaggi(prev => ({ ...prev, [idDestinatario]: '' })); // dopo aver inviato il messaggio, svuota la textarea associata a quel gestore (usando il suo ID).
    } catch (err) {
      console.error('Errore invio messaggio', err);
      alert("Errore durante l'invio del messaggio.");
    }
  };
  
  //-------------------------------------INTERFACCIA UTENTE---------------------------------------
  return (
    <div className="direttore-container">
      {/* Barra superiore */}
      <div className="direttore-top-bar">
        <div className="direttore-benvenuto">
          <span><strong>Benvenuto Direttore:</strong> {utente?.NomeUtente}</span>
        </div>
        <button className="direttore-esci"
          onClick={async () => {
            await fetch(`${SERVER_URL}/logout`, {  // rotta per eliminare il JWT
              method: 'POST',
              credentials: 'include'
            });
            navigate('/'); // rimanda ad Accesso.
          }}
        >
          Esci
        </button>
      </div>

      {/* Corpo */}
      <div className="direttore-body">
        {/* Stato Azienda        DESTRA */} 
        <div className="direttore-sinistra">
          <h2>Stato Azienda:</h2>
          <ul> {/* "|| 0" = se undefined mostra : 0 */}
            <li>🥛 Produzione odierna latte: {statoAzienda.latte || 0} litri</li>
            <li>🌾 Consumo mangime odierno: {statoAzienda.mangime || 0} kg</li>
            <li>🧹 Grado di pulizia ambienti: {statoAzienda.pulizia || 0}%</li>
            <li>💶 Costo odierno manodopera: {statoAzienda.costo || 0} €</li>
            <li>👷🏻‍♂️ Operai: {statoAzienda.operai || 0}</li>
            <li>👨🏻‍💼 Gestori: {statoAzienda.gestori || 0}</li>
            <li>🐄 Capi di Bestiame: {statoAzienda.bestie || 0}</li>
          </ul>
        </div>

        {/* Lista Stalle      SINISTRA*/}
        <div className="direttore-destra">
          <h2>Singole Unità Produttive:</h2>
          <div className="stalle-scroll">
            {stalle.map(stalla => (  // si cicla su tutte le stalle per mostrare le varie card
              <div key={stalla.idStalla} className="stalla-card"> {/*Si crea un div per ogni stalla*/}
                <h3>Stalla ID: {stalla.idStalla}</h3>
                <p>Gestore: {stalla.nomeGestore}</p>
                <p>Operai: {stalla.numOperai}</p>
                <p>Mucche: {stalla.numMucche}</p>
                {/*barre di progresso*/}
                <div className="barre-stalla">
                  <label>Mungitura: {stalla.mungitura}%</label>
                  <progress value={stalla.mungitura} max="100"></progress> 
                  <label>Pulizia: {stalla.pulizia}%</label>
                  <progress value={stalla.pulizia} max="100"></progress>
                  <label>Alimentazione: {stalla.alimentazione}%</label>
                  <progress value={stalla.alimentazione} max="100"></progress>
                </div>
                <div className="comunica-gestore">
                  <textarea
                    placeholder="Comunica al Gestore"
                    value={messaggi[stalla.idGestore] || ''}
                    onChange={(e) =>
                      setMessaggi(prev => ({ ...prev, [stalla.idGestore]: e.target.value })) //aggiorna oggetto messaggi 
                    }
                  />
                  <button onClick={() => inviaMessaggio(stalla.idGestore, messaggi[stalla.idGestore])}>
                    Invia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeDirettore;
