import React from 'react';
import { createRoot } from 'react-dom/client';
import TrustLayerAI from './TrustLayerAI.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TrustLayerAI />
  </React.StrictMode>,
);
