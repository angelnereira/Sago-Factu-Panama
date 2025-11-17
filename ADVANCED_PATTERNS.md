# Patrones Avanzados de Integración con HKA

Este documento describe los patrones avanzados implementados en SAGO-FACTU para garantizar una integración robusta, eficiente y confiable con la API de HKA.

---

## 📋 Tabla de Contenidos

1. [Circuit Breaker Pattern](#circuit-breaker-pattern)
2. [Sistema de Categorización de Errores](#sistema-de-categorización-de-errores)
3. [Polling Inteligente](#polling-inteligente)
4. [Reconciliación Periódica](#reconciliación-periódica)
5. [Optimizaciones para Alto Volumen](#optimizaciones-para-alto-volumen)
6. [Flujo Completo de Procesamiento](#flujo-completo-de-procesamiento)

---

## 1. Circuit Breaker Pattern

### ¿Qué es?

El Circuit Breaker actúa como un interruptor eléctrico que protege tanto nuestro sistema como el de HKA de cascadas de fallos. Si detecta demasiados errores consecutivos, "abre el circuito" y deja de intentar llamadas por un período de recuperación.

### Estados del Circuit Breaker

```
CLOSED (Normal)
   ↓ (muchos errores)
OPEN (Bloqueado)
   ↓ (después de timeout)
HALF_OPEN (Prueba)
   ↓ (éxito)
CLOSED (Recuperado)
```

### Configuración

```typescript
{
  failureThreshold: 5,      // Abrir después de 5 fallos
  successThreshold: 2,      // Necesita 2 éxitos para cerrar
  timeout: 60000,           // Esperar 60s antes de reintentar
  monitoringPeriod: 120000  // Contar fallos en ventana de 2 minutos
}
```

### Por qué es Crítico para HKA

**Protege los Folios**: Si HKA está teniendo problemas, no queremos seguir enviando facturas que podrían consumir folios sin procesarse correctamente.

**Previene Sobrecarga**: Evita bombardear a HKA con peticiones cuando está experimentando problemas.

**Recuperación Automática**: Intenta automáticamente recuperarse después de un período de espera.

### Uso

```typescript
import { createEnhancedHKAClient } from '@/lib/hka/enhanced-soap-client';

const client = createEnhancedHKAClient('demo', credentials);

try {
  const result = await client.enviar(xmlBase64);
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit está abierto - no reintentar ahora
    console.log('HKA circuit breaker is open, will retry later');
  }
}
```

---

## 2. Sistema de Categorización de Errores

### Categorías de Errores

Los errores de HKA se clasifican en categorías que determinan cómo manejarlos:

#### 100 Series: Autenticación/Autorización
- **Retryable**: No
- **Requiere Intervención Manual**: Sí
- **Estrategia**: Verificar credenciales y configuración

```typescript
ERR_001: Token inválido o expirado
ERR_003: RUC del emisor no coincide con token
ERR_008: Punto de facturación no autorizado
```

#### 200 Series: Validación de Datos
- **Retryable**: No (pero se puede corregir y reintentar)
- **Requiere Intervención Manual**: No
- **Estrategia**: Corregir datos y enviar nuevamente

```typescript
ERR_002: XML malformado
ERR_005: Totales no cuadran
ERR_006: Tasa ITBMS inválida
ERR_007: Fecha de emisión fuera de rango
ERR_009: RUC del receptor inválido
```

#### 300 Series: Reglas de Negocio
- **Retryable**: Depende del error
- **Requiere Intervención Manual**: Sí
- **Estrategia**: Revisar reglas fiscales

```typescript
ERR_004: Folios agotados (requiere compra)
ERR_010: Documento duplicado
```

#### 500 Series: Errores de Sistema
- **Retryable**: Sí
- **Requiere Intervención Manual**: No
- **Estrategia**: Reintentar con backoff exponencial

```typescript
ETIMEDOUT: Timeout de conexión
ECONNREFUSED: Conexión rechazada
ENOTFOUND: DNS no encontrado
```

### Uso

```typescript
import { classifyHKAError, getRetryStrategy } from '@/lib/hka/error-handler';

try {
  await client.enviar(xml);
} catch (error) {
  const classified = classifyHKAError(error);

  console.log(`Error Category: ${classified.category}`);
  console.log(`Severity: ${classified.severity}`);
  console.log(`Suggested Action: ${classified.suggestedAction}`);

  const retryStrategy = getRetryStrategy(classified);
  if (retryStrategy.shouldRetry) {
    // Reintentar después de delay
    await new Promise(r => setTimeout(r, retryStrategy.delayMs));
  }
}
```

---

## 3. Polling Inteligente

### Estrategia de Backoff Incremental

Después de enviar un documento, no queremos bombardear a HKA con consultas constantes, pero tampoco queremos esperar demasiado.

**Intervalos de Polling**:
1. 5 segundos (primera consulta)
2. 10 segundos
3. 30 segundos
4. 1 minuto
5. 2 minutos
6. 5 minutos (máximo)

### Flujo de Polling

```
Enviar Documento
     ↓
Esperar 5s → Consultar Estado
     ↓
¿Finalizado? → SÍ: Actualizar BD y Terminar
     ↓ NO
Esperar 10s → Consultar Estado
     ↓
¿Finalizado? → SÍ: Actualizar BD y Terminar
     ↓ NO
... (continuar con backoff)
```

### Implementación

```typescript
import { pollDocumentStatus } from '@/lib/hka/status-poller';

// Después de enviar factura
const result = await pollDocumentStatus(invoiceId);

console.log(`Status: ${result.status}`);
console.log(`CUFE: ${result.cufe}`);
console.log(`Intentos: ${result.pollCount}`);
console.log(`Tiempo total: ${result.totalTime}ms`);
```

### Worker de Polling en Lote

Para procesar múltiples facturas pendientes:

```typescript
import { pollPendingInvoices } from '@/lib/hka/status-poller';

// Ejecutar cada minuto
setInterval(async () => {
  await pollPendingInvoices();
}, 60000);
```

---

## 4. Reconciliación Periódica

### ¿Por Qué es Necesaria?

Incluso con el mejor polling, pueden ocurrir discrepancias debido a:
- Problemas de red temporales
- Errores en el procesamiento
- Estados que cambiaron después del último poll
- Documentos que "cayeron entre las grietas"

### Flujo de Reconciliación

```
1. Buscar facturas de las últimas N horas (default: 24h)
2. Para cada factura:
   a. Consultar estado actual en HKA
   b. Comparar con estado local
   c. Si hay discrepancia:
      - Actualizar estado local
      - Crear log de auditoría
3. Generar reporte de reconciliación
4. Guardar reporte en audit log
```

### Ejecución Programada

**Recomendación**: Ejecutar nocturnamente a las 2:00 AM

```typescript
import { scheduleReconciliation } from '@/workers/reconciliation-worker';

// Iniciar reconciliación programada
await scheduleReconciliation();
```

### Reconciliación Manual

Para administradores:

```typescript
import { triggerManualReconciliation } from '@/workers/reconciliation-worker';

// Reconciliar últimas 48 horas
const report = await triggerManualReconciliation(48);

console.log(`Documentos revisados: ${report.totalChecked}`);
console.log(`Discrepancias encontradas: ${report.discrepanciesFound}`);
console.log(`Discrepancias corregidas: ${report.fixed}`);
```

---

## 5. Optimizaciones para Alto Volumen

### Procesamiento en Paralelo

**Problema**: Enviar facturas una por una es ineficiente.

**Solución**: Procesamiento paralelo con límites.

```typescript
// Worker configuration
{
  concurrency: 5,           // 5 trabajos simultáneos
  limiter: {
    max: 10,                // Máximo 10 jobs
    duration: 1000          // Por segundo
  }
}
```

### Batching Inteligente

Agrupar facturas por prioridad:

```
ALTA: Facturas con clientes esperando
 ↓
MEDIA: Facturas del día actual
 ↓
BAJA: Facturas recurrentes/batch
```

### Caching Estratégico

Cachear respuestas que no cambian frecuentemente:

```typescript
// Cachear RUC validations (24 horas)
const cachedRuc = await cache.get(`ruc:${ruc}`);
if (cachedRuc) return cachedRuc;

const result = await client.consultarRucDV(ruc);
await cache.set(`ruc:${ruc}`, result, 86400);
```

### Connection Pooling

Reutilizar conexiones SOAP:

```typescript
// Mantener pool de clientes SOAP
const clientPool = new Map<string, HKASOAPClient>();

function getClient(orgId: string) {
  if (!clientPool.has(orgId)) {
    clientPool.set(orgId, createClient(orgId));
  }
  return clientPool.get(orgId);
}
```

---

## 6. Flujo Completo de Procesamiento

### Fase 1: Captura y Encolado (Síncrono)

```
Usuario → API → Validación Local → DB (DRAFT)
                                       ↓
                                    Genera XML
                                       ↓
                                  Valida Totales
                                       ↓
                              DB (QUEUED) + Encolar Job
                                       ↓
                              Response al Usuario
```

**Tiempo**: ~100-200ms

### Fase 2: Procesamiento Asíncrono (Worker)

```
Job Queue → Worker Toma Job
              ↓
         Recupera Invoice + Org
              ↓
        Desencripta Credenciales
              ↓
         Valida Datos Completos
              ↓
        Genera XML Firmado → Base64
              ↓
  ┌─────────────────────────┐
  │ Enhanced SOAP Client    │
  │  - Circuit Breaker      │
  │  - Error Classification │
  │  - Automatic Retry      │
  └─────────────────────────┘
              ↓
    Enviar a HKA (método Enviar)
              ↓
        ¿Respuesta Inmediata?
         /            \
      SÍ             NO
       ↓              ↓
  Update DB      Iniciar Polling
  (AUTHORIZED       Inteligente
   o REJECTED)         ↓
                   Consultar cada
                   5s, 10s, 30s...
                        ↓
                  ¿Estado Final?
                        ↓
                   Update DB
```

**Tiempo**: 5-60 segundos (dependiendo de HKA)

### Fase 3: Verificación y Reconciliación

```
Polling Worker (cada minuto)
    ↓
Buscar facturas PROCESSING > 5s
    ↓
Consultar estado en HKA
    ↓
Actualizar si cambió

Reconciliation Worker (noche)
    ↓
Buscar facturas últimas 24h
    ↓
Verificar todas con HKA
    ↓
Corregir discrepancias
    ↓
Generar reporte
```

---

## 📊 Métricas y Monitoreo

### Métricas del Circuit Breaker

```typescript
const stats = client.getCircuitBreakerStatus();

{
  state: 'CLOSED',
  failures: 0,
  successes: 45,
  totalRequests: 45,
  totalFailures: 2,
  totalSuccesses: 43
}
```

### Métricas de Performance

```typescript
const perfStats = client.getPerformanceStats();

{
  total: 100,
  successful: 95,
  failed: 5,
  successRate: 95,
  avgDuration: 3500,
  byMethod: {
    'Enviar': { total: 80, success: 76, avgDuration: 4200 },
    'FoliosRestantes': { total: 20, success: 19, avgDuration: 500 }
  }
}
```

### Alertas Recomendadas

```
❌ CRÍTICO:
   - Circuit Breaker OPEN por > 5 minutos
   - Error rate > 10%
   - Folios < 100

⚠️  ADVERTENCIA:
   - Circuit Breaker en HALF_OPEN
   - Error rate > 5%
   - Avg duration > 10s
   - Cola de jobs > 1000

ℹ️  INFORMACIÓN:
   - Reconciliación detectó discrepancias
   - Folios < 500
```

---

## 🔧 Configuración de Producción

### Variables de Entorno

```env
# Circuit Breaker
HKA_CIRCUIT_FAILURE_THRESHOLD=5
HKA_CIRCUIT_SUCCESS_THRESHOLD=2
HKA_CIRCUIT_TIMEOUT=60000
HKA_CIRCUIT_MONITORING_PERIOD=120000

# Polling
HKA_POLLING_ENABLED=true
HKA_POLLING_INTERVAL=60000

# Reconciliation
HKA_RECONCILIATION_ENABLED=true
HKA_RECONCILIATION_HOUR=2
HKA_RECONCILIATION_LOOKBACK_HOURS=24

# Performance
HKA_MAX_CONCURRENT_REQUESTS=5
HKA_REQUEST_RATE_LIMIT=10
HKA_REQUEST_RATE_DURATION=1000
```

### Worker Configuration

```typescript
// src/workers/index.ts
import { startPeriodicPoller } from '@/lib/hka/status-poller';
import { scheduleReconciliation } from './reconciliation-worker';

// Start polling worker
await startPeriodicPoller(60000); // Every minute

// Start reconciliation worker
await scheduleReconciliation(); // Nightly at 2 AM
```

---

## 🎯 Mejores Prácticas

### 1. Siempre Usar Enhanced Client en Producción

```typescript
// ✅ CORRECTO
import { createEnhancedHKAClient } from '@/lib/hka/enhanced-soap-client';
const client = createEnhancedHKAClient('production', credentials);

// ❌ INCORRECTO (solo para testing)
import { createHKAClient } from '@/lib/hka/soap-client';
const client = createHKAClient('production', credentials);
```

### 2. Monitorear Circuit Breaker

```typescript
// Verificar estado periódicamente
setInterval(() => {
  const status = client.getCircuitBreakerStatus();
  if (status.state === 'OPEN') {
    alertOps('Circuit Breaker is OPEN!');
  }
}, 60000);
```

### 3. Logs Estructurados

```typescript
// Usar logs estructurados para análisis
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'error',
  method: 'Enviar',
  invoiceId: invoice.id,
  error: classifiedError,
  circuitState: client.getCircuitBreakerStatus().state
}));
```

### 4. Graceful Degradation

```typescript
try {
  const result = await client.enviar(xml);
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit abierto - guardar para reintentar después
    await queue.add('retry-later', { invoiceId });
  } else {
    // Otro error - clasificar y manejar
    const classified = classifyHKAError(error);
    handleError(classified);
  }
}
```

---

## 📚 Referencias

- **HKA Wiki**: https://felwiki.thefactoryhka.com.pa/
- **Circuit Breaker Pattern**: Martin Fowler's article
- **Exponential Backoff**: Google Cloud best practices
- **Reconciliation Patterns**: Event Sourcing patterns

---

**Versión**: 1.0
**Última actualización**: 2025-11-17
