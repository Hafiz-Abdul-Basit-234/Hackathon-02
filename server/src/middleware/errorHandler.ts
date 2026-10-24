import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error('API Error:', err);

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues,
    });
  }

  const errObj = err as { code?: number; name?: string; message?: string; statusCode?: number };

  // MongoDB duplicate key error
  if (errObj.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique identifier (e.g., code, email, date) already exists.',
    });
  }

  // CastError (invalid ObjectId)
  if (errObj.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID format.',
    });
  }

  const status = errObj.statusCode || 500;
  const message = errObj.message || 'An unexpected internal server error occurred.';

  res.status(status).json({
    success: false,
    message,
  });
}
