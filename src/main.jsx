import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// --- PATCH TACTILE POUR L'ORGANIGRAMME ---
import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css"; // Pour l'effet visuel sous le doigt

polyfill({
  dragImageCenterOnTouch: true
});

// Force Safari (iPad/iPhone) à autoriser le glissement
window.addEventListener('touchmove', function() {}, {passive: false});
// -----------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
