# 03b · Comparación de modelos y conclusión técnica

Fuente: `03-matriz-modelos-calidad.csv` (46 filas). Los conteos salen de la columna "Conclusión".

## 1. Resultado por modelo

| Modelo | Elementos evaluados | CUMPLE | PENDIENTE | NO EVALUADO | NO APLICA | Matices dentro de CUMPLE |
|---|---:|---:|---:|---:|---:|---|
| Garvin (8 dimensiones) | 8 | 7 | 0 | 1 (Calidad percibida) | 0 | Rendimiento solo en local; Estética por juicio del revisor; Conformidad sin lector de pantalla |
| McCall (11 factores) | 11 | 9 | 1 (Interoperabilidad: Frankfurter real) | 0 | 1 (Reusabilidad) | Usabilidad solo automatizable |
| ISO/IEC 9126-1 (27 subcaracterísticas) | 27 | 23 | 1 (Interoperabilidad) | 2 (Aprendizaje; Conformidad de portabilidad: Firefox y Safari) | 1 (Coexistencia) | Conformidad de usabilidad parcial; Madurez y Comportamiento temporal solo en local |

## 2. Qué aporta cada diagnóstico

- **Garvin** mira el producto desde fuera: prestaciones, estética y calidad percibida. Es el único que obliga a preguntar qué opina el usuario, y ahí está su hallazgo principal: la Calidad percibida queda NO EVALUADA. Ese hueco explica por qué cinco defectos de interfaz (D-11 a D-15) llegaron a producción y el más grave lo encontró el usuario. Su debilidad: las dimensiones no traen métricas propias; Estética y Calidad percibida dependen del juicio.
- **McCall** ordena la calidad por ciclo de vida (operación, revisión y transición). Hace visible lo que falta para entregar: la Interoperabilidad con el proveedor real de tasas sigue PENDIENTE y la Portabilidad depende del despliegue. Es menos fino que ISO dentro de cada factor.
- **ISO/IEC 9126** es el más granular: cada subcaracterística se pudo atar a un requisito, una métrica con umbral y una evidencia (por ejemplo Exactitud → RNF-01 → coincidencia al centavo → BE 58/60). Detecta los mismos pendientes que McCall y añade dos que los otros no ven: Aprendizaje y compatibilidad con otros navegadores.

## 3. Coincidencias y diferencias

- Los tres coinciden en lo crítico del dominio financiero: fiabilidad, exactitud e integridad cumplen con evidencia (carga ×5 sin descuadres, centavos exactos, aislamiento entre usuarios).
- Los tres señalan la accesibilidad como parcial (falta el lector de pantalla).
- Solo Garvin deja ver la falta de opinión del usuario; solo ISO separa la compatibilidad entre navegadores; solo McCall agrupa los pendientes de transición (despliegue e integración externa) en un mismo bloque.

## 4. Conclusión: qué modelo o combinación es más adecuada

Para este producto se recomienda **ISO/IEC 9126 como eje, completado con la dimensión de Calidad percibida de Garvin**:

1. ISO/IEC 9126 permite la cadena que exige la consigna (característica → requisito → criterio → métrica → evidencia → resultado): de sus 26 subcaracterísticas aplicables, 23 tienen métrica, umbral y evidencia, y las otras 3 quedan marcadas como PENDIENTE o NO EVALUADO con su motivo. Es el modelo con el que más afirmaciones quedan medidas.
2. Garvin añade lo que ISO/IEC 9126 no mide de forma directa: la percepción del usuario. En este proyecto esa fue la mayor fuente de defectos escapados, así que dejarla fuera ocultaría el riesgo principal.
3. McCall no aporta factores que ISO no tenga (la propia diapositiva S1-C2 d.18 advierte que la correspondencia no es perfecta, pero aquí todos sus factores aplicables se cubrieron con subcaracterísticas ISO). Se usa como vista de ciclo de vida para planificar la transición a producción.

**Limitación:** ISO/IEC 9126 está sustituida por ISO/IEC 25010; se usa porque la consigna la pide. La matriz no evalúa las características nuevas de 25010 (por ejemplo, compatibilidad como característica propia).
