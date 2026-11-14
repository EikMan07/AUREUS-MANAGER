import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AccessibilityProvider } from './context/AccessibilityContext.jsx';
import Routing from './routes/Routing.jsx';

export function App() {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <Routing />
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

export default App;
