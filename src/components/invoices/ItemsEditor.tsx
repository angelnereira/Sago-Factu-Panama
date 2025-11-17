/**
 * Items Editor Component
 *
 * Inline editable table for invoice items with automatic calculations
 */

'use client';

import { useState } from 'react';
import { TASA_ITBMS } from '@/config/hka.config';

export interface InvoiceItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  tasaItbms: string;
  descuento: number;
}

interface ItemsEditorProps {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
}

export function ItemsEditor({ items, onChange }: ItemsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      {
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        tasaItbms: TASA_ITBMS.SIETE,
        descuento: 0,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.cantidad * item.precioUnitario;
    const itbmsRate =
      item.tasaItbms === TASA_ITBMS.SIETE
        ? 0.07
        : item.tasaItbms === TASA_ITBMS.DIEZ
        ? 0.1
        : item.tasaItbms === TASA_ITBMS.QUINCE
        ? 0.15
        : 0;
    const itbms = subtotal * itbmsRate;
    return subtotal + itbms - item.descuento;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Items / Servicios</h3>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          + Agregar Item
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Descripción
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">
                  Precio Unit.
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">
                  ITBMS
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">
                  Total
                </th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.descripcion}
                      onChange={(e) =>
                        updateItem(index, 'descripcion', e.target.value)
                      }
                      placeholder="Descripción del producto/servicio"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) =>
                        updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.precioUnitario}
                      onChange={(e) =>
                        updateItem(
                          index,
                          'precioUnitario',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.tasaItbms}
                      onChange={(e) => updateItem(index, 'tasaItbms', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={TASA_ITBMS.CERO}>0%</option>
                      <option value={TASA_ITBMS.SIETE}>7%</option>
                      <option value={TASA_ITBMS.DIEZ}>10%</option>
                      <option value={TASA_ITBMS.QUINCE}>15%</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    ${calculateItemTotal(item).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay items. Haz clic en "Agregar Item" para comenzar.
        </div>
      )}
    </div>
  );
}
