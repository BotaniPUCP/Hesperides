# Registro de specs

| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|--------------|
| SPEC-000 | Arquitectura general      | ✅ Completado  | —          | S0     | 2026-09-06   |
| SPEC-001 | Autenticación             | 👀 En revisión  | —          | S0     |              |
| SPEC-002 | Modelo de datos           | 👀 En revisión  | —          | S0     |              |
| SPEC-003 | Catálogos configurables   | 👀 En revisión  | —          | S0     |              |
| SPEC-004 | Auditoría y trazabilidad  | 👀 En revisión  | —          | S0     |              |
| SPEC-C01 | Componentes UI            | 👀 En revisión  | —          | S0     |              |
| SPEC-C02 | Manejo de errores         | 👀 En revisión  | —          | S0     |              |
| SPEC-C03 | Patrones de API           | 👀 En revisión  | —          | S0     |              |
| SPEC-100 | Gestión de usuarios       | 👀 En revisión  | —          | S1     |              |

**Leyenda:** ⏳ Pendiente · 📝 En spec · 👀 En revisión · 🔄 En progreso · ✅ Completado

---

## Enmiendas a specs cerrados

Cuando un spec de feature obliga a corregir uno fundacional ya cerrado, la enmienda se aplica al
archivo original (marcada como cita con su procedencia) y se anota aquí. Nadie debe descubrir por
sorpresa que un principio fundacional cambió.

| Spec enmendado | Enmendado por | Qué cambió |
|---|---|---|
| SPEC-000 §1 | SPEC-100 | "Sin dependencia de servicios externos" pasa a admitir **SMTP como única excepción**, con la condición de que su caída nunca impida una operación de negocio. |
| SPEC-001 §2.5 | SPEC-100 | Se corrige la justificación del "no autorregistro": el argumento de que no había correo en el alcance ya no aplica. **La decisión de no permitir autorregistro no cambia.** |
| SPEC-004 §3.2 | SPEC-100 | Se añade la acción auditable `USER_CREDENTIALS_DELIVERY_FAILED`. |

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
| Composición de las cuadrillas | SPEC-1XX de equipos | Las tablas `teams`/`team_members` existen (SPEC-002 V012), pero el cliente aún no ha dicho cuántas cuadrillas hay, cómo se llaman ni qué zonas cubre cada una. |
