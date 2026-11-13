import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Routing from './routes/Routing.jsx';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routing />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
