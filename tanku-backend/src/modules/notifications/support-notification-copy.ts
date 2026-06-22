/**
 * Copy legible para notificaciones de soporte (postventa).
 * El título siempre muestra el ID del reporte (RCL-…) para identificarlo de un vistazo.
 */

import type { SupportCaseStatusDTO } from '../../shared/dto/support-cases.dto';

export type SupportNotificationCopy = {
  title: string;
  message: string;
};

/** Etiqueta visible del caso: ref RCL o id acortado como fallback. */
export function formatSupportCaseLabel(caseRef: string | null | undefined, caseId: string): string {
  return caseRef?.trim() || caseId.slice(0, 8);
}

export function getSupportCaseRegisteredCopy(caseLabel: string): SupportNotificationCopy {
  return {
    title: caseLabel,
    message: 'Solicitud registrada — pendiente de revisión',
  };
}

export function getSupportCaseStatusCopy(
  status: SupportCaseStatusDTO,
  caseLabel: string
): SupportNotificationCopy {
  switch (status) {
    case 'IN_REVIEW':
      return {
        title: caseLabel,
        message: 'En revisión por el equipo de soporte',
      };
    case 'RESOLVED':
      return {
        title: caseLabel,
        message: 'Caso resuelto',
      };
    default:
      return {
        title: caseLabel,
        message: 'Hay novedades en tu reporte',
      };
  }
}

export function getSupportCaseReplyCopy(
  caseLabel: string,
  message: string
): SupportNotificationCopy {
  const preview = message.length > 120 ? `${message.slice(0, 117)}...` : message;
  return {
    title: caseLabel,
    message: preview,
  };
}
