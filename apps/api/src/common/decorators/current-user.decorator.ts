import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user from the request object.
 * The user is attached by the JwtAuthGuard after token verification.
 *
 * Usage:
 *   @CurrentUser() user           - returns the full user object { id, email }
 *   @CurrentUser('id') userId     - returns just the user ID
 *   @CurrentUser('email') email   - returns just the email
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
