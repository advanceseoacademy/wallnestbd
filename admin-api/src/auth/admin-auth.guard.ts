import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getIronSession } from 'iron-session';

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    'wallnest-dev-secret-min-32-characters-long',
  cookieName: 'wn_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  },
};

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
