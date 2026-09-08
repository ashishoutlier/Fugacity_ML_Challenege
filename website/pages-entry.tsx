import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-serif/400.css';
import '@fontsource/ibm-plex-serif/400-italic.css';
import './app/globals.css';
import Home from './app/page';

const root = document.getElementById('root');
if (!root) throw new Error('The website root element is missing');
createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
