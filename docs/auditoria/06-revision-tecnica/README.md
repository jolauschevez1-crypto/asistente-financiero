# 06 · Revisiones R1–R8 y revisión técnica formal RTF-01

## 1. Planificado frente a ejecutado

| Actividad | Planificado | Ejecutado | Evidencia |
|---|---|---|---|
| Rondas de revisión por artefacto | 6 (R1 a R6), una por fuente de defectos | 8 (R1 a R8). R7 y R8 se añadieron al publicar: revisión visual pantalla por pantalla y barrido de rutas | Tabla §2 |
| Modalidad de las rondas | Revisión individual con lista de comprobación y herramientas | Igual. Ninguna ronda fue una reunión | Listas §3 |
| Revisión técnica formal con roles, reunión y acta | 1 (RTF-01), 30 minutos | **PENDIENTE**: planificada, no celebrada a la fecha de corte | `RTF-01-reunion.md` |

**Por qué ocho rondas.** El plan inicial tenía seis, una por cada fuente de defectos del material: requisitos, diseño, código, interfaz, seguridad y accesibilidad, y pruebas y liberación. Agregamos R7 porque la primera versión publicada mostró defectos de interfaz que solo aparecían con datos reales de pantalla (D-11 a D-14). Agregamos R8 porque D-15 escapó a producción: había que recorrer todas las rutas y mirar cada tarjeta, no una muestra. Más rondas no aportaban artefactos nuevos.

## 2. Rondas ejecutadas

| Ronda | Artefacto | Fecha (UTC) | Duración | Lista | Herramientas | Modalidad | Hallazgos | Seguimiento |
|---|---|---|---|---|---|---|---|---|
| R1 | Requisitos y documentación (consigna, README, `.env.example`) | 2026-10-25 05:10–05:50 | 40 min | §3.1 | Lectura, `git grep` | Individual | CR-01 y CR-02 (cambios de requisito, ver 11); D-10 | D-10 cerrado |
| R2 | Arquitectura y datos (esquema, migración, triggers, moneda histórica) | 2026-10-25 05:20–05:45 | 25 min | §3.2 | PostgreSQL 16 local, `psql`, EV-BASE-01 | Individual | Restricción `MONEDA_BLOQUEADA` incompatible con CR-01 (observación de diseño, no defecto) | Sustituida por la migración aditiva `8cc3b6c` |
| R3 | Código y cálculos (dinero, tasas, transacciones) | 2026-10-25 05:45–06:10 | 25 min | §3.3 | `node --test`, Karma | Individual | D-03 | Cerrado en `067caac` |
| R4 | Interfaz (navegación, responsive, nombres largos) | 2026-10-25 06:15–06:30 | 15 min | §3.4 | Playwright, capturas | Individual | D-02 | Cerrado en `0baef03` |
| R5 | Seguridad y accesibilidad | 2026-10-25 06:30–06:45 | 15 min | §3.5 | Sondeo OWASP, npm audit, axe-core 4.10.3, script de teclado | Individual | D-01, D-04, D-05, D-06 | Cerrados en `015fed5` y `19b56de` |
| R6 | Pruebas, rendimiento y liberación (carga, configuración de Vercel) | 2026-10-25 14:45–14:55 | 10 min | §3.6 | carga.cjs, vitals.cjs, variables de Vercel sin descifrar | Individual | D-07, D-08, D-09; riesgo del límite por IP (EV-REN-03) | D-07 cerrado; D-08 y D-09 sin verificar en producción |
| R7 | Interfaz publicada, pantalla por pantalla | 2026-10-25 15:10–15:47 | 37 min | §3.4 | Playwright (23 capturas antes, 24 después), desborde.cjs, axe-core, keyboard.cjs | Individual | D-11, D-12, D-13, D-14 | Publicados en `b24d805` |
| R8 | Todas las rutas y tarjetas de la versión `5514da0` | 2026-10-27 03:00–03:28 | 28 min | §3.7 | barrido.cjs (12 rutas × 2 anchos), capturas completas, variables de Vercel (solo nombres) | Individual | D-16, D-17, D-18, D-19 | Publicados en `5c7c8c5` |
| — | Uso en producción (no es una revisión) | 2026-10-25 17:24 | — | — | Captura de pantalla | — | D-15 | Publicado en `7192a02` |
| — | Redacción del expediente: mensajes del servidor contra la configuración de producción (no es una ronda) | 2026-10-27 03:35 | — | — | `grep` de textos, variables de Vercel (solo nombres) | Individual | D-20 | Publicado en `7c09956` |

Las horas salen de los commits y de las marcas de tiempo de las evidencias. Total: 195 minutos (métrica en `05-metricas.md` §4).

## 3. Listas de comprobación usadas

### 3.1 R1 Requisitos
- [x] Cada requisito tiene un criterio verificable (proporción, umbral y contexto).
- [x] Los cambios de requisito están registrados con su fecha (CR-01 a CR-06).
- [x] No hay requisitos contradictorios en la documentación. Falló: D-10.
- [x] Las reglas visibles no prometen «tiempo real».

### 3.2 R2 Arquitectura y datos
- [x] Las migraciones son aditivas, sin DROP de datos.
- [x] La moneda histórica de cada movimiento se conserva.
- [x] Las escrituras relacionadas van en una transacción.
- [x] Los triggers impiden editar movimientos anteriores a una conversión.
- [x] La migración se puede ejecutar dos veces sin error.

### 3.3 R3 Código y cálculos
- [x] Sin coma flotante en importes; redondeo half-up explícito.
- [x] La misma regla de redondeo en servidor y cliente.
- [x] Reintentos idempotentes.
- [x] Sin sumas entre monedas.
- [x] Formularios: el estado no se pierde ante revalidaciones. Falló: D-03.

### 3.4 R4 y R7 Interfaz
- [x] Sin sidebar residual.
- [x] Menú móvil con aria-expanded y Escape.
- [x] Nombres largos legibles.
- [x] Sin errores de consola ni peticiones canceladas. Falló: D-02.
- [x] Ningún elemento sale del ancho de 390 px. Falló: D-12.
- [x] Importes nunca partidos a mitad de número. Falló: D-11.
- [x] Fechas en español. Falló: D-14.
- [x] Sin datos personales en las plantillas. Falló: D-13.

### 3.5 R5 Seguridad y accesibilidad
- [x] OWASP Top 10:2025: control de acceso, configuración, cadena de suministro (falló: D-01), criptografía, inyección, autenticación, integridad, registro y excepciones.
- [x] WCAG 2.2 AA: contraste (falló: D-04), nombres accesibles (falló: D-05), orden del foco (falló: D-06), reflujo y objetivos táctiles.

### 3.6 R6 Pruebas y liberación
- [x] Pruebas en verde.
- [x] Carga ×5 sin errores ni descuadres.
- [x] Recursos sin desperdicio. Falló: D-07.
- [x] Variables de producción completas (falló: D-08) y correctas (falló: D-09).
- [~] Verificación en producción: 6 despliegues verificados sin sesión (EV-PROD-01); falta la verificación con sesión (CP-13, CP-40).

### 3.7 R8 Rutas y tarjetas
- [x] Cada ruta lleva a una pantalla coherente con la sesión y el rol. Falló: D-16.
- [x] Ningún importe se recorta en tarjetas ni indicadores. Falló: D-17.
- [x] Los textos de la interfaz no contradicen la configuración del servidor. Falló: D-18.
- [x] Los números usan coma decimal en toda la interfaz. Falló: D-19.
- [x] Sin errores de consola ni respuestas ≥ 400 en 24 vistas.

## 4. Revisión técnica formal RTF-01

**Estado: PENDIENTE.** La reunión está planificada en `RTF-01-reunion.md`, con artefacto, motivo, roles por asignar, criterios de entrada, agenda de 30 minutos, lista de 13 preguntas, registro de hallazgos, acta y criterios de salida. Esta sección se completa solo con los datos de una reunión que efectivamente ocurra; hasta entonces la Fase 4 se declara cumplida en parte.

| Campo | Estado a la fecha de corte |
|---|---|
| Artefacto | Validación de entradas y conversión multidivisa en `5514da0` (329 líneas en 5 archivos) |
| Roles | Por asignar al inicio de la reunión |
| Criterios de entrada | Definidos (§3 de RTF-01) |
| Lista de comprobación | Definida (13 preguntas, §6 de RTF-01) |
| Hallazgos, acta y firmas | `[PENDIENTE: reunión RTF-01]` |
| Seguimiento | defecto → acción → corrección → prueba de regresión → cierre; nuevos defectos desde D-21 |
