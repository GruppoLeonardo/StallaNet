import React, { useEffect, useState } from 'react';//hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom'; //hook per navigazione tra pagine
import '../../style/HomeDirettore.css'; 
import { SERVER_URL } from '../../config';



function HomeDirettore() {
  //Dati utente
  const nomeUtente = localStorage.getItem('nomeUtente'); // localstorage.
  const idUtente = localStorage.getItem('idUtente'); //localstorage.
  //Principali
  const [statoAzienda, setStatoAzienda] = useState({}); // riepilogo intera azienda.
  const [stalle, setStalle] = useState([]); // lista stalle.
  const [messaggi, setMessaggi] = useState({}); // messaggi ai gestori.

  const navigate = useNavigate();

  //Parte a ogni caricamento e poi ogni 5 secondi 
  useEffect(() => { 
    fetchStatoAzienda(); //carica dati azienda.
    fetchStalle(); // carica dati stalle.
    const interval = setInterval(() => {
      fetchStatoAzienda();
      fetchStalle();
    }, 5000); // ogni 5 secondi
    return () => clearInterval(interval); // ferma interval quando si cambia pagina
  }, []);

  //Carica stato azienda
  const fetchStatoAzienda = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-direttore/stato-azienda`);
      const data = await res.json();
      setStatoAzienda(data); 
    } catch (err) {
      console.error('Errore caricamento stato azienda', err);
    }
  };

  //Carica lista delle stalle
  const fetchStalle = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/home-direttore/singole-stalle`);
      const data = await res.json();
      setStalle(data);
    } catch (err) {
      console.error('Errore caricamento stalle', err);
    }
  };

  //Inviare messaggio al gestore di una certa stalla
  const inviaMessaggio = async (idGestore, testo) => {
    if (!testo || testo.trim() === '') { //controlla che campo non sia vuoto 
      alert('Non e\' stato scritto nessun messaggio da inviare.');
      return;
    }
    try {
      await fetch(`${SERVER_URL}/home-direttore/invia-comunicazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idMittente: idUtente,
          idDestinatario: idGestore,
          testo: testo.trim()
        })
      });
      alert('Messaggio inviato!');
      setMessaggi(prev => ({ ...prev, [idGestore]: '' }));
    } catch (err) {
      console.error('Errore invio messaggio', err);
      alert("Errore durante l'invio del messaggio.");
    }
  };


// -------------------- INTERFACCIA UTENTE ---------------------
  return (
    <div className="direttore-container">
      {/* Barra superiore */}
      <div className="direttore-top-bar">
        <div className="direttore-benvenuto">
          <span><strong>Benvenuto Direttore:</strong> {nomeUtente}</span>
        </div>
        <button className="direttore-esci" onClick={() => navigate('/')}> Esci </button>
      </div>

      {/* Corpo */}
      <div className="direttore-body">
        {/* Stato Azienda (Sinistra) */}
        <div className="direttore-sinistra">
          <h2>Stato Azienda:</h2>
          <ul>
            <li>🥛 Produzione odierna latte: {statoAzienda.latte || 0} litri</li>
            <li>🌾 Consumo mangime odierno: {statoAzienda.mangime || 0} kg</li>
            <li>🧹 Grado di pulizia ambienti: {statoAzienda.pulizia || 0}%</li>
            <li>💶 Costo odierno manodopera: {statoAzienda.costo || 0} €</li>
            <li>👷🏻‍♂️ Operai: {statoAzienda.operai || 0}</li>
            <li>👨🏻‍💼 Gestori: {statoAzienda.gestori || 0}</li>
            <li>🐄 Capi di Bestiame: {statoAzienda.bestie || 0}</li>
          </ul>
        </div>

        {/* Singole Unità Produttive (Destra) */}
          <div className="direttore-destra">
        <h2>Singole Unità Produttive:</h2>
        <div className="stalle-scroll">
          {stalle.map((stalla) => (
            <div key={stalla.idStalla} className="stalla-card">
              <h3>Stalla ID: {stalla.idStalla}</h3>
              <p>Gestore: {stalla.nomeGestore}</p>
              <p>Operai: {stalla.numOperai}</p>
              <p>Mucche: {stalla.numMucche}</p>
              <div className="barre-stalla"> {/* Barre di progresso */}
                <label>Mungitura: {stalla.mungitura}%</label>
                <progress value={stalla.mungitura} max="100"></progress>
                <label>Pulizia: {stalla.pulizia}%</label>
                <progress value={stalla.pulizia} max="100"></progress>
                <label>Alimentazione: {stalla.alimentazione}%</label>
                <progress value={stalla.alimentazione} max="100"></progress>
              </div>  
              <div className="comunica-gestore"> {/* Invio di messaggi ai gestori */}
                <textarea
                placeholder="Comunica al Gestore"
                value={messaggi[stalla.idGestore] || ''}
                onChange={(e) =>
                setMessaggi(prev => ({ ...prev, [stalla.idGestore]: e.target.value }))}/>
                <button
                  onClick={() => inviaMessaggio(stalla.idGestore, messaggi[stalla.idGestore])}
                > Invia </button>


              </div>
              </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

export default HomeDirettore;
