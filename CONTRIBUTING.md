# Guía de Contribución - SAGO-FACTU

## 📌 Estructura de Ramas

### Rama Principal de Desarrollo

**Rama**: `claude/saas-async-architecture-01KNKiQXDHeEXofvQ3HmxJgE`

Esta es la rama principal del proyecto. Todos los desarrollos se realizan **directamente** en esta rama.

### Por qué no usamos "main" o "master"

Este proyecto se desarrolla en un entorno específico que requiere que las ramas:
- Comiencen con el prefijo `claude/`
- Terminen con el session ID correspondiente

Por esta razón, la rama `claude/saas-async-architecture-01KNKiQXDHeEXofvQ3HmxJgE` actúa como nuestra rama principal.

---

## 🔄 Flujo de Trabajo

### Desarrollo Normal

1. **Asegúrate de estar en la rama principal**:
   ```bash
   git checkout claude/saas-async-architecture-01KNKiQXDHeEXofvQ3HmxJgE
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
   git push origin claude/saas-async-architecture-01KNKiQXDHeEXofvQ3HmxJgE
   ```

### Tipos de Commits

Seguimos la convención de commits semánticos:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `style:` - Formato, punto y coma faltantes, etc
- `refactor:` - Refactorización de código
- `test:` - Añadir tests
- `chore:` - Tareas de mantenimiento

**Ejemplos**:
```bash
git commit -m "feat: Implementar endpoint de anulación de facturas"
git commit -m "fix: Corregir cálculo de ITBMS en items"
git commit -m "docs: Actualizar guía de instalación"
```

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
