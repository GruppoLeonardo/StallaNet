import { useEffect, useState } from 'react'; // useEffect : far girare codice secondario, useState : uso di stato locale. 
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../config';
import '../../style/GestorePagHome.css';
import GestoreBarraSuperiore from './GestoreBarraSuperiore';

function GestorePagHome() {
  //Stati locali
  const [idUtente, setIdUtente] = useState(null);
  const [comunicazioni, setComunicazioni] = useState([]);
  const [contatti, setContatti] = useState([]);
  const [filtro, setFiltro] = useState('fornitore');

  const navigate = useNavigate();

  //---------------------------------------LOGICA-------------------------------------------

  //VALIDAZIONE DEL TOKEN
  useEffect(() => {
    fetch(`${SERVER_URL}/informazioni-utente`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        //Controllo : Se token non valido o non e' un gestore , si redirect ad Accesso
        if (!data.success || data.utente.Ruolo !== 'gestore') {
          navigate('/'); 
        } else {
          setIdUtente(data.utente.ID); //salva dati utente 
        }
      })
      .catch(() => navigate('/'));
  }, []);

  //AGGIORNAMENTO DATI ogni 5 secondi.
  useEffect(() => {
    if (!idUtente) return; // se idUtente non disponibile salta l'Effect
    fetchData(); // carica dati
    const intervallo = setInterval(fetchData, 5000);
    return () => clearInterval(intervallo);
  }, [idUtente, filtro]); //ogni volta che cambia idUtente o il filtro

  //CARICAMENTO DEI DATI
  const fetchData = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/gestore-pag-home/${idUtente}?ruoloPartner=${filtro}`);
      const data = await res.json();
      //Aggiorna Comunicazioni e Partner
      setComunicazioni(data.comunicazioni); 
      setContatti(data.contatti);
    } catch (err) {
      console.error('Errore nel caricamento dati gestore', err);
    }
  };

  //SPUNTE SU TABELLE COMUNICAZIONE (sincronizza tabella e DB)
  const aggiornaLettura = async (idComunicazione, statoAttuale) => {
    const nuovoStato = statoAttuale === 1 ? 0 : 1; //invertitore
    try {
      await fetch(`${SERVER_URL}/gestore-pag-home/aggiorna-lettura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idComunicazione, nuovoStato })
      });
      fetchData(); // ricarica i dati aggiornati
    } catch (err) {
      console.error('Errore aggiornamento lettura', err);
    }
  };

  //--------------------------------------INTERFACCIA UTENTE ----------------------------------------
  return (  
    // BARRA SUPERIORE
    <div className="gestore-container">
      <div><GestoreBarraSuperiore /></div>

      {/*TABELLA COMUNICAZIONI*/}
      <h3>Comunicazioni</h3>
      <div className="tabella-scroll">
        <table>
          <thead>
            <tr><th>Messaggio</th><th>Letta</th></tr>
          </thead>
          <tbody>
            {comunicazioni.map(c => (
              <tr key={c.ID}>
                <td>{c.Testo}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={c.Stato === 1}
                    onChange={() => aggiornaLettura(c.ID, c.Stato)} // se si spunta aggiorna il DB
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*LISTA DEI PARTNER COMMERCIALI*/}
      <h3>Lista Contatti</h3>
      <div className="gestore-filtri">
        <button
          onClick={() => setFiltro('fornitore')} //aggiorna filtro
          className={filtro === 'fornitore' ? 'attivo' : ''} // si aggiorna il css , se selezionato applica "attivo"
        >Fornitori</button>
        <button
          onClick={() => setFiltro('veterinario')} //aggiorna filtro
          className={filtro === 'veterinario' ? 'attivo' : ''}// si aggiorna il css , se selezionato applica "attivo"
        >Sanitari</button>
      </div>
      <div className="tabella-scroll">
        <table>
          <thead>
            <tr><th>Nome</th><th>Descrizione</th><th>Telefono</th><th>Invia Mail</th></tr>
          </thead>
          <tbody>
            {contatti.map(c => (
              <tr key={c.ID}>
                <td>{c.Nominativo}</td>
                <td>{c.Descrizione}</td>
                <td>{c.Telefono}</td>
                <td>
                  <a
                    //Precompilatore di email
                    href={`mailto:${c.Email}?subject=MAIL LAVORATIVA&body=Salve ${c.Nominativo},`}
                    style={{ textDecoration: 'none' }}
                  >
                    <button className="emoji-email">📩</button>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GestorePagHome;
