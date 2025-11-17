'use client';

/**
 * Invoice Import Page
 *
 * Allows users to upload files (xlsx, xls, csv, xml) and bulk import invoices.
 * Features:
 * - Drag & drop file upload
 * - Editable form preview before sending
 * - Direct send option
 * - Template download links
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InvoiceFormEditor } from '@/components/invoices/InvoiceFormEditor';
import { MappedInvoiceData } from '@/lib/import/field-mapper';

interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
  created?: number;
}

interface ImportError {
  invoiceNumber: string;
  error: string;
}

export default function InvoiceImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sendDirectly, setSendDirectly] = useState(false);

  // Results
  const [previewInvoices, setPreviewInvoices] = useState<MappedInvoiceData[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // Mock organization ID (in real app, get from session/context)
  const organizationId = 'org_demo';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const extension = selectedFile.name.toLowerCase().split('.').pop();
    const validExtensions = ['xlsx', 'xls', 'csv', 'xml'];

    if (!validExtensions.includes(extension || '')) {
      alert(`Formato no soportado. Use: ${validExtensions.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    // Reset previous results
    setPreviewInvoices([]);
    setStats(null);
    setErrors([]);
    setImportSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', organizationId);
      formData.append('sendDirectly', sendDirectly.toString());

      const response = await fetch('/api/invoices/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error}\n${result.details || ''}`);
        return;
      }

      // Update stats
      setStats(result.stats);
      setErrors(result.errors || []);

      if (result.preview) {
        // Show editable preview
        setPreviewInvoices(result.invoices);
      } else {
        // Direct send - show success
        setImportSuccess(true);
      }
    } catch (error: any) {
      alert(`Error subiendo archivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateInvoice = (index: number, updatedInvoice: MappedInvoiceData) => {
    const updated = [...previewInvoices];
    updated[index] = updatedInvoice;
    setPreviewInvoices(updated);
  };

  const handleDeleteInvoice = (index: number) => {
    const updated = previewInvoices.filter((_, i) => i !== index);
    setPreviewInvoices(updated);

    // Update stats
    if (stats) {
      setStats({
        ...stats,
        valid: updated.length,
        total: stats.total,
      });
    }
  };

  const handleAddNewInvoice = () => {
    const newInvoice: MappedInvoiceData = {
      tipoReceptor: '01',
      tipoContribuyente: '1',
      numeroRUC: '',
      digitoVerificadorRUC: '',
      razonSocial: '',
      direccion: '',
      correoElectronico: '',
      tipoDocumento: '01',
      numeroDocumentoFiscal: '',
      fechaEmision: new Date(),
      formaPago: '1',
      items: [
        {
          descripcion: '',
          cantidad: 1,
          unidadMedida: 'UND',
          precioUnitario: 0,
          precioTotal: 0,
          tasaItbms: '01',
          valorItbms: 0,
          valorDescuento: 0,
          valorTotal: 0,
        },
      ],
      subtotal: 0,
      totalItbms: 0,
      totalDescuento: 0,
      totalFactura: 0,
    };

    setPreviewInvoices([...previewInvoices, newInvoice]);
  };

  const handleConfirmSend = async () => {
    if (previewInvoices.length === 0) {
      alert('No hay facturas para enviar');
      return;
    }

    setIsUploading(true);

    try {
      // Send edited invoices directly to creation endpoint
      const response = await fetch('/api/invoices/create-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          invoices: previewInvoices,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error}`);
        return;
      }

      setStats({
        total: previewInvoices.length,
        valid: result.created?.length || 0,
        invalid: result.errors?.length || 0,
        created: result.created?.length || 0,
      });
      setErrors(result.errors || []);
      setImportSuccess(true);
      setPreviewInvoices([]);
    } catch (error: any) {
      alert(`Error procesando facturas: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewInvoices([]);
    setStats(null);
    setErrors([]);
    setImportSuccess(false);
    setSendDirectly(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar Facturas</h1>
        <p className="text-gray-600 mt-1">
          Cargue facturas en lote desde archivos Excel, CSV o XML, o cree facturas
          manualmente
        </p>
      </div>

      {/* Template Downloads */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📥 Plantillas de Ejemplo</h3>
        <p className="text-sm text-blue-800 mb-3">
          Descargue una plantilla para ver el formato esperado:
        </p>
        <div className="flex gap-3">
          <a
            href="/templates/facturas-template.xlsx"
            download
            className="text-sm bg-white border border-blue-300 px-3 py-1.5 rounded hover:bg-blue-50"
          >
            📊 Excel (.xlsx)
          </a>
          <a
            href="/templates/facturas-template.csv"
            download
            className="text-sm bg-white border border-blue-300 px-3 py-1.5 rounded hover:bg-blue-50"
          >
            📄 CSV (.csv)
          </a>
          <a
            href="/templates/facturas-template.xml"
            download
            className="text-sm bg-white border border-blue-300 px-3 py-1.5 rounded hover:bg-blue-50"
          >
            📋 XML (.xml)
          </a>
        </div>
      </div>

      {/* Upload Area */}
      {!importSuccess && previewInvoices.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div>
                <div className="text-4xl mb-3">📎</div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:underline mt-2"
                >
                  Eliminar archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📂</div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Arrastra tu archivo aquí
                </p>
                <p className="text-gray-600 mb-4">o</p>
                <label className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-blue-700">
                  Seleccionar Archivo
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Formatos soportados: XLSX, XLS, CSV, XML (máx 10 MB)
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          {file && (
            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendDirectly}
                  onChange={(e) => setSendDirectly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Enviar directamente a HKA (sin edición)
                </span>
              </label>

              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUploading
                  ? 'Procesando...'
                  : sendDirectly
                  ? '🚀 Cargar y Enviar'
                  : '✏️ Cargar para Editar'}
              </button>
            </div>
          )}

          {/* Or create manually */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                ¿No tiene un archivo? Cree facturas manualmente
              </p>
              <button
                onClick={handleAddNewInvoice}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                ➕ Crear Factura Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && !importSuccess && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total en archivo</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-sm text-gray-600">Válidas</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-sm text-gray-600">Con errores</div>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && !importSuccess && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">❌ Errores Encontrados</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium text-red-800">
                  Factura {error.invoiceNumber}:
                </span>{' '}
                <span className="text-red-700">{error.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editable Preview */}
      {previewInvoices.length > 0 && !importSuccess && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📝 Facturas para Revisar y Editar ({previewInvoices.length})
            </h3>
            <button
              onClick={handleAddNewInvoice}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ➕ Agregar Otra Factura
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {previewInvoices.map((invoice, index) => (
              <InvoiceFormEditor
                key={index}
                invoice={invoice}
                index={index}
                onChange={handleUpdateInvoice}
                onDelete={handleDeleteInvoice}
              />
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex gap-3">
              <button
                onClick={handleConfirmSend}
                disabled={isUploading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {isUploading
                  ? 'Procesando...'
                  : `✅ Confirmar y Enviar ${previewInvoices.length} Factura${
                      previewInvoices.length > 1 ? 's' : ''
                    } a HKA`}
              </button>
              <button
                onClick={handleReset}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {importSuccess && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">
            ¡Importación Exitosa!
          </h3>
          <p className="text-green-800 mb-4">
            Se crearon {stats?.created} facturas y están siendo procesadas por HKA.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Importar Más
            </button>
            <a
              href="/invoices"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Ver Facturas
            </a>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
