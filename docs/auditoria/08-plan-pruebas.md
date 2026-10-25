# 08 · Estrategia y plan de pruebas

Basado en Semana 6 a Semana 8 (niveles, técnicas, pruebas web, validación y sistema).

## 1. Objetivo y riesgos que guían la estrategia

Demostrar con evidencia ejecutada que el cambio multidivisa no pierde dinero, no suma monedas incompatibles, no reescribe el historial y no abre fallos de seguridad. La prioridad sigue el riesgo:

1. Integridad de saldos.
2. Exactitud de conversión.
3. Autorización y aislamiento.
4. Dependencia del proveedor de tasas.
5. Accesibilidad e interfaz.
6. Rendimiento.

## 2. Niveles

| Nivel | Qué cubre | Herramienta | Entorno | Criterio de entrada | Criterio de salida |
|---|---|---|---|---|---|
| Unidad | `money.ts`, política de contraseña, validaciones, `fx.js` (aritmética racional) | Karma/Jasmine; `node --test` | Local | Código compila | 100 % en verde |
| Integración | Rutas HTTP con base PGlite: panel, tasas, transferencias, conversión, módulos, seguridad de sesión | `node --test` + supertest | PGlite | Unidad en verde | 100 % en verde |
| Sistema | Navegador real sobre servidor local con PostgreSQL 16: accesibilidad, teclado, reflujo, red, rendimiento, carga ×5, sondeo OWASP | Playwright, axe-core, scripts en `evidencias/` | Local aislado | Integración en verde; build actual | Umbrales de 07 cumplidos |
| Aceptación | Producción: login, panel, tasa real con fecha, conversión, LCP móvil | Navegador + consultas a la API | https://asistente-financiero-seven.vercel.app | OK del usuario; migración aplicada | Casos CP-13, CP-40 y CP-46 aprobados |

## 3. Técnicas

- **Particiones de equivalencia:**
  - monedas (con tasa, sin tasa, fuera de catálogo);
  - tipos de movimiento;
  - estados de tasa (vigente, antigua, ausente).
- **Valores límite:**
  - contraseña de 9, 10 y 11 caracteres;
  - importes de 0, 0,01 y el máximo;
  - redondeo en 0,005;
  - vigencia de la tasa en 4 días.
- **Tablas de decisión:**
  - transferencia (misma o distinta moneda × confirmada o no × tasa igual o cambiada × clave nueva o repetida);
  - contraseña (contiene nombre, usuario o correo).
- **Transición de estados:** cartera sin actividad → con actividad → convertida (los movimientos previos quedan bloqueados).
- **Caja blanca:** idempotencia de la migración; ramas de error del proveedor.
- **Concurrencia:** dos gastos simultáneos; ráfaga de 5 transferencias.
- **Pruebas web (Semana 7 Clase 2):** funcional, interfaz, navegación, compatibilidad (solo Chromium) y rendimiento.

## 4. Datos y configuración

Solo datos ficticios (`*@local.test`). Las tasas son ficticias porque vienen de un proveedor simulado. La única excepción es la verificación en producción, que usará la cuenta del usuario sin crear movimientos reales y la tasa real de Frankfurter. Las contraseñas de prueba se pasan por variables de entorno y no están en el repositorio.

## 5. Criterios de suspensión y reanudación

- **Se suspende:** si falla una prueba de integridad de saldos o de aislamiento.
- **Se reanuda:** tras corregir y repetir toda la suite.
- **Pruebas desactivadas u ocultas:** ninguna. No se desactivó ni se omitió ninguna prueba.

## 6. Matriz componente–riesgo–técnica

| Componente | Riesgo | Técnica | Casos |
|---|---|---|---|
| `finance/fx.js` | Tasa inválida o vieja; proveedor caído | Fallo inyectado; límites | CP-11, CP-14, CP-15 |
| `finance/multicurrency.js` | Doble cargo; tasa cambiada | Tabla de decisión; concurrencia | CP-16, CP-18, CP-41 |
| `services/ledgerService.js` | Saldo negativo | Concurrencia | CP-23, CP-41 |
| `core/money.ts` | Coma flotante | Límites | CP-30 |
| Autenticación | Acceso ajeno; contraseña débil | Seguridad; tabla de decisión | CP-03..CP-05, CP-31, CP-32 |
| Navegación y diálogos | Pérdida de foco; menú inaccesible | Teclado; axe | CP-26, CP-28, CP-35, CP-36 |
| Despliegue | Variables o migración | Aceptación en producción | CP-13, CP-46 |

## 7. Resultados

Los conteos están en `05-metricas.md` §2. Los casos y sus resultados están en `09-casos-prueba.csv`.
