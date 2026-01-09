import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse, ErrorCode } from '../response';

/**
 * Middleware de validación con Zod
 * Valida el body, query o params según el schema proporcionado
 */
export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar body si existe schema
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validar query si existe schema
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validar params si existe schema
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatear errores de Zod
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json(
          errorResponse(ErrorCode.VALIDATION_ERROR, `Error de validación: ${errors[0].message}`)
        );
      }

      next(error);
    }
  };
}

