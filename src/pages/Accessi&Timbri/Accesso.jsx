import React, { useState } from 'react'; // useState = gestire gli stati reattivi 
import { useNavigate } from 'react-router-dom'; // hook di React Router , per redirect programmati

// Componente ACCESSO
function Accesso() {
 
  // Definizione degli stati
  const [nomeUtente, setNomeUtente] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');

  // Per spostarsi tra pagine senza refreshare
  const navigate = useNavigate();

  // --------------------- GESTIONE DEL LOGIN ---------------------
  const handleLogin = async () => {
    try {
      // manda a /login in server.js
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeUtente, password })
      });

      //Contiene risultati
      const data = await res.json();

      //In caso di errori
      if (!data.success) {
        setErrore(data.error || 'Errore generico');
        return;
      }

      //Salva dati dell'utente nel browser
      localStorage.setItem('idUtente', data.idUtente);
      localStorage.setItem('nomeUtente', nomeUtente);

      //REINDIRIZZAMENTO IN BASE A RUOLO E CARTELLINO
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







  // INTERFACCIA UTENTE 
  return (
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
      <button onClick={handleLogin}>Accedi</button> {/* manda dati ad handleLogin*/}
      {errore && <p style={{ color: 'red' }}>{errore}</p>}
    </div>
  );
}

export default Accesso; // per farlo importare ad altre pag

