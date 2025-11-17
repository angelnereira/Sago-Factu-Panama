/**
 * Invoices List Page
 *
 * Searchable, filterable list of all invoices with quick actions
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InvoiceStatus } from '@/lib/prisma';

interface Invoice {
  id: string;
  numeroDocumentoFiscal: string;
  receptorNombre: string;
  totalFactura: number;
  status: InvoiceStatus;
  cufe?: string;
  createdAt: string;
}

// Mock data - replace with API call
const mockInvoices: Invoice[] = [
  {
    id: '1',
    numeroDocumentoFiscal: '0000000123',
    receptorNombre: 'Empresa ABC S.A.',
    totalFactura: 1250.0,
    status: 'AUTHORIZED',
    cufe: 'ABC123DEF456',
    createdAt: '2025-11-17T10:30:00',
  },
  {
    id: '2',
    numeroDocumentoFiscal: '0000000124',
    receptorNombre: 'Consumidor Final',
    totalFactura: 850.5,
    status: 'PROCESSING',
    createdAt: '2025-11-17T10:25:00',
  },
  {
    id: '3',
    numeroDocumentoFiscal: '0000000122',
    receptorNombre: 'Cliente XYZ',
    totalFactura: 450.0,
    status: 'REJECTED',
    createdAt: '2025-11-17T10:15:00',
  },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter invoices
  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.numeroDocumentoFiscal.includes(search) ||
      invoice.receptorNombre.toLowerCase().includes(search.toLowerCase()) ||
      invoice.cufe?.includes(search);

    const matchesStatus =
      statusFilter === 'ALL' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona y consulta todas tus facturas electrónicas
            </p>
          </div>

          <Link
            href="/invoices/new"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nueva Factura
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, cliente, CUFE..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los estados</option>
              <option value="AUTHORIZED">Autorizadas</option>
              <option value="PROCESSING">Procesando</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="QUEUED">En Cola</option>
            </select>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showFilters ? '🔼' : '🔽'} Filtros
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Mostrando {filteredInvoices.length} de {mockInvoices.length} facturas
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {invoice.numeroDocumentoFiscal}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{invoice.receptorNombre}</p>
                      {invoice.cufe && (
                        <p className="text-xs text-gray-500">CUFE: {invoice.cufe}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                      ${invoice.totalFactura.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString('es-PA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Ver detalles"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          👁️
                        </button>
                        {invoice.status === 'AUTHORIZED' && (
                          <>
                            <button
                              title="Descargar PDF"
                              className="text-green-600 hover:text-green-700"
                            >
                              📄
                            </button>
                            <button
                              title="Enviar por email"
                              className="text-purple-600 hover:text-purple-700"
                            >
                              ✉️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">📭</p>
              <p>No se encontraron facturas</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
