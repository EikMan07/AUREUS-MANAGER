import React from 'react';
import { HttpErrorPage } from '../Errors/HttpErrorPage';

export function NotFoundPage() {
  return <HttpErrorPage code={404} />;
}

export default NotFoundPage;
