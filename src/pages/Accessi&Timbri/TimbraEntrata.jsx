import React, { useEffect, useState } from 'react'; //hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate, useLocation } from 'react-router-dom'; //hook per navigare fra le pagine 
import '../../style/TimbraEntrata.css'; 


function TimbraEntrata() {
  //variabili di stato
  const [ora, setOra] = useState('17:00:00'); // hardcoded
  const [giaTerminato, setGiaTerminato] = useState(false); // se turno e' gia stato fatto
  const nomeUtente = localStorage.getItem('nomeUtente');  // salvati dal browser 
  const idUtente = localStorage.getItem('idUtente');
  const navigate = useNavigate(); 
  const location = useLocation();

  // Legge da URL se ha gia fatto il turno 
  useEffect(() => { 
    const query = new URLSearchParams(location.search);
    setGiaTerminato(query.get('giaTerminato') === 'true');
  }, [location.search]); 

  //------------------- LOGICA DI TIMBRATURA -------------------
  const handleInizioTurno = async () => {
    try {
      const res = await fetch('http://localhost:3001/timbra-ingresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUtente })
      });
      const data = await res.json(); // carica dati da json 

      //Vede se e' operaio o gestore
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

  // ------------------- INTERFACCIA UTENTE -------------------
  return (
    <div className="timbra-container">
      <h2>Benvenuto {nomeUtente}</h2>
      <p>Orario attuale: {ora}</p>

      {giaTerminato ? (
        <div>
          <p style={{ color: 'red' }}>Turno di lavoro odierno già terminato.</p>
          <button onClick={() => navigate('/')}>Torna Indietro</button>
        </div>
      ) : (
        <div>
          <p>Stai iniziando il turno di lavoro?</p>
          <button onClick={handleInizioTurno}>SI</button>
          <button onClick={() => navigate('/')}>NO</button>
        </div>
      )}
    </div>
  );
}

export default TimbraEntrata;
