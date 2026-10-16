import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, restoreTheme } from 'pelagic/core/theme';
import 'pelagic/style.css';
import './styles.css';
import { App } from './App';
import { DEFAULT_PRESET, applyBrand, loadBrand } from './theme';

// Restore the saved theme and brand colour before the first render (no flash).
// First visit: the calm Lagoon colour theme.
if (!restoreTheme()) applyTheme({ preset: DEFAULT_PRESET });
applyBrand(loadBrand());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
