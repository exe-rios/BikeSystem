/** Error base operacional con código de estado HTTP y detalles adicionales. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: string | string[] | undefined;

  constructor(message: string, statusCode = 500, details?: string | string[] | undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Error HTTP 400 para peticiones con sintaxis o datos inválidos. */
export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta', details?: string | string[] | undefined) {
    super(message, 400, details);
  }
}

/** Error HTTP 401 para solicitudes sin autenticación válida. */
export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado. Se requiere inicio de sesión') {
    super(message, 401);
  }
}

/** Error HTTP 403 para usuarios autenticados sin permisos suficientes. */
export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado. Permisos insuficientes') {
    super(message, 403);
  }
}

/** Error HTTP 404 para recursos no encontrados en el sistema. */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

/** Error HTTP 409 para conflictos de estado o registros duplicados. */
export class ConflictError extends AppError {
  constructor(message = 'Conflicto en la operación. El registro ya existe') {
    super(message, 409);
  }
}
