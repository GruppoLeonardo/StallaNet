import React, { useEffect, useState } from 'react';//hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom';//hook per navigare fra le pagine 
import '../../style/GestorePagHome.css';
import { SERVER_URL } from '../../config';
import { calcolaTempoTrascorso } from '../../utils/utilsFrontend';




       
function GestorePagHome() { 
  //Stati utente 
  const idUtente = localStorage.getItem('idUtente'); // prende dati dal browser
  const nomeUtente = localStorage.getItem('nomeUtente'); 
  
  const [oraIngresso, setOraIngresso] = useState(null);
  const [oreLavoro, setOreLavoro] = useState(0);
  const [comunicazioni, setComunicazioni] = useState([]);
  const [contatti, setContatti] = useState([]);
  const [filtro, setFiltro] = useState('fornitore'); 

  const navigate = useNavigate(); // per navigare senza refreshare le pag 

  useEffect(() => {
    const aggiornaDati = () => {
      fetchData();
    };

    aggiornaDati(); // subito
    const intervallo = setInterval(aggiornaDati, 5000); // ogni 5 secondi

    return () => clearInterval(intervallo);
  }, [filtro]);



  useEffect(() => {
    if (!oraIngresso) return;

    const aggiornaOre = () => {
      const tempo = calcolaTempoTrascorso(oraIngresso);
      setOreLavoro(tempo);
    };

    aggiornaOre(); // subito
    const timer = setInterval(aggiornaOre, 60000); // ogni minuto

    return () => clearInterval(timer);
  }, [oraIngresso]);





//-------------------- LOGICA DI GESTOREPAGHOME ----------------------
  // Carica da server i dati da mostrare (ore di lavoro svolte , comunicazioni , partner)
 const fetchData = async () => {
  try {
    const res = await fetch(`${SERVER_URL}/gestore-pag-home/${idUtente}?ruoloPartner=${filtro}`);
    const data = await res.json();

    setOraIngresso(data.oraIngresso || null); // ← nuovo
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
      await fetch(`${SERVER_URL}/gestore-pag-home/aggiorna-lettura`, {
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