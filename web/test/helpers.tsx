import { render } from '@testing-library/react';
import { App } from '../src/App';

/** Makes public/js/api.js use the in-memory demo store, as the GitHub Pages build does. */
export function useDemoMeta() {
  const meta = document.createElement('meta');
  meta.name = 'calm-plan-mode';
  meta.content = 'demo';
  document.head.append(meta);
}

export function renderApp() {
  window.history.replaceState(null, '', '/#today');
  return render(<App />);
}
