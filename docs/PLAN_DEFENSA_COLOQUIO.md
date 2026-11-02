# PLAN INTEGRAL DE DEFENSA Y COLOQUIO FINAL — BIKESYSTEM

**PROYECTO:** BikeSystem — Sistema Integral de Gestión Comercial y Taller Mecánico  
**EMPRESA BENEFICIARIA:** DN Bikes — Esperanza, Santa Fe (Titular: Diego Nagel)  
**INSTITUCIÓN:** Instituto Tecnológico El Molino (ITEC) — Tecnicatura Superior en Desarrollo de Software  
**UNIDAD CURRICULAR:** Prácticas Profesionalizantes II (Prof. Nicolás Kappes)  
**EQUIPO EXPOSITOR:** German Domingues • Exequiel Rios  

---

## 1. ESTRUCTURA DE TIEMPOS Y DIVISIÓN DE ORADORES (25 - 30 MINUTOS)

La defensa está diseñada bajo una narrativa continua: **Problema Real en DN Bikes $\rightarrow$ Decisión de Ingeniería $\rightarrow$ Demostración en Vivo en la Aplicación $\rightarrow$ Evidencia en Código Fuente**.

| Bloque | Minutos | Orador | Contenido Principal y Pantalla a Mostrar |
|---|---|---|---|
| **Bloque 1: Apertura, Diagnóstico y Valor** | `00:00 - 03:00` | **Ambos** | Contexto real de **DN Bikes** (reemplazo de cuadernos de taller, Excel desconectado y garantías en papel). Presentación general de la interfaz y tableros con código de colores por criticidad. |
| **Bloque 2: Arquitectura Monorepo y Trigramas (`pg_trgm`)** | `03:00 - 08:00` | **Exequiel** (Desktop) + **German** (BD) | Empaquetado nativo con Electron 42 (`utilityProcess.fork`) + React 19 + Express 5. Demostración de velocidad de búsqueda en Stock/Clientes con extensión `pg_trgm` (índices GIN) y parser semántico. |
| **Bloque 3: Punto de Venta (POS), ACID y Anti-Deadlocks** | `08:00 - 15:00` | **Exequiel** (Demo POS) + **German** (Código ACID) | Venta en vivo en el POS (1 Bicicleta + 1 Repuesto) y emisión de PDF. Explicación en código de `BEGIN...COMMIT`, ordenamiento `.sort()` por `id_producto` y bloqueo `SELECT ... FOR UPDATE`. |
| **Bloque 4: Regla de Negocio de Garantías (30 / 180 días)** | `15:00 - 19:00` | **Exequiel** | Demostración en vivo de la garantía recién creada: 180 días totales desde la compra condicionados a realizar el 1° Service obligatorio dentro de los primeros 30 días (si no cumple, pierde vigencia). Excepción por rol Admin. |
| **Bloque 5: Taller Kanban, Kardex e Historial Clínico** | `19:00 - 26:00` | **German** (Kanban/Kardex) + **Exequiel** (Ficha Clínica) | Arrastre *Drag & Drop* de tarjetas entre estados (`Recibida` $\rightarrow$ `En Reparación` $\rightarrow$ `Lista` $\rightarrow$ `Entregada`), imputación de repuestos con descuento atómico en Kardex y consulta del Historial Clínico por bicicleta. |
| **Bloque 6: DER, Documentación, QA y Cierre** | `26:00 - 30:00` | **Ambos** | Trazabilidad exacta DER $\leftrightarrow$ `bikesystem.sql`, suite de 67 tests automatizados (Vitest), Documentación Técnica y Manual de Usuario ilustrado (con FAQ y Glosario). |

---

## 2. GUION TÉCNICO Y EXPOSITIVO DE LOS 4 PUNTOS FUERTES

### PUNTO FUERTE 1: Transaccionalidad ACID y Prevención de Deadlocks en el POS

#### A. Qué explicar al tribunal (Argumento de Ingeniería)
En un entorno comercial donde el mostrador de ventas y el taller mecánico descuentan inventario simultáneamente, una venta no puede ejecutarse como consultas sueltas. Si ocurre un corte de energía a mitad de la operación o si dos vendedores facturan el último artículo al mismo tiempo, el sistema quedaría con comprobantes inconclusos o **stock negativo**.

Para blindar el Punto de Venta, en `backend/src/services/venta.service.ts` (`VentaService.crearVenta`, líneas 55–179) implementamos **tres barreras de ingeniería**:

1. **Prevención Matemática de Deadlocks (Ordenamiento determinista previo al bloqueo):**
   - *El problema:* Si el Vendedor 1 arma un carrito con `[Producto #20, Producto #5]` y al mismo milisegundo el Vendedor 2 arma un carrito con `[Producto #5, Producto #20]`, la Transacción 1 bloquea el `#20` y espera por el `#5`, mientras la Transacción 2 bloquea el `#5` y espera por el `#20`. Esto produce un **bloqueo mutuo (Deadlock)**.
   - *Nuestra solución (Línea 56):* Antes de iniciar los bloqueos en PostgreSQL, ordenamos en memoria los renglones del carrito de menor a mayor por `id_producto`:
     ```ts
     const detallesOrdenados = [...detalles].sort((a, b) => Number(a.id_producto) - Number(b.id_producto));
     ```
     De esta manera, todas las transacciones concurrentes adquieren los candados de fila estrictamente en el mismo orden ascendente (`#5` y luego `#20`), haciendo **imposible la espera circular**.

2. **Bloqueo Pesimista de Fila (`SELECT ... FOR UPDATE`) y Blindaje de Precios (Líneas 82–106):**
   - Dentro del bloque `BEGIN ... COMMIT`, cada artículo se lee con `SELECT ... FROM Productos WHERE id_producto = $1 FOR UPDATE`.
   - PostgreSQL pone un candado exclusivo sobre esa fila hasta que termine la transacción. Recién con la fila bloqueada validamos que el artículo esté activo (`activo === true`) y que exista stock suficiente (`producto.cantidad >= cantNum`), respaldado además por el constraint físico `chk_productos_cantidad CHECK (cantidad >= 0)` en la tabla `Productos`.
   - **Seguridad de precios:** El backend ignora cualquier precio enviado desde el frontend y calcula los subtotales usando exclusivamente `producto.precio` leído de la base de datos.

3. **Atomicidad en 5 Tablas ("Todo o Nada", Líneas 62–176):**
   En la misma transacción se ejecutan 5 impactos sincronizados:
   - `INSERT INTO Venta` (cabecera) e `INSERT INTO Detalle_Venta` (renglones).
   - `UPDATE Productos SET cantidad = cantidad - $1` (descuento real de inventario).
   - `INSERT INTO Movimiento_Stock` (asiento inmutable de `'EGRESO'` en el Kardex con motivo `'Venta Comercial'`).
   - **Empadronamiento automático de bicicletas (Líneas 131–143):** Si el artículo vendido es `tipo_prod === 'bicicleta'`, el sistema inserta automáticamente cada unidad en la tabla `Bicicleta` asociada al `id_cliente` comprador.
   - `INSERT INTO Bitacora_Actividad` (auditoría del operador).
   - Si falla cualquiera de los pasos, el bloque `catch` dispara `await client.query('ROLLBACK')`, dejando la base de datos intacta.

---

### PUNTO FUERTE 2: Tablero Kanban Interactivo de Taller, Kardex e Historial Clínico

#### A. Qué explicar y demostrar al tribunal
1. **Usabilidad y Gestión Visual con Drag & Drop (`frontend/src/views/Reparaciones/components/ReparacionesKanban.tsx`):**
   - El taller mecánico de DN Bikes se gestiona en un tablero Kanban dividido en las 3 etapas operativas activas: **Recibida**, **En Reparación** y **Lista** (mientras que las órdenes finalizadas pasan al historial de **Entregadas**).
   - Cada columna y tarjeta posee **código de colores por criticidad y estado** y soporta tanto **arrastre nativo HTML5 (`onDragStart`, `onDragOver`, `onDrop`)** como botones de avance rápido.
   - En el backend (`ReparacionService.actualizarEstadoReparacion`, líneas 250–263), una orden **solo recibe `fecha_egreso = CURRENT_DATE` en el instante en que pasa a `'Entregada'`**. Una vez entregada, queda sellada por regla de negocio: no se permite modificar su estado ni agregarle o quitarle repuestos.

2. **Imputación de Repuestos con Descuento Automático en Kardex (`backend/src/services/detalleReparacion.service.ts`):**
   - Cuando el mecánico abre una orden desde el Kanban y asigna un repuesto (`DetalleReparacionService.agregarRepuesto`, líneas 43–126), se ejecuta una transacción ACID que:
     - Bloquea la orden (`FOR UPDATE`) verificando que no esté `'Entregada'`.
     - Bloquea el producto (`FOR UPDATE`), valida que haya stock y **prohíbe imputar una bicicleta completa como si fuera un repuesto** (`if (producto.tipo_prod === 'bicicleta') throw new BadRequestError(...)`, línea 65).
     - Inserta el consumo en `Detalle_Reparacion`, descuenta la existencia en `Productos` y **recalcula en SQL el total de la orden** (`costo_total = costo_mano_obra + SUM(costo_total de Detalle_Reparacion)`).
     - Registra automáticamente el movimiento en el Kardex (`Movimiento_Stock`) como `'EGRESO'` por `'Uso Interno de Taller'`.
   - Si el mecánico elimina un repuesto cargado por error (`eliminarRepuesto`, líneas 159–255), una transacción inversa devuelve las unidades a `Productos`, recalcula la orden y asienta un `'INGRESO'` por `'Devolución de Taller'` en el Kardex.

3. **Historial Clínico por Bicicleta sin N+1 Queries (`backend/src/services/bicicleta.service.ts`):**
   - Cada bicicleta tiene su propia "historia clínica" consultable desde `ModalHistorialBicicleta.tsx`.
   - En `BicicletaService.obtenerHistorialBicicleta` (líneas 281–315), resolvemos la consulta mediante una **CTE (`WITH repuestos_agg AS (...)`) combinada con `json_agg(json_build_object(...))`**. Esto empaqueta todas las órdenes históricas del rodado junto con el array JSON de repuestos consumidos en cada intervención y el mecánico actuante en **una única consulta a PostgreSQL**.

---

### PUNTO FUERTE 3: Regla de Negocio de Garantías (180 días con condición de 1° Service a los 30 días)

#### A. Cómo explicar la Regla de Negocio con total claridad
Toda bicicleta nueva comercializada en DN Bikes cuenta con **180 días (6 meses) de garantía oficial contados desde la fecha de compra (`v.fecha`)**, pero **su continuidad está sujeta a una condición técnica obligatoria**:
- **Los primeros 30 días (que son parte integrante de esos 180 días totales)** constituyen el período de asentamiento mecánico (donde los cables de cambio se estiran y los rayos y frenos requieren reajuste).
- **Si el cliente realiza el 1° Service dentro de esos primeros 30 días:** cumple la condición y la garantía continúa vigente por el resto del período hasta completar los **180 días desde la fecha de compra**.
- **Si pasan los primeros 30 días y el cliente NO trajo la bicicleta al service:** la condición se incumple y **la garantía cae automáticamente (`caducada_sin_service`), dejando de estar vigente**.

#### B. Cómo está implementado en Backend y Frontend
1. **Cálculo SQL Dinámico sobre la misma Fecha Base (`backend/src/services/venta.service.ts`, líneas 351–374):**
   En `VentaService.obtenerGarantiasBicicletas`, PostgreSQL calcula en tiempo real los plazos tomando siempre `v.fecha::DATE` como punto de partida:
   ```sql
   (v.fecha::DATE + 30)::DATE AS fecha_limite_service,
   (v.fecha::DATE + INTERVAL '6 months')::DATE AS fecha_vencimiento_extendida,
   CASE 
     WHEN dv.primer_service_realizado = true THEN (v.fecha::DATE + INTERVAL '6 months')::DATE
     ELSE (v.fecha::DATE + 30)::DATE
   END AS fecha_vencimiento,
   CASE 
     WHEN dv.primer_service_realizado = true THEN 
       CASE 
         WHEN (v.fecha::DATE + INTERVAL '6 months')::DATE < CURRENT_DATE THEN 'concluida'
         WHEN ((v.fecha::DATE + INTERVAL '6 months')::DATE - CURRENT_DATE)::INT <= 15 THEN 'por_vencer'
         ELSE 'vigente'
       END
     ELSE 
       CASE 
         WHEN (v.fecha::DATE + 30)::DATE < CURRENT_DATE THEN 'caducada_sin_service'
         WHEN ((v.fecha::DATE + 30)::DATE - CURRENT_DATE)::INT <= 7 THEN 'service_por_vencer'
         ELSE 'service_pendiente'
       END
   END AS estado_garantia
   ```
   Como se observa en la consulta, cuando `primer_service_realizado` pasa a `true`, la fecha de vencimiento pasa a `v.fecha + 6 meses` (es decir, 180 días desde la compra original, por lo que los primeros 30 días forman parte de los 180).

2. **Tablero de Garantías con Semáforo de Criticidad (`TabGarantiasListado.tsx`):**
   - Muestra KPIs superiores, un banner ámbar de alerta temprana cuando existen garantías próximas a vencer (`service_por_vencer` en los últimos 7 días de los 30 iniciales, o `por_vencer` en los últimos 15 días de los 180 totales) y etiquetas con código de color:
     - **Azul (`1° Service Pendiente`):** Dentro de los primeros 30 días.
     - **Ámbar (`Service por vencer` / `Por vencer`):** Alerta de proximidad de vencimiento.
     - **Rojo (`Caducada sin Service`):** Pasaron los 30 días sin hacer el service; la garantía dejó de estar vigente.
     - **Verde (`Vigente`):** Cumplió el 1° Service; corriendo el resto de los 180 días.
     - **Gris (`Garantía Concluida`):** Cumplió el ciclo completo de 180 días.

3. **Excepción Administrativa Protegida por Rol (`VentaService.registrarPrimerService`, líneas 503–556):**
   - Si un cliente llega en el día 35 (con la garantía ya caída por no hacer el service en los primeros 30 días), un usuario con rol `EMPLEADO` tiene **bloqueado** el registro tanto en `ModalRegistroPrimerService.tsx` como en el endpoint `PATCH /api/ventas/garantias/:id_detalle_venta/primer-service`.
   - Únicamente un usuario con rol `ADMIN` o `SUPERADMIN` puede tildar la casilla de **Excepción Administrativa**, lo cual rehabilita la garantía hasta el día 180, marca `service_excepcion = true` en `Detalle_Venta` y graba en `Bitacora_Actividad` la acción `'1° Service Excepción'`.

---

### PUNTO FUERTE 4: Arquitectura Monorepo y Búsqueda con Trigramas (`pg_trgm`)

#### A. Arquitectura Monorepo y Empaquetado Desktop (`pnpm` + Electron 42 + React 19 + Express 5)
1. **Estructura Monorepo con `pnpm workspaces`:**
   - El proyecto separa limpiamente `frontend/` (React 19 + Vite + Electron), `backend/` (Express 5 + TypeScript + `pg`) y `database/` (`bikesystem.sql`).
2. **Empaquetado Unificado y Subproceso Autónomo (`frontend/electron/main.ts`):**
   - Para que el personal de DN Bikes use el sistema como una aplicación nativa de Windows sin abrir consolas ni servidores manualmente, el comando `pnpm dist` compila el backend completo en un único archivo CommonJS (`backend/dist/server.cjs`) mediante `esbuild` y lo empaqueta dentro de los recursos del instalador (`BikeSystem Setup 1.0.0.exe`).
   - Al ejecutarse la app de escritorio, el proceso principal de Electron (`startBackendServer`, líneas 35–63 de `main.ts`) levanta automáticamente el servidor Express en segundo plano mediante **`utilityProcess.fork(serverPath)`** y lo finaliza limpiamente al cerrar la ventana (`stopBackendServer`).
   - La ventana `BrowserWindow` (líneas 100–181 de `main.ts`) aplica aislamiento de seguridad (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) y bloquea recargas accidentales (`F5`/`Ctrl+R`) o apertura de DevTools en producción.

#### B. Velocidad de Búsqueda con Trigramas (`pg_trgm`) e Índices GIN
1. **Por qué usamos `pg_trgm` (`database/bikesystem.sql`, línea 2 y líneas 247–254):**
   - En un catálogo con cientos de repuestos y clientes, el usuario busca escribiendo fragmentos intermedios (ej. `"shimano"`, `"29"`, `"camara"`), lo que se traduce en SQL a `ILIKE '%termino%'`.
   - Un índice tradicional **B-Tree** solo funciona si se busca desde el primer carácter (`LIKE 'termino%'`), pero **queda inutilizado** cuando hay un comodín `%` adelante, forzando a PostgreSQL a realizar un *Sequential Scan* fila por fila.
   - Al activar `CREATE EXTENSION IF NOT EXISTS pg_trgm;` y crear **6 índices GIN (`USING gin (... gin_trgm_ops)`)** sobre nombre, marca y modelo de `Productos`, sobre `nombre || ' ' || apellido` y `dni` de `Cliente`, y sobre `Proveedor`, PostgreSQL divide cada texto en trigramas (grupos de 3 letras) y resuelve cualquier búsqueda parcial `ILIKE '%...%'` en **menos de 5 ms** mediante un *Bitmap Index Scan*.
2. **Combinación con Parser de Lenguaje Natural (`ProductoService.parsearBusquedaAvanzada`, líneas 103–185):**
   - En el buscador de Stock y POS, si el vendedor escribe `"scott r29 talle m"` o `"#8"`, el parser extrae automáticamente los atributos estructurados (`rodado = '29'`, `talle = 'm'`, `id = 8`) y aplica los términos restantes sobre los índices GIN trigramáticos, complementado en el frontend con el hook `useDebounce` (`300ms`).

---

## 3. RECORRIDO EXACTO PARA LA DEMOSTRACIÓN EN VIVO (10 MINUTOS)

Para que la demo sea dinámica y sin tiempos muertos, realicen **un único flujo continuo** con el mismo cliente y producto:

### Paso 1: Búsqueda Trigramática en Catálogo (1 min)
1. Abrir el módulo **Stock**.
2. Escribir en el buscador `"scott r29"` o el nombre parcial de un repuesto.
3. Señalar la respuesta instantánea (gracias a `useDebounce` + `parsearBusquedaAvanzada` + índice GIN `pg_trgm`) y los indicadores visuales de criticidad de stock (`Óptimo` en verde, `Bajo Stock` en amarillo, `Sin Stock` en rojo).

### Paso 2: Venta en POS, Transacción ACID y Comprobante PDF (3 min)
1. Ir a **Ventas $\rightarrow$ + Nueva Venta**.
2. Seleccionar un cliente (buscándolo por DNI o apellido con `pg_trgm`) y cargar al carrito **1 Bicicleta Nueva** y **1 Repuesto**.
3. Confirmar la operación y abrir el **Comprobante PDF** generado automáticamente (mostrar en la parte inferior del PDF el recuadro ámbar de *Condiciones de Garantía Oficial de 6 meses sujeta al 1° Service dentro de los 30 días*).
4. **Cambiar 45 segundos a VS Code (`venta.service.ts`, líneas 55–145):** Mostrar en pantalla el `.sort()` que previene Deadlocks, el `BEGIN`, el `SELECT ... FOR UPDATE`, el descuento en `Productos`, el insert en `Movimiento_Stock` y el `INSERT INTO Bicicleta` que acaba de asociar el rodado al cliente.

### Paso 3: Regla de Garantías en Vivo (2 min)
1. En **Ventas**, cambiar a la pestaña **Control de Garantías**.
2. Mostrar cómo la bicicleta recién facturada ya aparece primera en la tabla con estado **`1° Service Pendiente (30 d)`** en color azul.
3. Mostrar también una fila que tenga estado **`Caducada sin Service`** (en rojo, explicando que pasó el día 30 sin hacer el service y perdió la vigencia de los 180 días) y cómo un Administrador puede autorizar la excepción.
4. Hacer clic en **Registrar 1° Service** sobre la bicicleta recién vendida, cargar la observación técnica y confirmar: mostrar cómo su etiqueta pasa inmediatamente a **`Vigente (180 d) - Garantía extendida (6 meses)`** en color verde.

### Paso 4: Tablero Kanban de Taller e Imputación de Repuestos (2.5 min)
1. Ir al módulo **Reparaciones (Taller)**.
2. Crear una nueva orden para la bicicleta del cliente (o tomar una tarjeta de la columna **Recibida**) y **arrastrarla con el mouse (Drag & Drop)** a la columna **En Reparación**.
3. Hacer clic en **`Agregar Repuestos`** dentro de la tarjeta, asignar un repuesto del inventario y mostrar cómo el **Total Estimado** de la tarjeta se actualiza en vivo sumando `Mano de Obra + Repuestos`.
4. Arrastrar la tarjeta a la columna **Lista** y hacer clic en **`✓ Entregar a Cliente`** (explicando que recién en este paso se sella `fecha_egreso = CURRENT_DATE` y se bloquea la orden).

### Paso 5: Auditoría en Kardex e Historial Clínico de la Bicicleta (1.5 min)
1. Ir a **Stock $\rightarrow$ Historial de Movimientos (Kardex)** y mostrar los dos egresos trazables que se acaban de generar automáticamente: `'Venta Comercial'` (del Paso 2) y `'Uso Interno de Taller'` (del Paso 4).
2. Ir a **Bicicletas**, buscar la bicicleta del cliente y hacer clic en **Historial**: mostrar la **Ficha Técnica e Historial Clínico** con la orden recién entregada, el mecánico responsable y la lista de repuestos utilizados (obtenidos con la consulta `WITH repuestos_agg` y `json_agg`).

---

## 4. CHECKLIST DE PREPARACIÓN PREVIA AL COLOQUIO

1. **Archivos abiertos en VS Code (en este orden de pestañas y con fuente agrandada):**
   - Pestaña 1: `frontend/electron/main.ts` (Líneas 35–63: arranque del backend con `utilityProcess.fork`).
   - Pestaña 2: `database/bikesystem.sql` (Líneas 247–255: índices GIN `pg_trgm`).
   - Pestaña 3: `backend/src/services/venta.service.ts` (Líneas 55–176: transacción POS y anti-deadlock; Líneas 351–374: cálculo SQL de garantías 30/180 días).
   - Pestaña 4: `backend/src/services/detalleReparacion.service.ts` (Líneas 43–126: imputación atómica de repuestos en taller y Kardex).
   - Pestaña 5: `backend/src/services/bicicleta.service.ts` (Líneas 281–315: CTE con `json_agg` para el historial clínico).
2. **PDFs abiertos para mostrar organización documental:**
   - `docs/Documentacion tecnica.pdf` (abierto en el Diagrama Entidad-Relación y arquitectura).
   - `docs/Manual de Usuario.pdf` (abierto en el índice, capturas anotadas, sección de Preguntas Frecuentes — FAQ y Glosario).
3. **Terminal lista con los 67 tests pasados:**
   - Dejar ejecutado `cd backend && pnpm test` en una terminal secundaria por si el tribunal consulta cómo validaron que las reglas de negocio (stock negativo, deadlocks, garantías, estados de taller) no tuvieran regresiones.
