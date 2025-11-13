import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import checklistDoc from '../docs/GCP_OAUTH_CHECKLIST.md?raw';

console.log('See docs/GCP_OAUTH_CHECKLIST.md if OAuth fails.');
console.log(checklistDoc.trim());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
