import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 

// Import delle pagine
import Accesso from './pages/Accessi&Timbri/Accesso.jsx';
import TimbraEntrata from './pages/Accessi&Timbri/TimbraEntrata.jsx';
import TimbraUscita from './pages/Accessi&Timbri/TimbraUscita.jsx';
import HomeOperaio from './pages/Operaio/HomeOperaio.jsx';
import GestorePagHome from './pages/Gestore/GestorePagHome.jsx';
import GestorePagOperai from './pages/Gestore/GestorePagOperai.jsx';
import GestorePagMucche from './pages/Gestore/GestorePagMucche.jsx';
import HomeDirettore from './pages/Direttore/HomeDirettore.jsx';
//Middleware che protegge le rotte in base al ruolo dell'utente.
import ProtectedRoute from './ProtectedRoute.jsx'; 

//COMPONENTE APP 
function App() {
  return (
    <Router>
      <Routes>  
        {/* path = URL     element = componente se si e' in quell'URL*/}
        <Route path="/" element={<Accesso />} />
        <Route path="/TimbraEntrata" element={<ProtectedRoute ruoloRichiesto={['operaio', 'gestore']}><TimbraEntrata /></ProtectedRoute>}/>
        <Route path="/TimbraUscita" element={<ProtectedRoute ruoloRichiesto={['operaio', 'gestore']}><TimbraUscita /></ProtectedRoute>}/>
        <Route path="/HomeOperaio" element={<ProtectedRoute ruoloRichiesto="operaio"><HomeOperaio /></ProtectedRoute>} />
        <Route path="/GestorePagHome" element={<ProtectedRoute ruoloRichiesto="gestore"><GestorePagHome /></ProtectedRoute>} />
        <Route path="/GestorePagOperai" element={<ProtectedRoute ruoloRichiesto="gestore"><GestorePagOperai /></ProtectedRoute>} />
        <Route path="/GestorePagMucche" element={<ProtectedRoute ruoloRichiesto="gestore"><GestorePagMucche/> </ProtectedRoute>}/>
       <Route path="/HomeDirettore" element={<ProtectedRoute ruoloRichiesto="direttore"><HomeDirettore /></ProtectedRoute>}/>
      </Routes>
    </Router>
  );
}

export default App; 
