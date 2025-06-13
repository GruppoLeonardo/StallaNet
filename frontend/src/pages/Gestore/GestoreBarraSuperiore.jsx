import { useEffect, useState } from 'react'; // gestire stati e eseguire codice al caricicamento del componente
import { useNavigate, useLocation } from 'react-router-dom'; // navigare su altre pagine 
import { calcolaTempoTrascorso } from '../../utils/utilsFrontend'; // calcolare le ore di lavoro svote
import '../../style/GestoreBarraSuperiore.css'; // stile del componente
import { SERVER_URL } from '../../config';  // recupero indirizzo URL del server

function GestoreBarraSuperiore() {
  // stati generali
  const [nomeUtente, setNomeUtente] = useState(''); // nome utente
  const [idUtente, setIdUtente] = useState(null); // id utente
  const [oraIngresso, setOraIngresso] = useState(null); // orario in cui si è timbrato in ingresso il cartellino
  const [oreLavorate, setOreLavorate] = useState('00:00'); // oraio per ore e minuti trascorsi dalla timbratura in ingresso il cartellino

  const navigate = useNavigate(); // per cambiare pagina da codice, senza ricaricare il sito
  const location = useLocation(); // per informazioni sulla pagina corrente



  //------------------------- LOGICA DI GESTOREBARRASUPERIORE.JSX --------------------------



  // Recupera i dati utente dal JWT
  useEffect(() => { 
    fetch(`${SERVER_URL}/informazioni-utente`, { credentials: 'include' }) // recupero dati del JWT tramite richiesta server
      .then(res => res.json()) // trasforma la risposta in formato json
      .then(data => { // controllo sulla risposta del backend
        if (!data.success) {
          navigate('/'); // se è stato restituito un errore (JWT assente o non valido) ritorna in Accesso.jsx
        } else {
          setNomeUtente(data.utente.NomeUtente); // avvalora nomeUtente
          setIdUtente(data.utente.ID); // avvalora idUtente
        }
      })
      .catch(err => { // se la richiesta al backend fallisce
        console.error('Errore nel recupero dati utente:', err);
        navigate('/'); // ritorna ad Accesso.jsx
      });
  }, []);

  // Recupera ora ingresso dal backend, solo se c'è un idUtente
  useEffect(() => { // dopo aver recuperato idUtente
    if (!idUtente) return; 

    const fetchOra = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/barra-superiore/orario-ingresso/${idUtente}`); //recupero di oraIngresso tramite richiesta al server
        const data = await res.json();
        setOraIngresso(data.oraIngresso || null); // avvalora con oraIngresso se presente, altrimenti null
      } catch (err) {
        console.error('Errore nel recupero ora ingresso:', err);
      }
    };

    fetchOra(); // esecuzione di fetchOra
  }, [idUtente]);

  // Aggiorna ogni minuto il contatore ore lavorate
  useEffect(() => {  // dopo aver recuperato oraIngresso
    if (!oraIngresso) return;

    const aggiorna = () => setOreLavorate(calcolaTempoTrascorso(oraIngresso)); // avvalora oreLavorate con il risultato della funzione calcolaTempoTrascorso
    aggiorna(); // eseguito subito, appena il componente è pronto

    const interval = setInterval(aggiorna, 60000); // riesegui aggiorna() ogni minuto
    return () => clearInterval(interval); // se il componente si smpnta o oraIngresso cambia
  }, [oraIngresso]);
  
  // per andare al componente TimbraUscita.jsx
  const terminaTurno = () => {
    navigate('/TimbraUscita');
  };



 //---------------------INTERFACCIA UTENTE----------------------



  return (
    <>
      {/* Informazioni utente + Termina Turno */}
      <div className="gestore-top-bar">
        <div className="gestore-sinistra">
          <span className="gestore-nome"><strong>Gestore:</strong> {nomeUtente}</span>
        </div>
        <div className="gestore-destra">
          <span className="gestore-ore"><strong>Ore lavorate oggi:</strong> {oreLavorate}</span> 
          <button className="gestore-termina-turno" onClick={terminaTurno}>Termina Turno</button> {/* Se cliccato, naviga a TimbraUscita.jsx */}
        </div>
      </div>

      {/* Bottoni di navigazione */}
      <div className="gestore-nav">
        <button
          className={location.pathname === '/GestorePagHome' ? 'attivo' : ''}
          onClick={() => navigate('/GestorePagHome')} 
        >Home</button> {/* Se cliccato, naviga a GestorePagHome.jsx */}
        <button
          className={location.pathname === '/GestorePagOperai' ? 'attivo' : ''}
          onClick={() => navigate('/GestorePagOperai')}
        >Operai</button> {/* Se cliccato, naviga a GestorePagOperai.jsx */}
        <button
          className={location.pathname === '/GestorePagMucche' ? 'attivo' : ''}
          onClick={() => navigate('/GestorePagMucche')} 
        >Mucche</button>{/* Se cliccato, naviga a GestorePagMucche.jsx */}
      </div>
    </>
  );
}

export default GestoreBarraSuperiore;
