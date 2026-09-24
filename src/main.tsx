import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installSpotlight } from './lib/spotlight';

const root = document.getElementById('root');
if (!root) throw new Error('Fandt ikke #root');

installSpotlight();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
