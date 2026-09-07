# Nexus · Flujo del sistema y cumplimiento del requerimiento

**Proyecto:** Big Data / BI para optimizar la estrategia de negocio  
**Plataforma:** React + Tailwind + PostgreSQL (Supabase)  
**Proyecto en la nube:** el mismo de siempre (`oockgxorqwujwiuywfdf`) — no se creó otro Supabase.

Este documento explica el flujo de uso, qué pidió el profesor, cómo se resolvió y qué cambios se hicieron.

---

## 1. Planteamiento del problema

Las empresas juntan muchos datos (CSV de ventas, costos, demoras, etc.), pero no tienen una herramienta simple para:

- poner en la misma vara datasets del **mismo rubro** (o misma línea de negocio);
- calcular **ingresos, costos, ganancia neta y margen**;
- ver **qué metodología** (forma de trabajar) da mejor resultado;
- **probar esa palanca en lo nuestro**, no copiar el negocio entero.

Eso es el problema de negocio. La solución es esta plataforma web.

---

## 2. Identificar, definir y solucionar

| Paso | Qué significa aquí |
|------|-------------------|
| **Identificar** | Hacen falta dos perfiles: quien analiza (Administrador) y quien opera / sostiene el sistema (Encargado / Integrador). |
| **Definir** | Admin carga y compara. Encargado ejecuta tareas y vigila que, si se cae la nube, el sistema siga. Las tablas viven en Postgres; la web solo inserta y consulta. |
| **Solucionar** | App Nexus: login → panel según cargo → datasets en Supabase → ranking por ganancia → tarea al equipo. Failover real con copia local. |

---

## 3. Qué pidió el profesor (y dónde está)

### 3.1 Plataforma BI conectada a PostgreSQL (Supabase)

- **Pedido:** web que cargue datasets, procese métricas y aísle la metodología más rentable del mismo rubro.
- **Cumple:** Administrador → *Subir* (CSV) → *Comparar* (mismo tipo de negocio) → gana quien tiene **mayor ganancia neta**. *Inicio* muestra la recomendación y **Pasar al equipo** crea una tarea real.

### 3.2 Roles (RBAC)

| Rol | Pedido del profesor | En Nexus |
|-----|---------------------|----------|
| **Administrador** | Cargar datasets, analítica comparativa, tableros, reporte de la metodología ganadora | Panel `/admin`: Inicio, Subir, Comparar |
| **Integrador / Encargados** | Modularizar (pantalla, datos, gráficos), salud del servicio, contingencia si cae la API o la base | Panel `/employee`: **Tareas** + **Sistema** |

El permiso **no** lo da un botón en el login. Lo da la fila en la tabla `usuarios` (`cargo`: Administrador, Analista BI, Empleado, Asesor CRM, Integrador).

### 3.3 Tablas desde el frontend: ¿sí o no?

**No es correcto crear tablas (`CREATE TABLE`) desde el navegador.**

- El usuario podría inyectar SQL, se rompe la integridad y Supabase no actualiza bien el esquema.
- **DDL** (crear/alterar tablas) = SQL Editor de Supabase / motor Postgres. Eso ya se hizo una vez.
- **DML** (insertar, leer, actualizar, borrar **filas**) = lo único que hace React, sobre `usuarios`, `datasets` y `tareas`.

“Es trabajoso pero se puede”: sí, técnicamente. **No es lo que pide el trabajo ni cómo se hace un sistema real.**

### 3.4 Script SQL (ya ejecutado en el proyecto de Sam)

En el mismo Supabase del login:

- tipo ENUM de roles (`app_role`) y columna `rol` en `usuarios` (si se corrió ese bloque);
- tabla **`datasets`**: empresa, rubro, metodología, ingresos, costos;
- **`ganancia_neta` y `margen` generadas** por Postgres (`ingresos - costos`);
- columnas extra que usa el front: `es_mio`, `headers`, `filas`, `source_filename`;
- **RLS**: el Administrador / Analista BI puede escribir y leer `datasets`.

La web **nunca** ejecuta ese SQL. Solo `INSERT` / `SELECT` / `UPDATE` / `DELETE`.

### 3.5 Frontend pedido

| Ítem | Estado |
|------|--------|
| React + Tailwind | Sí |
| Gráficos comparativos (Chart.js) | Sí, en Comparar |
| Carga de datasets mismo rubro | Sí, Subir (también arrastrar archivo) |
| Algoritmo: mayor ganancia neta | Sí |
| Reporte de metodología ganadora | Sí, Inicio y Comparar |
| Panel Integrador: módulos + failover | Sí, **Sistema**: pantalla / datos / gráficos; copia local si no hay nube; **Probar sin nube** corta las llamadas de verdad; **Medir conexión** muestra milisegundos reales |
| Selector de roles en login | El login **explica** los dos perfiles (Admin vs Encargado). El destino lo define `usuarios.cargo`, para no falsear permisos |

---

## 4. Flujo detallado

### 4.1 Entrada (todos)

1. Abrir `http://localhost:5173/` (o la URL de Vite).
2. Correo y contraseña (Supabase Auth).
3. Se lee `usuarios.cargo`.
4. Si es Administrador o Analista BI → **Inicio (Admin)**.  
   Si es Encargado / Integrador / Empleado / Asesor CRM → **Tareas**.

### 4.2 Flujo del Administrador (inteligencia de negocio)

**Paso 1 — Inicio**  
Ve tres tarjetas (01 Subir, 02 Comparar, 03 Aplicar), cuántos archivos hay, cuál está marcado como “lo nuestro” y la ganancia de ese archivo. Si ya hay comparación, aparece la recomendación.

**Paso 2 — Subir**  
1. Soltá un **CSV** (solo ese tipo). El sistema lee encabezados y filas.  
2. **Mapeá el dinero:** qué columna es ingreso (monto, price, ventas…) y cuál es costo. Si el archivo ya se llama `monto`/`costos`, viene preseleccionado.  
3. **Etiquetá el negocio** con el **catálogo** (Ecommerce, Gastronomía, Retail…), no a mano, para que no se rompa la comparación. Elegí la **metodología** (entrega rápida, sucursal, marketplace…). Marcá “este es el mío”.  

- Se puede subir CSV de rubros distintos; cada uno se guarda.  
- **Para analizar** hacen falta **al menos dos CSV del mismo rubro**.  
- Al guardar se crean columnas canónicas `ingresos`/`costos` y Postgres calcula `ganancia_neta`.

**Paso 3 — Comparar**  
Elegís **un** rubro. Los CSV de otro rubro **no entran** al gráfico (aparecen como “quedan afuera”).  
Si hay uno solo de ese rubro, no hay ranking: pide otro archivo del mismo tipo de negocio.  
Con dos o más: gráfico + tabla. **Gana** el de mayor ganancia neta.

**Paso 4 — Aplicar**  
En Inicio: **Pasar al equipo**. Inserta una fila en **`tareas`** (Supabase, tiempo real). Eso es “aplicar en el negocio”: el encargado lo ejecuta; el tablero no cambia solo la empresa.

### 4.3 Flujo del Encargado / Integrador

**Tareas**  
Lista lo que mandó el Admin. Marca hecha. Llegan solas si el Admin acaba de enviar (realtime).

**Sistema** (cumplimiento Integrador)

- Tres módulos visibles: **Pantalla**, **Datos**, **Gráficos**.
- Si la nube está bien: punto verde “Conectado”.
- Si falla internet o Supabase: aviso y se usa la **copia local** (no se inventan métricas).
- **Medir conexión:** ping real (ms).
- **Probar sin nube / Volver a la nube:** aísla de verdad las llamadas a la API para demostrar resiliencia. No es un 80% inventado: usa los datasets que ya están en el navegador.

### 4.4 Datos (de punta a punta)

```
CSV en el PC
    → el navegador lo parsea
    → INSERT en public.datasets  (ingresos, costos; ganancia_neta la calcula Postgres)
    → SELECT para armar pantallas y gráficos
    → si falla la API: localStorage (misma estructura)
    → “Pasar al equipo”: INSERT en public.tareas
    → Encargado: SELECT / UPDATE tareas
```

---

## 5. Cambios que se hicieron (respecto al sistema viejo)

El Admin original:

- solo contaba filas del CSV;
- mostraba un hallazgo **fijo** (“80% de 1 estrella”);
- mandaba al CRM **dos clientes inventados**.

**Ahora:**

1. **Métricas de verdad** a partir de las columnas del archivo.
2. **Comparación por mismo rubro** y ranking por ganancia neta.
3. **Persistencia en `datasets`**, no solo en pantalla.
4. **Tarea CRM** con el hallazgo real.
5. **Encargados:** tareas + panel Sistema (módulos y failover real).
6. **Login y visual:** dos columnas, tipografía de producto, arrastrar CSV, gráfico Chart.js, estados de conexión.
7. **Sin crear tablas desde React.** DDL una vez en Supabase; el resto es DML.

También se evitó un segundo proyecto de Supabase: login y `datasets` viven juntos.

---

## 6. Cómo defenderlo en una frase

> El problema era no saber qué metodología es más rentable en el mismo rubro. Lo resolvimos con un Admin que carga y compara en Postgres, un Encargado que ejecuta y sostiene el sistema, tablas creadas en la base (no en el front), ganancia calculada en la base, y si se cae la nube el sistema sigue con copia local.

---

## 7. Uso rápido para la demo

1. Login **Administrador**.
2. Subir `olist.csv` y `mi_empresa.csv` (carpeta `public/samples`), **mismo tipo de negocio**, metodologías distintas; marcar uno como mío.
3. Comparar → ver quién gana.
4. Inicio → Pasar al equipo.
5. Salir, entrar como **Encargado** → ver la tarea → Sistema → Medir conexión / Probar sin nube.

Archivo de ejemplos: `bigdata-crm-enterprise/public/samples/`.
