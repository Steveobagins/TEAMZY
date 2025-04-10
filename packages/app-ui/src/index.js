//packages/platform-admin-ui/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import App from './App';
import { AuthProvider } from './contexts/AuthContext'; // We will create/copy this later
import theme from './theme'; // We will create this later
import reportWebVitals from './reportWebVitals';
// import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // Uncomment later for PWA features

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* // Auth context wraps everything */}
        <ThemeProvider theme={theme}>
          <CssBaseline /> {/* // Normalizes CSS and applies background color from theme */}
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
// serviceWorkerRegistration.unregister(); // Keep unregistered for now

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();