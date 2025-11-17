# SAGO-FACTU - Guía de Configuración Inicial

Esta guía te llevará paso a paso desde un repositorio vacío hasta un sistema funcional.

---

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

- ✅ Node.js 18+ (`node --version`)
- ✅ npm o yarn
- ✅ Git
- ✅ PostgreSQL (recomendado: cuenta Neon gratuita)
- ✅ Redis (local o Upstash)

---

## 🚀 Paso 1: Clonar e Instalar

```bash
# Clonar repositorio
git clone <repo-url>
cd Sago-Factu-Panama

# Instalar dependencias
npm install
```

---

## 🔐 Paso 2: Configurar Variables de Entorno

### 2.1 Generar claves de encriptación

```bash
# Generar ENCRYPTION_KEY (32 bytes)
openssl rand -base64 32

# Copiar el output (ejemplo):
# kX9mP2vL8qR4wZ7nT5bY3hJ6dF1gK0sA9cV8xN7mU4o=
```

### 2.2 Crear archivo `.env`

```bash
cp .env.example .env
```

### 2.3 Editar `.env` con tus credenciales

```env
# Database (Neon PostgreSQL)
# Consigue en: https://neon.tech
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Redis
# Opción 1: Local
REDIS_URL="redis://localhost:6379"
# Opción 2: Upstash (https://upstash.com)
# REDIS_URL="rediss://default:password@region.upstash.io:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<pegar-output-de-openssl-rand>"

# Encryption
ENCRYPTION_KEY="<pegar-output-de-openssl-rand>"

# Node Environment
NODE_ENV="development"
```

---

## 🗄️ Paso 3: Configurar Base de Datos

### 3.1 Crear cuenta en Neon (gratis)

1. Ir a https://neon.tech
2. Sign up con GitHub
3. Crear nuevo proyecto: "sago-factu"
4. Copiar connection string (con pooling)

### 3.2 Ejecutar migraciones

```bash
# Crear migración inicial
npx prisma migrate dev --name init

# Generar Prisma Client
npx prisma generate
```

### 3.3 Verificar conexión

```bash
# Abrir Prisma Studio
npx prisma studio
```

Deberías ver las tablas creadas (Organization, User, Invoice, etc)

---

## 📨 Paso 4: Configurar Redis

### Opción A: Redis Local (Desarrollo)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Verificar
redis-cli ping
# Respuesta: PONG
```

### Opción B: Upstash (Cloud - Recomendado)

1. Ir a https://upstash.com
2. Crear cuenta gratuita
3. Crear base de datos Redis
4. Copiar URL de conexión (REST API o Redis URL)
5. Pegar en `.env` como `REDIS_URL`

---

## 🧪 Paso 5: Probar el Sistema

### 5.1 Iniciar Servidor de Desarrollo

Terminal 1:
```bash
npm run dev
```

Esperar a ver:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### 5.2 Iniciar Workers

Terminal 2:
```bash
npm run worker
```

Esperar a ver:
```
🚀 Starting SAGO-FACTU Workers...
✅ 1 worker(s) started successfully
[Worker] Invoice processing worker started
```

### 5.3 Verificar Health Check

Abrir en navegador:
```
http://localhost:3000/api/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T...",
  "services": {
    "database": true,
    "redis": true,
    "queues": {
      "invoice-processing": true,
      "hka-sync": true,
      ...
    }
  }
}
```

---

## 🏢 Paso 6: Crear Primera Organización

### 6.1 Usando Prisma Studio

```bash
npx prisma studio
```

1. Ir a tabla `Organization`
2. Click "Add record"
3. Llenar campos:
   - name: "Mi Empresa Demo"
   - ruc: "155660055-2-2018"
   - dv: "77"
   - email: "admin@empresa.com"
   - hkaEnvironment: "DEMO"

4. Guardar

### 6.2 Configurar Credenciales HKA

Hacer POST a:
```bash
curl -X POST http://localhost:3000/api/organizations/[org-id]/hka-config \
  -H "Content-Type: application/json" \
  -d '{
    "hkaEnvironment": "DEMO",
    "hkaTokenEmpresa": "walgofugiitj_ws_tfhka",
    "hkaTokenPassword": "Octopusp1oQs5",
    "validateConnection": true
  }'
```

Deberías recibir:
```json
{
  "success": true,
  "message": "HKA credentials validated successfully. 999 folios available."
}
```

---

## 📄 Paso 7: Crear Primera Factura

### 7.1 Crear Usuario

En Prisma Studio, tabla `User`:
- email: "usuario@empresa.com"
- name: "Usuario Demo"
- password: (hash bcrypt)
- role: "ADMIN"
- organizationId: [id de la organización creada]

### 7.2 Crear Factura via API

```bash
curl -X POST http://localhost:3000/api/invoices/create \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "[org-id]",
    "userId": "[user-id]",
    "tipoReceptor": "02",
    "receptorNombre": "Cliente Final",
    "formaPago": "02",
    "items": [
      {
        "descripcion": "Producto Demo",
        "cantidad": 1,
        "precioUnitario": 100,
        "tasaItbms": "01"
      }
    ]
  }'
```

### 7.3 Verificar Procesamiento

Deberías ver en logs del Worker:
```
[Worker] Processing invoice xxx for organization yyy
[Worker] Sending invoice xxx to HKA (demo)
[Worker] Invoice xxx AUTHORIZED with CUFE: xxxxx
[Worker] Job completed successfully
```

### 7.4 Consultar Factura

```bash
curl http://localhost:3000/api/invoices/[invoice-id]
```

Deberías ver la factura con:
- status: "AUTHORIZED"
- cufe: "xxxxx"
- pdfBase64: "JVBERi0x..."

---

## ✅ Verificaciones Finales

- [ ] Health check retorna `status: "healthy"`
- [ ] Workers corriendo sin errores
- [ ] Organización creada y validada con HKA
- [ ] Factura procesada exitosamente (AUTHORIZED)
- [ ] CUFE recibido de HKA
- [ ] PDF disponible en base64

---

## 🚨 Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"

**Solución**: Ejecutar `openssl rand -base64 32` y pegar en `.env`

### Error: "Can't reach database server"

**Solución**:
1. Verificar DATABASE_URL en `.env`
2. Verificar que Neon proyecto está activo
3. Verificar firewall permite conexiones salientes

### Error: "Redis connection refused"

**Solución**:
1. Si local: `redis-cli ping` para verificar Redis corriendo
2. Si Upstash: verificar REDIS_URL correcto

### Error: "HKA credentials not validated"

**Solución**:
1. Verificar tokenEmpresa y tokenPassword correctos
2. Usar credenciales DEMO para pruebas:
   - Token: walgofugiitj_ws_tfhka
   - Password: Octopusp1oQs5

### Workers no procesan facturas

**Solución**:
1. Verificar `npm run worker` corriendo
2. Verificar Redis conectado
3. Ver logs para errores específicos

---

## 📚 Siguiente Pasos

1. ✅ Sistema funcionando
2. ⏭️ Implementar NextAuth.js para autenticación
3. ⏭️ Desarrollar UI del Dashboard
4. ⏭️ Implementar formulario de creación de facturas
5. ⏭️ Deploy a producción (Vercel + Railway)

---

## 🆘 Ayuda

- **Documentación Técnica**: Ver `ARCHITECTURE.md`
- **API Reference**: Ver `README.md`
- **HKA Wiki**: https://felwiki.thefactoryhka.com.pa/

---

**¡Felicidades! Tu sistema SAGO-FACTU está configurado y funcionando.** 🎉
