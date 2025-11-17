'use client';

/**
 * Organization Settings Page
 *
 * Complete configuration for:
 * - Issuer/Company data
 * - HKA credentials
 * - Digital signature
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface OrganizationData {
  // Emisor Data
  ruc: string;
  dv: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  telefono: string;
  email: string;
  codigoSucursal: string;
  puntoFacturacion: string;
  actividadEconomica: string;

  // HKA Credentials
  hkaEnvironment: 'DEMO' | 'PRODUCTION';
  hkaTokenEmpresa: string;
  hkaTokenPassword: string;
  hkaValidated: boolean;
  hkaFoliosRestantes: number | null;

  // Digital Signature
  certificadoDigital: string | null;
  certificadoPassword: string;
  certificadoVigencia: string | null;
  certificadoEmisor: string | null;
}

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState<'emisor' | 'hka' | 'firma'>('emisor');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Mock data - in real app, fetch from API
  const [formData, setFormData] = useState<OrganizationData>({
    ruc: '',
    dv: '',
    razonSocial: '',
    nombreComercial: '',
    direccion: '',
    telefono: '',
    email: '',
    codigoSucursal: '001',
    puntoFacturacion: '001',
    actividadEconomica: '',
    hkaEnvironment: 'DEMO',
    hkaTokenEmpresa: '',
    hkaTokenPassword: '',
    hkaValidated: false,
    hkaFoliosRestantes: null,
    certificadoDigital: null,
    certificadoPassword: '',
    certificadoVigencia: null,
    certificadoEmisor: null,
  });

  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const updateField = (field: keyof OrganizationData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Validate required fields
      if (!formData.ruc || !formData.dv || !formData.razonSocial) {
        alert('RUC, DV y Razón Social son campos requeridos');
        return;
      }

      const response = await fetch('/api/settings/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error}`);
        return;
      }

      alert('✅ Configuración guardada exitosamente');
    } catch (error: any) {
      alert(`Error guardando configuración: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateHKA = async () => {
    if (!formData.hkaTokenEmpresa || !formData.hkaTokenPassword) {
      alert('Ingrese las credenciales HKA primero');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch('/api/settings/validate-hka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: formData.hkaEnvironment,
          tokenEmpresa: formData.hkaTokenEmpresa,
          tokenPassword: formData.hkaTokenPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`❌ Error validando: ${result.error}`);
        return;
      }

      setFormData({
        ...formData,
        hkaValidated: true,
        hkaFoliosRestantes: result.foliosRestantes,
      });

      alert(`✅ Conexión validada exitosamente!\nFolios disponibles: ${result.foliosRestantes}`);
    } catch (error: any) {
      alert(`Error validando HKA: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.toLowerCase().split('.').pop();
    if (!['pfx', 'p12'].includes(extension || '')) {
      alert('Formato inválido. Use archivos .pfx o .p12');
      return;
    }

    setCertificateFile(file);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData({
        ...formData,
        certificadoDigital: base64.split(',')[1],
      });
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'emisor' as const, name: 'Datos del Emisor', icon: '🏢' },
    { id: 'hka' as const, name: 'Credenciales HKA', icon: '🔐' },
    { id: 'firma' as const, name: 'Firma Digital', icon: '📝' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Organización</h1>
        <p className="text-gray-600 mt-1">
          Configure los datos de su empresa, credenciales HKA y firma digital
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Datos del Emisor */}
          {activeTab === 'emisor' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Información Fiscal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUC *
                    </label>
                    <input
                      type="text"
                      value={formData.ruc}
                      onChange={(e) => updateField('ruc', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="1234567890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dígito Verificador *
                    </label>
                    <input
                      type="text"
                      value={formData.dv}
                      onChange={(e) => updateField('dv', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="01"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      value={formData.razonSocial}
                      onChange={(e) => updateField('razonSocial', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="EMPRESA DEMO S.A."
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={formData.nombreComercial}
                      onChange={(e) => updateField('nombreComercial', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Empresa Demo"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Actividad Económica
                    </label>
                    <input
                      type="text"
                      value={formData.actividadEconomica}
                      onChange={(e) => updateField('actividadEconomica', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Servicios de consultoría"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección Fiscal
                    </label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => updateField('direccion', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ave. Balboa, Ciudad de Panamá"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => updateField('telefono', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="+507 1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Corporativo
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="empresa@ejemplo.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Punto de Facturación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código de Sucursal
                    </label>
                    <input
                      type="text"
                      value={formData.codigoSucursal}
                      onChange={(e) => updateField('codigoSucursal', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="001"
                      maxLength={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      3 dígitos (ej: 001 para oficina principal)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Punto de Facturación Fiscal
                    </label>
                    <input
                      type="text"
                      value={formData.puntoFacturacion}
                      onChange={(e) => updateField('puntoFacturacion', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="001"
                      maxLength={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      3 dígitos (ej: 001 para punto de venta 1)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Credenciales HKA */}
          {activeTab === 'hka' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-yellow-900">
                      Credenciales Sensibles
                    </p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Estas credenciales se almacenarán encriptadas (AES-256-GCM). Nunca
                      las comparta con terceros.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Configuración de Ambiente
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ambiente HKA
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="DEMO"
                          checked={formData.hkaEnvironment === 'DEMO'}
                          onChange={(e) => updateField('hkaEnvironment', 'DEMO')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          <span className="font-medium">Demo</span>
                          <span className="text-gray-600"> - Pruebas</span>
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="PRODUCTION"
                          checked={formData.hkaEnvironment === 'PRODUCTION'}
                          onChange={(e) => updateField('hkaEnvironment', 'PRODUCTION')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          <span className="font-medium">Producción</span>
                          <span className="text-gray-600"> - Facturas reales</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {formData.hkaEnvironment === 'DEMO' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">Credenciales Demo:</span>
                        <br />
                        Token Empresa: <code className="bg-blue-100 px-1">walgofugiitj_ws_tfhka</code>
                        <br />
                        Token Password: <code className="bg-blue-100 px-1">Octopusp1oQs5</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Credenciales</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.hkaTokenEmpresa}
                      onChange={(e) => updateField('hkaTokenEmpresa', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                      placeholder="su_token_empresa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Password
                    </label>
                    <input
                      type="password"
                      value={formData.hkaTokenPassword}
                      onChange={(e) => updateField('hkaTokenPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                      placeholder="su_token_password"
                    />
                  </div>

                  <button
                    onClick={handleValidateHKA}
                    disabled={isValidating || !formData.hkaTokenEmpresa || !formData.hkaTokenPassword}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isValidating ? 'Validando...' : '🔍 Validar Conexión con HKA'}
                  </button>
                </div>
              </div>

              {formData.hkaValidated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="font-semibold text-green-900">
                        Conexión Validada
                      </p>
                      <p className="text-sm text-green-800 mt-1">
                        Folios disponibles: <span className="font-bold">{formData.hkaFoliosRestantes}</span>
                      </p>
                      <p className="text-xs text-green-700 mt-2">
                        Última validación: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Firma Digital */}
          {activeTab === 'firma' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="font-semibold text-blue-900">
                      Certificado Digital
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      El certificado digital (.pfx/.p12) es requerido para firmar las facturas
                      electrónicas según las regulaciones de la DGI.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Cargar Certificado
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Archivo de Certificado (.pfx / .p12)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {certificateFile ? (
                        <div>
                          <div className="text-3xl mb-2">📜</div>
                          <p className="font-semibold text-gray-900">{certificateFile.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {(certificateFile.size / 1024).toFixed(2)} KB
                          </p>
                          <button
                            onClick={() => {
                              setCertificateFile(null);
                              setFormData({ ...formData, certificadoDigital: null });
                            }}
                            className="text-sm text-red-600 hover:underline mt-2"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-3xl mb-2">📁</div>
                          <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700">
                            Seleccionar Certificado
                            <input
                              type="file"
                              accept=".pfx,.p12"
                              onChange={handleCertificateUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            Formatos soportados: .pfx, .p12
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña del Certificado
                    </label>
                    <input
                      type="password"
                      value={formData.certificadoPassword}
                      onChange={(e) => updateField('certificadoPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Contraseña del archivo .pfx/.p12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingrese la contraseña que protege su certificado digital
                    </p>
                  </div>
                </div>
              </div>

              {formData.certificadoDigital && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Información del Certificado
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className="font-medium text-green-600">✓ Cargado</span>
                    </div>
                    {formData.certificadoEmisor && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emisor:</span>
                        <span className="font-medium">{formData.certificadoEmisor}</span>
                      </div>
                    )}
                    {formData.certificadoVigencia && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vigencia:</span>
                        <span className="font-medium">{formData.certificadoVigencia}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>El certificado debe estar vigente y emitido por una CA autorizada</li>
                      <li>El RUC del certificado debe coincidir con el RUC del emisor</li>
                      <li>Guarde este archivo en un lugar seguro como respaldo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
