# SAGO-FACTU - Arquitectura Técnica Detallada

## Visión General

SAGO-FACTU es un **Middleware Asíncrono Inteligente** para facturación electrónica en Panamá. Su objetivo es desacoplar la experiencia del usuario (UI) del procesamiento pesado de HKA (SOAP), utilizando una arquitectura basada en eventos.

---

## 1. Principios Arquitectónicos

### 1.1 Multi-Tenancy (BYOC - Bring Your Own Credentials)

Cada organización trae sus propias credenciales de HKA:
- ✅ Token de empresa
- ✅ Password
- ✅ Certificado digital (.pfx)
- ✅ Selector de ambiente (Demo/Producción)

**Seguridad**:
- Credenciales encriptadas AES-256-GCM en reposo
- Desencriptación solo en Workers (nunca expuestas al frontend)
- Validación obligatoria mediante `FoliosRestantes` antes de permitir facturar

### 1.2 Arquitectura Asíncrona

**Problema**: HKA SOAP puede tardar 5-30 segundos en responder.

**Solución**: Pipeline asíncrono de 2 fases:

#### Fase A: Captura y Encolado (Síncrono - <200ms)
```
Usuario → API → Validación → DB (QUEUED) → Cola → Response
```

#### Fase B: Procesamiento (Asíncrono - Background)
```
Cola → Worker → XML → HKA SOAP → DB (AUTHORIZED/REJECTED)
```

**Beneficio**: Usuario no espera. La UI puede mostrar "Procesando..." y actualizar vía polling o WebSockets.

### 1.3 Escalabilidad Horizontal

- **API Gateway**: Serverless (Vercel Edge Functions)
- **Workers**: Escalado independiente (Railway, Render, ECS)
- **Database**: Neon PostgreSQL con PgBouncer (connection pooling)
- **Cache**: Redis (Upstash) para colas y cache

---

## 2. Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Frontend | Next.js 15 | UI + SSR + PWA |
| Backend | Next.js API Routes | API Gateway |
| Database | PostgreSQL (Neon) | Multi-tenant data |
| ORM | Prisma | Type-safe DB access |
| Queue | BullMQ + Redis | Asynchronous jobs |
| Workers | Node.js | Background processing |
| Auth | NextAuth.js | Multi-tenant auth |
| SOAP Client | node-soap | HKA integration |
| XML | xmlbuilder2 | DGI XML generation |
| Encryption | Node crypto | AES-256-GCM |

---

## 3. Data Model (Prisma Schema)

### 3.1 Core Entities

```prisma
Organization (Tenant)
├── HKA Credentials (encrypted)
├── Digital Certificate
├── Configuration (sucursal, punto facturación)
├── Users
└── Invoices

Invoice
├── Document Identification
├── Receptor Information
├── Financial Data
├── HKA Integration Fields (CUFE, XML, PDF, QR)
├── Processing Metadata (status, retries, errors)
└── Items

User
├── Multi-tenant (belongs to Organization)
└── Role (SUPER_ADMIN, ADMIN, USER)

AuditLog
├── All operations tracked
└── Linked to Organization/User/Invoice
```

### 3.2 Invoice Status Lifecycle

```
DRAFT
  ↓
QUEUED ← (Usuario crea factura)
  ↓
PROCESSING ← (Worker toma el job)
  ↓
  ├─→ AUTHORIZED ← (HKA código 00/01 + CUFE)
  ├─→ REJECTED ← (HKA rechaza: ERR_*)
  └─→ FAILED ← (Error técnico: timeout, red, etc)

AUTHORIZED → ANNULLED ← (Usuario anula)
```

---

## 4. Pipeline de Facturación

### 4.1 Paso A: API Gateway (POST /api/invoices/create)

```typescript
1. Validar request (Zod schema)
2. Verificar usuario pertenece a organización
3. Verificar credenciales HKA configuradas y validadas
4. Generar número de documento secuencial
5. Calcular totales (subtotal, ITBMS, total)
6. Crear Invoice + Items en DB (estado: QUEUED)
7. Encolar job en BullMQ
8. Responder inmediatamente al usuario
```

**Tiempo**: ~100-200ms

### 4.2 Paso B: Worker Processing

```typescript
1. Recuperar Invoice + Items de DB
2. Recuperar Organization con credenciales
3. Desencriptar credenciales HKA
4. Validar datos de factura (totales, RUC, etc)
5. Generar XML según esquema DGI FE_v1.00
6. Convertir XML a Base64
7. Crear cliente SOAP HKA
8. Enviar a HKA (método: Enviar)
9. Procesar respuesta:
   - Éxito (00): Guardar CUFE, XML firmado, PDF → AUTHORIZED
   - Rechazo (ERR_*): Guardar error → REJECTED
   - Error red: Lanzar excepción → Reintento BullMQ
10. Actualizar Invoice en DB
11. Crear AuditLog
```

**Tiempo**: 5-30 segundos (depende de HKA)

---

## 5. Integración HKA SOAP

### 5.1 Cliente Genérico

```typescript
class HKASOAPClient {
  constructor(environment, credentials)

  // Core
  async enviar(xmlBase64): EnviarResponse
  async estadoDocumento(data): EstadoDocumentoResponse
  async anulacionDocumento(data, motivo): AnulacionResponse

  // Downloads
  async descargaXML(data): DescargaResponse
  async descargaPDF(data): DescargaResponse

  // Management
  async foliosRestantes(): FoliosRestantesResponse
  async envioCorreo(data, email)
  async rastreoCorreo(data)

  // Utils
  async consultarRucDV(ruc)
  async testConnection(): boolean
}
```

### 5.2 Retry Strategy

```typescript
maxRetries: 3
backoff: Exponential (2s, 4s, 8s)
retryable: Network errors only (ECONNREFUSED, ETIMEDOUT)
non-retryable: HKA business errors (ERR_*)
```

---

## 6. Generación XML DGI

### 6.1 Esquema FE_v1.00

```xml
<rFE xmlns="http://dgi-fep.mef.gob.pa">
  <dEncab>
    <dTipoDE>01</dTipoDE>
    <dNroDF>0000000001</dNroDF>
    <dPtoFacDF>001</dPtoFacDF>
    <dFechaEm>2025-11-17T10:30:00-05:00</dFechaEm>
  </dEncab>
  <gEmis>
    <dRucEm>123456789-1-2023</dRucEm>
    <dDVEm>12</dDVEm>
    <dNombEm>Empresa Demo</dNombEm>
  </gEmis>
  <gRecep>...</gRecep>
  <gDatosItems>
    <gDatosItem>...</gDatosItem>
  </gDatosItems>
  <gTotales>
    <dSubTotal>100.00</dSubTotal>
    <dTotITBMS>7.00</dTotITBMS>
    <dTotalFact>107.00</dTotalFact>
  </gTotales>
</rFE>
```

### 6.2 Validaciones Pre-Envío

```typescript
✅ Totales cuadran (±0.01 por redondeo)
✅ Items > 0 y < 999
✅ RUC receptor válido (si es contribuyente)
✅ Tasas ITBMS válidas (00, 01, 02, 03)
✅ Descripción < 500 caracteres
```

---

## 7. Sistema de Colas (BullMQ)

### 7.1 Colas Definidas

```typescript
invoice-processing  // Procesamiento principal
hka-sync           // Sincronización de estados
pdf-generation     // Generación de PDFs
email-notification // Envío de emails
```

### 7.2 Configuración Jobs

```typescript
{
  attempts: 5,              // Reintentos
  backoff: {
    type: 'exponential',
    delay: 3000             // 3s, 6s, 12s, 24s, 48s
  },
  timeout: 300000,          // 5 min timeout
  removeOnComplete: {
    count: 100,             // Mantener últimos 100
    age: 86400              // 24 horas
  }
}
```

### 7.3 Worker Concurrency

```typescript
{
  concurrency: 5,           // 5 jobs simultáneos
  limiter: {
    max: 10,                // Max 10 jobs
    duration: 1000          // Por segundo
  }
}
```

---

## 8. Seguridad

### 8.1 Encriptación en Reposo

**Algoritmo**: AES-256-GCM

```typescript
// Encriptar
const encrypted = encrypt(plaintext)
// Formato: "iv:authTag:ciphertext" (Base64)

// Desencriptar
const decrypted = decrypt(encrypted)
// Valida authTag (authenticated encryption)
```

**Campos Encriptados**:
- `Organization.hkaTokenEmpresa`
- `Organization.hkaTokenPassword`
- `Organization.certificatePassword`

### 8.2 Aislamiento Multi-Tenant

```typescript
// Todas las queries incluyen organizationId
const invoice = await prisma.invoice.findMany({
  where: { organizationId }
})

// Verificación en API
if (invoice.organizationId !== user.organizationId) {
  throw new Error('Unauthorized')
}
```

### 8.3 Auditoría

```typescript
AuditLog {
  organizationId
  userId
  invoiceId
  action: 'CREATE' | 'HKA_SEND' | 'HKA_AUTHORIZED' | ...
  entity: 'Invoice' | 'Organization' | ...
  details: Json
  ipAddress
  userAgent
  createdAt
}
```

---

## 9. Escalabilidad

### 9.1 Database Connection Pooling

**Problema**: Vercel Serverless Functions = muchas conexiones DB

**Solución**: Neon PgBouncer

```env
# Connection pooling (para serverless)
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true"

# Migraciones (conexión directa)
DIRECT_URL="postgresql://user:pass@host/db"
```

**Límites**:
- Vercel Free: 60 conexiones simultáneas
- PgBouncer: Pool de 20 → reutilización

### 9.2 Separación API / Workers

```
Frontend + API (Vercel)
  ↓ enqueue
Redis (Upstash)
  ↓ consume
Workers (Railway/Render)
  ↓ write
PostgreSQL (Neon)
```

**Beneficio**: Escalar Workers independientemente de API

### 9.3 Cache Strategy (Futuro)

```typescript
// Edge caching (Vercel)
export const config = {
  runtime: 'edge'
}

// Cachear catálogos DGI (inmutables)
const catalogs = await getCachedCatalogs() // 1 día TTL
```

---

## 10. Monitoreo y Observabilidad

### 10.1 Métricas Clave

```
- Invoices created/hour
- Invoices authorized/rejected ratio
- HKA response time (p50, p95, p99)
- Queue depth (jobs pending)
- Worker throughput (jobs/sec)
- Error rate by type
```

### 10.2 Alertas (Futuro)

```
❌ HKA down (timeout > 60s)
❌ Queue backlog > 1000 jobs
❌ Error rate > 5%
⚠️  Folios < 100 (organización X)
⚠️  Encryption key missing
```

---

## 11. Deployment Architecture

### Production Setup

```
┌─────────────────┐
│  Vercel Edge    │ Frontend + API Routes
│  (Global CDN)   │ - Next.js 15
└────────┬────────┘ - API Gateway
         │
         ▼
┌─────────────────┐
│  Upstash Redis  │ Queue Storage
│  (Serverless)   │ - BullMQ jobs
└────────┬────────┘ - Cache
         │
         ▼
┌─────────────────┐
│  Railway        │ Workers (Node.js)
│  (Containers)   │ - invoice-processor
└────────┬────────┘ - Autoscaling
         │
         ▼
┌─────────────────┐
│  Neon           │ PostgreSQL
│  (Serverless)   │ - Multi-tenant data
└─────────────────┘ - Connection pooling
         │
         ▼
┌─────────────────┐
│  HKA SOAP API   │ The Factory HKA
│  (External)     │ - Certificación DGI
└─────────────────┘
```

---

## 12. Roadmap Técnico

### Phase 1 - Core (✅ Completado)
- ✅ Multi-tenant schema
- ✅ Encryption system
- ✅ HKA SOAP integration
- ✅ XML generation
- ✅ Async pipeline (BullMQ)
- ✅ API Routes

### Phase 2 - Auth & UI (Pendiente)
- ⏳ NextAuth.js setup
- ⏳ Frontend (React components)
- ⏳ Dashboard UI
- ⏳ Invoice creation form

### Phase 3 - Features (Futuro)
- ⏳ PDF download
- ⏳ Email notifications
- ⏳ Bulk invoicing
- ⏳ Invoice templates

### Phase 4 - Advanced (Futuro)
- ⏳ WebSockets (real-time status)
- ⏳ Analytics dashboard
- ⏳ Webhook support
- ⏳ API for integrations

---

## 13. Consideraciones de Producción

### 13.1 Secrets Management

```bash
# Vercel
vercel env add ENCRYPTION_KEY
vercel env add DATABASE_URL
vercel env add REDIS_URL

# Railway (Workers)
railway variables set ENCRYPTION_KEY=...
```

### 13.2 Monitoring

```typescript
// Sentry (errors)
import * as Sentry from '@sentry/nextjs'

// Vercel Analytics (performance)
import { Analytics } from '@vercel/analytics/react'

// Custom metrics
import { track } from '@/lib/analytics'
track('invoice.created', { organizationId })
```

### 13.3 Backup Strategy

```
Database: Neon automated backups (daily)
Redis: Upstash persistence enabled
Logs: Vercel logs (7 days retention)
```

---

**Versión**: 1.0
**Última actualización**: 2025-11-17
