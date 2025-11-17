# Sistema de Sincronización de Tiempo

Sistema completo de sincronización horaria para SAGO-FACTU que garantiza timestamps precisos en todas las facturas electrónicas usando la hora oficial de Panamá.

---

## 🎯 Propósito

Asegurar que todas las facturas emitidas tengan **timestamps exactos y sincronizados** con la hora oficial de Panamá, cumpliendo con los requisitos de la DGI para facturación electrónica.

## 📡 Fuente de Tiempo

**API Utilizada:** [WorldTimeAPI.org](https://worldtimeapi.org/)
- **Timezone:** `America/Panama`
- **Endpoint:** `https://worldtimeapi.org/api/timezone/America/Panama`
- **Características:**
  - ✅ Gratuito, sin límites
  - ✅ No requiere API key
  - ✅ Respuesta en tiempo real
  - ✅ Alta disponibilidad

## 🏗️ Arquitectura

### 1. Servicio de Sincronización (`src/lib/time/time-sync.ts`)

**Funciones principales:**

```typescript
// Obtener hora sincronizada actual
const time = getSyncedTime(); // Date object

// Obtener timestamp Unix
const timestamp = getSyncedTimestamp(); // number (ms)

// Obtener ISO string para BD
const isoString = getSyncedISOString(); // "2024-11-17T14:30:25.000Z"

// Formatear para display
const formatted = formatSyncedTime(); // "17/11/2024, 2:30:25 PM"

// Sincronizar manualmente
await synchronizeTime();
```

**Características:**
- Auto-sincronización al cargar la aplicación
- Re-sincronización automática cada hora
- Cálculo de offset local vs servidor
- Fallback a hora local si falla la API

### 2. Hook de React (`src/hooks/useSyncedTime.ts`)

Hook para componentes que necesitan tiempo en tiempo real:

```typescript
function MyComponent() {
  const { time, synced, offset, loading } = useSyncedTime();

  return (
    <div>
      Hora: {time.toLocaleTimeString()}
      Estado: {synced ? '✓ Sincronizado' : '⚠ Sin sincronizar'}
    </div>
  );
}
```

### 3. Componente Visual (`src/components/common/SyncedClock.tsx`)

Reloj visual con opciones configurables:

```typescript
<SyncedClock
  showDate={true}
  showSeconds={true}
  showTimezone={true}
  showSyncStatus={true}
  compact={false}
/>
```

**Modos:**
- **Compact:** Diseño horizontal, ideal para headers
- **Full:** Diseño vertical con toda la información

### 4. API Endpoint (`src/app/api/time/sync/route.ts`)

Endpoint del servidor para consultas de tiempo:

```
GET /api/time/sync

Response:
{
  "success": true,
  "serverTime": "2024-11-17T19:30:25.123Z",
  "unixtime": 1700244625,
  "timezone": "America/Panama",
  "utcOffset": "-05:00",
  "dayOfWeek": 6,
  "dayOfYear": 322,
  "weekNumber": 46
}
```

### 5. Utilidades para Facturas (`src/lib/time/invoice-timestamps.ts`)

Funciones especializadas para facturación:

```typescript
// Timestamp de creación de factura
const timestamp = getInvoiceTimestamp();

// Fecha en formato DGI (YYYY-MM-DD)
const date = getInvoiceDateDGI();

// Hora en formato DGI (HH:MM:SS)
const time = getInvoiceTimeDGI();

// DateTime completo (YYYY-MM-DDTHH:MM:SS)
const datetime = getInvoiceDateTimeDGI();

// Validar fecha de emisión
const validation = validateEmissionDate('2024-11-17');
// { valid: true } | { valid: false, error: "..." }
```

---

## 🔄 Flujo de Sincronización

```
1. Aplicación carga en navegador
   ↓
2. time-sync.ts ejecuta auto-sync
   ↓
3. Consulta WorldTimeAPI: America/Panama
   ↓
4. Recibe hora oficial: 2024-11-17T14:30:25-05:00
   ↓
5. Calcula offset: serverTime - localTime
   ↓
6. Almacena offset en memoria
   ↓
7. Componentes usan getSyncedTime()
   ↓
8. Cada llamada aplica offset: localNow + offset
   ↓
9. Re-sincroniza cada hora automáticamente
```

---

## 📊 Visualización en UI

### Header del Dashboard

El reloj aparece en el header principal:

```
┌─────────────────────────────────────────────────┐
│ Organización      │ 2:30:25 PM 17/11/2024 ✓    │
│ Mi Empresa        │ 850 folios   🔔   👤       │
└─────────────────────────────────────────────────┘
```

**Indicadores:**
- ✅ **✓ Verde:** Sincronizado con WorldTimeAPI
- ⚠️ **⚠ Amarillo:** Sin sincronizar (usando hora local)
- ⏳ **⏳:** Sincronizando...

---

## 🎯 Uso en Facturas

### Al Crear Factura

```typescript
import { getInvoiceTimestamp, getInvoiceDateDGI } from '@/lib/time/invoice-timestamps';

const invoice = await prisma.invoice.create({
  data: {
    numeroDocumentoFiscal: 'FAC-001',
    fechaEmision: getInvoiceDateDGI(), // "2024-11-17"
    createdAt: getInvoiceTimestamp(),   // ISO timestamp
    // ...otros campos
  }
});
```

### En XML de HKA

```typescript
import { getInvoiceDateDGI, getInvoiceTimeDGI } from '@/lib/time/invoice-timestamps';

const xml = `
<rFE>
  <dEncab>
    <dFechaEm>${getInvoiceDateDGI()}</dFechaEm>
    <dHoraEm>${getInvoiceTimeDGI()}</dHoraEm>
  </dEncab>
</rFE>
`;
```

### Validación de Fechas

```typescript
import { validateEmissionDate } from '@/lib/time/invoice-timestamps';

const result = validateEmissionDate('2024-11-17');
if (!result.valid) {
  throw new Error(result.error);
}
```

---

## ⚙️ Configuración

### Variables de Entorno (Opcionales)

```env
# Intervalo de re-sincronización (default: 3600000 = 1 hora)
SYNC_INTERVAL_MS=3600000

# Timezone (default: America/Panama)
TIMEZONE=America/Panama
```

---

## 🔍 Monitoreo

### Ver Estado de Sincronización

```typescript
import { isSynced, getTimeOffset, getLastSyncTime } from '@/lib/time/time-sync';

console.log('Sincronizado:', isSynced());
console.log('Offset:', getTimeOffset(), 'ms');
console.log('Última sincronización:', getLastSyncTime());
```

### Logs de Consola

```
[TimeSync] Time synchronized: {
  serverTime: "2024-11-17T14:30:25.000Z",
  localTime: "2024-11-17T14:30:24.850Z",
  offset: "150ms",
  timezone: "America/Panama"
}
```

---

## 🛡️ Manejo de Errores

### Si WorldTimeAPI falla:

1. **Primera capa:** Intenta con API del servidor (`/api/time/sync`)
2. **Segunda capa:** Usa hora local del navegador
3. **Indicador visual:** Muestra ⚠️ en lugar de ✓

### Si hay discrepancia > 5 segundos:

```javascript
const timeSinceSync = Date.now() - lastSyncTime;
if (timeSinceSync > SYNC_INTERVAL) {
  console.warn('[TimeSync] Time offset is stale, consider re-syncing');
}
```

---

## 📋 Reglas de Negocio DGI

Según regulaciones de la DGI de Panamá:

1. ✅ **Fecha de emisión:** No puede ser futura
2. ✅ **Rango permitido:** Máximo 7 días en el pasado
3. ✅ **Timezone:** America/Panama (UTC-5)
4. ✅ **Formato fecha:** YYYY-MM-DD
5. ✅ **Formato hora:** HH:MM:SS (24 horas)

Todas estas reglas están implementadas en `invoice-timestamps.ts`.

---

## 🧪 Testing

### Prueba Manual

1. Abrir DevTools → Console
2. Ejecutar:
```javascript
import { synchronizeTime, getSyncedTime } from '@/lib/time/time-sync';

// Ver hora sincronizada
console.log(getSyncedTime());

// Forzar re-sincronización
await synchronizeTime();
```

### Validación de Fechas

```javascript
import { validateEmissionDate } from '@/lib/time/invoice-timestamps';

// Fecha válida
console.log(validateEmissionDate('2024-11-17')); // { valid: true }

// Fecha futura (inválida)
console.log(validateEmissionDate('2025-01-01'));
// { valid: false, error: "La fecha no puede ser futura" }

// Fecha muy antigua (inválida)
console.log(validateEmissionDate('2024-10-01'));
// { valid: false, error: "La fecha no puede ser mayor a 7 días en el pasado" }
```

---

## 🚨 Alertas Recomendadas

Implementar alertas cuando:

- ❌ **Offset > 5000ms:** Diferencia significativa entre local y servidor
- ❌ **Sin sincronización > 2 horas:** Hora podría estar desactualizada
- ❌ **API falla consecutivamente:** Problema de conectividad

---

## 📚 Referencias

- **WorldTimeAPI:** https://worldtimeapi.org/
- **Timezone Database:** https://www.iana.org/time-zones
- **DGI Panamá:** Regulaciones de facturación electrónica
- **ISO 8601:** Formato estándar de fecha/hora

---

**Versión:** 1.0
**Última actualización:** 2024-11-17
**Timezone:** America/Panama (UTC-5)
