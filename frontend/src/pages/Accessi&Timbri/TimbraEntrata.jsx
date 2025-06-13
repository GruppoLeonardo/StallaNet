import React, { useEffect, useState } from 'react'; //useState = gestire il local state reattivo, useEffect = per gestire effetti collaterali (fetch, timer, ...)
import { useNavigate, useLocation } from 'react-router-dom'; // per navigare su altre pagine
import '../../style/TimbraEntrata.css'; // stile del componente
import { SERVER_URL } from '../../config'; // indirizzo URL del server



// --------------------- LOGICA DI TIMBRA ENTRATA ---------------------


// funzione TimbraEntrata
function TimbraEntrata() {
  // inizializza state vuoti
  const [ora, setOra] = useState('00:00'); 
  const [giaTerminato, setGiaTerminato] = useState(false);
  const [nomeUtente, setNomeUtente] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { // una volta caricato il componente
    fetch(`${SERVER_URL}/informazioni-utente`, { credentials: 'include' }) // recupero dati del JWT tramite richiesta al server
      .then(res => res.json()) // codifica la risposta in JSON
      .then(data => { 
        if (data.success) {
          setNomeUtente(data.utente.NomeUtente); // imposta nomeUtente
        } else {
          navigate('/'); // se la richiesta restituisce un errore, vai ad Accesso.jsx
        }
      })
      .catch(() => navigate('/')); // se altro va storto, vai ad Accesso.jsx
  }, []);


  // Imposta ora attuale al caricamento
  useEffect(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setOra(`${hh}:${mm}`);
  }, []);

  // Legge da URL se ha già fatto il turno
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    setGiaTerminato(query.get('giaTerminato') === 'true');
  }, [location.search]);

  const handleInizioTurno = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/timbra-ingresso`, { // timbratura del cartellino tramite richiesta al backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      // navigazione in base al ruolo
      if (data.success) {
        if (data.ruolo === 'operaio') {
          navigate('/HomeOperaio');
        } else if (data.ruolo === 'gestore') {
          navigate('/GestorePagHome');
        }
      } else {
        alert('Errore durante la timbratura');
      }
    } catch (err) {
      console.error(err);
      alert('Errore di connessione al server');
    }
  };




  //  --------------------- INTERFACCIA UTENTE ---------------------



  return (
    <div className="timbra-container">
      <h2>Benvenuto {nomeUtente}</h2>
      <p>Orario attuale: {ora}</p>

      {giaTerminato ? (
        <div> {/* Se cartellino odierno già timbrato in uscita */}
          <p style={{ color: 'red' }}>Turno di lavoro odierno già terminato.</p>
          <button onClick={() => navigate('/')}>Torna Indietro</button>
        </div>
      ) : (
        <div> {/* Se cartellino odierno non timbrato in entrata */}
          <p>Stai iniziando il turno di lavoro?</p>
          <button onClick={handleInizioTurno}>SI</button>
          <button onClick={() => navigate('/')}>NO</button>
        </div>
      )}
    </div>
  );
}

export default TimbraEntrata;