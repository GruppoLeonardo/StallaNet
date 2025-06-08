import React, { useEffect, useState } from 'react';//hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom';//hook per navigare fra le pagine 
import '../../style/GestorePagOperai.css';
import { SERVER_URL } from '../../config';
import { calcolaTempoTrascorso } from '../../utils/utilsFrontend';



function GestorePagOperai() {
  //costanti generali
  const idUtente = localStorage.getItem('idUtente');
  const nomeUtente = localStorage.getItem('nomeUtente');
  const [operai, setOperai] = useState([]);
  const [idStalla, setIdStalla] = useState(null);
  const [oreLavoroLive, setOreLavoroLive] = useState("00:00");
  const [orarioIngresso, setOrarioIngresso] = useState(null);



  //costanti per il popup ASSEGNA MANSIONE 
  const [popupAssegnaVisible, setPopupAssegnaVisible] = useState(false);
  const [operaioSelezionato, setOperaioSelezionato] = useState(null);
  const [testoMansione, setTestoMansione] = useState('');


  //costanti per il popup AGGIUNGI OPERAIO
  const [popupAggiungiVisibile, setPopupAggiungiVisibile] = useState(false);
  const [nomeNuovoOperaio, setNomeNuovoOperaio] = useState('');
  const [pswNuovoOperaio, setPswNuovoOperaio] = useState('');
  const [muccheStalla, setMuccheStalla] = useState([]);
  const [muccheSelezionate, setMuccheSelezionate] = useState([]);


  //costanti per il popup MODIFICA OPERAIO
  const [popupModificaVisibile, setPopupModificaVisibile] = useState(false);
  const [listaOperai, setListaOperai] = useState([]);
  const [modificaNomeUtente, setModificaNomeUtente] = useState('');
  const [modificaPassword, setModificaPassword] = useState('');


  //costanti per il popup ELIMINA OPERAIO
  const [popupEliminaVisibile, setPopupEliminaVisibile] = useState(false);
  const [listaOperaiEliminabili, setListaOperaiEliminabili] = useState([]);
  const [operaioDaEliminare, setOperaioDaEliminare] = useState(null);

  const navigate = useNavigate();

  //Fa partire fetchStalla appena parte il componente 
  useEffect(() => {
   fetchStalla(); // solo questo al primo caricamento
  }, []);

  // Avvalora orarioIngresso recuperando cartellino.OraIngresso appena si carica la pagina
  useEffect(() => {
    const fetchOrarioIngresso = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/gestore-pag-operai/orario-ingresso/${idUtente}`);
        const data = await res.json();
        if (data.orarioIngresso && typeof data.orarioIngresso === "string") { //controllo data.orarioIngresso avvalorato ed è una stringa?
          setOrarioIngresso(data.orarioIngresso); //se data.orarioIngresso supera i controlli può essere usato per avvalorare orarioIngresso
        }
      } catch (err) {
        console.error("Errore recupero orario ingresso:", err);
      }
    };

    if (idUtente) fetchOrarioIngresso();
  }, [idUtente]);

  // Quando orarioIngresso è disponibile, aggiorna immediatamente oreLavoroLive, poi ogni minuto
  useEffect(() => {
    if (!orarioIngresso) return;

    const aggiorna = () => {
      const aggiornate = calcolaTempoTrascorso(orarioIngresso);
      setOreLavoroLive(aggiornate);
    };

    aggiorna(); // calcolo immediato
    const timer = setInterval(aggiorna, 60000);
    return () => clearInterval(timer);
  }, [orarioIngresso]);

  //appena è disponibile idStalla carica gli operai e aggiona ogni 5 secondi
  useEffect(() => {
    if (!idStalla) return;

    fetchOperai(); // esegue subito appena disponibile idStalla

    const interval = setInterval(() => {
      fetchOperai(); // aggiorna ogni 5 secondi
    }, 5000);

   return () => clearInterval(interval);
  }, [idStalla]);

  //------------------------- LOGICA DI GESTOREPAGOPERAI.JSX --------------------------
  //recupera idStalla di stalla del gestore
  const fetchStalla = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/stalla-del-gestore/${idUtente}`);
      const data = await res.json();
      if (data.idStalla) {
        setIdStalla(data.idStalla); //salva idStalla
      } else {
        console.error("Stalla non trovata nel backend", data);
      }
    } catch (err) {
      console.error('Errore caricamento id stalla', err);
    }
  };

  //recupera operai che lavorano in specifica stalla
  const fetchOperai = async () => {
    if (!idStalla) return;
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/operai-in-stalla/${idStalla}`);
      const data = await res.json();
      setOperai(data.operai); // salva stato operai per riempire tabella in UI 
    } catch (err) {
      console.error('Errore caricamento operai', err);
    }
  };


  //Calcola percentuale barra di stato nella tabella UI 
  const calcolaPercentuale = (parte, totale) => {
    if (totale === 0) return 0; // se non ha attivita da fare returna 0 
    return Math.round((parte / totale) * 100);
  };

  //POPUP ASSEGNA MANSIONE
  // APERTURA del popup ASSEGNA MANSIONE
  const apriPopupAssegna = (operaio) => {
    setOperaioSelezionato(operaio); // salva quale operaio 
    setTestoMansione(''); // pulisce testo mansione
    setPopupAssegnaVisible(true); // mostra popup
  };
  // CHIUSURA del popup ASSEGNA MANSIONE
  const chiudiPopupAssegna = () => {
    setPopupAssegnaVisible(false); // comparsa popup in UI e' condizionata
    setOperaioSelezionato(null); 
  };

  //POPUP AGGIUNGI OPERAIO
  //APERTURA per il popup AGGIUNGI OPERAIO
  const apriPopupAggiungi = async () => {
    setPopupAggiungiVisibile(true); //comparsa popup in UI e' condizionata
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/mucche-in-stalla/${idStalla}`);
      const data = await res.json();
      setMuccheStalla(data); //salva elenco mucche (per tabella mucche da assegnare nel pop-up)
    } catch (err) {
      console.error("Errore caricamento mucche della stalla", err);
    }
  };
  //CHIUSURA per il popup AGGIUNGI OPERAIO
  const chiudiPopupAggiungi = () => {
    setPopupAggiungiVisibile(false);
    setNomeNuovoOperaio('');
    setPswNuovoOperaio('');
    setMuccheStalla([]);
    setMuccheSelezionate([]);
  }

  // POPUP MODIFICA OPERAIO
  //APERTURA per il popup MODIFICA OPERAIO
  const apriPopupModifica = async () => {
    if (!idStalla)
    {
      alert("idStalla non pronto");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/operai-per-popup-modifica/${idStalla}`);
      const data = await res.json();
      setListaOperai(data); //salva lista operai
      setPopupModificaVisibile(true); // attiva popup di modifica
    } catch (err) {
      console.error("Errore caricamento operai:", err);
    }
  };
  //CHIUSURA per il popup MODIFICA OPERAIO
  const chiudiPopupModifica = () => {
    setPopupModificaVisibile(false);
    setListaOperai([]);
    setOperaioSelezionato(null);
    setModificaNomeUtente('');
    setModificaPassword('');
  };

  //POPUP ELIMINA OPERAIO
  //APERTURA per il popup ELIMINA OPERAIO
  const apriPopupElimina = async () => {
    if (!idStalla) {
      alert("idStalla non pronto");
      return;
    }
    try { // returna solo operai che NON hanno mucche assegnate
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/operai-eliminabili/${idStalla}`);
      const data = await res.json();
      setListaOperaiEliminabili(data); //salva lista
      setPopupEliminaVisibile(true); //visualizza popup in UI
    } catch (err) {
      console.error("Errore caricamento operai per eliminazione:", err);
    }
  };
  //CHIUSURA per il popup ELIMINA OPERAIO
    const chiudiPopupElimina = () => {
    setPopupEliminaVisibile(false);
    setListaOperaiEliminabili([]);
    setOperaioDaEliminare(null);
  };

  //Assegnare MANSIONI ACCESSORIE agli operai
  const inviaMansione = async () => {
    if (!testoMansione.trim()) { // se casella di testo e' vuota
      alert('Inserisci un testo valido.');
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/invia-mansione-accessoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idMittente: idUtente,
          idDestinatario: operaioSelezionato.IdOperaio,
          testo: testoMansione,
        }),
      });
      const data = await res.json(); //converte risposta in json
      if (data.success) {
        alert('Mansione assegnata con successo!');
        chiudiPopupAssegna();
      } else {
        alert('Errore durante l\'invio.');
      }
    } catch (error) {
      console.error('Errore invio mansione', error);
    }
  };

  //AGGIUNTA di un nuovo OPERAIO
  const aggiungiOperaio = async () => { 
    if (!nomeNuovoOperaio.trim() || !pswNuovoOperaio.trim()) { // controllo nome e password
      alert("Inserire Nome Utente e Password");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/aggiungi-operaio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeUtente: nomeNuovoOperaio,
          password: pswNuovoOperaio,
          mucche: muccheSelezionate,
          idStalla: idStalla
        })
      });
      const data = await res.json(); //legge risposta 
      if (data.success) {
        alert('Operaio aggiunto con successo!');
        chiudiPopupAggiungi();
        fetchOperai(); //ricarica l'elenco degli operai
      } else {
        alert('Errore: ' + data.message);
      }
    } catch (err) {
      console.error('Errore aggiunta operaio:', err);
    }
  };
  
  //MODIFICA dati di un OPERAIO
  const modificaOperaio = async () => {
    if (!operaioSelezionato) {
      alert("Per effettuare le modifiche devi selezionare un operaio.");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/modifica-operaio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idOperaio: operaioSelezionato.ID,
          nuovoNomeUtente: modificaNomeUtente,
          nuovaPassword: modificaPassword
        })
      });
    const data = await res.json();
    if (data.success) {
      alert("Dati modificati con successo");
      chiudiPopupModifica();
      fetchOperai();
    } else {
      alert("Errore modifica: " + data.message);
    }
  } catch (err) {
    console.error("Errore modifica operaio:", err);
  }
  };

  //ELIMINAZIONE di un OPERAIO
  const eliminaOperaio = async () => {
    if (!operaioDaEliminare) { //controllo di selezione
      alert("Seleziona un operaio da eliminare.");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/elimina-operaio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOperaio: operaioDaEliminare })
      });
      const data = await res.json(); //converte risposta da json
      if (data.success) {
      alert("Operaio eliminato con successo.");
      chiudiPopupElimina();
      fetchOperai(); //ricarica lista di operai
      }
      else {
        alert(data.message || "Errore durante l'eliminazione.");
      }
    } catch (err) {
      console.error("Errore eliminazione operaio:", err);
    }
  };  


//---------------------INTERFACCIA UTENTE----------------------
  return (
    <div className="gestore-container">

      {/* Barra superiore */}
      <div className="gestore-top-bar">
        {/*Sinistra della barra */}
        <div className="gestore-sinistra">
          <span><strong>Gestore:</strong> {nomeUtente}</span>
        </div>
        {/*Destra della barra */}
        <div className="gestore-destra">
          <span className="gestore-ore"><strong>Ore lavorate oggi:</strong> {oreLavoroLive}</span>
          <button
            className="gestore-termina-turno"
            onClick={() => navigate('/TimbraUscita')}> Termina Turno 
          </button>
        </div>
      </div>

      {/* Navigazione tra le pagine del Gestore */}
      <div className="gestore-nav">
        <button onClick={() => navigate('/GestorePagHome')}>Home</button>
        <button onClick={() => navigate('/GestorePagOperai')}>Operai</button>
        <button onClick={() => navigate('/GestorePagMucche')}>Mucche</button>
      </div>

      {/* Tabella Operai Stalla */}
      <h3>Operai Stalla {idStalla ?`[${idStalla}]`: ''}</h3>
      <div className="tabella-scorribile">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Pulizia</th>
            <th>Mungitura</th>
            <th>Alimentazione</th>
            <th>Mansioni Accessorie</th>
            <th>Ore di Lavoro</th>
            <th>Assegna Mansione</th>
          </tr>
        </thead>
        <tbody>
          {operai.map(operaio => (
            <tr key={operaio.IdOperaio}>
              <td>{operaio.NomeUtente}</td>

              {operaio.TotaleQuotidiane === 0 ? (
                <td colSpan="3" style={{ fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
                  L'operaio non ha nessuna Mansione Quotidiana assegnata.
                </td>
              ) : (
                <>
                  <td>
                    <progress
                      value={calcolaPercentuale(operaio.PulizieSvolte, operaio.TotaleQuotidiane)}
                      max="100"
                    />
                    {calcolaPercentuale(operaio.PulizieSvolte, operaio.TotaleQuotidiane)}%
                  </td>
                  <td>
                    <progress
                      value={calcolaPercentuale(operaio.MungitureSvolte, operaio.TotaleMungiture)}
                      max="100"
                    />
                    {calcolaPercentuale(operaio.MungitureSvolte, operaio.TotaleMungiture)}%
                  </td>
                  <td>
                    <progress
                      value={calcolaPercentuale(operaio.AlimentazioniSvolte, operaio.TotaleQuotidiane)}
                      max="100"
                    />
                    {calcolaPercentuale(operaio.AlimentazioniSvolte, operaio.TotaleQuotidiane)}%
                  </td>
                </>
              )}

              <td>
                {operaio.TotaleMansioni === 0 ? (
                  <span style={{ fontStyle: 'italic', fontSize: '13px' }}>
                    Nessuna mansione accessoria odierna
                  </span>
                ) : (
                  <>
                    <progress
                      value={calcolaPercentuale(operaio.MansioniSvolte, operaio.TotaleMansioni)}
                      max="100"
                    />
                    {calcolaPercentuale(operaio.MansioniSvolte, operaio.TotaleMansioni)}%
                  </>
                )}
              </td>

              <td>{operaio.OreLavorate || "00:00"}</td>

              <td>
                <button onClick={() => apriPopupAssegna(operaio)}>Assegna</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>


      {/* Bottoni per popup Modifiche */}
      <h3>Modifiche:</h3>
      <div className="gestore-modifiche">
        <button onClick={apriPopupAggiungi}>Aggiungi Operaio</button>
        <button onClick={apriPopupModifica}>Modifica Dati Operaio</button>
        <button onClick={apriPopupElimina}>Elimina Operaio</button>
      </div>

      {/* Popup Assegna Mansione */}
      {popupAssegnaVisible && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Assegna una mansione a: {operaioSelezionato.NomeUtente}</h3>
            <textarea
              rows="4"
              value={testoMansione}
              onChange={(e) => setTestoMansione(e.target.value)}
              placeholder="Scrivi qui la mansione..."
            />
            <div className="popup-buttons">
              <button className="conferma" onClick={inviaMansione}>Invia</button>
              <button className="rosso" onClick={chiudiPopupAssegna}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Aggiungi Operaio */}
      {popupAggiungiVisibile && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Aggiungi Operaio</h3>
            <input
              type="text"
              placeholder="Nome Utente"
              value={nomeNuovoOperaio}
              onChange={(e) => setNomeNuovoOperaio(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={pswNuovoOperaio}
              onChange={(e) => setPswNuovoOperaio(e.target.value)}
            />
            <h4>(Facoltativo) Assegna Mucche</h4>
            <div className="popup-table">
              <table>
                <thead>
                  <tr>
                    <th>ID Mucca</th>
                    <th>Operaio Corrente</th>
                    <th>Assegna</th>
                  </tr>
                </thead>
                <tbody>
                  {muccheStalla.map(mucca => (
                    <tr key={mucca.ID}>
                      <td>{mucca.ID}</td>
                      <td>{mucca.OperaioCorrente || "Nessuno"}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={muccheSelezionate.includes(mucca.ID.toString())}
                          onChange={(e) => {
                            const id = mucca.ID.toString();
                            setMuccheSelezionate(prev =>
                              e.target.checked
                                ? [...prev, id]
                                : prev.filter(m => m !== id)
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="popup-buttons">
              <button className="conferma" onClick={aggiungiOperaio}>Crea</button>
              <button className="rosso" onClick={chiudiPopupAggiungi}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Modifica  */}
      {popupModificaVisibile && (
      <div className="popup-overlay">
        <div className="popup">
          <h3>Modifica Dati Operaio</h3>

          <h4>Seleziona Operaio</h4>
          <div className="popup-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome Utente</th>
                  <th>Seleziona</th>
                </tr>
              </thead>
              <tbody>
                {listaOperai.map(op => (
                  <tr key={op.ID}>
                    <td>{op.ID}</td>
                    <td>{op.NomeUtente}</td>
                    <td>
                      <input
                        type="radio"
                        name="selezionaOperaio"
                        value={op.ID}
                        checked={String(operaioSelezionato?.ID) === String(op.ID)}
                        onChange={() => {
                          setOperaioSelezionato(op);
                          setModificaNomeUtente(op.NomeUtente);
                          setModificaPassword(op.Psw || '');
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {operaioSelezionato && (
            <>
              <h4>Dati Modificabili</h4>
              <label>Nome Utente
                <input
                  type="text"
                  value={modificaNomeUtente}
                  onChange={e => setModificaNomeUtente(e.target.value)}
                />
              </label>
              
              <label>Password
              <input
                type="text"
                value={modificaPassword}
                onChange={e => setModificaPassword(e.target.value)}
              />
              </label>
            </>
          )}

          <div className="popup-buttons">
              <button className="conferma" onClick={modificaOperaio}>Modifica</button>
              <button className="rosso" onClick={chiudiPopupModifica}>Annulla</button>
            </div>

        </div>
      </div>
      )}

      {/* Popup Elimina */}
      {popupEliminaVisibile && (
      <div className="popup-overlay">
        <div className="popup">
          
          <h3>Elimina Operaio</h3>
         <p style={{ color: 'red' }}>
            Per poter eliminare un operaio NON deve avere alcuna mucca assegnata
          </p>
          <label>Seleziona Operaio</label>
          <select
            value={operaioDaEliminare || ''}
            onChange={(e) => setOperaioDaEliminare(e.target.value)}
          >
            <option value="">-- Seleziona un operaio --</option>
            {listaOperaiEliminabili.map(op => (
              <option key={op.ID} value={op.ID}>
                {op.NomeUtente}
              </option>
            ))}
          </select>

          <div className="popup-buttons">
            <button className="conferma" onClick={eliminaOperaio}>Conferma eliminazione</button>
            <button className="rosso" onClick={chiudiPopupElimina}>Annulla</button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}

export default GestorePagOperai;