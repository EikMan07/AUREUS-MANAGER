export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  const isTechnical = (str) => {
    if (!str || typeof str !== 'string') return false;
    const lower = str.toLowerCase();
    return (
      lower.includes('column') ||
      lower.includes('columna') ||
      lower.includes('relation') ||
      lower.includes('syntax') ||
      lower.includes('constraint') ||
      lower.includes('postgresql') ||
      lower.includes('sequelize') ||
      lower.includes('violates')
    );
  };

  const rawMessage = err.userMessage || err.message || 'Error interno del servidor';
  const userMessage = !isTechnical(rawMessage)
    ? rawMessage
    : 'Ocurrió un error al procesar la solicitud en el servidor.';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    error: userMessage,
    userMessage,
    debugError: process.env.NODE_ENV === 'production' ? undefined : err.message,
    field: err.field || null
  });
};

export default errorHandler;

