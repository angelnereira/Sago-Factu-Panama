# SAGO-FACTU Panamá 🇵🇦

**SaaS de Facturación Electrónica para Panamá**

Sistema Multi-Tenant de facturación electrónica integrado con The Factory HKA (PAC autorizado por la DGI de Panamá).

> **Rama Principal**: `claude/saas-async-architecture-01KNKiQXDHeEXofvQ3HmxJgE`
> Todos los desarrollos se realizan directamente en esta rama.

---

## 🎯 Características Principales

- ✅ **Multi-Tenant**: Cada organización trae sus propias credenciales HKA (BYOC)
- ✅ **Asíncrono**: Pipeline de procesamiento desacoplado con colas (BullMQ + Redis)
- ✅ **Escalable**: Arquitectura serverless ready (Vercel + Neon PostgreSQL)
- ✅ **Seguro**: Credenciales encriptadas AES-256 en reposo
- ✅ **Completo**: Integración SOAP completa con HKA (todos los métodos)
- ✅ **Trazable**: Auditoría completa de todas las operaciones

---

## 🏗️ Arquitectura

```
┌─────────────┐
│   Frontend  │ Next.js 15 PWA (UI Optimista)
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │ Next.js API Routes
│ (Validación)│ - Valida datos
└──────┬──────┘ - Encola trabajos
       │        - Responde inmediatamente
       ▼
┌─────────────┐
│ Job Queue   │ BullMQ + Redis
│  (BullMQ)   │ - invoice-processing
└──────┬──────┘ - hka-sync
       │        - pdf-generation
       ▼
┌─────────────┐
│   Workers   │ Serverless Functions
│ (Async)     │ - Genera XML DGI
└──────┬──────┘ - Envía a HKA SOAP
       │        - Actualiza BD
       ▼
┌─────────────┐
│     HKA     │ The Factory HKA (PAC)
│    (SOAP)   │ - Certifica facturas
└─────────────┘ - Retorna CUFE, PDF, XML firmado
       │
       ▼
┌─────────────┐
│  Database   │ Neon PostgreSQL + Prisma
│   (Neon)    │ - Multi-tenant data
└─────────────┘ - Audit logs
```

---

## 🚀 Quick Start

### Prerequisitos

- Node.js 18+
- PostgreSQL (recomendado: Neon)
- Redis (local o cloud)
- Credenciales HKA (Demo o Producción)

### Instalación

1. **Clonar repositorio**
   ```bash
   git clone <repo-url>
   cd Sago-Factu-Panama
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```

   Editar `.env` con tus credenciales:
   ```env
   # Database (Neon)
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

   # Redis
   REDIS_URL="redis://localhost:6379"

   # NextAuth
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

   # Encryption
   ENCRYPTION_KEY="generate-with-openssl-rand-base64-32"
   ```

4. **Generar claves de encriptación**
   ```bash
   openssl rand -base64 32
   # Copiar output a ENCRYPTION_KEY y NEXTAUTH_SECRET
   ```

5. **Ejecutar migraciones**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Iniciar servicios**

   Terminal 1 - Next.js (Frontend + API):
   ```bash
   npm run dev
   ```

   Terminal 2 - Workers:
   ```bash
   npm run worker
   ```

7. **Acceder**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

---

## 📁 Estructura del Proyecto

```
Sago-Factu-Panama/
├── prisma/
│   └── schema.prisma          # Schema multi-tenant
├── src/
│   ├── app/                   # Next.js App Router
│   │   └── api/               # API Routes
│   │       ├── invoices/
│   │       │   ├── create/    # POST crear factura
│   │       │   └── [id]/      # GET detalles, PDF
│   │       └── organizations/
│   │           └── [id]/
│   │               └── hka-config/  # Config HKA
│   ├── config/
│   │   └── hka.config.ts      # Catálogos y endpoints HKA
│   ├── lib/
│   │   ├── encryption.ts      # AES-256 encryption
│   │   ├── hka/
│   │   │   ├── soap-client.ts # Cliente SOAP HKA
│   │   │   └── xml-generator.ts # Generador XML DGI
│   │   ├── queue/
│   │   │   ├── config.ts      # BullMQ setup
│   │   │   └── jobs.ts        # Job definitions
│   │   └── prisma.ts          # Prisma client
│   └── workers/
│       ├── index.ts           # Workers entry point
│       └── invoice-processor.ts # Invoice worker
├── .env.example
├── package.json
└── README.md
```

---

## 🔐 Seguridad

### Encriptación de Credenciales

Todas las credenciales HKA se almacenan encriptadas en la base de datos:

```typescript
import { encrypt, decrypt } from '@/lib/encryption';

// Guardar credenciales
const encrypted = encrypt("mi-token-secreto");
await prisma.organization.update({
  data: { hkaTokenEmpresa: encrypted }
});

// Recuperar credenciales
const decrypted = decrypt(organization.hkaTokenEmpresa);
```

**Algoritmo**: AES-256-GCM
**Clave**: 256 bits (32 bytes) en `ENCRYPTION_KEY`

### Multi-Tenancy

- Cada organización tiene sus propias credenciales HKA
- Validación obligatoria antes de facturar (`FoliosRestantes`)
- Aislamiento de datos por `organizationId`
- Auditoría completa de todas las operaciones

---

## 📊 Pipeline de Facturación

### Flujo Completo

1. **Usuario crea factura** (POST `/api/invoices/create`)
   - Validación de datos (Zod)
   - Cálculo de totales
   - Guardado en DB con estado `QUEUED`
   - Encolado en `invoice-processing`
   - Respuesta inmediata al usuario

2. **Worker procesa factura** (asíncrono)
   - Recupera factura y organización
   - Desencripta credenciales HKA
   - Genera XML según esquema DGI
   - Envía a HKA vía SOAP
   - Actualiza estado según respuesta

3. **Estados de factura**
   - `DRAFT`: Borrador
   - `QUEUED`: En cola
   - `PROCESSING`: Worker procesando
   - `AUTHORIZED`: ✅ Autorizada por HKA (tiene CUFE)
   - `REJECTED`: ❌ Rechazada por HKA
   - `FAILED`: ❌ Error técnico
   - `CANCELLED`: Usuario canceló
   - `ANNULLED`: Anulada en HKA

---

## 🔌 Integración HKA

### Métodos Implementados

| Método | Descripción | Implementado |
|--------|-------------|--------------|
| `Enviar` | Enviar factura para certificación | ✅ |
| `EstadoDocumento` | Consultar estado | ✅ |
| `AnulacionDocumento` | Anular factura | ✅ |
| `DescargaXML` | Descargar XML firmado | ✅ |
| `DescargaPDF` | Descargar PDF | ✅ |
| `FoliosRestantes` | Consultar folios disponibles | ✅ |
| `EnvioCorreo` | Reenviar por email | ✅ |
| `RastreoCorreo` | Rastrear envío email | ✅ |
| `ConsultarRucDV` | Validar RUC | ✅ |

### Ejemplo de Uso

```typescript
import { createHKAClient } from '@/lib/hka/soap-client';

const client = createHKAClient('demo', {
  tokenEmpresa: 'your-token',
  tokenPassword: 'your-password'
});

// Enviar factura
const response = await client.enviar(xmlBase64);
console.log(response.cufe); // CUFE de la factura

// Consultar folios
const folios = await client.foliosRestantes();
console.log(folios.foliosDisponibles);
```

---

## 🧪 Testing

### Credenciales Demo

Para pruebas, usa las credenciales demo incluidas:

```typescript
import { HKA_DEMO_CREDENTIALS } from '@/config/hka.config';

// Token: walgofugiitj_ws_tfhka
// Password: Octopusp1oQs5
// RUC Prueba: 155660055-2-2018
// DV: 77
```

### Probar Conexión

```bash
# Via API
curl -X POST http://localhost:3000/api/organizations/[org-id]/hka-config \
  -H "Content-Type: application/json" \
  -d '{
    "hkaEnvironment": "DEMO",
    "hkaTokenEmpresa": "walgofugiitj_ws_tfhka",
    "hkaTokenPassword": "Octopusp1oQs5",
    "validateConnection": true
  }'
```

---

## 🚢 Deployment

### Vercel (Recomendado)

1. **Frontend + API**: Deploy automático desde Git
2. **Workers**: Deploy en Railway, Render o AWS ECS
3. **Database**: Neon PostgreSQL (incluye connection pooling)
4. **Redis**: Upstash Redis (serverless)

### Variables de Entorno (Producción)

```env
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=
ENCRYPTION_KEY=
NODE_ENV=production
```

### Comandos

```bash
# Build
npm run build

# Start production
npm start

# Start workers (separado)
npm run worker
```

---

## 📖 Referencias

- **HKA Wiki**: https://felwiki.thefactoryhka.com.pa/
- **DGI Panamá**: https://www.dgi.gob.pa/
- **Prisma Docs**: https://www.prisma.io/docs
- **BullMQ**: https://docs.bullmq.io/
- **Next.js 15**: https://nextjs.org/docs

---

## 🤝 Contribuciones

Este proyecto implementa el blueprint arquitectónico para SaaS de facturación electrónica en Panamá.

**Autor**: Desarrollado según especificaciones técnicas SAGO-FACTU

---

## 📝 Licencia

Propietario - SAGO-FACTU Panama

---

## 🆘 Soporte

Para dudas sobre:
- **HKA**: Contactar soporte The Factory HKA
- **DGI**: Consultar normativa en www.dgi.gob.pa
- **Arquitectura**: Referirse al blueprint técnico

---

**Version**: 1.0.0
**Last Updated**: 2025-11-17
