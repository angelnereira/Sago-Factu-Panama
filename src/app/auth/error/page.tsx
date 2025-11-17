'use client';

/**
 * Auth Error Page
 *
 * Displays authentication errors
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'Error en la configuración del servidor';
      case 'AccessDenied':
        return 'Acceso denegado';
      case 'Verification':
        return 'El token de verificación ha expirado o ya ha sido usado';
      default:
        return 'Ocurrió un error durante la autenticación';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error de Autenticación</h1>
          <p className="text-gray-600 mb-6">{getErrorMessage(error)}</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Volver al Login
            </Link>
            <Link
              href="/auth/register"
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Crear Cuenta Nueva
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
