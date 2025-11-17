/**
 * Recent Activity Feed
 *
 * Real-time feed of invoice activity
 */

'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { InvoiceStatus } from '@/lib/prisma';

interface Activity {
  id: string;
  type: 'invoice_created' | 'invoice_authorized' | 'invoice_rejected';
  invoiceNumber: string;
  status: InvoiceStatus;
  timestamp: string;
  amount: number;
}

// Mock data - replace with real API call
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'invoice_authorized',
    invoiceNumber: '0000000123',
    status: 'AUTHORIZED',
    timestamp: '2025-11-17T10:30:00',
    amount: 1250.0,
  },
  {
    id: '2',
    type: 'invoice_created',
    invoiceNumber: '0000000124',
    status: 'PROCESSING',
    timestamp: '2025-11-17T10:25:00',
    amount: 850.5,
  },
  {
    id: '3',
    type: 'invoice_rejected',
    invoiceNumber: '0000000122',
    status: 'REJECTED',
    timestamp: '2025-11-17T10:15:00',
    amount: 450.0,
  },
];

export function RecentActivity() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ver todas
        </button>
      </div>

      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                📄
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Factura #{activity.invoiceNumber}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleString('es-PA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <p className="font-semibold text-gray-900">
                ${activity.amount.toFixed(2)}
              </p>
              <StatusBadge status={activity.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
