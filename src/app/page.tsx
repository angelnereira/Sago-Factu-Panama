/**
 * Home Page
 *
 * Landing page for SAGO-FACTU
 */

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4">
          SAGO-FACTU Panamá 🇵🇦
        </h1>
        <p className="text-xl text-center text-gray-600 mb-8">
          SaaS de Facturación Electrónica Multi-Tenant
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Multi-Tenant</h2>
            <p className="text-gray-600">
              Cada organización trae sus propias credenciales HKA (BYOC)
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Asíncrono</h2>
            <p className="text-gray-600">
              Pipeline desacoplado con BullMQ para alto volumen
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Seguro</h2>
            <p className="text-gray-600">
              Credenciales encriptadas AES-256 en reposo
            </p>
          </div>
        </div>

        <div className="bg-gray-100 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Sistema Inicializado ✅</h3>
          <ul className="space-y-2">
            <li>✅ Schema Prisma Multi-Tenant</li>
            <li>✅ Sistema de Encriptación AES-256</li>
            <li>✅ Adaptador SOAP HKA Completo</li>
            <li>✅ Generador XML DGI</li>
            <li>✅ Sistema de Colas (BullMQ)</li>
            <li>✅ Workers Asíncronos</li>
            <li>✅ API Routes</li>
          </ul>
        </div>

        <div className="mt-8 p-6 border-l-4 border-blue-500 bg-blue-50">
          <h4 className="font-semibold mb-2">Próximos Pasos:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Configurar variables de entorno (.env)</li>
            <li>Ejecutar migraciones de Prisma</li>
            <li>Iniciar Redis localmente o configurar Upstash</li>
            <li>Ejecutar workers: <code className="bg-gray-200 px-2 py-1 rounded">npm run worker</code></li>
            <li>Configurar NextAuth.js para autenticación</li>
            <li>Desarrollar UI del Dashboard</li>
          </ol>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/api/health"
            className="text-blue-600 hover:underline mr-4"
          >
            API Health Check
          </a>
          <a
            href="https://github.com/angelnereira/Sago-Factu-Panama"
            className="text-blue-600 hover:underline"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  );
}
