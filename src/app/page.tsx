/**
 * Landing Page
 *
 * Welcome and login page for SAGO-FACTU
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            SAGO-FACTU
            <span className="block text-blue-600 mt-2">Panamá 🇵🇦</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma SaaS de Facturación Electrónica Multi-Tenant
            <br />
            <span className="text-lg text-gray-500">
              Integrada con The Factory HKA (PAC autorizado DGI)
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              🚀 Ir al Dashboard
            </Link>
            <Link
              href="/invoices/new"
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 text-lg font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              ➕ Nueva Factura
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Multi-Tenant
            </h3>
            <p className="text-gray-600">
              Cada organización trae sus propias credenciales HKA. Sistema
              BYOC (Bring Your Own Credentials) con encriptación AES-256.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Procesamiento Asíncrono
            </h3>
            <p className="text-gray-600">
              Pipeline desacoplado con BullMQ y Redis. Los usuarios no esperan
              - factura en segundo plano mientras continúan trabajando.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Seguro y Escalable
            </h3>
            <p className="text-gray-600">
              Arquitectura serverless-ready con Vercel y Neon PostgreSQL.
              Auditoría completa de todas las operaciones.
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mt-20 bg-white rounded-xl shadow-lg p-10 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Capacidades del Sistema
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Certificación Instantánea
                </h4>
                <p className="text-sm text-gray-600">
                  Emite facturas certificadas por DGI en segundos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Dashboard Ejecutivo
                </h4>
                <p className="text-sm text-gray-600">
                  Métricas en tiempo real y análisis de facturación
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Monitoreo en Tiempo Real
                </h4>
                <p className="text-sm text-gray-600">
                  Verifica el estado de tus documentos en cualquier momento
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Archivo Digital Certificado
                </h4>
                <p className="text-sm text-gray-600">
                  Descarga XML y PDF en cualquier momento
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Distribución Automática
                </h4>
                <p className="text-sm text-gray-600">
                  Envía facturas a clientes directamente por email
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">⚙️</span>
              <div>
                <h4 className="font-semibold text-gray-900">
                  Gestión de Correcciones
                </h4>
                <p className="text-sm text-gray-600">
                  Anula documentos siguiendo proceso legal completo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Stack Tecnológico
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              'Next.js 15',
              'TypeScript',
              'Prisma',
              'PostgreSQL',
              'BullMQ',
              'Redis',
              'TailwindCSS',
              'SOAP',
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6 text-sm">
          <Link
            href="/api/health"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            🔍 API Health Check
          </Link>
          <span className="text-gray-300 hidden sm:block">|</span>
          <a
            href="https://github.com/angelnereira/Sago-Factu-Panama"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            📚 Documentación
          </a>
          <span className="text-gray-300 hidden sm:block">|</span>
          <Link
            href="/settings/hka"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            🔐 Configurar HKA
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            SAGO-FACTU Panamá - Sistema de Facturación Electrónica
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Integrado con The Factory HKA (PAC autorizado DGI Panamá)
          </p>
        </div>
      </footer>
    </div>
  );
}
