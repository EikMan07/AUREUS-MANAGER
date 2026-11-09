import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import Routing from './routes/Routing.jsx';

export function App() {
  return (
    <AuthProvider>
      <Routing />
    </AuthProvider>
  );
}

export default App;
