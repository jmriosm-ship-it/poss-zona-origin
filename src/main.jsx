import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Visor from './componentes/Visor.jsx'
import './estilos.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Visor />
  </StrictMode>,
)
