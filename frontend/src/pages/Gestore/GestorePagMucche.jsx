import { useEffect, useState , useRef} from 'react';//useEffect = far girare codice secondario , useState = local state reattivo , useRef = creare riferimento persistente a un valore che non rerenderizza la pagina quando cambia
import { useNavigate } from 'react-router-dom';//Per navigare fra le pagine 
import '../../style/GestorePagMucche.css';
import { SERVER_URL } from '../../config';

import GestoreBarraSuperiore from './GestoreBarraSuperiore';

function GestorePagMucche() { 
  //Dati Utente
  const [idUtente, setIdUtente] = useState(null);
  //Stati principali della pagina
  const [mucche, setMucche] = useState([]);
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
  const righeRef = useRef({}); //salvare la ricerca anche se si ricarica la pagina

  const navigate = useNavigate(); 

  //-----------------------------------------LOGICA--------------------------------------------------------------------

  //VALIDAZIONE TOKEN
  useEffect(() => {
  const caricaUtente = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/informazioni-utente`, {
        credentials: 'include'
      });
      const data = await res.json();
      //Controllo : Se token non valido e non e' un gestore redirecta a Accesso
      if (!data.success || data.utente.Ruolo !== 'gestore') {
        navigate('/'); 
      } else {
        setIdUtente(data.utente.ID); //salva dati utente
      }
    } catch (err) {
      console.error('Errore nel recupero utente', err);
      navigate('/');
    }
  };
  caricaUtente();
  }, []);
  
  //AGGIORNA LISTA DELLE MUCCHE OGNI 5 SECONDI 
  useEffect(() => {
    if (!idUtente) return; // se idUtente non dispo interrompe Effect
    fetchMucche();  // carica le mucche 
    const interval = setInterval(() => {fetchMucche();}, 5000); // poi lo fa ogni 5 secondi 
    return () => clearInterval(interval);
  }, [idUtente]);


  // CARICA TUTTE LE MUCCHE PRESENTI IN QUESTA STALLA
  const fetchMucche = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-mucche/mucche-in-stalla/${idUtente}`);
      const data = await res.json(); 
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

  // CARICA TUTTI GLI OPERAI CHE LAVORANO IN QUESTA STALLA
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
  
  //-------------------------------------------POP UP-------------------------------------------------------------------

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

  //COPIA ARRAY MUCCHE E LE ORDINA IN BASE AGLI OPERAI 
  const muccheOrdinate = [...mucche].sort((a, b) => {
    const nomeA = a.NomeOperaio || '';
    const nomeB = b.NomeOperaio || '';
    return nomeA.localeCompare(nomeB);
  });

  //EVIDENZIA PAROLA CERCATA COL FINDER
  const evidenzia = (testo) => {
    if (!parolaEvidenziata) return testo;

    const parole = parolaEvidenziata.trim().split(/\s+/).filter(p => p.length > 0);
    if (parole.length === 0) return testo;

    const regex = new RegExp(`(${parole.join('|')})`, 'gi');
    return testo.replace(regex, '<mark>$1</mark>');
  };
  righeRef.current.found = null; //pulisce riferimento alla precedente riga trovata 


  // ------------------------------------- INTERFACCIA UTENTE ---------------------------------------------------------
  return (
    <div className="gestore-container">
        
      {/*BARRA SUPERIORE*/}
      <div>
        <GestoreBarraSuperiore />
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
