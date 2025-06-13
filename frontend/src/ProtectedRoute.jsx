//Middleware per la protezione delle rotte (controlla che utente sia autenticato da token e che abbia il ruolo corretto.)

import { useEffect, useState } from 'react'; //useEffect = far girare codice secondario , useState = stati locali
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from './config'; 

//Wrapper : riceve contenuto da visualizzare (children) solo se ruolo e' corretto
function ProtectedRoute({ children, ruoloRichiesto }) { 
  //Navigazione e Stato
  const navigate = useNavigate();
  const [autorizzato, setAutorizzato] = useState(null);

  //VALIDAZIONE DEL TOKEN E DEL RUOLO
  useEffect(() => {
    const controllaToken = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/informazioni-utente`, {
          credentials: 'include'
        });
        const data = await res.json();
        //Controllo : se token assente o Ruolo sbagliato rimanda a Accesso.
        if (!data.success || !data.utente?.Ruolo) {
          navigate('/');
          return;
        }
        const ruoloUtente = data.utente.Ruolo;
        //Controlla se RuoloUtente e' nella lista
        const match = Array.isArray(ruoloRichiesto)
          ? ruoloRichiesto.includes(ruoloUtente)
          : ruoloUtente === ruoloRichiesto;
        if (match) {
          setAutorizzato(true); // se SI : autorizzato
        } else {
          navigate('/'); //se NO : redirecta a Accesso
        }
      } catch (err) {
        console.error('Errore ProtectedRoute', err);
        navigate('/');
      }
    };

    controllaToken();
  }, [navigate, ruoloRichiesto]);

  if (autorizzato === null) return null; // Se autorizzato e' null -> fa niente 
  if (autorizzato === true) return children; //Se autorizzato e' true -> renderizza il children 
  return null;
}

export default ProtectedRoute;
