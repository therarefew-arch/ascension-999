import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startGame } from './core/store';
import { App } from './ui/App';
import './ui/styles.css';

startGame();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
