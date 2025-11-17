/**
 * Invoice Detail Page
 *
 * Detailed view of a single invoice with timeline and actions
 */

'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InvoiceStatus } from '@/lib/prisma';

interface InvoiceDetail {
  id: string;
  numeroDocumentoFiscal: string;
  cufe?: string;
  status: InvoiceStatus;
  receptorNombre: string;
  receptorRuc?: string;
  receptorDv?: string;
  subtotal: number;
  totalItbms: number;
  totalDescuento: number;
  totalFactura: number;
  formaPago: string;
  createdAt: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    tasaItbms: string;
    valorTotal: number;
  }>;
  timeline: Array<{
    status: string;
    timestamp: string;
    message: string;
  }>;
}

// Mock data
const mockInvoice: InvoiceDetail = {
  id: '1',
  numeroDocumentoFiscal: '0000000123',
  cufe: 'ABC123DEF456GHI789',
  status: 'AUTHORIZED',
  receptorNombre: 'Empresa ABC S.A.',
  receptorRuc: '123456789-1-2023',
  receptorDv: '12',
  subtotal: 1168.22,
  totalItbms: 81.78,
  totalDescuento: 0,
  totalFactura: 1250.0,
  formaPago: 'Contado',
  createdAt: '2025-11-17T10:30:00',
  items: [
    {
      descripcion: 'Servicio de Consultoría',
      cantidad: 10,
      precioUnitario: 116.82,
      tasaItbms: '7%',
      valorTotal: 1250.0,
    },
  ],
  timeline: [
    {
      status: 'CREATED',
      timestamp: '2025-11-17T10:30:00',
      message: 'Factura creada',
    },
    {
      status: 'QUEUED',
      timestamp: '2025-11-17T10:30:05',
      message: 'Encolada para procesamiento',
    },
    {
      status: 'PROCESSING',
      timestamp: '2025-11-17T10:30:10',
      message: 'Worker procesando',
    },
    {
      status: 'AUTHORIZED',
      timestamp: '2025-11-17T10:30:45',
      message: 'Autorizada por HKA - CUFE recibido',
    },
  ],
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  // TODO: Fetch real data from API
  const invoice = mockInvoice;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Actions */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Factura #{invoice.numeroDocumentoFiscal}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            {invoice.cufe && (
              <p className="mt-2 text-sm text-gray-500">
                CUFE: <span className="font-mono">{invoice.cufe}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          {invoice.status === 'AUTHORIZED' && (
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                📄 Descargar PDF
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                📥 Descargar XML
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                ✉️ Enviar Email
              </button>
              <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                ⛔ Anular
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Información del Documento
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">
                    {invoice.receptorNombre}
                  </p>
                </div>

                {invoice.receptorRuc && (
                  <div>
                    <p className="text-sm text-gray-500">RUC</p>
                    <p className="font-medium text-gray-900">
                      {invoice.receptorRuc}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Fecha de Emisión</p>
                  <p className="font-medium text-gray-900">
                    {new Date(invoice.createdAt).toLocaleDateString('es-PA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Forma de Pago</p>
                  <p className="font-medium text-gray-900">{invoice.formaPago}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 font-medium text-gray-700">
                        Descripción
                      </th>
                      <th className="text-right py-3 font-medium text-gray-700">
                        Cantidad
                      </th>
                      <th className="text-right py-3 font-medium text-gray-700">
                        Precio Unit.
                      </th>
                      <th className="text-right py-3 font-medium text-gray-700">
                        ITBMS
                      </th>
                      <th className="text-right py-3 font-medium text-gray-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-3 text-gray-900">{item.descripcion}</td>
                        <td className="py-3 text-right text-gray-900">
                          {item.cantidad}
                        </td>
                        <td className="py-3 text-right text-gray-900">
                          ${item.precioUnitario.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-gray-900">
                          {item.tasaItbms}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900">
                          ${item.valorTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal:</span>
                      <span>${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>ITBMS:</span>
                      <span>${invoice.totalItbms.toFixed(2)}</span>
                    </div>
                    {invoice.totalDescuento > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Descuento:</span>
                        <span>-${invoice.totalDescuento.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-bold text-gray-900">
                      <span>Total:</span>
                      <span>${invoice.totalFactura.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar (1/3) */}
          <div className="lg:col-span-1">
            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Historial
              </h2>

              <div className="space-y-4">
                {invoice.timeline.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === invoice.timeline.length - 1
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {index === invoice.timeline.length - 1 ? '✓' : '•'}
                      </div>
                      {index < invoice.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      )}
                    </div>

                    <div className="flex-1 pb-6">
                      <p className="font-medium text-gray-900">{event.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString('es-PA')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code */}
            {invoice.status === 'AUTHORIZED' && (
              <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Código QR
                </h2>
                <div className="flex justify-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-gray-500 text-center">
                      QR Code
                      <br />
                      (Implementar)
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 text-center">
                  Escanea para verificar autenticidad
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
