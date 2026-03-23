import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  validateSync,
} from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

export class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsString()
  ANTHROPIC_API_KEY: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '24h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '30d';

  @IsString()
  RUVECTOR_PATH: string;

  @IsString()
  ASSEMBLYAI_API_KEY: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => {
        const constraints = err.constraints
          ? Object.values(err.constraints).join(', ')
          : 'unknown error';
        return `${err.property}: ${constraints}`;
      })
      .join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}
