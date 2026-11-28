import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/nunito';
import App from './App';
import './styles.css';
import { registerServiceWorker } from './offline/register';
import { loadLocale } from '../i18n/index.js';
import { currentLang } from './lang-state';

registerServiceWorker();

function render(): void {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

// The child's language comes in its own file; wait for it so the first screen is already in that language.
loadLocale(currentLang()).then(render, render);
