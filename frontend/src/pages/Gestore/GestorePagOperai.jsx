import React, { useEffect, useState } from 'react';// useState = gestire stati locali del componente , useEffect = per eseguire codice al caricamento 
import { useNavigate } from 'react-router-dom';// reindirizzamentti per navigare fra le pagine 
import '../../style/GestorePagOperai.css'; // stile di pagina
import { SERVER_URL } from '../../config'; // contiene l'indirizzo url del server Node

import GestoreBarraSuperiore from './GestoreBarraSuperiore'; // import del compomente GestoreBarraSuperiore

function GestorePagOperai() {
  // stato utente: ID e nome del gestore (recuperati da JWT)
  const [idUtente, setIdUtente] = useState(null);
  const [nomeUtente, setNomeUtente] = useState('');

  // stato generale degli operai e della stalla
  const [operai, setOperai] = useState([]);
  const [idStalla, setIdStalla] = useState(null);

  
  const [orarioIngresso, setOrarioIngresso] = useState(null); // orario di ingresso del gestore



  // stati per il popup ASSEGNA MANSIONE 
  const [popupAssegnaVisible, setPopupAssegnaVisible] = useState(false);
  const [operaioSelezionato, setOperaioSelezionato] = useState(null);
  const [testoMansione, setTestoMansione] = useState('');


  // stati per il popup AGGIUNGI OPERAIO
  const [popupAggiungiVisibile, setPopupAggiungiVisibile] = useState(false);
  const [nomeNuovoOperaio, setNomeNuovoOperaio] = useState('');
  const [pswNuovoOperaio, setPswNuovoOperaio] = useState('');
  const [muccheStalla, setMuccheStalla] = useState([]);
  const [muccheSelezionate, setMuccheSelezionate] = useState([]);


  // stati per il popup MODIFICA OPERAIO
  const [popupModificaVisibile, setPopupModificaVisibile] = useState(false);
  const [listaOperai, setListaOperai] = useState([]);
  const [modificaNomeUtente, setModificaNomeUtente] = useState('');
  const [modificaPassword, setModificaPassword] = useState('');


  // stati per il popup ELIMINA OPERAIO
  const [popupEliminaVisibile, setPopupEliminaVisibile] = useState(false);
  const [listaOperaiEliminabili, setListaOperaiEliminabili] = useState([]);
  const [operaioDaEliminare, setOperaioDaEliminare] = useState(null);

  const navigate = useNavigate();


  //------------------------- LOGICA DI GESTOREPAGOPERAI.JSX --------------------------

  // RECUPERO DATI APPENA APERTO IL COMPOMENTE

  // chiamata al server per la lettura dei dati utente presenti nel JWT
  useEffect(() => {
    const fetchUtente = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/informazioni-utente`, { 
          credentials: 'include'
        }); 
        const data = await res.json();
        if (data.success && data.utente?.ID && data.utente?.NomeUtente) { // controllo richiesta a buon fine e presenza di id e nome utente 
          setIdUtente(data.utente.ID);
          setNomeUtente(data.utente.NomeUtente);
        } else {
          navigate('/'); // se token non valido, ritorna ad Accesso.jsx
        }
      } catch (err) {
        console.error('Errore durante il recupero dati utente', err);
        navigate('/');
      }
    };fetchUtente();
  }, []);


  //Fa partire fetchStalla appena parte il componente (recupero stalla del gestore)
  useEffect(() => {
    if (idUtente) {
      fetchStalla();
    }
  }, [idUtente]);


  // Avvalora orarioIngresso recuperando cartellino.OraIngresso appena si apre il componente
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


  //appena è disponibile idStalla carica gli operai e aggiona ogni 5 secondi
  useEffect(() => {
    if (!idStalla) return;

    fetchOperai(); // esegue subito appena disponibile idStalla

    const interval = setInterval(() => {
      fetchOperai(); // aggiornamento  
    }, 5000); // ogni 5 secondi

   return () => clearInterval(interval);
  }, [idStalla]);

  

  // FUNZIONI DI RECUPERO DATI



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

  //recupera operai, mansioni quotidiane, mansioni accessorie, ore lavorate (popolameto TABELLA OPERAI STALLA)
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


  //Calcola percentuale barra di stato nella TABELLA OPERAI STALLA
  const calcolaPercentuale = (parte, totale) => {
    if (totale === 0) return 0; // se non ha attivita da fare returna 0 
    return Math.round((parte / totale) * 100);
  };



  // GESTIONE POPUP



  //POPUP ASSEGNA MANSIONE
  // APERTURA del popup ASSEGNA MANSIONE interagendo con la TABELLA OPERAI STALLA
  const apriPopupAssegna = (operaio) => {
    setOperaioSelezionato(operaio); // salva quale operaio è stato selezionato 
    setTestoMansione(''); // reset del testo della mansione (si evita di usare testo vecchio)
    setPopupAssegnaVisible(true); // rende visibile il popup
  };

  // CHIUSURA del popup ASSEGNA MANSIONE
  const chiudiPopupAssegna = () => {
    setPopupAssegnaVisible(false); // rende non visibile il popup
    setOperaioSelezionato(null);  // resetta l'operaio selezionato
  };

  //POPUP AGGIUNGI OPERAIO
  //APERTURA per il popup AGGIUNGI OPERAIO
  const apriPopupAggiungi = async () => {
    setPopupAggiungiVisibile(true); // rende il popup visibile
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/mucche-in-stalla/${idStalla}`); //recupero id mucca e operaio a cui è associata
      const data = await res.json();
      setMuccheStalla(data); //salva elenco mucche (per tabella mucche da assegnare nel pop-up)
    } catch (err) {
      console.error("Errore caricamento mucche della stalla", err);
    }
  };
  //CHIUSURA per il popup AGGIUNGI OPERAIO
  const chiudiPopupAggiungi = () => { 
    //reset completo dei dati del popup
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
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/operai-per-popup-modifica/${idStalla}`); // recupero id e nome utente degli operai della stalla
      const data = await res.json();
      setListaOperai(data); //salva lista operai
      setPopupModificaVisibile(true); // rende visibile il popup di modifica
    } catch (err) {
      console.error("Errore caricamento operai:", err);
    }
  };
  //CHIUSURA per il popup MODIFICA OPERAIO
  const chiudiPopupModifica = () => { 
    //reset completo dei dati del popup
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
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/operai-eliminabili/${idStalla}`); //recupero di operai della stalla
      const data = await res.json();
      setListaOperaiEliminabili(data); //salva lista degli operai
      setPopupEliminaVisibile(true); //visualizza popup in UI
    } catch (err) {
      console.error("Errore caricamento operai per eliminazione:", err);
    }
  };
  //CHIUSURA per il popup ELIMINA OPERAIO
    const chiudiPopupElimina = () => {
    //reset completo dei dati del popup
    setPopupEliminaVisibile(false);
    setListaOperaiEliminabili([]);
    setOperaioDaEliminare(null);
  };

  // assegnazione delle MANSIONI ACCESSORIE agli operai
  const inviaMansione = async () => {
    if (!testoMansione.trim()) { // se casella di testo e' vuota
      alert('Inserisci un testo valido.');
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/invia-mansione-accessoria`, {  // invio richiesta di aggiunta al server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          //dati da inviare
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
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/aggiungi-operaio`, { //invio richiesta al server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          //dati da inviare
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
        fetchOperai(); //ricarica l'elenco degli operai nella TABELLA OPERAI STALLA
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
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/modifica-operaio`, { // invio richiesta al server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // dati da inviare
          idOperaio: operaioSelezionato.ID,
          nuovoNomeUtente: modificaNomeUtente,
          nuovaPassword: modificaPassword
        })
      });
    const data = await res.json();
    if (data.success) {
      alert("Dati modificati con successo");
      chiudiPopupModifica();
      fetchOperai(); // ricarica l'elenco degli operai nella TABELLA OPERAI STALLA
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
      const res = await fetch(`${SERVER_URL}/gestore-pag-operai/elimina-operaio`, { // invio richiesta al server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOperaio: operaioDaEliminare }) // dati da inviare
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


      <div>
        <GestoreBarraSuperiore />
        {/* Invocazione del componente GestoreBarraSuperiore */}
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
                  L'operaio non ha nessuna Mansione Quotidiana assegnata. {/* se non è stata trovata nessua quotidiana per l'operaio */}
                </td>
              ) : (
                <>{/* Calcolo delle percentuali di completament0 */}
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
                          setModificaPassword('');
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