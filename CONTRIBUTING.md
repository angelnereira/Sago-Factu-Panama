# Guía de Contribución - SAGO-FACTU

## 📌 Estructura de Ramas

### Rama Principal de Desarrollo

**Rama**: `claude/main-01KNKiQXDHeEXofvQ3HmxJgE`

Esta es la rama principal del proyecto. Todos los desarrollos se realizan **directamente** en esta rama.

### Por qué no usamos "main" o "master"

Este proyecto se desarrolla en un entorno específico que requiere que las ramas:
- Comiencen con el prefijo `claude/`
- Terminen con el session ID correspondiente

Por esta razón, la rama `claude/main-01KNKiQXDHeEXofvQ3HmxJgE` actúa como nuestra rama principal.

---

## 🔄 Flujo de Trabajo

### Desarrollo Normal

1. **Asegúrate de estar en la rama principal**:
   ```bash
   git checkout claude/main-01KNKiQXDHeEXofvQ3HmxJgE
   git pull
   ```

2. **Hacer cambios**:
   ```bash
   # Editar archivos
   git add .
   git commit -m "tipo: descripción del cambio"
   ```

3. **Subir cambios**:
   ```bash
   git push origin claude/main-01KNKiQXDHeEXofvQ3HmxJgE
   ```

### Convención de Commits en Español

**IMPORTANTE**: Todos los commits deben escribirse **completamente en español** para facilitar la comprensión del proyecto y mantener un trabajo profesional.

Seguimos la convención de commits semánticos con descripciones claras y concisas:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `style:` - Formato, punto y coma faltantes, etc
- `refactor:` - Refactorización de código
- `test:` - Añadir tests
- `chore:` - Tareas de mantenimiento

**Ejemplos de Commits Profesionales**:
```bash
# Nuevas funcionalidades
git commit -m "feat: Implementar sistema completo de autenticación con NextAuth"
git commit -m "feat: Agregar endpoint de anulación de facturas con validación DGI"
git commit -m "feat: Integrar sincronización de tiempo con API pública de Panama"

# Correcciones
git commit -m "fix: Corregir cálculo de ITBMS en items con múltiples tasas"
git commit -m "fix: Resolver error de validación en credenciales HKA"
git commit -m "fix: Ajustar zona horaria en timestamps de facturas"

# Documentación
git commit -m "docs: Actualizar guía de instalación con requisitos de Redis"
git commit -m "docs: Agregar documentación de API de sincronización de tiempo"
git commit -m "docs: Actualizar README con nueva estructura de ramas"

# Refactorización
git commit -m "refactor: Reorganizar estructura de carpetas de componentes"
git commit -m "refactor: Mejorar manejo de errores en servicios HKA"

# Mantenimiento
git commit -m "chore: Actualizar dependencias de producción a últimas versiones"
git commit -m "chore: Configurar variables de entorno para producción"
```

**Guía para Escribir Buenos Commits**:
- ✅ Usa verbos en infinitivo: "Implementar", "Agregar", "Corregir", "Actualizar"
- ✅ Sé específico y descriptivo: explica QUÉ cambió y POR QUÉ
- ✅ Mantén la primera línea en menos de 72 caracteres
- ❌ Evita mensajes genéricos como "fix bug" o "update file"
- ❌ No uses spanglish ni mezcles idiomas

---

## 🚀 Despliegue

### Producción

Cuando estés listo para desplegar a producción:

1. **Crear un Pull Request** (si aplica según tu plataforma)
2. **Mergear a la rama de producción** que tu plataforma de hosting utilice
3. **Tag de versión**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

---

## 📝 Checklist de Contribución

Antes de hacer commit, verifica:

- [ ] El código compila sin errores: `npm run build`
- [ ] Las migraciones de Prisma están actualizadas
- [ ] Los tipos de TypeScript están correctos
- [ ] La documentación está actualizada (si aplica)
- [ ] El commit message sigue el formato semántico
- [ ] Has probado los cambios localmente

---

## 🔍 Revisión de Código

### Para Revisores

Al revisar un PR, verifica:

1. **Funcionalidad**: El código hace lo que dice hacer
2. **Seguridad**: No hay vulnerabilidades evidentes
3. **Performance**: No hay operaciones bloqueantes innecesarias
4. **Estilo**: Sigue las convenciones del proyecto
5. **Tests**: Los cambios están cubiertos por tests (cuando aplique)

---

## 🆘 Ayuda

Si tienes dudas sobre el flujo de trabajo:

1. Revisa la documentación en `README.md`
2. Consulta la arquitectura en `ARCHITECTURE.md`
3. Sigue la guía de setup en `SETUP.md`

---

**Última actualización**: 2025-11-17
