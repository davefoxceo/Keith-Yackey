import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || 'unknown';
    const requestId = request.headers['x-request-id'] || 'no-id';
    const userId = (request as any).user?.id || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          const logMessage = `${method} ${url} ${statusCode} ${duration}ms - user:${userId} ip:${ip}`;

          if (duration > 3000) {
            this.logger.warn(`SLOW ${logMessage}`);
          } else if (statusCode >= 400) {
            this.logger.warn(logMessage);
          } else {
            this.logger.log(logMessage);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || error?.statusCode || 500;

          this.logger.error(
            `${method} ${url} ${statusCode} ${duration}ms - user:${userId} ip:${ip} error:${error?.message}`,
          );
        },
      }),
    );
  }
}
