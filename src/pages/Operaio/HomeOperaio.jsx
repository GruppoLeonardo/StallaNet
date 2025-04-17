import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Definisce variabili utente , ne recupera alcune dal browser
function HomeOperaio() {
  const nomeUtente = localStorage.getItem('nomeUtente');
  const idUtente = localStorage.getItem('idUtente');
  const [oreLavoro, setOreLavoro] = useState('0');
  const [capiBestiame, setCapiBestiame] = useState([]);
  const [mansioniAccessorie, setMansioniAccessorie] = useState([]);
  const [segnalazione, setSegnalazione] = useState('');

  const navigate = useNavigate();

  // Prende dati utente dal server , aggiorna ogni 5 secondi
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [idUtente]);

  // -------- comunica con HOME-OPERAIO nel server ----------
  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/home-operaio/${idUtente}`);
      const data = await res.json();
      setOreLavoro(data.oreLavoro);
      setCapiBestiame(data.capiBestiame);
      setMansioniAccessorie(data.mansioniAccessorie);
    } catch (err) {
      console.error('Errore durante il recupero dei dati', err);
    }
  };

  // LISTA CAPI DI BESTIAME : Aggiorna la tabella delle quotidiane nel DB passando da server
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
      fetchData(); // ricarica da server dati per rifletteri in IU 
    } catch (err) {
      console.error('Errore aggiornamento mansione', err);
    }
  };

  // LISTA MANSIONI ACCESSORIE : Aggiorna la tabella delle mansioni accessorie nel DB passando da server 
  const spuntaMansioneAccessoria = async (idComunicazione, statoAttuale) => {
    const nuovoStato = statoAttuale === 1 ? 0 : 1;
    try {
      await fetch('http://localhost:3001/segna-mansione-accessoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idComunicazione, nuovoStato })
      });
  
      fetchData(); // ricarica da server dati per figletterli su UI 
    } catch (err) {
      console.error('Errore aggiornamento comunicazione', err);
    }
  };
  
// INVIA SEGNALAZIONE : Inserisce in DB una segnaalzione , passando da server 
  const inviaSegnalazione = async () => {
    if (!segnalazione.trim()) return; // controllo per textarea vuota o solo spazi 
    try {
      const res = await fetch('http://localhost:3001/invia-segnalazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMittente: idUtente, testo: segnalazione })
      });
  
      const data = await res.json();
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
  
// INTERFACCIA UTENTE
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span><strong>Utente:</strong> {nomeUtente}</span>
        <span><strong>Ore lavorate oggi:</strong> {oreLavoro}</span>
      </div>

      <h3>Capi di bestiame</h3>
      <table border="1">
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
              <td>{item.idAnimale}</td>
              {['Pulizia', 'Mungitura1', 'Mungitura2', 'Alimentazione'].map(campo => (
                <td
                  key={campo}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => toggleMansione(item.ID, campo, item[campo])} // Rende tabella "interattiva"
                >
                  {item[campo] === 1 ? '✓' : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Mansioni Accessorie</h3>
      <table border="1">
        <thead>
          <tr>
            <th>Messaggio</th>
            <th>Eseguita</th>
          </tr>
        </thead>
        <tbody>
          {mansioniAccessorie.map(m => (
            <tr key={m.ID}>
              <td>{m.Testo}</td>
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


      <h3>Segnalazioni</h3>
        <textarea
          rows="4"
          cols="50"
          value={segnalazione}
          onChange={e => setSegnalazione(e.target.value)}
          placeholder="Scrivi qui la tua segnalazione..."
        />
        <br />
        <button onClick={inviaSegnalazione}>Invia</button>

        <br />
        <button style={{ backgroundColor: 'red', color: 'white' }} onClick={() => navigate('/TimbraUscita')}>
          Termina Turno
        </button>
    </div>
    
  );
}

export default HomeOperaio; //rende esportabile la pagina
