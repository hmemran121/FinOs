import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';

jeepSqlite(window);

const rootElement = document.getElementById('root');
console.log("Mounting React App...");
if (!rootElement) throw new Error("No root");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
