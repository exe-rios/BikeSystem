import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { validarId } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

const TIPOS_PRODUCTO_VALIDOS = ['bicicleta', 'repuesto', 'accesorio'];

export const PRODUCTO_SELECT = `
  SELECT p.*, 
         COALESCE(pb.marca, p.marca) AS marca, 
         pb.color, pb.rodado, pb.talle, pb.genero,
         prov.nombre_empresa AS proveedor_nombre,
         prov.cotizacion_dolar AS proveedor_cotizacion_dolar,
         CASE 
             WHEN p.cantidad <= 0 THEN 'sin_stock'
             WHEN p.stock_minimo > 0 AND p.cantidad <= p.stock_minimo THEN 'bajo_stock'
             ELSE 'optimo'
         END AS estado_stock
  FROM Productos p
  LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
  LEFT JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
`;

const GENEROS_BICICLETA_VALIDOS = ['hombre', 'mujer', 'unisex', 'niño/a'];
const MONEDAS_VALIDAS = ['ARS', 'USD'];

/** Normaliza el porcentaje de ganancia al factor decimal almacenado en DB (ej. 60 -> 0.6000). */
function normalizarFactorGanancia(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num > 10) {
    return Math.round((num / 100) * 10000) / 10000;
  }
  return Math.round(num * 10000) / 10000;
}

/** Obtiene la cotización efectiva del dólar: propia del proveedor si existe, o global del sistema. */
async function obtenerCotizacionEfectiva(client: { query: (sql: string, params?: any[]) => Promise<any> }, idProveedor: number | null): Promise<number> {
  if (idProveedor) {
    const resProvCot = await client.query('SELECT cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1 LIMIT 1;', [idProveedor]);
    if (resProvCot.rows[0]?.cotizacion_dolar) {
      const cotProv = Number(resProvCot.rows[0].cotizacion_dolar);
      if (!isNaN(cotProv) && cotProv > 0) return cotProv;
    }
  }
  const resCot = await client.query(`SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' LIMIT 1;`);
  const cotGlobal = Number(resCot.rows[0]?.valor);
  return !isNaN(cotGlobal) && cotGlobal > 0 ? cotGlobal : 1;
}

/** Valida formato y restricciones de los campos del artículo. */
export const validarDatosProducto = (body: any) => {
  const { nombre, tipo_prod, cantidad, precio, precio_usd, moneda, id_proveedor, stock_minimo, genero } = body;
  const errores: string[] = [];

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    errores.push('Escribí el nombre del artículo (al menos 2 letras).');
  }

  if (nombre && typeof nombre === 'string' && nombre.trim().length > 100) {
    errores.push('El nombre no puede superar los 100 caracteres.');
  }

  const tipoLimpio = String(tipo_prod || '').trim().toLowerCase();
  if (!tipoLimpio || !TIPOS_PRODUCTO_VALIDOS.includes(tipoLimpio)) {
    errores.push('Elegí un tipo válido: Bicicleta, Repuesto o Accesorio.');
  }

  if (body.marca && typeof body.marca === 'string' && body.marca.trim().length > 50) {
    errores.push('La marca no puede superar los 50 caracteres.');
  }

  if (body.modelo && typeof body.modelo === 'string' && body.modelo.trim().length > 50) {
    errores.push('El modelo no puede superar los 50 caracteres.');
  }

  if (body.codigo && typeof body.codigo === 'string' && body.codigo.trim().length > 50) {
    errores.push('El código del artículo no puede superar los 50 caracteres.');
  }

  if (tipoLimpio === 'bicicleta') {
    const generoVal = String(genero || '').trim().toLowerCase();
    if (!generoVal || !GENEROS_BICICLETA_VALIDOS.includes(generoVal)) {
      errores.push('Seleccioná el género de la bicicleta (Hombre, Mujer, Unisex o Niño/a).');
    }
  }

  if (moneda !== undefined && moneda !== null && moneda !== '') {
    const monedaNorm = String(moneda).trim().toUpperCase();
    if (!MONEDAS_VALIDAS.includes(monedaNorm)) {
      errores.push('La moneda del producto debe ser ARS o USD.');
    }
  }

  if (precio !== undefined && precio !== null && precio !== '') {
    const precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum < 0) {
      errores.push('El precio no puede ser negativo.');
    } else if (precioNum > 99999999.99) {
      errores.push('El precio no puede superar los $99.999.999,99.');
    }
  }

  if (precio_usd !== undefined && precio_usd !== null && precio_usd !== '') {
    const precioUsdNum = Number(precio_usd);
    if (isNaN(precioUsdNum) || precioUsdNum < 0) {
      errores.push('El precio en dólares no puede ser negativo.');
    } else if (precioUsdNum > 99999999.99) {
      errores.push('El precio en dólares no puede superar USD 99.999.999,99.');
    }
  }

  if (body.costo_usd !== undefined && body.costo_usd !== null && body.costo_usd !== '') {
    const costoNum = Number(body.costo_usd);
    if (isNaN(costoNum) || costoNum < 0) {
      errores.push('El costo no puede ser negativo.');
    } else if (costoNum > 99999999.99) {
      errores.push('El costo no puede superar 99.999.999,99.');
    }
  }

  if (body.porcentaje_ganancia !== undefined && body.porcentaje_ganancia !== null && body.porcentaje_ganancia !== '') {
    const ganNum = Number(body.porcentaje_ganancia);
    if (isNaN(ganNum) || ganNum < 0) {
      errores.push('El porcentaje de ganancia no puede ser negativo.');
    } else if (ganNum > 100000) {
      errores.push('El porcentaje de ganancia excede el máximo permitido.');
    }
  }

  if (body.porcentaje_reventa !== undefined && body.porcentaje_reventa !== null && body.porcentaje_reventa !== '') {
    const revPctNum = Number(body.porcentaje_reventa);
    if (isNaN(revPctNum) || revPctNum < 0) {
      errores.push('El porcentaje de reventa no puede ser negativo.');
    } else if (revPctNum > 100000) {
      errores.push('El porcentaje de reventa excede el máximo permitido.');
    }
  }

  if (body.precio_reventa !== undefined && body.precio_reventa !== null && body.precio_reventa !== '') {
    const revNum = Number(body.precio_reventa);
    if (isNaN(revNum) || revNum < 0) {
      errores.push('El precio de reventa no puede ser negativo.');
    } else if (revNum > 99999999.99) {
      errores.push('El precio de reventa no puede superar los $99.999.999,99.');
    }
  }

  if (body.precio_reventa_usd !== undefined && body.precio_reventa_usd !== null && body.precio_reventa_usd !== '') {
    const revUsdNum = Number(body.precio_reventa_usd);
    if (isNaN(revUsdNum) || revUsdNum < 0) {
      errores.push('El precio de reventa en dólares no puede ser negativo.');
    } else if (revUsdNum > 99999999.99) {
      errores.push('El precio de reventa en dólares no puede superar USD 99.999.999,99.');
    }
  }

  if (id_proveedor !== undefined && id_proveedor !== null && id_proveedor !== '') {
    const provNum = Number(id_proveedor);
    if (!Number.isInteger(provNum) || provNum <= 0) {
      errores.push('El proveedor seleccionado no es válido.');
    }
  }

  if (cantidad !== undefined && cantidad !== null && cantidad !== '') {
    const cantNum = Number(cantidad);
    if (isNaN(cantNum) || cantNum < 0 || !Number.isInteger(cantNum)) {
      errores.push('La cantidad debe ser un número entero (0 o más).');
    } else if (cantNum > 1000000) {
      errores.push('La cantidad no puede superar 1.000.000 de unidades.');
    }
  }

  if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '') {
    const stockMinNum = Number(stock_minimo);
    if (isNaN(stockMinNum) || stockMinNum < 0 || !Number.isInteger(stockMinNum)) {
      errores.push('El stock mínimo debe ser un número entero (0 o más).');
    } else if (stockMinNum > 1000000) {
      errores.push('El stock mínimo no puede superar 1.000.000 de unidades.');
    }
  }

  return errores;
};

export interface BusquedaParseada {
  id?: number | undefined;
  talle?: string | undefined;
  rodado?: string | undefined;
  terminos: string[];
}

const TALLES_BICICLETA_ESTANDAR = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'];
const PALABRAS_VACIAS = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'en', 'para', 'con', 'un', 'una', 'unos', 'unas']);

/**
 * Parsea una consulta en lenguaje natural identificando ID de producto, talle, rodado y términos clave.
 * Ejemplos: 
 *   - "8" -> id: 8, terminos: ["8"]
 *   - "id 8" -> id: 8, terminos: ["8"]
 *   - "marca scott talle m" -> talle: "m", terminos: ["scott"]
 */
export function parsearBusquedaAvanzada(busqueda: string): BusquedaParseada {
  if (!busqueda || typeof busqueda !== 'string') {
    return { terminos: [] };
  }

  let texto = busqueda.trim();
  let id: number | undefined = undefined;
  let talle: string | undefined = undefined;
  let rodado: string | undefined = undefined;

  // 1. Extraer ID numérico explícito (ej: "id 8", "id: 8", "producto 8", "art 8", "#8", "# 8", o solo "8")
  const idRegex = /\b(?:id|prod|producto|art|articulo|artículo)\s*[:=]?\s*#?\s*([0-9]+)\b/i;
  const matchId = texto.match(idRegex);
  if (matchId && matchId[1]) {
    const parsedId = Number(matchId[1]);
    if (Number.isInteger(parsedId) && parsedId > 0 && parsedId <= 2147483647) {
      id = parsedId;
    }
    texto = texto.replace(matchId[0], ' ');
  } else {
    const hashRegex = /#\s*([0-9]+)\b/;
    const matchHash = texto.match(hashRegex);
    if (matchHash && matchHash[1]) {
      const parsedId = Number(matchHash[1]);
      if (Number.isInteger(parsedId) && parsedId > 0 && parsedId <= 2147483647) {
        id = parsedId;
      }
      texto = texto.replace(matchHash[0], ' ');
    } else if (/^\s*([0-9]+)\s*$/.test(texto)) {
      const parsedId = Number(texto.trim());
      if (Number.isInteger(parsedId) && parsedId > 0 && parsedId <= 2147483647) {
        id = parsedId;
      }
    }
  }

  // 2. Extraer patrón explícito de talle (ej: "talle m", "talla: XL", "size S")
  const talleRegex = /\b(?:talle|talla|size)\s*[:=]?\s*([a-zA-Z0-9]+)\b/i;
  const matchTalle = texto.match(talleRegex);
  if (matchTalle && matchTalle[1]) {
    talle = matchTalle[1].trim();
    texto = texto.replace(matchTalle[0], ' ');
  }

  // 3. Extraer patrón explícito de rodado (ej: "rodado 29", "rodado: 29", "r29", "rodado gravel")
  const rodadoRegex = /\b(?:rodado|r)\s*[:=]?\s*([0-9]{2}|gravel)\b/i;
  const matchRodado = texto.match(rodadoRegex);
  if (matchRodado && matchRodado[1]) {
    rodado = matchRodado[1].trim();
    texto = texto.replace(matchRodado[0], ' ');
  }

  // 4. Remover palabras descriptoras semánticas que no corresponden a nombres de marca o modelo
  texto = texto.replace(/\b(?:marca|modelo|id|codigo|código|prod|producto|art|articulo|artículo)\b/gi, ' ');

  // 5. Limpiar signos de puntuación y extraer palabras individuales
  let terminos = texto
    .replace(/[.,;:\-_/\\#"'()[\]{}<>]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !PALABRAS_VACIAS.has(t.toLowerCase()));

  // 6. Si no se especificó "talle X", pero hay un término que es estrictamente un talle estándar (ej: "scott m")
  if (!talle && terminos.length > 0) {
    const idxTalle = terminos.findIndex(t => TALLES_BICICLETA_ESTANDAR.includes(t.toLowerCase()));
    if (idxTalle !== -1) {
      talle = terminos[idxTalle];
      terminos.splice(idxTalle, 1);
    }
  }

  // Si se reconoció un ID pero no quedó como término de búsqueda textual, incluirlo para el matching SQL
  if (id && !terminos.some(t => t === String(id) || (/^\d+$/.test(t) && Number(t) === id))) {
    terminos.push(String(id));
  }

  return {
    id,
    talle,
    rodado,
    terminos
  };
}

/** Servicio de catálogo de productos, control de stock y trazabilidad de inventario. */
export class ProductoService {
  /** Obtiene listado paginado de productos con filtros de categoría, proveedor, moneda, stock y métricas resumidas. */
  static async obtenerProductos(filtros: { 
    tipo_prod?: string | undefined; 
    tipo?: string | undefined;
    busqueda?: string | undefined; 
    talle?: string | undefined;
    rodado?: string | undefined;
    marca?: string | undefined;
    id_proveedor?: number | string | undefined;
    moneda?: string | undefined;
    estado_stock?: string | undefined;
    disponibilidad?: string | undefined;
    estado?: string | undefined;
    solo_activos?: boolean | string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    const { tipo_prod, tipo, busqueda, talle, rodado, marca, id_proveedor, moneda, estado_stock, disponibilidad, estado, solo_activos, limite, pagina } = filtros;
    
    // Consulta para resumen global de inventario
    const queryResumen = `
      SELECT 
        COUNT(*) FILTER (WHERE activo = true)::INT AS total_articulos,
        COALESCE(SUM(cantidad) FILTER (WHERE activo = true), 0)::INT AS total_unidades,
        COUNT(*) FILTER (WHERE activo = true AND cantidad > 0 AND stock_minimo > 0 AND cantidad <= stock_minimo)::INT AS bajo_stock_count,
        COUNT(*) FILTER (WHERE activo = true AND cantidad <= 0)::INT AS sin_stock_count,
        COUNT(*) FILTER (WHERE activo = false)::INT AS inactivos_count
      FROM Productos;
    `;

    let query = `
      SELECT p.*, 
             COALESCE(pb.marca, p.marca) AS marca, 
             pb.color, pb.rodado, pb.talle, pb.genero,
             prov.nombre_empresa AS proveedor_nombre,
             prov.cotizacion_dolar AS proveedor_cotizacion_dolar,
             CASE 
                 WHEN p.cantidad <= 0 THEN 'sin_stock'
                 WHEN p.stock_minimo > 0 AND p.cantidad <= p.stock_minimo THEN 'bajo_stock'
                 ELSE 'optimo'
             END AS estado_stock,
             COUNT(*) OVER()::INT AS total_registros
      FROM Productos p
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      LEFT JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filtro de activos / inactivos
    const estadoFiltro = String(estado || '').trim().toLowerCase();
    if (estadoFiltro === 'activos' || solo_activos === true || solo_activos === 'true') {
      query += ` AND p.activo = true`;
    } else if (estadoFiltro === 'inactivos') {
      query += ` AND p.activo = false`;
    } else if (estadoFiltro !== 'todos') {
      // Por defecto mostrar activos a menos que se especifique 'todos'
      query += ` AND p.activo = true`;
    }

    const tipoFiltro = tipo_prod || tipo;
    if (tipoFiltro && typeof tipoFiltro === 'string' && tipoFiltro.trim() !== 'todos') {
      query += ` AND p.tipo_prod = $${paramIndex}`;
      params.push(tipoFiltro.trim().toLowerCase());
      paramIndex++;
    }

    // Filtro por proveedor
    if (id_proveedor !== undefined && id_proveedor !== null && String(id_proveedor).trim() !== '' && String(id_proveedor).trim().toLowerCase() !== 'todos') {
      if (String(id_proveedor).trim().toLowerCase() === 'sin_proveedor') {
        query += ` AND p.id_proveedor IS NULL`;
      } else {
        const provIdNum = Number(id_proveedor);
        if (!Number.isInteger(provIdNum) || provIdNum <= 0) {
          throw new BadRequestError('El filtro de proveedor no es válido.');
        }
        query += ` AND p.id_proveedor = $${paramIndex}`;
        params.push(provIdNum);
        paramIndex++;
      }
    }

    // Filtro por moneda
    if (moneda && typeof moneda === 'string' && ['ARS', 'USD'].includes(moneda.trim().toUpperCase())) {
      query += ` AND p.moneda = $${paramIndex}`;
      params.push(moneda.trim().toUpperCase());
      paramIndex++;
    }

    // Procesamiento avanzado de búsqueda inteligente (marca, talle, rodado, términos libres)
    const busquedaParseada = parsearBusquedaAvanzada(busqueda || '');

    // Filtro de talle (por parámetro explícito o detectado en la frase de búsqueda)
    const talleFinal = (talle || busquedaParseada.talle)?.trim();
    if (talleFinal) {
      query += ` AND (LOWER(TRIM(COALESCE(pb.talle, ''))) = LOWER($${paramIndex}) OR p.nombre ILIKE $${paramIndex + 1})`;
      params.push(talleFinal);
      params.push(`%talle ${talleFinal}%`);
      paramIndex += 2;
    }

    // Filtro de rodado (por parámetro explícito o detectado en la frase de búsqueda)
    const rodadoFinal = (rodado || busquedaParseada.rodado)?.trim();
    if (rodadoFinal) {
      query += ` AND (LOWER(TRIM(COALESCE(pb.rodado, ''))) = LOWER($${paramIndex}) OR p.nombre ILIKE $${paramIndex + 1})`;
      params.push(rodadoFinal);
      params.push(`%${rodadoFinal}%`);
      paramIndex += 2;
    }

    // Filtro de marca explícito si fue provisto
    if (marca && typeof marca === 'string' && marca.trim()) {
      query += ` AND (p.marca ILIKE $${paramIndex} OR pb.marca ILIKE $${paramIndex})`;
      params.push(`%${marca.trim()}%`);
      paramIndex++;
    }

    // Intersección (AND) de cada término individual restante (ej: "scott")
    if (busquedaParseada.terminos.length > 0) {
      for (const termino of busquedaParseada.terminos) {
        query += ` AND (
          p.codigo ILIKE $${paramIndex} OR
          p.nombre ILIKE $${paramIndex} OR 
          p.marca ILIKE $${paramIndex} OR 
          p.modelo ILIKE $${paramIndex} OR 
          pb.marca ILIKE $${paramIndex} OR 
          pb.color ILIKE $${paramIndex} OR 
          pb.genero ILIKE $${paramIndex} OR 
          p.tipo_prod ILIKE $${paramIndex} OR
          CAST(p.id_producto AS TEXT) ILIKE $${paramIndex}
        )`;
        params.push(`%${termino}%`);
        paramIndex++;
      }
    }

    const dispFiltro = String(estado_stock || disponibilidad || '').trim().toLowerCase();
    if (dispFiltro && dispFiltro !== 'todos') {
      if (dispFiltro === 'sin_stock') {
        query += ` AND p.cantidad <= 0`;
      } else if (dispFiltro === 'bajo_stock') {
        query += ` AND p.activo = true AND p.cantidad > 0 AND p.stock_minimo > 0 AND p.cantidad <= p.stock_minimo`;
      } else if (dispFiltro === 'optimo' || dispFiltro === 'disponible') {
        query += ` AND p.activo = true AND p.cantidad > 0 AND (p.stock_minimo = 0 OR p.cantidad > p.stock_minimo)`;
      }
    }

    // Priorización de ID: si la búsqueda especificó un ID o alguno de los términos es un número entero,
    // colocamos la coincidencia exacta de ID primero en el ordenamiento.
    const idPrioritario = busquedaParseada.id || (
      busquedaParseada.terminos.find(t => /^\d+$/.test(t)) ? Number(busquedaParseada.terminos.find(t => /^\d+$/.test(t))) : undefined
    );

    if (idPrioritario && Number.isInteger(idPrioritario) && idPrioritario > 0 && idPrioritario <= 2147483647) {
      query += ` ORDER BY CASE WHEN p.id_producto = $${paramIndex} THEN 0 ELSE 1 END, p.id_producto DESC`;
      params.push(idPrioritario);
      paramIndex++;
    } else {
      query += ` ORDER BY p.id_producto DESC`;
    }

    const paginacion = normalizarPaginacion({ limite, pagina }, { opcional: true });
    query = aplicarPaginacionSQL(query, params, paginacion);

    // Ejecución paralela de resumen y listado paginado
    const [resResumen, result] = await Promise.all([
      pool.query(queryResumen),
      pool.query(query, params)
    ]);

    const resumen = resResumen.rows[0] || {
      total_articulos: 0,
      total_unidades: 0,
      bajo_stock_count: 0,
      sin_stock_count: 0,
      inactivos_count: 0
    };

    const total = result.rows.length > 0 ? Number(result.rows[0].total_registros) : 0;
    const meta = calcularMetaPaginacion(total, paginacion);
    const productos = result.rows.map(({ total_registros, ...prod }) => prod);

    return {
      ...meta,
      resumen: {
        total_articulos: Number(resumen.total_articulos) || 0,
        total_unidades: Number(resumen.total_unidades) || 0,
        bajo_stock_count: Number(resumen.bajo_stock_count) || 0,
        sin_stock_count: Number(resumen.sin_stock_count) || 0,
        inactivos_count: Number(resumen.inactivos_count) || 0
      },
      productos
    };
  }

  /** Obtiene el detalle completo de un producto por su ID. */
  static async obtenerProductoPorId(id: number) {
    validarId(id, 'No se encontró ese producto.');

    const query = `${PRODUCTO_SELECT} WHERE p.id_producto = $1;`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }

    return result.rows[0];
  }

  /** Da de alta un nuevo artículo en catálogo y registra el stock inicial en Kardex si aplica. */
  static async crearProducto(datos: any, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    const errores = validarDatosProducto(datos);
    if (errores.length > 0) {
      throw new BadRequestError('Hay errores en los datos del artículo.', errores);
    }

    const { codigo, nombre, marca, modelo, tipo_prod, cantidad, color, rodado, talle, genero, precio, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, moneda, id_proveedor, stock_minimo, activo } = datos;
    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const estadoActivo = activo !== undefined ? Boolean(activo) : true;
    const codigoLimpio = codigo !== undefined && codigo !== null && String(codigo).trim() !== '' ? String(codigo).trim() : null;
    const tipoLimpio = String(tipo_prod).trim().toLowerCase();
    const marcaLimpia = marca ? String(marca).trim() : null;
    const monedaLimpia = String(moneda || 'ARS').trim().toUpperCase() === 'USD' ? 'USD' : 'ARS';
    const idProveedorFinal = id_proveedor !== undefined && id_proveedor !== null && id_proveedor !== '' ? Number(id_proveedor) : null;
    const costoUsdFinal = costo_usd !== undefined && costo_usd !== null && costo_usd !== '' ? Math.round(Number(costo_usd) * 100) / 100 : null;
    const gananciaFinal = normalizarFactorGanancia(porcentaje_ganancia);
    const porcentajeReventaFinal = normalizarFactorGanancia(porcentaje_reventa);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let precioFinalArs = Math.round((Number(precio) || 0) * 100) / 100;
      let precioUsdFinal: number | null = null;
      let precioReventaFinal: number | null = null;
      let precioReventaUsdFinal: number | null = null;

      if (monedaLimpia === 'USD') {
        const cotizacion = await obtenerCotizacionEfectiva(client, idProveedorFinal);
        if (precio_usd !== undefined && precio_usd !== null && precio_usd !== '') {
          precioUsdFinal = Math.round(Number(precio_usd) * 100) / 100;
        } else if (costoUsdFinal !== null && costoUsdFinal > 0 && gananciaFinal !== null) {
          precioUsdFinal = Math.round(costoUsdFinal * (1 + gananciaFinal) * 100) / 100;
        } else {
          precioUsdFinal = Math.round(Number(precio || 0) * 100) / 100;
        }
        precioFinalArs = Math.round(precioUsdFinal * cotizacion * 100) / 100;

        if (precio_reventa_usd !== undefined && precio_reventa_usd !== null && precio_reventa_usd !== '') {
          precioReventaUsdFinal = Math.round(Number(precio_reventa_usd) * 100) / 100;
        } else if (costoUsdFinal !== null && costoUsdFinal > 0 && porcentajeReventaFinal !== null) {
          precioReventaUsdFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
        } else if (precio_reventa !== undefined && precio_reventa !== null && precio_reventa !== '') {
          precioReventaFinal = Math.round(Number(precio_reventa) * 100) / 100;
          if (cotizacion > 0) {
            precioReventaUsdFinal = Math.round((precioReventaFinal / cotizacion) * 100) / 100;
          }
        }
        if (precioReventaUsdFinal !== null) {
          precioReventaFinal = Math.round(precioReventaUsdFinal * cotizacion * 100) / 100;
        }
      } else {
        if (
          costoUsdFinal !== null &&
          costoUsdFinal > 0 &&
          gananciaFinal !== null &&
          (precio === undefined || precio === null || precio === '')
        ) {
          precioFinalArs = Math.round(costoUsdFinal * (1 + gananciaFinal) * 100) / 100;
        }

        if (precio_reventa !== undefined && precio_reventa !== null && precio_reventa !== '') {
          precioReventaFinal = Math.round(Number(precio_reventa) * 100) / 100;
        } else if (costoUsdFinal !== null && costoUsdFinal > 0 && porcentajeReventaFinal !== null) {
          precioReventaFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
        }
      }

      const queryProd = `
        INSERT INTO Productos (codigo, nombre, marca, modelo, tipo_prod, cantidad, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, id_proveedor, stock_minimo, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *;
      `;
      const resultProd = await client.query(queryProd, [
        codigoLimpio,
        nombre.trim(),
        marcaLimpia,
        modelo ? String(modelo).trim() : null,
        tipoLimpio,
        Number(cantidad) || 0,
        precioFinalArs,
        monedaLimpia,
        precioUsdFinal,
        costoUsdFinal,
        gananciaFinal,
        porcentajeReventaFinal,
        precioReventaFinal,
        precioReventaUsdFinal,
        idProveedorFinal,
        Number(stock_minimo) || 0,
        estadoActivo
      ]);

      const nuevoProducto = resultProd.rows[0];

      if (tipoLimpio === 'bicicleta') {
        const queryBici = `
          INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle, genero)
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        await client.query(queryBici, [
          nuevoProducto.id_producto,
          marcaLimpia || 'Genérica',
          color ? String(color).trim() : null,
          rodado ? String(rodado).trim() : null,
          talle ? String(talle).trim() : null,
          String(genero).trim().toLowerCase()
        ]);
      }

      if (idUsuarioOperador && Number(cantidad) > 0) {
        await client.query(
          `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
           VALUES ($1, $2, 'INGRESO', $3, 'Carga Inicial de Inventario', 'Alta de producto nuevo en catálogo');`,
          [nuevoProducto.id_producto, idUsuarioOperador, Number(cantidad)]
        );
      }

      const infoMoneda = monedaLimpia === 'USD' ? ` (USD ${precioUsdFinal} -> $${nuevoProducto.precio} ARS)` : ` ($${nuevoProducto.precio} ARS)`;
      const infoProv = idProveedorFinal ? `, Proveedor ID #${idProveedorFinal}` : '';
      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Alta de Producto', $3);`,
        [
          idUsuarioOperador || null,
          String(nombreUsuarioOperador || 'Usuario').trim().slice(0, 50),
          `Producto registrado: "${nuevoProducto.nombre}" (ID #${nuevoProducto.id_producto}, Tipo: ${tipoLimpio}, Stock: ${nuevoProducto.cantidad}${infoProv}, Precio:${infoMoneda}).`
        ]
      );

      await client.query('COMMIT');

      const resultCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [nuevoProducto.id_producto]);
      return resultCompleto.rows[0] || nuevoProducto;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Actualiza los datos de un artículo y registra diferencias de stock en Kardex si cambiaron. */
  static async actualizarProducto(
    id: number,
    datos: any,
    operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined; rolUsuarioOperador?: string | undefined }
  ) {
    validarId(id, 'No se encontró ese producto.');

    const { idUsuarioOperador, nombreUsuarioOperador, rolUsuarioOperador } = operador;
    if (
      datos?.activo !== undefined &&
      rolUsuarioOperador &&
      !['ADMIN', 'SUPERADMIN'].includes(rolUsuarioOperador.toUpperCase())
    ) {
      throw new ForbiddenError('Solo un administrador puede activar o desactivar productos.');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const checkProd = await client.query('SELECT * FROM Productos WHERE id_producto = $1 FOR UPDATE;', [id]);
      if (checkProd.rowCount === 0) {
        throw new NotFoundError('Ese producto no existe.');
      }

      const prodAnterior = checkProd.rows[0];
      const stockAnterior = Number(prodAnterior.cantidad);

      const { codigo, nombre, marca, modelo, tipo_prod, cantidad, color, rodado, talle, genero, precio, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, moneda, id_proveedor, stock_minimo, activo } = datos;

      if (codigo !== undefined && codigo !== null && typeof codigo === 'string' && codigo.trim().length > 50) {
        throw new BadRequestError('El código del artículo no puede superar los 50 caracteres.');
      }

      const codigoFinal: string | null = 'codigo' in datos
        ? (codigo !== null && String(codigo).trim() !== '' ? String(codigo).trim() : null)
        : (prodAnterior.codigo ?? null);

      let tipoLimpio: string | null = null;
      if (tipo_prod) {
        tipoLimpio = String(tipo_prod).trim().toLowerCase();
        if (!TIPOS_PRODUCTO_VALIDOS.includes(tipoLimpio)) {
          throw new BadRequestError('Elegí un tipo válido: Bicicleta, Repuesto o Accesorio.');
        }
      }

      if (genero !== undefined && genero !== null && genero !== '') {
        const generoVal = String(genero).trim().toLowerCase();
        if (!GENEROS_BICICLETA_VALIDOS.includes(generoVal)) {
          throw new BadRequestError('Seleccioná un género válido: Hombre, Mujer, Unisex o Niño/a.');
        }
      }

      if (cantidad !== undefined && cantidad !== null && cantidad !== '') {
        const cantNum = Number(cantidad);
        if (isNaN(cantNum) || cantNum < 0 || !Number.isInteger(cantNum)) {
          throw new BadRequestError('La cantidad debe ser un número entero mayor o igual a 0.');
        }
      }

      if (precio !== undefined && precio !== null && precio !== '') {
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) {
          throw new BadRequestError('El precio no puede ser negativo.');
        }
      }

      if (precio_usd !== undefined && precio_usd !== null && precio_usd !== '') {
        const precioUsdNum = Number(precio_usd);
        if (isNaN(precioUsdNum) || precioUsdNum < 0) {
          throw new BadRequestError('El precio en dólares no puede ser negativo.');
        }
      }

      if (costo_usd !== undefined && costo_usd !== null && costo_usd !== '') {
        const costoNum = Number(costo_usd);
        if (isNaN(costoNum) || costoNum < 0) {
          throw new BadRequestError('El costo no puede ser negativo.');
        }
      }

      if (porcentaje_ganancia !== undefined && porcentaje_ganancia !== null && porcentaje_ganancia !== '') {
        const ganNum = Number(porcentaje_ganancia);
        if (isNaN(ganNum) || ganNum < 0) {
          throw new BadRequestError('El porcentaje de ganancia no puede ser negativo.');
        }
      }

      if (porcentaje_reventa !== undefined && porcentaje_reventa !== null && porcentaje_reventa !== '') {
        const revPctNum = Number(porcentaje_reventa);
        if (isNaN(revPctNum) || revPctNum < 0) {
          throw new BadRequestError('El porcentaje de reventa no puede ser negativo.');
        }
      }

      if (precio_reventa !== undefined && precio_reventa !== null && precio_reventa !== '') {
        const revNum = Number(precio_reventa);
        if (isNaN(revNum) || revNum < 0) {
          throw new BadRequestError('El precio de reventa no puede ser negativo.');
        }
      }

      if (precio_reventa_usd !== undefined && precio_reventa_usd !== null && precio_reventa_usd !== '') {
        const revUsdNum = Number(precio_reventa_usd);
        if (isNaN(revUsdNum) || revUsdNum < 0) {
          throw new BadRequestError('El precio de reventa en dólares no puede ser negativo.');
        }
      }

      if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '') {
        const stockMinNum = Number(stock_minimo);
        if (isNaN(stockMinNum) || stockMinNum < 0 || !Number.isInteger(stockMinNum)) {
          throw new BadRequestError('El stock mínimo debe ser un número entero mayor o igual a 0.');
        }
      }

      let idProveedorFinal: number | null = prodAnterior.id_proveedor ?? null;
      if ('id_proveedor' in datos) {
        if (id_proveedor === null || id_proveedor === '') {
          idProveedorFinal = null;
        } else {
          idProveedorFinal = validarId(id_proveedor, 'El proveedor seleccionado no es válido.');
        }
      }

      const monedaActual = prodAnterior.moneda === 'USD' ? 'USD' : 'ARS';
      let monedaFinal = monedaActual;
      if (moneda !== undefined && moneda !== null && moneda !== '') {
        const mNorm = String(moneda).trim().toUpperCase();
        if (!MONEDAS_VALIDAS.includes(mNorm)) {
          throw new BadRequestError('La moneda debe ser ARS o USD.');
        }
        monedaFinal = mNorm;
      }

      const costoUsdFinal: number | null = 'costo_usd' in datos
        ? (costo_usd !== null && costo_usd !== '' ? Math.round(Number(costo_usd) * 100) / 100 : null)
        : (monedaActual === 'USD' && monedaFinal === 'ARS'
            ? null
            : (prodAnterior.costo_usd !== null && prodAnterior.costo_usd !== undefined ? Number(prodAnterior.costo_usd) : null));

      const marcaFinal: string | null = 'marca' in datos
        ? (marca !== null && String(marca).trim() !== '' ? String(marca).trim() : null)
        : (prodAnterior.marca ?? null);
      const modeloFinal: string | null = 'modelo' in datos
        ? (modelo !== null && String(modelo).trim() !== '' ? String(modelo).trim() : null)
        : (prodAnterior.modelo ?? null);

      const gananciaFinal: number | null = 'porcentaje_ganancia' in datos
        ? normalizarFactorGanancia(porcentaje_ganancia)
        : (prodAnterior.porcentaje_ganancia !== null && prodAnterior.porcentaje_ganancia !== undefined ? Number(prodAnterior.porcentaje_ganancia) : null);

      const porcentajeReventaFinal: number | null = 'porcentaje_reventa' in datos
        ? normalizarFactorGanancia(porcentaje_reventa)
        : (prodAnterior.porcentaje_reventa !== null && prodAnterior.porcentaje_reventa !== undefined ? Number(prodAnterior.porcentaje_reventa) : null);

      let precioFinalArs = Number(prodAnterior.precio);
      let precioUsdFinal: number | null = prodAnterior.precio_usd !== null && prodAnterior.precio_usd !== undefined ? Number(prodAnterior.precio_usd) : null;
      let precioReventaFinal: number | null = prodAnterior.precio_reventa !== null && prodAnterior.precio_reventa !== undefined ? Number(prodAnterior.precio_reventa) : null;
      let precioReventaUsdFinal: number | null = prodAnterior.precio_reventa_usd !== null && prodAnterior.precio_reventa_usd !== undefined ? Number(prodAnterior.precio_reventa_usd) : null;

      if (monedaFinal === 'USD') {
        const cambioCostoOGanancia = 'costo_usd' in datos || 'porcentaje_ganancia' in datos;
        const cambioReventa = 'costo_usd' in datos || 'porcentaje_reventa' in datos || 'precio_reventa_usd' in datos || 'precio_reventa' in datos;
        const necesitaRecalculo =
          moneda !== undefined ||
          precio_usd !== undefined ||
          precio !== undefined ||
          cambioCostoOGanancia ||
          cambioReventa ||
          'id_proveedor' in datos;

        if (precio_usd !== undefined && precio_usd !== null && precio_usd !== '') {
          precioUsdFinal = Math.round(Number(precio_usd) * 100) / 100;
        } else if (cambioCostoOGanancia && costoUsdFinal !== null && costoUsdFinal > 0) {
          precioUsdFinal = Math.round(costoUsdFinal * (1 + (gananciaFinal || 0)) * 100) / 100;
        } else if (precioUsdFinal === null && precio !== undefined && precio !== '') {
          precioUsdFinal = Math.round(Number(precio) * 100) / 100;
        } else if (precioUsdFinal === null) {
          precioUsdFinal = 0;
        }

        const cotizacion = necesitaRecalculo ? await obtenerCotizacionEfectiva(client, idProveedorFinal) : 1;
        if (necesitaRecalculo) {
          precioFinalArs = Math.round(precioUsdFinal * cotizacion * 100) / 100;
        }

        if ('precio_reventa_usd' in datos) {
          if (precio_reventa_usd !== null && precio_reventa_usd !== '') {
            precioReventaUsdFinal = Math.round(Number(precio_reventa_usd) * 100) / 100;
          } else if (costoUsdFinal !== null && costoUsdFinal > 0 && porcentajeReventaFinal !== null) {
            precioReventaUsdFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
          } else {
            precioReventaUsdFinal = null;
          }
        } else if (('costo_usd' in datos || 'porcentaje_reventa' in datos) && costoUsdFinal !== null && costoUsdFinal > 0 && porcentajeReventaFinal !== null) {
          precioReventaUsdFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
        } else if ('precio_reventa' in datos) {
          if (precio_reventa === null || precio_reventa === '') {
            precioReventaUsdFinal = null;
            precioReventaFinal = null;
          } else if (cotizacion > 0) {
            precioReventaUsdFinal = Math.round((Number(precio_reventa) / cotizacion) * 100) / 100;
          }
        }

        if (necesitaRecalculo) {
          precioReventaFinal = precioReventaUsdFinal !== null ? Math.round(precioReventaUsdFinal * cotizacion * 100) / 100 : null;
        }
      } else {
        precioUsdFinal = null;
        precioReventaUsdFinal = null;
        if (precio !== undefined && precio !== null && precio !== '') {
          precioFinalArs = Math.round(Number(precio) * 100) / 100;
        } else if (
          ('costo_usd' in datos || 'porcentaje_ganancia' in datos) &&
          costoUsdFinal !== null &&
          costoUsdFinal > 0
        ) {
          precioFinalArs = Math.round(costoUsdFinal * (1 + (gananciaFinal || 0)) * 100) / 100;
        }

        if ('precio_reventa' in datos) {
          if (precio_reventa !== null && precio_reventa !== '') {
            precioReventaFinal = Math.round(Number(precio_reventa) * 100) / 100;
          } else if (costoUsdFinal !== null && costoUsdFinal > 0 && porcentajeReventaFinal !== null) {
            precioReventaFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
          } else {
            precioReventaFinal = null;
          }
        } else if (
          ('costo_usd' in datos || 'porcentaje_reventa' in datos) &&
          costoUsdFinal !== null &&
          costoUsdFinal > 0 &&
          porcentajeReventaFinal !== null
        ) {
          precioReventaFinal = Math.round(costoUsdFinal * (1 + porcentajeReventaFinal) * 100) / 100;
        }
      }

      const queryProd = `
        UPDATE Productos
        SET codigo = $1,
            nombre = COALESCE($2, nombre),
            marca = $3,
            modelo = $4,
            tipo_prod = COALESCE($5, tipo_prod),
            cantidad = COALESCE($6, cantidad),
            precio = $7,
            moneda = $8,
            precio_usd = $9,
            id_proveedor = $10,
            stock_minimo = COALESCE($11, stock_minimo),
            activo = COALESCE($12, activo),
            costo_usd = $13,
            porcentaje_ganancia = $14,
            porcentaje_reventa = $15,
            precio_reventa = $16,
            precio_reventa_usd = $17
        WHERE id_producto = $18
        RETURNING *;
      `;
      const resultProd = await client.query(queryProd, [
        codigoFinal,
        nombre !== undefined ? String(nombre).trim() : null,
        marcaFinal,
        modeloFinal,
        tipoLimpio,
        cantidad !== undefined && cantidad !== null && cantidad !== '' ? Number(cantidad) : null,
        precioFinalArs,
        monedaFinal,
        precioUsdFinal,
        idProveedorFinal,
        stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' ? Number(stock_minimo) : null,
        activo !== undefined ? Boolean(activo) : null,
        costoUsdFinal,
        gananciaFinal,
        porcentajeReventaFinal,
        precioReventaFinal,
        precioReventaUsdFinal,
        id
      ]);

      const productoActualizado = resultProd.rows[0];
      const stockNuevo = Number(productoActualizado.cantidad);
      const deltaStock = stockNuevo - stockAnterior;

      // Mantener trazabilidad en Kardex (Movimiento_Stock) si se editó la cantidad directamente
      if (deltaStock !== 0 && idUsuarioOperador) {
        const tipoMovDb = deltaStock > 0 ? 'INGRESO' : 'EGRESO';
        const cantMovDb = Math.abs(deltaStock);
        await client.query(
          `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
           VALUES ($1, $2, $3, $4, 'Ajuste en edición de catálogo', $5);`,
          [id, idUsuarioOperador, tipoMovDb, cantMovDb, `Stock modificado de ${stockAnterior} a ${stockNuevo} un.`]
        );
      }

      if (productoActualizado.tipo_prod === 'bicicleta') {
        const queryBici = `
          INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle, genero)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id_producto) 
          DO UPDATE SET 
            marca = CASE WHEN $7::boolean THEN EXCLUDED.marca ELSE Producto_BiciNueva.marca END,
            color = CASE WHEN $8::boolean THEN EXCLUDED.color ELSE Producto_BiciNueva.color END,
            rodado = CASE WHEN $9::boolean THEN EXCLUDED.rodado ELSE Producto_BiciNueva.rodado END,
            talle = CASE WHEN $10::boolean THEN EXCLUDED.talle ELSE Producto_BiciNueva.talle END,
            genero = CASE WHEN $11::boolean THEN EXCLUDED.genero ELSE Producto_BiciNueva.genero END;
        `;
        await client.query(queryBici, [
          id,
          marca ? String(marca).trim() : (productoActualizado.marca || 'Genérica'),
          color !== undefined && color !== null && String(color).trim() !== '' ? String(color).trim() : null,
          rodado !== undefined && rodado !== null && String(rodado).trim() !== '' ? String(rodado).trim() : null,
          talle !== undefined && talle !== null && String(talle).trim() !== '' ? String(talle).trim() : null,
          genero !== undefined && genero !== null && String(genero).trim() !== '' ? String(genero).trim().toLowerCase() : 'unisex',
          'marca' in datos,
          'color' in datos,
          'rodado' in datos,
          'talle' in datos,
          'genero' in datos
        ]);
      }

      const detallePrecio = monedaFinal === 'USD'
        ? `USD ${precioUsdFinal} -> $${productoActualizado.precio} ARS`
        : `$${productoActualizado.precio} ARS`;
      const detalleProv = idProveedorFinal ? `, Proveedor ID #${idProveedorFinal}` : '';
      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Modificación de Producto', $3);`,
        [
          idUsuarioOperador || null,
          String(nombreUsuarioOperador || 'Usuario').trim().slice(0, 50),
          `Producto actualizado: "${productoActualizado.nombre}" (ID #${id}). Stock: ${productoActualizado.cantidad}${detalleProv}, Precio (${monedaFinal}): ${detallePrecio}.`
        ]
      );

      await client.query('COMMIT');

      const resultCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [id]);
      return resultCompleto.rows[0] || productoActualizado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Realiza la baja lógica (desactivación) de un producto del catálogo activo. */
  static async eliminarProducto(id: number, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    validarId(id, 'No se encontró ese producto.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProd = await pool.query('SELECT nombre, tipo_prod FROM Productos WHERE id_producto = $1;', [id]);
    if (resProd.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }
    const datosProd = resProd.rows[0];

    const query = 'UPDATE Productos SET activo = false WHERE id_producto = $1 RETURNING *;';
    await pool.query(query, [id]);

    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Baja de Producto', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Producto dado de baja (desactivado): "${datosProd.nombre}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return { message: 'Producto desactivado del inventario exitosamente' };
  }

  /** Reactiva un producto previamente dado de baja en el catálogo. */
  static async reactivarProducto(id: number, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    validarId(id, 'No se encontró ese producto.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProd = await pool.query('SELECT nombre, tipo_prod FROM Productos WHERE id_producto = $1;', [id]);
    if (resProd.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }
    const datosProd = resProd.rows[0];

    const query = 'UPDATE Productos SET activo = true WHERE id_producto = $1 RETURNING *;';
    const result = await pool.query(query, [id]);

    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Reactivación de Producto', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Producto reactivado en inventario: "${datosProd.nombre}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return {
      message: 'Producto reactivado exitosamente',
      producto: result.rows[0]
    };
  }

  /** Realiza ajustes manuales de inventario (ingreso, egreso o corrección de stock) con Kardex. */
  static async ajustarStock(id: number, datos: {
    cantidad_ajuste: number | string;
    tipo_movimiento: 'INGRESO' | 'EGRESO' | 'AJUSTE';
    motivo: string;
    observaciones?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    validarId(id, 'No se encontró ese producto.');

    const { cantidad_ajuste, tipo_movimiento, motivo, observaciones, idUsuarioOperador, nombreUsuarioOperador } = datos;
    const cantNum = Number(cantidad_ajuste);

    const tipoNorm = String(tipo_movimiento || '').trim().toUpperCase();
    if (!['INGRESO', 'EGRESO', 'AJUSTE'].includes(tipoNorm)) {
      throw new BadRequestError('El tipo de movimiento debe ser INGRESO, EGRESO o AJUSTE.');
    }

    if (tipoNorm === 'AJUSTE') {
      if (isNaN(cantNum) || cantNum < 0 || !Number.isInteger(cantNum)) {
        throw new BadRequestError('El stock de ajuste debe ser un número entero mayor o igual a 0.');
      }
    } else {
      if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
        throw new BadRequestError('La cantidad debe ser al menos 1.');
      }
    }

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 3) {
      throw new BadRequestError('Escribí el motivo del ajuste (al menos 3 letras).');
    }
    if (motivo.trim().length > 70) {
      throw new BadRequestError('El motivo no puede superar los 70 caracteres.');
    }

    if (observaciones && typeof observaciones === 'string' && observaciones.trim().length > 250) {
      throw new BadRequestError('Las observaciones no pueden superar los 250 caracteres.');
    }

    if (cantNum > 1000000) {
      throw new BadRequestError('La cantidad no puede superar 1.000.000 de unidades.');
    }

    if (!idUsuarioOperador || isNaN(Number(idUsuarioOperador)) || Number(idUsuarioOperador) <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que realiza el ajuste.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resProd = await client.query('SELECT id_producto, nombre, cantidad, activo FROM Productos WHERE id_producto = $1 FOR UPDATE;', [id]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('Ese producto no existe.');
      }

      if (resProd.rows[0].activo === false) {
        throw new BadRequestError(`El producto "${resProd.rows[0].nombre}" está inactivo. Debe reactivarlo antes de registrar movimientos de stock.`);
      }

      const stockActual = Number(resProd.rows[0].cantidad);
      let nuevoStock = stockActual;
      let tipoMovimientoDb: 'INGRESO' | 'EGRESO' = 'INGRESO';
      let cantidadMovimientoDb = cantNum;

      if (tipoNorm === 'INGRESO') {
        nuevoStock = stockActual + cantNum;
        tipoMovimientoDb = 'INGRESO';
        cantidadMovimientoDb = cantNum;
      } else if (tipoNorm === 'EGRESO') {
        if (stockActual < cantNum) {
          throw new BadRequestError(`No hay suficiente stock. Hay ${stockActual} unidades.`);
        }
        nuevoStock = stockActual - cantNum;
        tipoMovimientoDb = 'EGRESO';
        cantidadMovimientoDb = cantNum;
      } else if (tipoNorm === 'AJUSTE') {
        nuevoStock = cantNum;
        if (nuevoStock > stockActual) {
          tipoMovimientoDb = 'INGRESO';
          cantidadMovimientoDb = nuevoStock - stockActual;
        } else if (nuevoStock < stockActual) {
          tipoMovimientoDb = 'EGRESO';
          cantidadMovimientoDb = stockActual - nuevoStock;
        } else {
          // El stock es el mismo, no requiere alteración
          cantidadMovimientoDb = 0;
        }
      }

      const queryUpdate = 'UPDATE Productos SET cantidad = $1 WHERE id_producto = $2 RETURNING *;';
      const resUpdate = await client.query(queryUpdate, [nuevoStock, id]);

      // Registrar en Movimiento_Stock asegurando longitud máxima de 100 caracteres
      if (cantidadMovimientoDb > 0) {
        const motivoBase = tipoNorm === 'AJUSTE' ? `Ajuste de inventario: ${motivo.trim()}` : motivo.trim();
        const motivoDb = motivoBase.slice(0, 100);

        await client.query(
          `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            id,
            idUsuarioOperador,
            tipoMovimientoDb,
            cantidadMovimientoDb,
            motivoDb,
            observaciones ? String(observaciones).trim() : null
          ]
        );
      }

      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Ajuste de Stock Manual', $3);`,
        [
          idUsuarioOperador || null,
          String(nombreUsuarioOperador || 'Usuario').trim().slice(0, 50),
          `Ajuste de stock en "${resProd.rows[0].nombre}" (ID #${id}): ${tipoNorm} de ${cantNum} un. (Stock anterior: ${stockActual}, Nuevo stock: ${nuevoStock}). Motivo: ${motivo.trim()}.`
        ]
      );

      await client.query('COMMIT');

      const resCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [id]);
      return {
        message: 'Ajuste de inventario aplicado exitosamente',
        producto: resCompleto.rows[0] || resUpdate.rows[0],
        stock_anterior: stockActual,
        nuevo_stock: nuevoStock
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Recupera el historial de movimientos de inventario con filtros por artículo o búsqueda libre. */
  static async obtenerMovimientosStock(filtros: { id_producto?: number | string | undefined; busqueda?: string | undefined }) {
    const { id_producto, busqueda } = filtros;
    let query = `
      SELECT 
        ms.*, 
        u.nombre_usuario, 
        u.nombre_usuario AS usuario_nombre, 
        p.nombre AS producto_nombre,
        COALESCE(pb.marca, p.marca) AS producto_marca,
        p.modelo AS producto_modelo
      FROM Movimiento_Stock ms
      INNER JOIN Usuario u ON ms.id_usuario = u.id_usuario
      INNER JOIN Productos p ON ms.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (id_producto !== undefined && id_producto !== null && id_producto !== '') {
      const idNum = validarId(id_producto, 'El ID del artículo no es válido.');
      whereClauses.push(`ms.id_producto = $${paramIdx}`);
      params.push(idNum);
      paramIdx++;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      whereClauses.push(`(
        p.nombre ILIKE $${paramIdx} OR 
        u.nombre_usuario ILIKE $${paramIdx} OR 
        ms.motivo ILIKE $${paramIdx} OR 
        ms.observaciones ILIKE $${paramIdx} OR
        CAST(p.id_producto AS TEXT) ILIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY ms.id_movimiento DESC LIMIT 500;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      movimientos: result.rows
    };
  }

  /** Obtiene la sábana de movimientos de Kardex para un producto determinado. */
  static async obtenerKardex(id: number) {
    return this.obtenerMovimientosStock({ id_producto: id });
  }
}
