import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function TimbraEntrata() {
  const [ora, setOra] = useState('17:00:00'); // Hardcoded
  const [giaTerminato, setGiaTerminato] = useState(false); // se turno e' gia stato fatto

  const nomeUtente = localStorage.getItem('nomeUtente');
  const idUtente = localStorage.getItem('idUtente'); // salvati dal browser 
  const navigate = useNavigate(); 
  const location = useLocation();

  // legge da URL se ha gia fatto il turno 
  useEffect(() => { 
    const query = new URLSearchParams(location.search);
    setGiaTerminato(query.get('giaTerminato') === 'true');
  }, [location.search]); 

  //---------------- Comunica con TIMBRA-INGRESSO nel server ----------------
  const handleInizioTurno = async () => {
    try {
      const res = await fetch('http://localhost:3001/timbra-ingresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUtente })
      });

      const data = await res.json();

      //vede se operaio o gestore
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

  // INTERFACCIA UTENTE 
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
