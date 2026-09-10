# Registro de specs

> **Antes de generar código, leer [`REGLAS.md`](REGLAS.md):** contiene las
> invariantes que aplican a todos los specs. Cada spec contiene solo lo propio suyo.

| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|--------------|
| SPEC-000 | Arquitectura general      | ✅ Completado  | —          | S0     | 2026-09-06   |
| SPEC-001 | Autenticación             | ✅ Completado  | —          | S0     | 2026-09-07   |
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
| SPEC-000 (stack y §5.2.1 nueva) | Implementación de SPEC-001 | Se fijan las versiones exactas verificadas (Spring Boot 4.1.1, Security 7.1.1, JJWT 0.12.6, Testcontainers 2.x, JaCoCo 0.8.15) y se documenta **qué cambió Spring Boot 4 respecto a 3.x**: Jackson 3 en `tools.jackson`, `@MockBean` eliminado, `@WebMvcTest` de paquete, Flyway y Jackson con starter propio, Lombok declarado a mano. Cada fila costó un fallo real de compilación o un test en rojo. |
| SPEC-000 §5.2.2 (nueva) | Corrección de CORS | La sección 4 reservaba `shared/security/` para CORS pero ningún spec lo detalló, y su ausencia hacía que el login mostrara "Sin conexión" con el backend sano. Se documentan las reglas obligatorias: lista cerrada de orígenes, `allowCredentials` activo, preflight `OPTIONS` público. |
| SPEC-001 Anexo B, §6 (CA-11 y CA-12), §8.2 | Corrección de CORS | CORS pasa a ser parte explícita de la cadena de seguridad, con dos criterios de aceptación verificables y cuatro tests de integración. CA-11 exige **comprobar el login en un navegador real**: `curl` y MockMvc no hacen preflight, así que no detectan este fallo. |
| SPEC-C02 §6.0 (nueva) | Corrección de CORS | Se advierte que `ApiError.status === 0` no significa necesariamente "sin red": CORS mal configurado produce el mismo mensaje y es la causa más frecuente en desarrollo. Tabla para distinguir las cuatro causas. |
| `_plantilla.md` §2.4 y checklist | Ambas | Todo spec de backend debe leer §5.2.1 antes de generar código, y el checklist exige verificación **en navegador real**, no solo `curl`. |
| Todos los specs | Refactor a formato atómico | Las invariantes comunes salen a **`REGLAS.md`** (lectura obligatoria antes de generar código): las diez invariantes, las convenciones de SPEC-000 §5 —con §5.2.1 de Spring Boot 4 y §5.2.2 de CORS íntegras— y el checklist común. SPEC-000 pierde la copia de `_plantilla.md` y los resúmenes de los otros specs, que ya contradecían a SPEC-001. En cada spec, las secciones genéricas de Seguridad, Extensibilidad y Checklist se funden en una sola "Propio de este spec". **La numeración se conserva**: toda referencia `SPEC-XXX §N` sigue siendo válida, y `SPEC-000 §5.x` pasa a `REGLAS.md §5.x` con el mismo número. Ninguna decisión técnica, contrato ni criterio de aceptación cambió. |

---

## Decisiones abiertas que hereda cada spec

El proyecto base dejó estos puntos sin resolver a propósito: pertenecen a un spec
que todavía no se ha escrito. La pareja que tome ese spec debe cerrarlos.

| Decisión | La cierra | Estado actual en el código |
|----------|-----------|----------------------------|
| Versionado de rutas en servicios internos | SPEC-C03 | El backend expone `/api/v1/health`; el data service expone `/health`, sin prefijo. El sobre de respuesta sí es idéntico en ambos. Definir si los servicios internos llevan `/api/v1` y alinear `services/app/routes/health.py`. |
| ~~Almacenamiento del token en web vs. móvil~~ | SPEC-001 | **✅ Cerrada** al implementar SPEC-001. Web recibe el refresh token en una cookie `httpOnly`, `Secure` y `SameSite=Strict` con `Path=/api/v1/auth`, y nunca en el cuerpo. Móvil lo recibe en el body (header `X-Client-Type: mobile`) y lo guarda en SecureStore. Lo decide `AuthController.respondWithSession`, con web como valor por defecto si falta el header. CSRF: se apoya en `SameSite=Strict`, no en tokens sincronizadores, porque la API es stateless y el resto de la autenticación viaja en el header `Authorization`. El refresh encolado del Anexo C está en `frontend/src/lib/api.ts`. |
| Entidades de dominio | SPEC-002 | `shared/types/models.ts` solo define `AuditFields`. No hay ninguna `@Entity` en el backend. |
| Estructura de la app móvil | Spec de móvil | `mobile/` solo tiene README. Es fase 2, posterior a que el web esté listo. |
| Composición de las cuadrillas | SPEC-1XX de equipos | Las tablas `teams`/`team_members` existen (SPEC-002 V012), pero el cliente aún no ha dicho cuántas cuadrillas hay, cómo se llaman ni qué zonas cubre cada una. |
