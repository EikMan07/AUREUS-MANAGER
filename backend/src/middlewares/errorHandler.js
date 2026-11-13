const HTTP_ERROR_LABELS = {
  400: {
    error: 'Solicitud incorrecta',
    fallbackMessage: 'Los datos enviados están incompletos o tienen un formato no válido.',
  },
  401: {
    error: 'Acceso no autorizado',
    fallbackMessage: 'Se requiere iniciar sesión para continuar con esta operación.',
  },
  403: {
    error: 'Acceso restringido',
    fallbackMessage: 'No cuentas con permisos suficientes para realizar esta acción.',
  },
  404: {
    error: 'Recurso no encontrado',
    fallbackMessage: 'La dirección o el registro solicitado no existe.',
  },
};

export const errorHandler = (err, req, res, next) => {
  const isJsonSyntaxError =
    err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && 'body' in err;

  const rawStatus = isJsonSyntaxError
    ? 400
    : err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  const statusCode = Number.isInteger(Number(rawStatus)) && Number(rawStatus) >= 400
    ? Number(rawStatus)
    : 500;

  const isTechnical = (str) => {
    if (!str || typeof str !== 'string') return false;
    return /\b(column|columna|relation|syntax|constraint|postgresql|postgres|sequelize|sql|base de datos|bases de datos|database|backend|frontend|servidor|server|api|endpoint|fetch|networkerror|localhost|puerto|port|stack|syntaxerror|typeerror|referenceerror|econnrefused|aplicativo|sistema|sistemas|cartera|carteras|violates|unexpected token|json at position)\b/i.test(
      str
    );
  };

  const mapped = HTTP_ERROR_LABELS[statusCode];
  const rawMessage = err.userMessage || err.message || '';

  let userMessage;
  if (mapped) {
    userMessage =
      rawMessage && !isTechnical(rawMessage) ? rawMessage : mapped.fallbackMessage;
  } else {
    userMessage =
      rawMessage && !isTechnical(rawMessage)
        ? rawMessage
        : 'Ocurrió un inconveniente al procesar la solicitud.';
  }

  const errorLabel = mapped ? mapped.error : userMessage;
  console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    ok: false,
    success: false,
    status: statusCode,
    error: errorLabel,
    userMessage,
    debugError: process.env.NODE_ENV === 'production' ? undefined : err.message,
    field: err.field || null,
  });
};

export default errorHandler;
