// Display helpers for the Spanish UI (safe for client and server).

const TIME_ZONE = 'America/Costa_Rica';

export function formatCRC(value) {
  if (value == null) return '—';
  return `₡${Number(value).toLocaleString('es-CR')}`;
}

export function formatNumber(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('es-CR');
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CR', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// 88887777 → 8888-7777
export function formatPhone(value) {
  if (typeof value !== 'string' || value.length !== 8) return value || '';
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

export const STATUS_LABELS = {
  pending: 'Pendiente',
  received: 'Recibida',
  cancelled: 'Cancelada',
};
