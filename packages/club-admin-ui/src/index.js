// Canvas: packages/club-admin-ui/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Keep your base global styles if any
import App from './App';
import reportWebVitals from './reportWebVitals';

import { ThemeProvider } from '@mui/material/styles'; // <-- Import ThemeProvider
import CssBaseline from '@mui/material/CssBaseline'; // <-- Import CssBaseline
import theme from './theme'; // <-- Import your custom theme

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Wrap the App with MUI ThemeProvider and CssBaseline */}
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normalizes CSS and applies background color */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();