import { useEffect, useState } from 'react'; //useEffect = fa girare del codice secondario , useState = uso di stati locali
import { useNavigate } from 'react-router-dom';
import '../../style/TimbraUscita.css';
import { SERVER_URL } from '../../config';

function TimbraUscita() { 
  // Stati locali
  const [oreLavoro, setOreLavoro] = useState('00:00'); 
  const [nomeUtente, setNomeUtente] = useState('');
  const navigate = useNavigate();

  //------------------------------------------LOGICA------------------------------------------------------------------
  
  // CARICA NOME UTENTE E ORE LAVORATE (eseguito solo una volta)
  useEffect(() => {
    const fetchDati = async () => {
      try {
        // Carica ore lavorate 
        const resOre = await fetch(`${SERVER_URL}/timbra-uscita/ore-lavorate`, {
          credentials: 'include'
        });
        const datiOre = await resOre.json();
        setOreLavoro(datiOre.oreLavoro); //salva
        // Carica nome utente dal token
        const resUtente = await fetch(`${SERVER_URL}/informazioni-utente`, {
          credentials: 'include'
        });
        const datiUtente = await resUtente.json();
          //Se token e' valido salva il nomeUtente (per mostrarlo in UI)
          if (datiUtente.success) {
            setNomeUtente(datiUtente.utente.NomeUtente);
          } else {
            navigate('/'); // token invalido rimanda a Accesso.
          }
      } catch (err) {
        console.error('Errore nel recupero dei dati utente', err);
        navigate('/');
      }
    };

    fetchDati();
  }, []);

  // TIMBRA ORARIO DI USCITA IN CARTELLINO  
  const terminaTurno = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/timbra-uscita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      //Se si timbra uscita elimina i cookie 
      if (data.success) {
        await fetch(`${SERVER_URL}/logout`, {
          method: 'POST',
          credentials: 'include'
        });
        // e redirecta a Accesso
        navigate('/');
      } else {
        alert('Errore durante la timbratura di uscita');
      }
    } catch (err) {
      console.error('Errore timbratura uscita', err);
      alert('Errore di rete durante la timbratura');
    }
  };

  // ------------------------------------------INTERFACCIA UTENTE ------------------------------------------------------
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
