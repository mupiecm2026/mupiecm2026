import { NextRequest, NextResponse } from 'next/server';
import { JWTService, JWTPayload } from '../utils/jwt';
import { authService } from '../services/auth-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<Response> | Response) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = JWTService.extractFromHeader(authHeader);
      let payload: JWTPayload | null = null;

      if (token) {
        payload = JWTService.verify(token);
      }

      if (!payload) {
        const sessionToken = req.cookies?.get('mupi_session')?.value;
        if (sessionToken) {
          const session = await authService.getSession(sessionToken);
          if (session) {
            payload = {
              email: session.email,
              role: session.role,
            };
          }
        }
      }

      if (!payload) {
        return NextResponse.json(
          { success: false, error: 'Autenticação necessária' },
          { status: 401 }
        );
      }

      // Adicionar usuário autenticado ao request
      (req as AuthenticatedRequest).user = payload;

      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('[AuthMiddleware] Erro na autenticação:', error);
      return NextResponse.json(
        { success: false, error: 'Erro interno de autenticação' },
        { status: 500 }
      );
    }
  };
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<Response> | Response) => {
    return withAuth(async (req: AuthenticatedRequest) => {
      if (!req.user) {
        return NextResponse.json(
          { success: false, error: 'Usuário não autenticado' },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(req.user.role)) {
        return NextResponse.json(
          { success: false, error: 'Acesso negado - role insuficiente' },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
}