import type {
  Cliente,
  Bicicleta,
  Producto,
  Venta,
  DetalleVentaItem,
  Reparacion,
  Proveedor,
  PagoProveedor,
  PagoProveedorPendiente,
  MetodoPago,
  DashboardData,
  Usuario,
  DetalleReparacionItem,
  GarantiaBicicleta,
  MovimientoStock,
  BitacoraActividad,
  ResumenStock,
  CotizacionDolarInfo,
  CotizacionProveedorInput,
  ItemCargaMasivaInput,
  PreviewCargaMasivaResponse,
  AumentoMasivoResponse,
  ReporteEstadisticasResponse,
  ReporteVentasResponse,
  ReporteReparacionesResponse,
  ReporteEgresosResponse,
  ReporteCapitalStockResponse
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Error personalizado para respuestas no exitosas o fallos de red en la API. */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Ejecuta peticiones fetch con inyección de token JWT, control de timeout y deserialización. */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(10000),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ApiError('La solicitud al servidor expiró por tiempo de espera.', 408);
    }
    throw new ApiError('No se pudo establecer conexión con el servidor backend (puerto 3000). Verificá que el servicio esté iniciado.', 0);
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const rawData: unknown = isJson ? await response.json() : null;
  const data = rawData as Record<string, unknown> | null;

  if (response.status === 401) {
    if (endpoint !== '/api/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new Event('auth:logout'));
    }
    const errorMsg = (data?.error as string) || (data?.mensaje as string) || (data?.message as string) || (endpoint === '/api/login' ? 'Contraseña incorrecta.' : 'Tu sesión expiró. Volvé a iniciar sesión.');
    throw new ApiError(errorMsg, 401, data);
  }

  if (!response.ok) {
    const errorMsg = (data?.error as string) || (data?.mensaje as string) || (data?.message as string) || `Error del servidor (${response.status})`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return rawData as T;
}

export interface LogsSistemaResponse {
  existe: boolean;
  archivo: string;
  tamanoBytes: number;
  totalLineas: number;
  lineas: string[];
}

export interface LogRemotoRegistro {
  id_log: number;
  nivel: 'INFO' | 'WARN' | 'ERROR';
  origen: string;
  equipo: string;
  usuario: string | null;
  mensaje: string;
  detalle: string | null;
  created_at: string;
}

export interface LogsRemotosResponse {
  total: number;
  equipos: string[];
  registros: LogRemotoRegistro[];
}

async function descargarArchivoConAuth(
  endpoint: string,
  nombrePorDefecto: string,
  mensajeTimeout: string,
  mensajeErrorBase: string,
  timeoutMs = 60000
): Promise<{ nombreArchivo: string; tamanoBytes: number }> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ApiError(mensajeTimeout, 408);
    }
    throw new ApiError('No se pudo establecer conexión con el servidor backend (puerto 3000). Verificá que el servicio esté iniciado.', 0);
  }

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError('Tu sesión expiró. Volvé a iniciar sesión.', 401);
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorMsg = `${mensajeErrorBase} (${res.status})`;
    if (contentType && contentType.includes('application/json')) {
      try {
        const errJson = (await res.json()) as Record<string, unknown>;
        errorMsg =
          (errJson?.error as string) ||
          (errJson?.mensaje as string) ||
          (errJson?.message as string) ||
          errorMsg;
      } catch {
        // Mantener mensaje legible por defecto si el JSON está truncado
      }
    } else {
      const errorText = (await res.text()).trim();
      if (errorText && !errorText.startsWith('{')) {
        errorMsg = errorText;
      }
    }
    throw new ApiError(errorMsg, res.status);
  }

  const disposition = res.headers.get('Content-Disposition');
  let nombreArchivo = nombrePorDefecto;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      nombreArchivo = match[1];
    }
  }

  const blob = await res.blob();
  const tamanoBytes = blob.size;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 5000);

  return { nombreArchivo, tamanoBytes };
}

/** Cliente HTTP centralizado del frontend para interactuar con los endpoints de la API. */
export const api = {
  // Auth
  auth: {
    login: (nombre_usuario: string, contrasena: string) =>
      request<{ message: string; token: string; usuario: { id: number; nombre: string; rol: string } }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ nombre_usuario, contrasena }),
      }),
    health: () => request<{ status: string; message: string }>('/api/health'),
    dbTest: () => request<{ status: string; connected: boolean }>('/api/db-test'),
  },

  // Usuarios y Empleados
  usuarios: {
    getAll: (params?: { busqueda?: string; rol?: string }) => {
      const q = new URLSearchParams();
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      if (params?.rol && params.rol !== 'todos') q.append('rol', params.rol);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; usuarios: Usuario[] }>(`/api/usuarios${qs}`);
    },
    create: (usuario: { nombre_usuario: string; contrasena: string; rol: string }) =>
      request<{ message: string; usuario: Usuario }>('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(usuario),
      }),
    update: (id: number, usuario: { rol?: string; contrasena?: string }) =>
      request<{ message: string; usuario: Usuario }>(`/api/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(usuario),
      }),
    delete: (id: number) => request<{ message: string }>(`/api/usuarios/${id}`, { method: 'DELETE' }),
  },

  // Clientes
  clientes: {
    getAll: (params?: string | { busqueda?: string; limite?: number | string; pagina?: number }) => {
      const q = new URLSearchParams();
      if (typeof params === 'string') {
        if (params.trim()) q.append('busqueda', params.trim());
      } else if (params) {
        if (params.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
        if (params.limite !== undefined && params.limite !== null) q.append('limite', String(params.limite));
        if (params.pagina !== undefined && params.pagina !== null) q.append('pagina', String(params.pagina));
      }
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; clientes: Cliente[] }>(`/api/clientes${qs}`);
    },
    getById: (id: number) => request<Cliente>(`/api/clientes/${id}`),
    create: (cliente: Omit<Cliente, 'id_cliente'>) =>
      request<{ message: string; cliente: Cliente }>('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(cliente),
      }),
    update: (id: number, cliente: Partial<Cliente>) =>
      request<{ message: string; cliente: Cliente }>(`/api/clientes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cliente),
      }),
    delete: (id: number) => request<{ message: string }>(`/api/clientes/${id}`, { method: 'DELETE' }),
  },

  // Bicicletas (De Clientes para Taller)
  bicicletas: {
    getAll: (params?: number | { id_cliente?: number; busqueda?: string; limite?: number | string; pagina?: number }) => {
      if (typeof params === 'number') {
        return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; bicicletas: Bicicleta[] }>(`/api/bicicletas?id_cliente=${params}`);
      }
      const q = new URLSearchParams();
      if (params?.id_cliente) q.append('id_cliente', String(params.id_cliente));
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      if (params?.limite !== undefined && params.limite !== null) q.append('limite', String(params.limite));
      if (params?.pagina !== undefined && params.pagina !== null) q.append('pagina', String(params.pagina));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; bicicletas: Bicicleta[] }>(`/api/bicicletas${qs}`);
    },
    getById: (id: number) => request<Bicicleta>(`/api/bicicletas/${id}`),
    create: (bicicleta: { id_cliente: number; marca: string; modelo: string }) =>
      request<{ message: string; bicicleta: Bicicleta }>('/api/bicicletas', {
        method: 'POST',
        body: JSON.stringify(bicicleta),
      }),
    update: (id: number, bicicleta: { marca: string; modelo: string }) =>
      request<{ message: string; bicicleta: Bicicleta }>(`/api/bicicletas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bicicleta),
      }),
    getHistorial: (id: number) =>
      request<{
        bicicleta: Bicicleta & { cliente_nombre: string; cliente_apellido: string; cliente_dni?: string; cliente_telefono?: string; cliente_email?: string };
        historial_reparaciones: Array<{
          id_reparacion: number;
          fecha_ingreso: string;
          fecha_egreso: string | null;
          estado: string;
          descripcion: string;
          costo_mano_obra: number;
          costo_total: number;
          mecanico: string;
          repuestos_utilizados: Array<{
            id_detalle_rep: number;
            cantidad: number;
            precio_unitario: number;
            costo_total: number;
            repuesto_nombre: string;
            repuesto_marca?: string;
          }>;
        }>;
        total_reparaciones: number;
      }>(`/api/bicicletas/${id}/historial`),
    delete: (id: number) => request<{ message: string }>(`/api/bicicletas/${id}`, { method: 'DELETE' }),
  },

  // Productos (Inventario / Stock, incluye bicicletas nuevas a la venta)
  productos: {
    getAll: (params?: boolean | { soloActivos?: boolean; tipo?: string; estado?: string; disponibilidad?: string; id_proveedor?: string | number; moneda?: string; busqueda?: string; limite?: number; pagina?: number }) => {
      if (typeof params === 'boolean') {
        return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; resumen?: ResumenStock; productos: Producto[] }>(
          params ? '/api/productos?solo_activos=true' : '/api/productos'
        );
      }
      const q = new URLSearchParams();
      if (params?.soloActivos) q.append('solo_activos', 'true');
      if (params?.tipo && params.tipo !== 'todos') q.append('tipo', params.tipo);
      if (params?.estado && params.estado !== 'todos') q.append('estado', params.estado);
      if (params?.disponibilidad && params.disponibilidad !== 'todos') q.append('disponibilidad', params.disponibilidad);
      if (params?.id_proveedor && String(params.id_proveedor) !== 'todos') q.append('id_proveedor', String(params.id_proveedor));
      if (params?.moneda && params.moneda !== 'todos') q.append('moneda', params.moneda);
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      if (params?.limite) q.append('limite', String(params.limite));
      if (params?.pagina) q.append('pagina', String(params.pagina));
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; resumen?: ResumenStock; productos: Producto[] }>(`/api/productos${queryStr}`);
    },
    getById: (id: number) => request<Producto>(`/api/productos/${id}`),
    create: (producto: Omit<Producto, 'id_producto'>) =>
      request<{ message: string; producto: Producto }>('/api/productos', {
        method: 'POST',
        body: JSON.stringify(producto),
      }),
    update: (id: number, producto: Partial<Producto>) =>
      request<{ message: string; producto: Producto }>(`/api/productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(producto),
      }),
    delete: (id: number) => request<{ message: string; producto?: Producto }>(`/api/productos/${id}`, { method: 'DELETE' }),
    reactivate: (id: number) =>
      request<{ message: string; producto?: Producto }>(`/api/productos/${id}/reactivar`, {
        method: 'PUT',
      }),
    previsualizarCargaMasiva: (payload: {
      id_proveedor?: number;
      nombre_proveedor?: string;
      moneda_lote?: 'ARS' | 'USD';
      modo_stock_default?: 'sumar' | 'reemplazar';
      cotizaciones_proveedores?: CotizacionProveedorInput[];
      items: ItemCargaMasivaInput[];
    }) =>
      request<PreviewCargaMasivaResponse>('/api/productos/carga-masiva/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      }),
    ejecutarCargaMasiva: (payload: {
      id_proveedor?: number;
      nombre_proveedor?: string;
      moneda_lote?: 'ARS' | 'USD';
      origen_formato?: string;
      modo_stock_default?: 'sumar' | 'reemplazar';
      cotizaciones_proveedores?: CotizacionProveedorInput[];
      items: ItemCargaMasivaInput[];
      pago?: {
        registrar: boolean;
        id_metodo_pago: number;
        monto_total: number | string;
        moneda?: 'ARS' | 'USD';
        monto_usd?: number | string;
        observaciones?: string;
        monto_factura_total?: number | string;
        numero_factura?: string;
        fecha_factura?: string;
        fecha_proximo_pago?: string;
      };
    }) =>
      request<{
        message: string;
        proveedor: { id_proveedor: number | null; nombre_empresa: string };
        insertados: number;
        actualizados: number;
        unidades_ingresadas: number;
        pago: PagoProveedor | null;
        pago_pendiente?: PagoProveedorPendiente | null;
      }>('/api/productos/carga-masiva', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      }),
    aumentoMasivo: (payload: {
      id_proveedor: number | 'todos';
      tipo_ajuste: 'porcentaje' | 'monto_fijo';
      valor: number;
      filtro_tipo_prod?: string;
      filtro_moneda?: string;
      solo_activos?: boolean;
      preview?: boolean;
    }) =>
      request<AumentoMasivoResponse>('/api/productos/aumento-masivo', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      }),
    registrarMovimiento: (payload: {
      id_producto: number;
      tipo_movimiento: 'INGRESO' | 'EGRESO';
      cantidad: number;
      motivo: string;
      observaciones?: string;
    }) =>
      request<{ message: string; movimiento: MovimientoStock; nuevo_stock: number }>('/api/productos/movimientos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMovimientos: (id_producto?: number) =>
      request<{ total: number; movimientos: MovimientoStock[] }>(
        id_producto ? `/api/productos/${id_producto}/movimientos` : '/api/productos/movimientos'
      ),
  },

  // Configuración Global (Cotización manual del dólar)
  configuracion: {
    getDolar: () => request<CotizacionDolarInfo>('/api/configuracion/dolar'),
    updateDolar: (cotizacion_dolar: number) =>
      request<{
        message: string;
        cotizacion_anterior: number;
        cotizacion_dolar: number;
        productos_actualizados: number;
      }>('/api/configuracion/dolar', {
        method: 'PUT',
        body: JSON.stringify({ cotizacion_dolar }),
        signal: AbortSignal.timeout(30000),
      }),
  },

  // Ventas
  ventas: {
    getAll: (params?: { busqueda?: string; limite?: number; pagina?: number }) => {
      const q = new URLSearchParams();
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      if (params?.limite) q.append('limite', String(params.limite));
      if (params?.pagina) q.append('pagina', String(params.pagina));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; pagina?: number; limite?: number; totalPaginas?: number; ventas: Venta[] }>(`/api/ventas${qs}`);
    },
    getMetodosPago: () => request<MetodoPago[]>('/api/ventas/metodos-pago'),
    getGarantias: (params?: { busqueda?: string; estado?: string }) => {
      const q = new URLSearchParams();
      if (params?.busqueda) q.append('busqueda', params.busqueda);
      if (params?.estado && params.estado !== 'todas') q.append('estado', params.estado);
      const qs = q.toString();
      return request<{
        total: number;
        resumen?: {
          total: number;
          vigentes: number;
          service_pendiente: number;
          por_vencer: number;
          concluidas: number;
          vencidas?: number;
        };
        garantias: GarantiaBicicleta[];
      }>(qs ? `/api/ventas/garantias?${qs}` : '/api/ventas/garantias');
    },
    registrarPrimerService: (id_detalle_venta: number, payload: { fecha_service?: string; observaciones?: string }) =>
      request<{
        message: string;
        detalle: unknown;
        garantia: {
          estado_garantia: string;
          fecha_limite_service: string;
          fecha_vencimiento_extendida: string;
          fecha_vencimiento: string;
          primer_service_realizado: boolean;
          fecha_primer_service: string;
          service_excepcion: boolean;
        };
      }>(`/api/ventas/garantias/${id_detalle_venta}/primer-service`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    getById: (id: number) =>
      request<{ venta: Venta; productos_vendidos: DetalleVentaItem[] }>(`/api/ventas/${id}`),
    create: (payload: {
      id_cliente: number;
      id_metodo_pago?: number;
      tipo_precio?: 'publico' | 'reventa';
      cliente_nombre?: string;
      cliente_apellido?: string;
      cliente_dni?: string;
      detalles: Array<{ id_producto: number; cantidad: number; precio_unitario?: number; tipo_precio?: 'publico' | 'reventa' }>;
    }) =>
      request<{ message: string; venta: Venta; detalles?: DetalleVentaItem[] }>('/api/ventas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    anular: (id: number, motivo?: string) =>
      request<{ message: string; venta: Venta; articulos_repuestos?: number }>(`/api/ventas/${id}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo }),
      }),
  },

  // Reparaciones / Taller
  reparaciones: {
    getAll: (params?: { estado?: string; busqueda?: string; limite?: number; pagina?: number }) => {
      const q = new URLSearchParams();
      if (params?.estado && params.estado !== 'todos') q.append('estado', params.estado);
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      if (params?.limite) q.append('limite', String(params.limite));
      if (params?.pagina) q.append('pagina', String(params.pagina));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{
        total: number;
        pagina?: number;
        limite?: number;
        totalPaginas?: number;
        resumen?: {
          total_activas: number;
          recibidas_count: number;
          en_reparacion_count: number;
          listas_count: number;
          total_entregadas: number;
          total_historico: number | string;
          promedio_historico: number | string;
        };
        reparaciones: Reparacion[];
      }>(`/api/reparaciones${qs}`);
    },
    getById: (id: number) =>
      request<{ reparacion: Reparacion; repuestos_utilizados: DetalleReparacionItem[] }>(`/api/reparaciones/${id}`),
    create: (reparacion: { id_bicicleta: number; estado: string; descripcion: string; costo_mano_obra?: number }) =>
      request<{ message: string; reparacion: Reparacion }>('/api/reparaciones', {
        method: 'POST',
        body: JSON.stringify(reparacion),
      }),
    updateEstado: (id: number, payload: { estado: string; descripcion?: string; costo_mano_obra?: number }) =>
      request<{ message: string; reparacion: Reparacion }>(`/api/reparaciones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    getRepuestos: (id_reparacion: number) =>
      request<{ repuestos: DetalleReparacionItem[] }>(`/api/detalle-reparacion/${id_reparacion}`),
    agregarRepuesto: (payload: { id_reparacion: number; id_producto: number; cantidad: number; precio_unitario?: number }) =>
      request<{ message: string; detalle: DetalleReparacionItem }>('/api/detalle-reparacion', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    eliminarRepuesto: (id_detalle_rep: number) =>
      request<{ message: string; reparacion: Reparacion }>(`/api/detalle-reparacion/${id_detalle_rep}`, {
        method: 'DELETE',
      }),
  },

  // Proveedores
  proveedores: {
    getAll: () => request<{ total: number; proveedores: Proveedor[] }>('/api/proveedores'),
    getById: (id: number) => request<Proveedor>(`/api/proveedores/${id}`),
    create: (proveedor: Omit<Proveedor, 'id_proveedor'>) =>
      request<{ message: string; proveedor: Proveedor }>('/api/proveedores', {
        method: 'POST',
        body: JSON.stringify(proveedor),
      }),
    update: (id: number, proveedor: Partial<Proveedor>) =>
      request<{ message: string; proveedor: Proveedor }>(`/api/proveedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(proveedor),
      }),
    updateDolar: (id: number, cotizacion_dolar: number | null) =>
      request<{
        message: string;
        id_proveedor: number;
        nombre_empresa: string;
        cotizacion_dolar: number | null;
        cotizacion_efectiva: number;
        productos_actualizados: number;
      }>(`/api/proveedores/${id}/dolar`, {
        method: 'PUT',
        body: JSON.stringify({ cotizacion_dolar }),
        signal: AbortSignal.timeout(30000),
      }),
    delete: (id: number) => request<{ message: string }>(`/api/proveedores/${id}`, { method: 'DELETE' }),
  },

  // Pagos a Proveedores
  pagosProveedores: {
    getAll: (params?: string | { busqueda?: string; limite?: number | string; pagina?: number }) => {
      const q = new URLSearchParams();
      if (typeof params === 'string') {
        if (params.trim()) q.append('busqueda', params.trim());
      } else if (params) {
        if (params.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
        if (params.limite !== undefined && params.limite !== null) q.append('limite', String(params.limite));
        if (params.pagina !== undefined && params.pagina !== null) q.append('pagina', String(params.pagina));
      }
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; total_monto?: number; pagina?: number; limite?: number; totalPaginas?: number; pagos: PagoProveedor[] }>(`/api/pagos-proveedores${qs}`);
    },
    getMetodosPago: () => request<MetodoPago[]>('/api/pagos-proveedores/metodos-pago'),
    getPendientes: () => request<{ total: number; pendientes: PagoProveedorPendiente[] }>('/api/pagos-proveedores/pendientes'),
    registrarAbonoPendiente: (
      idPendiente: number,
      payload: {
        id_metodo_pago: number;
        monto_abono: number;
        nueva_fecha_proximo_pago?: string;
        observaciones?: string;
      }
    ) =>
      request<{ message: string; pago: PagoProveedor; pendiente: PagoProveedorPendiente }>(
        `/api/pagos-proveedores/pendientes/${idPendiente}/pagar`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    create: (pago: { id_proveedor?: number; nombre_proveedor?: string; id_usuario: number; id_metodo_pago: number; monto_total: number; moneda?: 'ARS' | 'USD'; monto_usd?: number; cotizacion_dolar?: number; observaciones?: string }) =>
      request<{ message: string; pago: PagoProveedor }>('/api/pagos-proveedores', {
        method: 'POST',
        body: JSON.stringify(pago),
      }),
  },

  // Reportes & Dashboard
  reportes: {
    getDashboard: () => request<DashboardData>('/api/reportes/dashboard', { signal: AbortSignal.timeout(30000) }),
    getEstadisticas: (filtros?: { fechaDesde?: string; fechaHasta?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      const qs = params.toString();
      return request<ReporteEstadisticasResponse>(qs ? `/api/reportes/estadisticas?${qs}` : '/api/reportes/estadisticas', {
        signal: AbortSignal.timeout(30000),
      });
    },
    getVentas: (filtros?: { fechaDesde?: string; fechaHasta?: string; busqueda?: string; limite?: number; pagina?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.limite) params.append('limite', String(filtros.limite));
      if (filtros?.pagina) params.append('pagina', String(filtros.pagina));
      const qs = params.toString();
      return request<ReporteVentasResponse>(qs ? `/api/reportes/ventas?${qs}` : '/api/reportes/ventas', {
        signal: AbortSignal.timeout(30000),
      });
    },
    getReparaciones: (filtros?: { fechaDesde?: string; fechaHasta?: string; estado?: string; busqueda?: string; limite?: number; pagina?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.estado) params.append('estado', filtros.estado);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.limite) params.append('limite', String(filtros.limite));
      if (filtros?.pagina) params.append('pagina', String(filtros.pagina));
      const qs = params.toString();
      return request<ReporteReparacionesResponse>(qs ? `/api/reportes/reparaciones?${qs}` : '/api/reportes/reparaciones', {
        signal: AbortSignal.timeout(30000),
      });
    },
    getEgresos: (filtros?: { fechaDesde?: string; fechaHasta?: string; busqueda?: string; limite?: number; pagina?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.limite) params.append('limite', String(filtros.limite));
      if (filtros?.pagina) params.append('pagina', String(filtros.pagina));
      const qs = params.toString();
      return request<ReporteEgresosResponse>(qs ? `/api/reportes/egresos?${qs}` : '/api/reportes/egresos', {
        signal: AbortSignal.timeout(30000),
      });
    },
    getCapitalStock: (filtros?: { gamaBajaMax?: number; gamaMediaMax?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.gamaBajaMax) params.append('gamaBajaMax', String(filtros.gamaBajaMax));
      if (filtros?.gamaMediaMax) params.append('gamaMediaMax', String(filtros.gamaMediaMax));
      const qs = params.toString();
      return request<ReporteCapitalStockResponse>(qs ? `/api/reportes/capital-stock?${qs}` : '/api/reportes/capital-stock', {
        signal: AbortSignal.timeout(30000),
      });
    },
  },

  // Bitácora de Auditoría (CU28)
  bitacora: {
    getAll: (filtros?: { modulo?: string; busqueda?: string; limite?: number | string; pagina?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.modulo) params.append('modulo', filtros.modulo);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.limite) params.append('limite', String(filtros.limite));
      if (filtros?.pagina) params.append('pagina', String(filtros.pagina));
      const qs = params.toString();
      return request<{ total: number; totalPaginas?: number; pagina?: number; limite?: number; registros: BitacoraActividad[] }>(
        qs ? `/api/bitacora?${qs}` : '/api/bitacora'
      );
    },
  },

  // Respaldo y Copias de Seguridad (RNF3)
  backup: {
    descargarSql: (): Promise<{ nombreArchivo: string; tamanoBytes: number }> =>
      descargarArchivoConAuth(
        '/api/backup/descargar',
        'Backup_BikeSystem.sql',
        'La generación del respaldo expiró por tiempo de espera (60 segundos).',
        'No se pudo generar el respaldo de la base de datos',
        60000
      )
  },

  logs: {
    obtener: (lineas = 250) =>
      request<LogsSistemaResponse>(`/api/logs?lineas=${encodeURIComponent(String(lineas))}`),
    descargar: (): Promise<{ nombreArchivo: string; tamanoBytes: number }> =>
      descargarArchivoConAuth(
        '/api/logs/descargar',
        'Logs_BikeSystem.log',
        'La descarga de logs expiró por tiempo de espera.',
        'No se pudo descargar el archivo de logs',
        30000
      ),
    obtenerRemotos: (params?: { limite?: number; nivel?: string; equipo?: string; busqueda?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limite) qs.append('limite', String(params.limite));
      if (params?.nivel && params.nivel !== 'TODOS') qs.append('nivel', params.nivel);
      if (params?.equipo && params.equipo !== 'TODOS') qs.append('equipo', params.equipo);
      if (params?.busqueda && params.busqueda.trim()) qs.append('busqueda', params.busqueda.trim());
      const query = qs.toString();
      return request<LogsRemotosResponse>(query ? `/api/logs/remotos?${query}` : '/api/logs/remotos');
    },
    descargarRemotos: (params?: { nivel?: string; equipo?: string }): Promise<{ nombreArchivo: string; tamanoBytes: number }> => {
      const qs = new URLSearchParams();
      if (params?.nivel && params.nivel !== 'TODOS') qs.append('nivel', params.nivel);
      if (params?.equipo && params.equipo !== 'TODOS') qs.append('equipo', params.equipo);
      const query = qs.toString();
      return descargarArchivoConAuth(
        query ? `/api/logs/remotos/descargar?${query}` : '/api/logs/remotos/descargar',
        'Logs_Remotos_BikeSystem.log',
        'La descarga de logs remotos expiró por tiempo de espera.',
        'No se pudieron descargar los logs remotos',
        30000
      );
    }
  },
};
