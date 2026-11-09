import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', margin: '0 0 12px 0', color: '#EF4444' }}>404</h1>
      <p style={{ fontSize: '18px', margin: '0 0 24px 0', color: '#94A3B8' }}>Página no encontrada</p>
      <Link
        to="/"
        style={{
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          padding: '10px 20px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '14px'
        }}
      >
        Volver al Inicio
      </Link>
    </div>
  );
}

export default NotFoundPage;

