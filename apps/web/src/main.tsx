import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Única fuente de estilos: tokens.css → components.css (rc-*) → layout.css (páginas del prototipo).
import '@red-clinica/design-system';
import { App } from './app/App';
import { SesionProvider } from './app/sesion';
import { ToastProvider } from './layout/Toasts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SesionProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SesionProvider>
    </BrowserRouter>
  </StrictMode>,
);
