import React from 'react'; // Dipendenze React 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; /* Gestisce il routing  
Router = gestisce URL / Routes = tutte le route / Route = Singola Route */ 

// Import delle pagine
import Accesso from './pages/Accessi&Timbri/Accesso.jsx';
import TimbraEntrata from './pages/Accessi&Timbri/TimbraEntrata.jsx';
import TimbraUscita from './pages/Accessi&Timbri/TimbraUscita.jsx';
import HomeOperaio from './pages/Operaio/HomeOperaio.jsx';
import GestorePagHome from './pages/Gestore/GestorePagHome.jsx';
import GestorePagOperai from './pages/Gestore/GestorePagOperai.jsx';
import GestorePagMucche from './pages/Gestore/GestorePagMucche.jsx';
import HomeDirettore from './pages/Direttore/HomeDirettore.jsx';



//COMPONENTE APP 
function App() {
  return (
    <Router>
      <Routes>
        {/* path = URL     element = componente se si e' in quell'URL*/}
        <Route path="/" element={<Accesso />} />
        <Route path="/TimbraEntrata" element={<TimbraEntrata />} />
        <Route path="/TimbraUscita" element={<TimbraUscita />} />
        <Route path="/HomeOperaio" element={<HomeOperaio />} />
        <Route path="/GestorePagHome" element={<GestorePagHome />} />
        <Route path="/GestorePagOperai" element={<GestorePagOperai />} />
        <Route path="/GestorePagMucche" element={<GestorePagMucche />} />
        <Route path="/HomeDirettore" element={<HomeDirettore />} />
      </Routes>
    </Router>
  );
}

export default App; // Altri file possono importare App 
