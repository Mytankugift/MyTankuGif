import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import { DATA_POLICY_VERSION } from '../../config/constants';
import crypto from 'crypto';

export interface ConsentInput {
  consentType: string;
  policyVersion: string;
  ipAddress?: string;
}

export class ConsentService {
  /**
   * Verificar si el usuario requiere aceptación de política
   */
  async requiresDataPolicyAcceptance(userId: string): Promise<boolean> {
    // Buscar consentimiento más reciente para DATA_TREATMENT
    const latestConsent = await prisma.userConsent.findFirst({
      where: {
        userId,
        consentType: 'DATA_TREATMENT',
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });

    // Si no existe consentimiento o es de una versión anterior, requiere aceptación
    if (!latestConsent || latestConsent.policyVersion !== DATA_POLICY_VERSION) {
      return true;
    }

    return false;
  }

  /**
   * Guardar consentimiento del usuario
   */
  async saveConsent(userId: string, input: ConsentInput, ipAddress?: string): Promise<void> {
    // Validar que el tipo de consentimiento sea válido
    if (input.consentType !== 'DATA_TREATMENT') {
      throw new BadRequestError('Tipo de consentimiento inválido');
    }

    // Validar que la versión de política sea la actual
    if (input.policyVersion !== DATA_POLICY_VERSION) {
      throw new BadRequestError('Versión de política inválida');
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Hash de la IP (SHA256) para respaldo legal
    let ipHash: string | null = null;
    if (ipAddress) {
      ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');
    }

    // Guardar o actualizar consentimiento
    await prisma.userConsent.upsert({
      where: {
        userId_consentType_policyVersion: {
          userId,
          consentType: input.consentType,
          policyVersion: input.policyVersion,
        },
      },
      create: {
        userId,
        consentType: input.consentType,
        policyVersion: input.policyVersion,
        ipHash,
      },
      update: {
        acceptedAt: new Date(),
        ipHash,
      },
    });
  }

  /**
   * Obtener IP desde request
   */
  getIpFromRequest(req: any): string | undefined {
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress;
    return ip;
  }
}

