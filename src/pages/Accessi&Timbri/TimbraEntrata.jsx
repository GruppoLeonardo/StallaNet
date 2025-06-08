import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../style/TimbraEntrata.css';
import { SERVER_URL } from '../../config';

function TimbraEntrata() {
  const [ora, setOra] = useState('00:00'); // inizializza vuoto
  const [giaTerminato, setGiaTerminato] = useState(false);
  const nomeUtente = localStorage.getItem('nomeUtente');
  const idUtente = localStorage.getItem('idUtente');
  const navigate = useNavigate();
  const location = useLocation();

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
      const res = await fetch(`${SERVER_URL}/timbra-ingresso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUtente })
      });
      const data = await res.json();

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
