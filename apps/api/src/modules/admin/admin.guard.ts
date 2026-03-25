import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { DataStore } from '../learning/data-store.service';
import { JwtAuthGuard } from '../auth/auth.guard';

interface StoredUser {
  id: string;
  email: string;
  role?: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly dataStore: DataStore) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required');
    }

    const storedUser = this.dataStore.get<StoredUser>('users', user.id);
    if (!storedUser || storedUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

/**
 * Composite decorator that applies both JwtAuthGuard and AdminGuard.
 * Use on controller methods or classes to require admin access.
 */
export function Admin() {
  return applyDecorators(UseGuards(JwtAuthGuard, AdminGuard));
}
