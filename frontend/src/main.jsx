import { StrictMode } from 'react' // Di React , Per scrivere codice compliant  
import { createRoot } from 'react-dom/client' // Crea Root dell'App 
import './index.css'
import App from './App.jsx' 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
