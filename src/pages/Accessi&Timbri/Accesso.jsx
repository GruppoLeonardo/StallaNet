import React, { useState } from 'react'; // useState = gestire il local state reattivo 
import { useNavigate } from 'react-router-dom'; // hook di React Router per navigare tra le pagine
import '../../style/Accesso.css';

function Accesso() {
  // Variabili di stato
  const [nomeUtente, setNomeUtente] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');

  const navigate = useNavigate();// Per spostarsi tra pagine senza refreshare.

  // --------------------- LOGICA DI LOGIN ---------------------
  const handleLogin = async () => {
    try {

      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeUtente, password })
      });
      const data = await res.json(); // risultati in json

      if (!data.success) {  
        setErrore(data.error || 'Errore generico');  
        return;
      }

      //Salva dati dell'utente in localstorage nel browser
      localStorage.setItem('idUtente', data.idUtente);
      localStorage.setItem('nomeUtente', nomeUtente);

      //Reindirizzamento in base a ruolo e cartellino
      if (data.ruolo === 'direttore') {
        navigate('/HomeDirettore'); // se direttore
      } else if (data.stato === 'timbraEntrata') {
        navigate('/TimbraEntrata'); // se operaio o gestore con turno da iniziare 
      } else if (data.stato === 'turnoAttivo') {
        if (data.ruolo === 'operaio') { // se operaio con turno iniziato
          navigate('/HomeOperaio');
        } else if (data.ruolo === 'gestore') {
          navigate('/GestorePagHome'); // se gestore con turno iniziato 
        }
      } else if (data.stato === 'turnoTerminato') {
        navigate('/TimbraEntrata?giaTerminato=true'); // se turno finito
      }

    } catch (err) { 
      console.error(err);
      setErrore('Errore di connessione');
    }
  };


  //  --------------------- INTERFACCIA UTENTE ---------------------
  return (
    <div className="page-container">
      <div className="header">
        <h1>StallaNet</h1>
        <p>Gestione moderna per la tua azienda agricola</p>
      </div>
  
      <div className="accesso-container">
        <h2>Accesso</h2>
        <input
          type="text"
          placeholder="Nome utente"
          value={nomeUtente}
          onChange={e => setNomeUtente(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button onClick={handleLogin}>Accedi</button>
        {errore && <p>{errore}</p>}
      </div>
  
      <br />
      <div className="footer">© 2025 - StallaNet ERP - Tutti i diritti riservati</div>
    </div>
  );
  
}

export default Accesso; 