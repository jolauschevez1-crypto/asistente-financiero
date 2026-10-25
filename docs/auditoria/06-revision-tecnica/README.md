# 06 · Revisiones R1–R6 y revisión técnica formal

## Plan y ejecución real

Se planificaron seis rondas, una por artefacto de riesgo, siguiendo Semana 4 (Clase 1 y Clase 2). Las seis se ejecutaron como **revisiones individuales asistidas por herramientas** (escritorio + herramienta). Ninguna fue una reunión: **no hubo reuniones, actas firmadas ni participantes humanos además del usuario**, que aprobó decisiones en el hilo del proyecto. La revisión técnica formal (RTF) con roles queda **PENDIENTE** (§3).

**Por qué seis.** Cada ronda cubre una fuente distinta de defectos según el material (requisito, diseño, código, interfaz, seguridad y accesibilidad, pruebas y liberación). Menos rondas mezclarían listas de comprobación. Más rondas no aportaban artefactos nuevos.

| Ronda | Artefacto | Fecha (UTC) | Lista de comprobación | Herramientas | Revisor | Hallazgos | Seguimiento |
|---|---|---|---|---|---|---|---|
| R1 | Requisitos y documentación (consigna, README, `.env.example`) | 2026-10-25 05:10–05:50 y 15:00 | §2.1 | Lectura, `git grep` | Asistente (Claude) | CR-01 y CR-02 (cambios de requisito, ver 11); D-10 | D-10 cerrado |
| R2 | Arquitectura y datos (esquema, migración, triggers, moneda histórica) | 2026-10-25 05:20–05:45 | §2.2 | PostgreSQL 16 local, `psql`, línea base EV-BASE-01 | Asistente | Restricción `MONEDA_BLOQUEADA` (trigger) incompatible con CR-01 | Sustituida por migración aditiva `8cc3b6c` |
| R3 | Código y cálculos (dinero, tasas, transacciones) | 2026-10-25 05:45–06:10 | §2.3 | Pruebas `node --test`, Karma | Asistente | D-03 | Cerrado en `067caac` |
| R4 | Interfaz (navegación, responsive, nombres largos) | 2026-10-25 06:15–06:30 | §2.4 | Playwright, capturas | Asistente | D-02 | Cerrado en `0baef03` |
| R5 | Seguridad y accesibilidad | 2026-10-25 06:30–06:45 | §2.5 | Sondeo OWASP, npm audit, axe-core 4.10.3, script de teclado | Asistente | D-01, D-04, D-05, D-06 | Cerrados en `015fed5` y `19b56de` |
| R6 | Pruebas, rendimiento y liberación (carga, configuración de Vercel) | 2026-10-25 14:45–14:55 | §2.6 | carga.cjs, vitals.cjs, variables de Vercel sin descifrar | Asistente | D-07, D-08, D-09; riesgo del límite por IP (EV-REN-03) | D-07 cerrado; D-08 y D-09 pendientes de verificar en producción |
| R7 | Interfaz publicada, pantalla por pantalla (pulido visual pedido por el usuario) | 2026-10-25 15:10–15:30 | §2.4 | Playwright: 23 capturas antes y 24 después, desborde.cjs, axe-core, keyboard.cjs | Asistente | D-11, D-12, D-13, D-14 | Corregidos en la rama; pendientes de publicar |

Las horas son aproximadas y salen de los commits y de las marcas de tiempo de las evidencias.

## 2. Listas de comprobación usadas

### 2.1 R1 Requisitos
- [x] Cada requisito tiene un criterio verificable (proporción, umbral y contexto).
- [x] Los cambios del usuario están registrados con su fecha (CR-01, CR-02, CR-03).
- [x] No hay requisitos contradictorios en la documentación: falló, ver D-10.
- [x] Las reglas visibles al usuario no prometen "tiempo real".

### 2.2 R2 Arquitectura y datos
- [x] Las migraciones son aditivas, sin DROP de datos.
- [x] La moneda histórica de cada movimiento se conserva.
- [x] Las escrituras relacionadas van en una transacción.
- [x] Los triggers impiden editar movimientos anteriores a una conversión.
- [x] La migración se puede ejecutar dos veces sin error.

### 2.3 R3 Código y cálculos
- [x] Sin coma flotante en importes; redondeo half-up explícito.
- [x] La misma regla de redondeo en servidor y cliente.
- [x] Reintentos idempotentes.
- [x] Sin sumas entre monedas.
- [x] Formularios: el estado no se pierde ante revalidaciones (falló: D-03).

### 2.4 R4 Interfaz
- [x] Sin sidebar residual.
- [x] Menú móvil con aria-expanded y Escape.
- [x] Nombres largos legibles.
- [x] Sin errores de consola ni peticiones canceladas (falló: D-02).

### 2.5 R5 Seguridad y accesibilidad
- [x] OWASP Top 10:2025: control de acceso, configuración, cadena de suministro (falló: D-01), criptografía, inyección, autenticación, integridad, registro y excepciones.
- [x] WCAG 2.2 AA: contraste (falló: D-04), nombres accesibles (D-05), orden del foco (D-06), reflujo y objetivos táctiles.

### 2.6 R6 Pruebas y liberación
- [x] Pruebas en verde.
- [x] Carga ×5 sin errores ni descuadres.
- [x] Recursos sin desperdicio (falló: D-07).
- [x] Variables de producción completas (falló: D-08) y correctas (falló: D-09).
- [ ] Verificación en producción: pendiente del OK del usuario.

## 3. Revisión técnica formal (RTF): PENDIENTE

No se realizó ninguna reunión de RTF. Para que la revisión sea válida según Semana 4 Clase 2, el equipo debe hacerla y completar esta sección. Esta plantilla no se debe rellenar con datos que no ocurrieron.

| Campo | Valor |
|---|---|
| Fecha y duración | [pendiente] |
| Moderador | [Integrante] |
| Autor | [Integrante] |
| Revisores | [Integrante], [Integrante] |
| Secretario | [Integrante] |
| Artefacto | Rama `claude/project-thread-noiuro` y este expediente |
| Criterios de entrada | Pruebas en verde (EV-PRU-01/02); expediente 01–13 disponible; cada revisor leyó 04 y 10 antes de la reunión |
| Lista de comprobación | §2.1–§2.6 |
| Hallazgos | [pendiente], con formato ID, ubicación, criterio, descripción, evidencia/impacto y estado |
| Clasificación | defecto, observación, duplicado o descartado |
| Acciones y responsables | [pendiente] |
| Criterios de salida | Ningún hallazgo crítico abierto; acciones con responsable y fecha |
| Acta | [pendiente: firmas de los participantes] |
| Seguimiento | defecto → acción → corrección → verificación → cierre |
