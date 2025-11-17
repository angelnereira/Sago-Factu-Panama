/**
 * Status Badge Component
 *
 * Visual indicator for invoice status with color coding
 */

import { InvoiceStatus } from '@prisma/client';

interface StatusBadgeProps {
  status: InvoiceStatus;
  showLabel?: boolean;
}

const statusConfig: Record<InvoiceStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  DRAFT: {
    label: 'Borrador',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '📝',
  },
  QUEUED: {
    label: 'En Cola',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '⏳',
  },
  PROCESSING: {
    label: 'Procesando',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '⚙️',
  },
  AUTHORIZED: {
    label: 'Autorizada',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '✅',
  },
  REJECTED: {
    label: 'Rechazada',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '❌',
  },
  FAILED: {
    label: 'Error',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '⚠️',
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '🚫',
  },
  ANNULLED: {
    label: 'Anulada',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: '⛔',
  },
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
