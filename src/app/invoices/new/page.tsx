/**
 * New Invoice Page
 *
 * Form for creating new invoices with real-time preview and validation
 */

'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClientSelector } from '@/components/invoices/ClientSelector';
import { ItemsEditor, InvoiceItem } from '@/components/invoices/ItemsEditor';
import { FORMA_PAGO, TIPO_RECEPTOR } from '@/config/hka.config';

interface Client {
  id: string;
  name: string;
  ruc: string;
  dv: string;
  type: 'CONTRIBUYENTE' | 'CONSUMIDOR_FINAL';
}

export default function NewInvoicePage() {
  const [client, setClient] = useState<Client | undefined>();
  const [formaPago, setFormaPago] = useState(FORMA_PAGO.CONTADO);
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      tasaItbms: '01',
      descuento: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalItbms = 0;
    let totalDescuento = 0;

    items.forEach((item) => {
      const itemSubtotal = item.cantidad * item.precioUnitario;
      const itbmsRate =
        item.tasaItbms === '01' ? 0.07 : item.tasaItbms === '02' ? 0.1 : item.tasaItbms === '03' ? 0.15 : 0;
      const itemItbms = itemSubtotal * itbmsRate;

      subtotal += itemSubtotal;
      totalItbms += itemItbms;
      totalDescuento += item.descuento;
    });

    const totalMontoGravado = subtotal - totalDescuento;
    const totalFactura = totalMontoGravado + totalItbms;

    return { subtotal, totalItbms, totalDescuento, totalMontoGravado, totalFactura };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-123', // TODO: Get from auth context
          userId: 'user-123', // TODO: Get from auth context
          tipoReceptor: client?.type === 'CONTRIBUYENTE' ? TIPO_RECEPTOR.CONTRIBUYENTE : TIPO_RECEPTOR.CONSUMIDOR_FINAL,
          receptorNombre: client?.name,
          receptorRuc: client?.ruc,
          receptorDv: client?.dv,
          formaPago,
          items: items.map((item) => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            tasaItbms: item.tasaItbms,
            descuento: item.descuento,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Factura creada exitosamente. Número: ${data.invoice.numeroDocumentoFiscal}`);
        // TODO: Redirect to invoice detail or list
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error al crear la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = client && items.length > 0 && items.every((i) => i.descripcion && i.cantidad > 0 && i.precioUnitario > 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nueva Factura</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea una nueva factura electrónica certificada por la DGI
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Información del Cliente
                </h2>
                <ClientSelector value={client} onChange={setClient} />

                {client && client.type === 'CONTRIBUYENTE' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ RUC validado: {client.ruc}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <ItemsEditor items={items} onChange={setItems} />
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Forma de Pago
                </h3>
                <select
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={FORMA_PAGO.CONTADO}>Contado</option>
                  <option value={FORMA_PAGO.CREDITO}>Crédito</option>
                  <option value={FORMA_PAGO.TARJETA_CREDITO}>Tarjeta de Crédito</option>
                  <option value={FORMA_PAGO.TARJETA_DEBITO}>Tarjeta de Débito</option>
                  <option value={FORMA_PAGO.ACH}>ACH</option>
                </select>
              </div>
            </div>

            {/* Preview Section (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Vista Previa
                  </h2>

                  <div className="space-y-4">
                    {/* Totals */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>${totals.subtotal.toFixed(2)}</span>
                      </div>
                      {totals.totalDescuento > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Descuento:</span>
                          <span>-${totals.totalDescuento.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>ITBMS:</span>
                        <span>${totals.totalItbms.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-bold text-gray-900">
                        <span>Total:</span>
                        <span>${totals.totalFactura.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Items Count */}
                    <div className="pt-4 border-t border-gray-200 text-sm text-gray-600">
                      <p>{items.length} item(s)</p>
                      {client && <p className="mt-1">Cliente: {client.name}</p>}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-3">
                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Procesando...' : '🚀 Emitir y Certificar'}
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    💾 Guardar Borrador
                  </button>
                </div>

                {!isValid && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ Completa todos los campos requeridos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
