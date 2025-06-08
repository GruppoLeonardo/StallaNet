import React, { useEffect, useState , useRef} from 'react';//hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom';//hook per navigare fra le pagine 
import '../../style/GestorePagMucche.css';
import { SERVER_URL } from '../../config';
import { calcolaTempoTrascorso } from '../../utils/utilsFrontend';



function GestorePagMucche() { 
  //Dati Utente
  const idUtente = localStorage.getItem('idUtente');
  const nomeUtente = localStorage.getItem('nomeUtente'); // prende da browser
  const [oraIngresso, setOraIngresso] = useState(null);
  //Stati principali della pagina
  const [mucche, setMucche] = useState([]);
  const [oreLavoro, setOreLavoro] = useState(0);
  const [idStalla, setIdStalla] = useState(null);
  const [posizioneStalla, setPosizioneStalla] = useState('');
  //POPUP
  const [popupTipo, setPopupTipo] = useState(null); // controlla quale pop-up e' aperto ora
  const [popupData, setPopupData] = useState({});   //  contiene dati che si stanno scrivendo 
  //Gestione operai
  const [operai, setOperai] = useState([]);
  //Barra di ricerca
  const [cercaTesto, setCercaTesto] = useState(''); 
  const [parolaEvidenziata, setParolaEvidenziata] = useState('');
  const righeRef = useRef({}); //Ref React

  const navigate = useNavigate(); 

  // Parte al caricamento della pagina , refresha ogni 5 secondi 
  useEffect(() => {
    fetchMucche(); //recupera mucche in stalla 
    const interval = setInterval(() => {fetchMucche();}, 5000);
    return () => clearInterval(interval); // pulizia all'uscita
  },[]);

  //Parte al caricamento della pagina , refresha ogni 60 secondi
    useEffect(() => {
      fetchOraIngresso(); //recupera ore lavorate da gestore
      if (!oraIngresso) return;
      const aggiornaOre = () => {
        const tempo = calcolaTempoTrascorso(oraIngresso);
        setOreLavoro(tempo);
      };
      aggiornaOre(); // calcolo immediato
      const timer = setInterval(aggiornaOre, 60000); // ogni minuto
      return () => clearInterval(timer);
    }, [oraIngresso]);

  
  //------------------------------------ LOGICA DI GESTOREPAGMUCCHE.JSX -----------------------
  // Carica tutte le mucche in questa stalla
  const fetchMucche = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-mucche/mucche-in-stalla/${idUtente}`);
      const data = await res.json(); //carica da json
      if (!data || !data.idStalla) {
        throw new Error("Dati mancanti dal backend");
      }
      //salva i dati negli stati 
      setMucche(data.mucche);
      setIdStalla(data.idStalla);
      setPosizioneStalla(data.posizioneStalla); 
    } catch (err) {
      console.error('Errore caricamento mucche:', err);
      alert('Errore nel caricamento delle mucche.');
    }
  };

  // MODIFICA : 23 mag , qui ho tolto un controllo di risposta server
  // Carica tutti gli operai che lavorano in questa stalla 
  const fetchOperai = async (idStalla) => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-mucche/operai-in-stalla/${idStalla}`);
      const data = await res.json(); 
      if (!data.operai || !Array.isArray(data.operai)) { // controlla che ci sia l'array operai 
        throw new Error("Formato JSON non valido: manca 'operai'");
      }
      setOperai(data.operai); //salva lista operai
    } catch (err) {
      console.error('Errore fetchOperai:', err);
      alert('Errore nel caricamento degli operai. Controlla la console.');
    }
  };

  // Calcola ore lavorate oggi dal gestore
    const fetchOraIngresso = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-mucche/ore-lavorate/${idUtente}`);
      const data = await res.json();
      setOraIngresso(data.oraIngresso || null); // salva orario
    } catch (err) {
      console.error('Errore caricamento ora ingresso', err);
    }
  };
  
  // APRE I POP-UP
  const apriPopup = async (tipo) => {
    if (idStalla) {
      await fetchOperai(idStalla); // aspetta che operai sia disponibile prima di aprire popup
    }
    setPopupTipo(tipo);
    setPopupData({});
  };

  // CHIUDE I POP-UP
  const chiudiPopup = () => {
    setPopupTipo(null);
    setPopupData({}); // pulisce dati inseriti
  };

  // POP-UP : AGGIUNGI MUCCA
  const aggiungiMucca = async () => {
    if (!popupData.idOperaio) { //controlla che nuova mucca venga assegnata ad un operaio
      alert("ATTENZIONE : Per inserire una nuova mucca nel database bisogna assegnarla ad un Operaio.");
      return;
    }
    try {
      await fetch(`${SERVER_URL}/gestore-pag-mucche/aggiungi-mucca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...popupData, idStalla })
      });
      fetchMucche(); //aggiorna lista mucche 
      chiudiPopup();
    } catch (err) {
      console.error('Errore aggiunta mucca', err);
    }
  };
  
  // POP-UP : MODIFICA DATI MUCCA
  const modificaMucca = async () => {
    if (!popupData.idMucca) {  //Controlla se è stata selezionata una mucca
      alert("ATTENZIONE : Devi selezionare una mucca da modificare per poter continuare.");
      return;
    }
    // Controlla se almeno uno degli altri campi è stato modificato
    const nessunCambio =
      (!popupData.Nota || popupData.Nota.trim() === '') &&
      (!popupData.Vaccinazioni || popupData.Vaccinazioni.trim() === '') &&
      (!popupData.idOperaio || popupData.idOperaio === '');
    if (nessunCambio) {
      alert("ATTENZIONE : Non hai selezionato alcun campo da modificare .");
      return;
    }
    try {
      await fetch(`${SERVER_URL}/gestore-pag-mucche/modifica-mucca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(popupData)
      });
      fetchMucche(); // Ricarica lista mucche
      chiudiPopup();
    } catch (err) {
      console.error('Errore modifica mucca', err);
    }
  };  

  //POP-UP : ELIMINA MUCCA
  const eliminaMucca = async () => {
    if (!popupData.idMucca) { //controlla che sia stata selezionata una mucca 
      alert("ATTENZIONE: Non hai selezionato alcuna mucca da eliminare.");
      return;
    }
    try {
      await fetch(`${SERVER_URL}/gestore-pag-mucche/elimina-mucca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMucca: popupData.idMucca })
      });
      fetchMucche();// Ricarica lista mucche
      chiudiPopup();
    } catch (err) {
      console.error('Errore eliminazione mucca', err);
    }
  };

  //Copia array mucche , ordina tabella Mucche in UI in base agli operai .
  const muccheOrdinate = [...mucche].sort((a, b) => {
    const nomeA = a.NomeOperaio || '';
    const nomeB = b.NomeOperaio || '';
    return nomeA.localeCompare(nomeB);
  });

  // evidenzia parola cercata col finder
  const evidenzia = (testo) => {
    if (!parolaEvidenziata) return testo;

    const parole = parolaEvidenziata.trim().split(/\s+/).filter(p => p.length > 0);
    if (parole.length === 0) return testo;

    const regex = new RegExp(`(${parole.join('|')})`, 'gi');
    return testo.replace(regex, '<mark>$1</mark>');
  };

  righeRef.current.found = null; //pulisce riferimento alla precedente riga trovata 


  // --------------------- INTERFACCIA UTENTE ----------------------
  return (
    //BARRA SUPERIORE
    <div className="gestore-container">

      <div className="gestore-top-bar">
        <div className="gestore-sinistra">
          <span><strong>Gestore:</strong> {nomeUtente}</span>
        </div>
        <div className="gestore-destra">
          <span><strong> Ore lavorate oggi: </strong> {oreLavoro}</span>
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
    <div className="intestazione-tabella">
      <h3>Mucche presenti nella stalla a: {posizioneStalla}</h3>
      <div className="campo-ricerca">
        <form
          onSubmit={(e) => {
            e.preventDefault(); // previene il refresh della pagina
            setParolaEvidenziata(cercaTesto);
            setTimeout(() => {
              if (righeRef.current.found) {
                righeRef.current.found.scrollIntoView({ behavior: 'smooth', block: 'center' });
                righeRef.current.found = null;
              }
            }, 100);
          }}className="campo-ricerca">
          <input
            type="text"
            placeholder="Cerca in elenco"
            value={cercaTesto}
            onChange={(e) => setCercaTesto(e.target.value)}
          />
          <button type="submit">Cerca</button>
        </form>
      </div>
    </div>
    
    <div class="tabella-scroll">
      <table>
        <thead>
          <tr>
            <th>ID Bestiame</th>
            <th>Operaio</th>
            <th>Note</th>
            <th>Vaccinazioni</th>
          </tr>
        </thead>
        <tbody>
          {muccheOrdinate.map((m) => {
            const match =
              m.ID.toString().includes(parolaEvidenziata) ||
              (m.NomeOperaio || '').toLowerCase().includes(parolaEvidenziata.toLowerCase()) ||
              (m.Nota || '').toLowerCase().includes(parolaEvidenziata.toLowerCase()) ||
              (m.Vaccinazioni || '').toLowerCase().includes(parolaEvidenziata.toLowerCase());

            return(
              <tr
                key={m.ID}
                className={match && parolaEvidenziata ? 'highlight' : ''}
                ref={el => 
                  {if (match && parolaEvidenziata && !righeRef.current.found) {righeRef.current.found = el;}}
                }
              >
                <td dangerouslySetInnerHTML={{ __html: evidenzia(m.ID.toString()) }} />
                <td dangerouslySetInnerHTML={{ __html: evidenzia(m.NomeOperaio || '—') }} />
                <td dangerouslySetInnerHTML={{ __html: evidenzia(m.Nota || '') }} />
                <td dangerouslySetInnerHTML={{ __html: evidenzia(m.Vaccinazioni || '') }} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>


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
                <option value="">-- Operaio a cui affidarla --</option>
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
            < >
              <h3>Modifica Dati Mucca</h3>
              <select
                onChange={e => {
                  const id = e.target.value;
                  const mucca = mucche.find(m => m.ID == id);
                  if (mucca) {
                    setPopupData(prev => ({
                      ...prev,
                      idMucca: mucca.ID,
                      Nota: mucca.Nota || '',
                      Vaccinazioni: mucca.Vaccinazioni || '',
                      idOperaio: mucca.idOperaio ? String(mucca.idOperaio) : ''
                    }));
                  }
                }}
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
                value={popupData.Nota || ''}
                onChange={e => setPopupData({ ...popupData, Nota: e.target.value })}
              />

              <input
                type="text"
                placeholder="Nuove Vaccinazioni"
                value={popupData.Vaccinazioni || ''}
                onChange={e => setPopupData({ ...popupData, Vaccinazioni: e.target.value })}
              />

              <select
                value={popupData.idOperaio || ''}
                onChange={e => setPopupData({ ...popupData, idOperaio: e.target.value })}
              >
              <option value="">-- Affida a Operaio --</option>
              {operai.map(o => (
                <option key={o.ID} value={o.ID.toString()}>
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
