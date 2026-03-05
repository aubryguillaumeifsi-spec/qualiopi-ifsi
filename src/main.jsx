import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// --- PATCH TACTILE POUR L'ORGANIGRAMME ---
// Le polyfill permet au Drag & Drop HTML5 de fonctionner sur les écrans tactiles (iPad, etc.)
import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css"; // Effet visuel sous le doigt

polyfill({
  dragImageCenterOnTouch: true
});

// ⚠️ La ligne window.addEventListener('touchmove', ...) a été volontairement supprimée 
// pour réparer le bug de défilement sur mobile signalé lors de l'audit.
// -----------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
