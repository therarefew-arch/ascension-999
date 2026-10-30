import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startGame } from './core/store';
import { captureInvite } from './core/family';
import { App } from './ui/App';
import './ui/styles.css';

captureInvite(); // 👪 opened from a family invite link?
startGame();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
