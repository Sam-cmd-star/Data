# Nexus — Cómo funciona de verdad

Documento para estudiar el sistema tal como está armado.  
No es un manual de marketing: dice qué hace el código, qué calcula la base, y qué **no** hace.

**App:** `bigdata-crm-enterprise` (React + Vite + TypeScript + Tailwind + Chart.js)  
**Nube:** PostgreSQL vía Supabase Auth + REST (`public.usuarios`, `public.datasets`, `public.tareas`)  
**Arranque local:** `npm run dev` → `http://localhost:5173`

---

## 1. El problema que resuelve

Las empresas tienen CSV (ventas, costos, demoras, reseñas) y no tienen un lugar donde:

1. cargar varios archivos del **mismo rubro**;
2. comparar **ganancia neta**;
3. ver **qué metodología** (forma de trabajar) gana;
4. mandar esa decisión al equipo como **tarea real**.

Nexus es esa herramienta. No crea tablas desde el navegador. No inventa números de BI.

---

## 2. Quién entra y a dónde va

El login **no** elige el rol. El rol lo da la fila en `usuarios.cargo`.

| `cargo` en la base | Panel | Rutas |
|--------------------|--------|--------|
| Administrador, Analista BI | Inteligencia de negocio | `/admin` Inicio · `/admin/cargas` Subir · `/admin/analisis` Comparar |
| Integrador, Empleado, Asesor CRM | Operación | `/employee` Tareas · `/employee/sistema` Salud del servicio |

**Código:** `src/context/AuthContext.tsx` (login con `signInWithPassword` + lectura de `usuarios`)  
**Código:** `src/types/auth.ts` (`ADMIN_CARGOS` / `INTEGRADOR_CARGOS`)  
**Código:** `src/routes/AppRouter.tsx` (Gate: si no hay usuario o el cargo no coincide, vuelve a `/login`)

Flujo de entrada:

```
Correo + contraseña
  → Supabase Auth valida
  → SELECT usuarios WHERE id = auth.uid()
  → cargo decide /admin o /employee
```

---

## 3. Arquitectura (una sola frase)

El **navegador** parsea el CSV, calcula totales de ingresos/costos sobre **todo el archivo**, guarda en Postgres un resumen + una muestra de filas, y dibuja gráficos en React. Si la nube no responde, usa una **copia en el navegador**.

```
CSV en el PC
    → parseo en el navegador (no hay servidor propio)
    → financials() suma ingresos y costos de TODAS las filas
    → INSERT public.datasets
         ingresos, costos          ← totales del archivo completo
         ganancia_neta, margen     ← columnas GENERADAS en Postgres (ingresos - costos)
         filas                     ← solo ~100 filas para previsualizar
    → pantallas leen datasets
    → ranking ordena por ganancia neta (usa esos totales, no las 100 filas)
    → “Pasar al equipo” = INSERT public.tareas
    → Encargado lista / marca hecha (realtime en INSERT)
    → si no hay nube: localStorage (nexus_bi_datasets_v1)
```

**Importante para el examen:** la ganancia con la que se **elige al ganador** sale de los totales guardados (`ingresos` / `costos` del archivo completo). Las ~100 `filas` son para **ver la tabla** y para demora/reseñas del “por qué”. No se debe decir “Postgres lee el CSV”: el CSV nunca se sube como archivo a Storage en este diseño; se lee en el cliente.

---

## 4. Flujo del Administrador

### 4.1 Inicio (`/admin`) — `ResumenPage.tsx`

- Título: **Inteligencia de negocio**.
- Tarjetas 01 Subir · 02 Comparar · 03 Aplicar.
- Números: cuántos datasets, cuál es “lo nuestro”, ganancia de ese archivo.
- Si hay **al menos dos CSV del mismo rubro** con dinero: texto de **por qué / qué copiar** y botón **Pasar al equipo**.

**Pasar al equipo** hace un `INSERT` en `tareas` (`cliente`, `prioridad`, `accion`, `completada`).  
La `accion` la arma `explainWinner()` (texto con números reales, no un hallazgo inventado).

### 4.2 Subir (`/admin/cargas`) — `CargasPage.tsx`

1. Solo **CSV** (arrastrar o elegir archivo).
2. El navegador inspecciona encabezados (`inspectCsv` / contrato de columnas en `profile.ts`).
3. Se mapea qué columna es **ingreso** y cuál **costo** (nombres tipo `monto`, `price`, `costos`…).
4. Se elige **rubro** del catálogo (`catalog.ts`) y **metodología** (cómo trabajan).
5. Se puede marcar **este es el mío**.
6. **Guardar** llama `insertDataset` (`datasetStore.ts`).

Al guardar, si la nube está viva:

- se desmarcan otros `es_mio` si este es el mío;
- se insertan `empresa`, `rubro`, `metodologia`, `ingresos`, `costos`, `headers`, `filas` (máx. 100), `source_filename`, `created_by`.

### 4.3 Comparar (`/admin/analisis`) — `AnalisisPage.tsx`

1. Elegís **un** rubro. Los CSV de otro rubro **no entran** (texto “quedan afuera”).
2. Hace falta **mínimo dos** del mismo rubro para recomendar.
3. `rankSameRubro()` ordena por **ganancia neta** descendente. El primero **gana**.
4. Gráficos Chart.js: ganancia, y si el CSV trae las columnas: demora, estrellas, pedidos.
5. Tabla + bloque quién gana / por qué / qué copiar.

**Algoritmo de ranking:** `src/lib/recommend.ts`  
**Métricas de dinero:** `src/lib/analyze.ts` → `financials()`  
**Por qué (texto):** `src/lib/explain.ts` → `explainWinner()`  
**Demora / reseñas / pedidos:** `src/lib/profile.ts` → `profileDataset()`

---

## 5. Flujo del Encargado

### 5.1 Tareas (`/employee`) — `EmployeeDashboard.tsx`

- `SELECT * FROM tareas` ordenado por fecha.
- Filtros: todas / pendientes / hechas.
- **Marcar como hecha** = `UPDATE tareas SET completada`.
- Canal Realtime `tareas-live`: si el Admin inserta una tarea, aparece sin recargar.

### 5.2 Salud del servicio (`/employee/sistema`) — `SistemaPage.tsx`

- Gráfico de latencia en vivo (`LatencyMonitor.tsx`): ping a `datasets` cada ~2,5 s.
- Bandas: Operativo (&lt; 250 ms) · Degradado · No disponible.
- **Medir ahora:** un ping + refresh.
- **Modo respaldo:** `setIsolationMode(true)` — **deja de llamar a la API**. La app usa la copia local. No es un porcentaje inventado.

Estados de conexión (`ConnectionBar` en el header): En línea · Respaldo · Sin servidor.

---

## 6. Cómo se calcula la plata (honesto)

`financials(dataset)`:

1. Si el dataset ya trae `ingresos` numéricos (los que se guardaron al subir el CSV completo) → usa **esos totales**. Resta costos. Calcula margen.
2. Si no hay totales (por ejemplo solo caché viejo) → **suma las columnas** de las filas que tenga en memoria (puede ser la muestra).

Por eso el ranking, si el alta se hizo bien, **no** depende de las 100 filas de preview.

Postgres, si la tabla tiene columnas generadas:

- `ganancia_neta = ingresos - costos`
- `margen` a partir de eso

El front **también** calcula ganancia para ordenar y mostrar, leyendo `ingresos`/`costos` del row.

**Demora y reseñas** del texto “por qué” se calculan sobre las **filas guardadas** (muestra). Si el archivo era enorme, ese “por qué” de demora/estrellas es sobre el recorte, no sobre los millones de filas. Los totales de plata sí vienen del archivo completo.

---

## 7. Mismo rubro (regla de oro)

`normalizeRubro()` unifica el nombre del catálogo.  
`rankSameRubro(datasets, rubro)` filtra `d.rubro === ese rubro`.  
Si mezclás gastronomía con ecommerce, **no se comparan entre sí**.

---

## 8. Failover (resiliencia)

| Situación | Qué pasa |
|-----------|----------|
| Nube OK | `source: supabase`, header “En línea” |
| Error de red / tabla / RLS | se lee `localStorage` (`nexus_bi_datasets_v1`) |
| Encargado activa **Modo respaldo** | `isolationMode = true`: `probeDatasetsTable` ni siquiera llama a la API |

El caché local guarda como máximo **50 filas** por dataset (`writeCache`) para no reventar el almacenamiento del navegador.

---

## 9. Qué hay en la interfaz (producto)

- Login: texto para empresa + gráfica de **ejemplo** (no son datos de un CSV).
- Header fijo: pantalla actual, estado de conexión, tema claro/oscuro, usuario, salir.
- Footer: NEXUS · Inteligencia de negocio · año.
- Tema: un clic (sol/luna). Se guarda en `localStorage` (`nexus-theme`).

---

## 10. Archivos para seguir el código

| Qué | Dónde |
|-----|--------|
| Login y destino por cargo | `src/pages/LoginPage.tsx`, `src/types/auth.ts` |
| Sesión | `src/context/AuthContext.tsx` |
| Rutas y permisos de pantalla | `src/routes/AppRouter.tsx` |
| Layouts | `src/layouts/AdminLayout.tsx`, `EncargadoLayout.tsx` |
| Inicio / Subir / Comparar | `src/pages/admin/ResumenPage.tsx`, `CargasPage.tsx`, `AnalisisPage.tsx` |
| Tareas / Salud | `src/pages/EmployeeDashboard.tsx`, `src/pages/encargado/SistemaPage.tsx` |
| Guardar / ping / caché | `src/lib/datasetStore.ts` |
| Dinero | `src/lib/analyze.ts` |
| Ranking | `src/lib/recommend.ts` |
| Texto por qué / cómo | `src/lib/explain.ts` |
| Columnas demora, reseña, pedidos | `src/lib/profile.ts` |
| Catálogo de rubros | `src/lib/catalog.ts` |
| Cliente Supabase | `src/lib/supabaseClient.ts` |
| Gráficos | `src/modules/charts/ProfitBarChart.tsx`, `LatencyMonitor.tsx` |
| Tema | `src/context/ThemeContext.tsx` |

CSV de ejemplo: `public/samples/olist.csv` y `public/samples/mi_empresa.csv`.

---

## 11. Lo que NO hace (para no equivocarse al explicar)

- No crea `CREATE TABLE` desde React.
- No hay PHP ni MySQL propio: es React → Supabase (Postgres).
- El login no es un selector de rol.
- La gráfica del login es **ilustración**, no un ranking real.
- “Por qué gana” en demora/reseñas usa la **muestra** de filas, no necesariamente todo el CSV.
- Modo respaldo aísla la API; no simula un porcentaje de caída inventado.

---

## 12. Cómo contarlo en una defensa (corto)

> El problema era no saber qué metodología rinde más en el mismo rubro. El Administrador carga CSV, el navegador calcula ingresos y costos de todo el archivo, Postgres guarda esos totales y la ganancia neta. Se comparan solo archivos del mismo rubro; gana el de mayor ganancia. Esa decisión se manda al Encargado como tarea en la tabla `tareas`. Si el servidor no responde, el sistema sigue con la copia local.

---

## 13. Recorrido rápido para probarlo

1. Entrar como Administrador.
2. Subir `olist.csv` y `mi_empresa.csv` (mismo rubro, metodologías distintas; marcar uno como mío).
3. Comparar → ver quién gana.
4. Inicio → Pasar al equipo.
5. Salir, entrar como Encargado → Tareas → Salud → Medir / Modo respaldo.
