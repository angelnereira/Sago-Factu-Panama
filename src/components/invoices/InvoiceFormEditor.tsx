'use client';

/**
 * Invoice Form Editor Component
 *
 * Allows users to edit imported invoice data before sending to HKA.
 * Includes automatic calculations, validation, and item management.
 */

import { useState, useEffect } from 'react';
import { MappedInvoiceData, MappedInvoiceItem } from '@/lib/import/field-mapper';
import { TASA_ITBMS } from '@/config/hka.config';

interface InvoiceFormEditorProps {
  invoice: MappedInvoiceData;
  index: number;
  onChange: (index: number, updatedInvoice: MappedInvoiceData) => void;
  onDelete: (index: number) => void;
}

export function InvoiceFormEditor({
  invoice,
  index,
  onChange,
  onDelete,
}: InvoiceFormEditorProps) {
  const [formData, setFormData] = useState<MappedInvoiceData>(invoice);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Recalculate totals when items change
  useEffect(() => {
    const newTotals = calculateTotals(formData.items);
    const updated = {
      ...formData,
      ...newTotals,
    };
    setFormData(updated);
    onChange(index, updated);
  }, [formData.items]);

  const calculateTotals = (items: MappedInvoiceItem[]) => {
    let subtotal = 0;
    let totalItbms = 0;
    let totalDescuento = 0;

    items.forEach((item) => {
      const itemSubtotal = item.cantidad * item.precioUnitario;
      const itbmsRate = getItbmsRate(item.tasaItbms);
      const baseImponible = itemSubtotal - item.valorDescuento;
      const itbms = baseImponible * itbmsRate;

      subtotal += itemSubtotal;
      totalItbms += itbms;
      totalDescuento += item.valorDescuento;
    });

    const totalFactura = subtotal - totalDescuento + totalItbms;

    return {
      subtotal: roundToTwo(subtotal),
      totalItbms: roundToTwo(totalItbms),
      totalDescuento: roundToTwo(totalDescuento),
      totalFactura: roundToTwo(totalFactura),
    };
  };

  const getItbmsRate = (tasa: string): number => {
    switch (tasa) {
      case '00':
        return 0.0;
      case '01':
        return 0.07;
      case '02':
        return 0.1;
      case '03':
        return 0.15;
      default:
        return 0.0;
    }
  };

  const roundToTwo = (num: number): number => {
    return Math.round(num * 100) / 100;
  };

  const updateField = (field: keyof MappedInvoiceData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(index, updated);
  };

  const updateItem = (itemIndex: number, field: keyof MappedInvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: value,
    };

    // Recalculate item totals
    const item = updatedItems[itemIndex];
    const precioTotal = item.cantidad * item.precioUnitario;
    const itbmsRate = getItbmsRate(item.tasaItbms);
    const baseImponible = precioTotal - item.valorDescuento;
    const valorItbms = baseImponible * itbmsRate;
    const valorTotal = baseImponible + valorItbms;

    updatedItems[itemIndex] = {
      ...item,
      precioTotal: roundToTwo(precioTotal),
      valorItbms: roundToTwo(valorItbms),
      valorTotal: roundToTwo(valorTotal),
    };

    setFormData({ ...formData, items: updatedItems });
  };

  const addItem = () => {
    const newItem: MappedInvoiceItem = {
      descripcion: '',
      cantidad: 1,
      unidadMedida: 'UND',
      precioUnitario: 0,
      precioTotal: 0,
      tasaItbms: '01',
      valorItbms: 0,
      valorDescuento: 0,
      valorTotal: 0,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (itemIndex: number) => {
    if (formData.items.length <= 1) {
      alert('La factura debe tener al menos un item');
      return;
    }

    const updatedItems = formData.items.filter((_, i) => i !== itemIndex);
    setFormData({ ...formData, items: updatedItems });
  };

  const validate = () => {
    const newErrors: string[] = [];

    if (!formData.numeroDocumentoFiscal) {
      newErrors.push('Número de factura es requerido');
    }

    if (!formData.razonSocial) {
      newErrors.push('Razón social es requerida');
    }

    if (formData.tipoReceptor === '01') {
      if (!formData.numeroRUC) newErrors.push('RUC es requerido para contribuyentes');
      if (!formData.digitoVerificadorRUC) newErrors.push('DV es requerido');
    }

    formData.items.forEach((item, i) => {
      if (!item.descripcion) newErrors.push(`Item ${i + 1}: falta descripción`);
      if (item.cantidad <= 0) newErrors.push(`Item ${i + 1}: cantidad debe ser > 0`);
      if (item.precioUnitario < 0) newErrors.push(`Item ${i + 1}: precio inválido`);
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white mb-4">
      {/* Header - Collapsed View */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <button
            className="text-xl"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div>
            <div className="font-semibold text-gray-900">
              {formData.numeroDocumentoFiscal}
            </div>
            <div className="text-sm text-gray-600">{formData.razonSocial}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total</div>
            <div className="font-bold text-lg text-gray-900">
              ${formData.totalFactura.toFixed(2)}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('¿Eliminar esta factura?')) {
                onDelete(index);
              }
            }}
            className="text-red-600 hover:bg-red-50 p-2 rounded"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="font-semibold text-red-900 mb-1">Errores:</div>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Document Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Información del Documento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Factura *
                </label>
                <input
                  type="text"
                  value={formData.numeroDocumentoFiscal}
                  onChange={(e) => updateField('numeroDocumentoFiscal', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={
                    formData.fechaEmision
                      ? new Date(formData.fechaEmision).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => updateField('fechaEmision', new Date(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Receptor *
                </label>
                <select
                  value={formData.tipoReceptor}
                  onChange={(e) => updateField('tipoReceptor', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="01">01 - Contribuyente</option>
                  <option value="02">02 - Consumidor Final</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pago
                </label>
                <select
                  value={formData.formaPago}
                  onChange={(e) => updateField('formaPago', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="1">Contado</option>
                  <option value="2">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cliente Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Información del Cliente</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social / Nombre *
                </label>
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => updateField('razonSocial', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => updateField('direccion', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              {formData.tipoReceptor === '01' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUC *
                    </label>
                    <input
                      type="text"
                      value={formData.numeroRUC}
                      onChange={(e) => updateField('numeroRUC', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DV *
                    </label>
                    <input
                      type="text"
                      value={formData.digitoVerificadorRUC}
                      onChange={(e) => updateField('digitoVerificadorRUC', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      maxLength={2}
                      required
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.correoElectronico || ''}
                  onChange={(e) => updateField('correoElectronico', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Items de la Factura</h4>
              <button
                onClick={addItem}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                ➕ Agregar Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="font-medium text-gray-700">Item {itemIndex + 1}</div>
                    <button
                      onClick={() => removeItem(itemIndex)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded text-sm"
                      disabled={formData.items.length <= 1}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descripción *
                      </label>
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) =>
                          updateItem(itemIndex, 'descripcion', e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateItem(itemIndex, 'cantidad', parseFloat(e.target.value) || 0)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unidad
                      </label>
                      <input
                        type="text"
                        value={item.unidadMedida}
                        onChange={(e) =>
                          updateItem(itemIndex, 'unidadMedida', e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Precio Unit. *
                      </label>
                      <input
                        type="number"
                        value={item.precioUnitario}
                        onChange={(e) =>
                          updateItem(
                            itemIndex,
                            'precioUnitario',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ITBMS *
                      </label>
                      <select
                        value={item.tasaItbms}
                        onChange={(e) => updateItem(itemIndex, 'tasaItbms', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      >
                        <option value="00">0% (Exento)</option>
                        <option value="01">7%</option>
                        <option value="02">10%</option>
                        <option value="03">15%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descuento
                      </label>
                      <input
                        type="number"
                        value={item.valorDescuento}
                        onChange={(e) =>
                          updateItem(
                            itemIndex,
                            'valorDescuento',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="bg-white rounded px-2 py-1.5 border border-gray-300">
                      <div className="text-xs text-gray-600">Total Item</div>
                      <div className="font-semibold text-sm">
                        ${item.valorTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Totales</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Subtotal</div>
                <div className="font-bold text-lg">${formData.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">ITBMS</div>
                <div className="font-bold text-lg">${formData.totalItbms.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Descuentos</div>
                <div className="font-bold text-lg">
                  ${formData.totalDescuento.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Total Factura</div>
                <div className="font-bold text-xl text-blue-700">
                  ${formData.totalFactura.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Información Adicional
            </label>
            <textarea
              value={formData.informacionAdicional || ''}
              onChange={(e) => updateField('informacionAdicional', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              placeholder="Notas o información adicional..."
            />
          </div>

          {/* Validate Button */}
          <div>
            <button
              onClick={validate}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
            >
              ✓ Validar Factura
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
