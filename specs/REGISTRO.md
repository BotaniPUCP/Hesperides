# Registro de specs

| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|--------------|
| SPEC-000 | Arquitectura general      | ✅ Completado  | —          | S0     | 2026-09-06   |
| SPEC-001 | Autenticación             | 👀 En revisión  | —          | S0     |              |
| SPEC-002 | Modelo de datos           | 👀 En revisión  | —          | S0     |              |
| SPEC-003 | Catálogos configurables   | 👀 En revisión  | —          | S0     |              |
| SPEC-C01 | Componentes UI            | 👀 En revisión  | —          | S0     |              |
| SPEC-C02 | Manejo de errores         | 👀 En revisión  | —          | S0     |              |
| SPEC-C03 | Patrones de API           | 👀 En revisión  | —          | S0     |              |

**Leyenda:** ⏳ Pendiente · 📝 En spec · 👀 En revisión · 🔄 En progreso · ✅ Completado

---

## Decisiones abiertas que hereda cada spec

El proyecto base dejó estos puntos sin resolver a propósito: pertenecen a un spec
que todavía no se ha escrito. La pareja que tome ese spec debe cerrarlos.

| Decisión | La cierra | Estado actual en el código |
|----------|-----------|----------------------------|
| Versionado de rutas en servicios internos | SPEC-C03 | El backend expone `/api/v1/health`; el data service expone `/health`, sin prefijo. El sobre de respuesta sí es idéntico en ambos. Definir si los servicios internos llevan `/api/v1` y alinear `services/app/routes/health.py`. |
| Almacenamiento del token en web vs. móvil | SPEC-001 | `frontend/src/lib/api.ts` marca el punto de extensión del refresh, sin implementar. El SPEC-000 pide httpOnly cookie en web y SecureStore en móvil: son dos flujos distintos en el mismo cliente, y la cookie implica protección CSRF. |
| Entidades de dominio | SPEC-002 | `shared/types/models.ts` solo define `AuditFields`. No hay ninguna `@Entity` en el backend. |
| Estructura de la app móvil | Spec de móvil | `mobile/` solo tiene README. Es fase 2, posterior a que el web esté listo. |
