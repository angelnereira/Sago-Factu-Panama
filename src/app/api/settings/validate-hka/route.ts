/**
 * HKA Validation API
 *
 * Validates HKA credentials by testing connection and checking available folios.
 *
 * POST /api/settings/validate-hka
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHKAClient, type HKAEnvironmentType } from '@/lib/hka/soap-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { environment, tokenEmpresa, tokenPassword } = body;

    // Validate inputs
    if (!environment || !tokenEmpresa || !tokenPassword) {
      return NextResponse.json(
        { error: 'Ambiente y credenciales son requeridos' },
        { status: 400 }
      );
    }

    // Validate environment
    if (!['DEMO', 'PRODUCTION'].includes(environment)) {
      return NextResponse.json(
        { error: 'Ambiente inválido. Use DEMO o PRODUCTION' },
        { status: 400 }
      );
    }

    console.log(`[ValidateHKA] Testing connection to ${environment}`);

    // Create HKA client
    const hkaClient = createHKAClient(
      environment.toLowerCase() as HKAEnvironmentType,
      {
        tokenEmpresa,
        tokenPassword,
      }
    );

    try {
      // Test connection by checking folios
      const result = await hkaClient.foliosRestantes();

      console.log(`[ValidateHKA] Connection successful. Folios: ${result.foliosDisponibles}`);

      return NextResponse.json({
        success: true,
        message: 'Conexión validada exitosamente',
        foliosRestantes: result.foliosDisponibles,
        ambiente: environment,
      });
    } catch (error: any) {
      console.error('[ValidateHKA] Connection failed:', error);

      // Determine error type
      let errorMessage = 'Error validando credenciales';

      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Credenciales inválidas. Verifique su Token Empresa y Password';
      } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        errorMessage = 'Timeout de conexión. Verifique su conexión a internet';
      } else if (error.message?.includes('ENOTFOUND')) {
        errorMessage = 'No se pudo conectar al servidor de HKA';
      } else {
        errorMessage = `Error de HKA: ${error.message}`;
      }

      return NextResponse.json(
        { error: errorMessage, details: error.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[ValidateHKA] Error:', error);
    return NextResponse.json(
      { error: 'Error procesando solicitud', details: error.message },
      { status: 500 }
    );
  }
}
