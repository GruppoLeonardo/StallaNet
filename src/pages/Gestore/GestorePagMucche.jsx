import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom'; // per sapere in quale delle 3 pagine ci si trova 
import '../../style/GestorePagMucche.css';



//COMPONENTE REACT 
function GestorePagMucche() { 
  const idUtente = localStorage.getItem('idUtente');
  const nomeUtente = localStorage.getItem('nomeUtente'); // prende da browser
  const [mucche, setMucche] = useState([]);
  const [oreLavoro, setOreLavoro] = useState(0);
  const [idStalla, setIdStalla] = useState(null);
  const [popupTipo, setPopupTipo] = useState(null); // stato che controlla quale pop-up e' attualmente aperto 
  const [popupData, setPopupData] = useState({});   // stato che contiene i dati temporanei che si stanno scrivendo nel pop-up
  const [operai, setOperai] = useState([]);

  const navigate = useNavigate(); // fa navigare tra le pagine 

  // Carica dati appena apri pag , refresha ogni 5 secondi 
  useEffect(() => {
    fetchMucche();
    fetchOreLavorate();
    const interval = setInterval(() => {fetchMucche();}, 5000);
    return () => clearInterval(interval); // Quando esci , ferma intervallo
  },[]);
  
  // CARICA TUTTE MUCCHE DELLA STALLA SOTTO CONTROLLO DAL GESTORE
  const fetchMucche = async () => {
    try {
      const res = await fetch(`http://localhost:3001/mucche-gestore/${idUtente}`);
      const data = await res.json();
      setMucche(data.mucche);
      setIdStalla(data.idStalla);
    } catch (err) {
      console.error('Errore caricamento mucche', err);
    }
  };

  // CARICA TUTTI OPERAI CHE LAVORANO NELLA STALLA SOTTO CONTROLLO DEL GESTORE
  const fetchOperai = async (idStalla) => {
    try {
      const res = await fetch(`http://localhost:3001/operai-stalla/${idStalla}`);
      const data = await res.json();
      setOperai(data.operai);
    } catch (err) {
      console.error('Errore caricamento operai', err);
    }
  };

  // CALCOLO ORE LAVORATE OGGI
  const fetchOreLavorate = async () => {
    try {
      const res = await fetch(`http://localhost:3001/home-gestore/${idUtente}`);
      const data = await res.json();
      setOreLavoro(data.oreLavoro);
    } catch (err) {
      console.error('Errore caricamento ore lavorate', err);
    }
  };
  
  // APRE I POP-UP
  const apriPopup = (tipo) => {
    setPopupTipo(tipo); // quale fra i 3
    setPopupData({}); // pulisce dati vecchi nei form
    if (idStalla) {
      fetchOperai(idStalla);
    }
  };

  // CHIUDE I POP-UP
  const chiudiPopup = () => {
    setPopupTipo(null);
    setPopupData({}); // pulisce dati inseriti
  };

  // POP-UP : AGGIUNGI MUCCA
  const aggiungiMucca = async () => {
    try {
      await fetch('http://localhost:3001/aggiungi-mucca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...popupData, idStalla }) // invia i dati inseriti nel form
      });
      fetchMucche(); // ricarica lista mucche
      chiudiPopup();
    } catch (err) {
      console.error('Errore aggiunta mucca', err);
    }
  };

  // POP-UP : MODIFICA DATI MUCCA
  const modificaMucca = async () => {
    try {
      await fetch('http://localhost:3001/modifica-mucca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(popupData) // invia i dati inseriti nel form
      });
      fetchMucche(); // ricarica lista mucche
      chiudiPopup();
    } catch (err) {
      console.error('Errore modifica mucca', err);
    }
  };

  //POP-UP : ELIMINA MUCCA
  const eliminaMucca = async () => {
    try {
      await fetch('http://localhost:3001/elimina-mucca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMucca: popupData.idMucca }) // invia i dati inseriti nel form
      });
      fetchMucche(); // ricarica lista mucche
      chiudiPopup();
    } catch (err) {
      console.error('Errore eliminazione mucca', err);
    }
  };
 









  // ---------------- INTERFACCIA UTENTE -----------------
  return (
    //BARRA SUPERIORE
    <div className="gestore-container">

      <div className="gestore-top-bar">
        <div className="gestore-sinistra">
          <span><strong>Gestore:</strong> {nomeUtente}</span>
        </div>
        <div className="gestore-destra">
          <span> 
            <strong> Ore lavorate oggi: </strong> {oreLavoro}
          </span>
          <button className="gestore-termina-turno" onClick={() => navigate('/TimbraUscita')}> Termina Turno </button>
        </div>
      </div>

      {/* SELETTORE PAGINE (Home/Operai/Mucche) */}
      <div className="gestore-nav">
        <button onClick={() => navigate('/GestorePagHome')} className={location.pathname === '/GestorePagHome' ? 'attivo' : ''}> Home </button>
        <button onClick={() => navigate('/GestorePagOperai')} className={location.pathname === '/GestorePagOperai' ? 'attivo' : ''}> Operai </button>
        <button onClick={() => navigate('/GestorePagMucche')} className={location.pathname === '/GestorePagMucche' ? 'attivo' : ''}> Mucche </button> 
      </div>

      {/* TABELLA MUCCHE */}
      <h3>Mucche presenti in stalla: {idStalla}</h3>
      <table>
        <thead>
          <tr>
            <th>ID Bestiame</th>
            <th>Note</th>
            <th>Vaccinazioni</th>
          </tr>
        </thead>
        <tbody>
          {mucche.map(m => (
            <tr key={m.ID}>
              <td>{m.ID}</td>
              <td>{m.Nota}</td>
              <td>{m.Vaccinazioni}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PULSANTI MODIFICHE */}
      <h3>Modifiche</h3>
      <div className="gestore-modifiche">
        <button onClick={() => apriPopup('aggiungi')}>Aggiungi Mucca</button>
        <button onClick={() => apriPopup('modifica')}>Modifica Dati Mucca</button>
        <button onClick={() => apriPopup('elimina')}>Elimina Mucca</button>
      </div>

      {/* POPUP */}
      {popupTipo && (
        <div className="popup-overlay">
          <div className="popup">

            {/* AGGIUNGI MUCCA */}
            {popupTipo === 'aggiungi' && (
              <>
                <h3>Aggiungi nuova mucca alla stalla</h3>
                <input
                  type="text"
                  placeholder="Nota"
                  onChange={e => setPopupData({ ...popupData, Nota: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Vaccinazioni"
                  onChange={e => setPopupData({ ...popupData, Vaccinazioni: e.target.value })}
                />
                <select
                  onChange={e => setPopupData({ ...popupData, idOperaio: e.target.value })}
                >
                  <option value="">-- Seleziona Operaio --</option>
                  {operai.map(o => (
                    <option key={o.ID} value={o.ID}>
                      {o.NomeUtente} ({o.numMucche} mucche)
                    </option>
                  ))}
                </select>
                <button onClick={aggiungiMucca}>Aggiungi Mucca</button>
                <button onClick={chiudiPopup}>Annulla</button>
              </>
            )}

             {/* MODIFICA DATI MUCCA */}
            {popupTipo === 'modifica' && (
              <>
                <h3>Modifica Dati Mucca</h3>
                <select
                  onChange={e => setPopupData({ ...popupData, idMucca: e.target.value })}
                >
                  <option value="">-- Seleziona Mucca --</option>
                  {mucche.map(m => (
                    <option key={m.ID} value={m.ID}>
                      ID: {m.ID}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nuova Nota"
                  onChange={e => setPopupData({ ...popupData, Nota: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Nuove Vaccinazioni"
                  onChange={e => setPopupData({ ...popupData, Vaccinazioni: e.target.value })}
                />
                <select
                  onChange={e => setPopupData({ ...popupData, idOperaio: e.target.value })}
                >
                  <option value="">-- Affida a Operaio --</option>
                  {operai.map(o => (
                    <option key={o.ID} value={o.ID}>
                      {o.NomeUtente} ({o.numMucche} mucche)
                    </option>
                  ))}
                </select>
                <button onClick={modificaMucca}>Esegui Modifica</button>
                <button onClick={chiudiPopup}>Annulla</button>
              </>
            )}

             {/* ELIMINA MUCCA */}
            {popupTipo === 'elimina' && (
              <>
                <h3>Elimina Mucca</h3>
                <select
                  onChange={e => setPopupData({ ...popupData, idMucca: e.target.value })}
                >
                  <option value="">-- Seleziona Mucca da Eliminare --</option>
                  {mucche.map(m => (
                    <option key={m.ID} value={m.ID}>
                      ID: {m.ID}
                    </option>
                  ))}
                </select>
                <button onClick={eliminaMucca}>Conferma Eliminazione</button>
                <button onClick={chiudiPopup}>Annulla</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GestorePagMucche;
