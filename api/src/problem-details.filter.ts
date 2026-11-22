import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AccountConflictError,
  AccountNotFoundError,
  InvalidAccountError,
} from './accounts/domain/errors.js';

/** RFC 9457. Transport-only mapping; never exposes unexpected exception details. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let detail = 'Ocurrió un error inesperado.';
    if (
      error instanceof InvalidAccountError ||
      error instanceof AccountNotFoundError ||
      error instanceof AccountConflictError
    ) {
      status =
        error instanceof InvalidAccountError
          ? 400
          : error instanceof AccountNotFoundError
            ? 404
            : 409;
      code = error.code;
      detail = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      code = `HTTP_${status}`;
      const body = error.getResponse();
      const message: unknown =
        typeof body === 'object' && body !== null && 'message' in body
          ? body.message
          : body;
      detail = Array.isArray(message)
        ? message.join('; ')
        : typeof message === 'string'
          ? message
          : error.message;
    } else {
      this.logger.error(error instanceof Error ? error.stack : 'Unknown error');
    }
    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: `urn:accounting:problem:${code.toLowerCase().replaceAll('_', '-')}`,
        title: HttpStatus[status]?.replaceAll('_', ' ') ?? 'Error',
        status,
        detail,
        instance: request.originalUrl,
        code,
      });
  }
}
