/**
 * HKA Configuration Page
 *
 * Configure and validate HKA credentials for organization
 */

'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface HKAConfig {
  environment: 'DEMO' | 'PRODUCTION';
  validated: boolean;
  foliosRestantes?: number;
  lastSync?: string;
}

export default function HKAConfigPage() {
  const [environment, setEnvironment] = useState<'DEMO' | 'PRODUCTION'>('DEMO');
  const [tokenEmpresa, setTokenEmpresa] = useState('');
  const [tokenPassword, setTokenPassword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    folios?: number;
  } | null>(null);

  // Mock current config
  const currentConfig: HKAConfig | null = null; // Replace with API call

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/organizations/org-123/hka-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hkaEnvironment: environment,
          hkaTokenEmpresa: tokenEmpresa,
          hkaTokenPassword: tokenPassword,
          validateConnection: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setValidationResult({
          success: true,
          message: data.message,
          folios: data.organization.hkaFoliosRestantes,
        });
      } else {
        setValidationResult({
          success: false,
          message: data.error || 'Error al validar credenciales',
        });
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: 'Error de conexión al servidor',
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configuración HKA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura tus credenciales de The Factory HKA para certificación de
            facturas
          </p>
        </div>

        {/* Current Status */}
        {currentConfig && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Estado Actual
                </h2>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    Ambiente:{' '}
                    <span className="font-medium text-gray-900">
                      {currentConfig.environment}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Estado:{' '}
                    <span
                      className={`font-medium ${
                        currentConfig.validated
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {currentConfig.validated ? '✓ Validado' : '✗ No validado'}
                    </span>
                  </p>
                  {currentConfig.foliosRestantes !== undefined && (
                    <p className="text-gray-600">
                      Folios disponibles:{' '}
                      <span className="font-bold text-gray-900">
                        {currentConfig.foliosRestantes}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {currentConfig.validated && (
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                  Activo
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Configurar Credenciales
          </h2>

          <div className="space-y-4">
            {/* Environment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambiente *
              </label>
              <select
                value={environment}
                onChange={(e) =>
                  setEnvironment(e.target.value as 'DEMO' | 'PRODUCTION')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DEMO">Demo (Pruebas)</option>
                <option value="PRODUCTION">Producción</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Usa Demo para pruebas, Producción para facturación real
              </p>
            </div>

            {/* Token Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Empresa *
              </label>
              <input
                type="text"
                value={tokenEmpresa}
                onChange={(e) => setTokenEmpresa(e.target.value)}
                placeholder="walgofugiitj_ws_tfhka (Demo)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Token Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Password *
              </label>
              <input
                type="password"
                value={tokenPassword}
                onChange={(e) => setTokenPassword(e.target.value)}
                placeholder="Octopusp1oQs5 (Demo)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium mb-2">
                ℹ️ Credenciales Demo
              </p>
              <div className="text-xs text-blue-600 space-y-1 font-mono">
                <p>Token Empresa: walgofugiitj_ws_tfhka</p>
                <p>Token Password: Octopusp1oQs5</p>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                Usa estas credenciales para probar la integración con HKA
              </p>
            </div>

            {/* Validation Button */}
            <button
              onClick={handleValidate}
              disabled={
                isValidating || !tokenEmpresa || !tokenPassword
              }
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating
                ? '🔄 Validando conexión...'
                : '🔐 Validar y Guardar Credenciales'}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                validationResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`font-medium ${
                  validationResult.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {validationResult.success ? '✅' : '❌'}{' '}
                {validationResult.message}
              </p>
              {validationResult.success && validationResult.folios !== undefined && (
                <p className="mt-2 text-sm text-green-600">
                  Folios disponibles: <strong>{validationResult.folios}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ¿Cómo obtener credenciales?
          </h2>

          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">
                Para Ambiente de Pruebas (Demo):
              </p>
              <p>
                Usa las credenciales demo mostradas arriba. Puedes comenzar a
                probar inmediatamente.
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">
                Para Ambiente de Producción:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Contacta a The Factory HKA</li>
                <li>Proporciona tus documentos legales (RUC, constitución)</li>
                <li>Firma contrato de servicio PAC</li>
                <li>
                  Recibe tus credenciales únicas de producción por email seguro
                </li>
              </ol>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Contacto HKA:</p>
              <p>Portal: https://factura.thefactoryhka.com.pa/</p>
              <p>Wiki: https://felwiki.thefactoryhka.com.pa/</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
