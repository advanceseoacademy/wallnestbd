import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getIronSession } from 'iron-session';

// Keep in sync with lib/session.js (Next.js login + admin pages).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sessionOptions } = require('../../../lib/session');

@Injectable()
export class AdminAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const session = await getIronSession<{
      admin?: { username: string };
    }>(req, res, sessionOptions);
    req.session = session;
    if (!session?.admin) {
      throw new UnauthorizedException('Admin login required');
    }
    return true;
  }
}
