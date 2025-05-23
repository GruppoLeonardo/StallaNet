import React, { useEffect, useState } from 'react'; //hook useState = gestire il local state reattivo , useEffect = far girare codice secondario
import { useNavigate } from 'react-router-dom'; //hook per navigare fra le pagine 
import '../../style/TimbraUscita.css'; 



function TimbraUscita() {
  const nomeUtente = localStorage.getItem('nomeUtente');
  const idUtente = localStorage.getItem('idUtente'); // prende dati da browser
  const [oreLavoro, setOreLavoro] = useState(0); 
  const navigate = useNavigate();

  // Recupera ore di lavoro svolte 
  useEffect(() => {
    const fetchOre = async () => {
      try {
        const res = await fetch(`http://localhost:3001/ore-lavoro/${idUtente}`);
        const data = await res.json();
        setOreLavoro(data.oreLavoro);
      } catch (err) {
        console.error('Errore nel recupero ore di lavoro', err);
      }
    };
    fetchOre();
  } , [idUtente] );

  //-------------------- LOGICA DI TIMBRATURA ----------------------
  const terminaTurno = async () => {
    try {
      const res = await fetch('http://localhost:3001/timbra-uscita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUtente })
      });
      const data = await res.json();

      if (data.success) {
        navigate('/');
      } else {
        alert('Errore durante la timbratura di uscita');
      }
    } catch (err) {
      console.error('Errore timbratura uscita', err);
    }
  };


  // -------------------- INTERFACCIA UTENTE ---------------------
  return (
    <div className="uscita-container" style={{ padding: '20px' }}>
      <h2>{nomeUtente}, hai lavorato per {oreLavoro} ore.</h2>
      <p>Desideri terminare il turno di lavoro?</p>
      <button onClick={terminaTurno}>SI</button>
      <button onClick={() => navigate(-1)}>NO</button>
    </div>
  );
}

export default TimbraUscita;
