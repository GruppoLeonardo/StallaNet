import React, { useEffect, useState } from 'react';//hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom';//hook per navigare fra le pagine 
import '../../style/GestorePagHome.css';
import { useLocation } from 'react-router-dom'; //          



//    da controlallare se utilizzato useLocation



function GestorePagHome() { 
  //variabili di stato 
  const idUtente = localStorage.getItem('idUtente'); // prende dati dal browser
  const nomeUtente = localStorage.getItem('nomeUtente'); 
  const [oreLavoro, setOreLavoro] = useState(0);
  const [comunicazioni, setComunicazioni] = useState([]);
  const [contatti, setContatti] = useState([]);
  const [filtro, setFiltro] = useState('fornitore'); 

  const navigate = useNavigate(); // per navigare senza refreshare le pag 

  //Carica dati per ottenere le ore lavorate da mostrare in UI.
  useEffect(() => { 
    const fetchEImposta = () => { //eseguito subito per caricare dati in IU 
      fetchData();
    };

    fetchEImposta(); // esegui subito al caricamento pagina 
    const intervalloMinuti = setInterval(fetchEImposta, 60000); // aggiorna ogni minuto
    return () => clearInterval(intervalloMinuti);
  }, []);

  //Carica i dati ogni volta che si cambia filtro ( Fornitori/Sanitari )
  useEffect(() => {
    fetchData(); 
  }, [filtro]);// ogni volta che cambia filtro



//-------------------- LOGICA DI GESTOREPAGHOME ----------------------
  // Carica da server i dati da mostrare (ore di lavoro svolte , comunicazioni , partner)
  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/home-gestore/${idUtente}?ruoloPartner=${filtro}`);
      const data = await res.json(); // carica dati da json
      setOreLavoro(data.oreLavoro);
      setComunicazioni(data.comunicazioni);
      setContatti(data.contatti);
    } catch (err) {
      console.error('Errore nel caricamento dati gestore', err);
    }
  };

  // Aggiorne le Comunicazioni (cambia le spunte in tabella)
  const aggiornaLettura = async (idComunicazione, statoAttuale) => {
    const nuovoStato = statoAttuale === 1 ? 0 : 1; // invertirore 
    try {
      await fetch('http://localhost:3001/aggiorna-lettura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idComunicazione, nuovoStato })
      });
      fetchData();
    } catch (err) {
      console.error('Errore aggiornamento lettura', err);
    } 
  };


// ------------- INTERFACCIA UTENTE -------------
  return (
    <div className="gestore-container">

      {/* BARRA SUPERIORE */}
      <div className="gestore-top-bar">
        <div className="gestore-sinistra">
          <span className="gestore-nome"><strong>Gestore:</strong> {nomeUtente}</span>
        </div>

        <div className="gestore-destra">
          <span className="gestore-ore">  
            <strong>Ore lavorate oggi:</strong> {oreLavoro} 
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

      {/* COMUNICAZIONI */}
      <h3>Comunicazioni</h3>
      <div class="tabella-scroll">
      <table>
        <thead>
          <tr>
            <th>Messaggio</th>
            <th>Letta</th>
          </tr>
        </thead>
        <tbody>
          {comunicazioni.map(c => (
            <tr key={c.ID}>
              <td>{c.Testo}</td>
              <td>
                <input type="checkbox" checked={c.Stato === 1} onChange={() => aggiornaLettura(c.ID, c.Stato)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* LISTA CONTATTI */}
      <h3>Lista Contatti</h3>
      <div className="gestore-filtri">
        <button onClick={() => setFiltro('fornitore')} className={filtro === 'fornitore' ? 'attivo' : ''}> Fornitori </button>
        <button onClick={() => setFiltro('veterinario')} className={filtro === 'veterinario' ? 'attivo' : ''}> Sanitari </button>
      </div>
      <div class="tabella-scroll">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrizione</th>
            <th>Telefono</th>
            <th>Invia Mail</th>
          </tr>
        </thead>
        <tbody>
          {contatti.map(c => (
            <tr key={c.ID}>
              <td>{c.Nominativo}</td>
              <td>{c.Descrizione}</td>
              <td>{c.Telefono}</td>
              <td>
                <a
                  href={`mailto:${c.Email}?subject=MAIL LAVORATIVA&body=Salve ${c.Nominativo},`} // precompila l'email da mandare
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