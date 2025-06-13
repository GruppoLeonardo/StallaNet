import React, { useState } from 'react'; // useState = gestire il local state reattivo 
import { useNavigate } from 'react-router-dom'; // hook di React Router per navigare tra le pagine
import '../../style/Accesso.css'; // stile visivo della pagina
import { SERVER_URL } from '../../config'; // URL del server backend


function Accesso() {
  // Variabili di stato
  const [nomeUtente, setNomeUtente] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');

  const navigate = useNavigate();// Per spostarsi tra pagine senza refreshare.

  // --------------------- LOGICA DI LOGIN ---------------------
  const handleLogin = async () => {
    try {

      const res = await fetch(`${SERVER_URL}/accesso`, { // invio della ricgiesta tramite backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeUtente, password }), // invia i dati nomeUtente e password in formato JSON
        credentials: 'include' //per i cookie
      });
      const data = await res.json(); // codifica i risultati in json

      if (!data.success) {  // se si è verificato un problema nella risposta
        setErrore(data.error || 'Errore generico'); // avvaloramento di errore col messaggio del server
        return;
      }

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

    } catch (err) { // se in handleLogin qualcosa va storto
      console.error(err); // stampa dell'errore nella console
      setErrore('Errore di connessione'); // per mostrare un errore generico all'utente
    }
  };


  //  --------------------- INTERFACCIA UTENTE ---------------------
  return (
    <div className="page-container">

      {/* Titolo */}
      <div className="header"> 
        <h1>StallaNet</h1>
        <p>Gestione moderna per la tua azienda agricola</p>
      </div>

      {/* Riquadro di accesso */}
      <div className="accesso-container">
        <h2>Accesso</h2>
        <input
          type="text"
          placeholder="Nome utente"
          value={nomeUtente}
          onChange={e => { {/* Se il valore nomeUtente cambia in UI, aggiorna il valore */}
            setNomeUtente(e.target.value);
            setErrore('');
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => { {/* Se il valore password cambia in UI, aggiorna il valore */}
            setPassword(e.target.value);
            setErrore('');
          }}
        />
        <button onClick={handleLogin}>Accedi</button> 
        {errore && <p>{errore}</p>} {/* Se handleLogin restituisce un errore, mostralo in un paragrafo */}
      </div>
  
      <br/>
      {/* Footer */}
      <div className="footer">© 2025 - StallaNet ERP - Tutti i diritti riservati</div>
    </div>
  );
  
}

export default Accesso; 