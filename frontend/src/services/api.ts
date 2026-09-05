import type {
  Cliente,
  Bicicleta,
  Producto,
  Venta,
  Reparacion,
  Proveedor,
  PagoProveedor,
  MetodoPago,
  DashboardData,
  Usuario,
  DetalleReparacionItem,
  GarantiaBicicleta,
  MovimientoStock,
  BitacoraActividad,
  ResumenStock,
  ReporteEstadisticasResponse,
  ReporteVentasResponse,
  ReporteReparacionesResponse,
  ReporteEgresosResponse
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (response.status === 401) {
    if (endpoint !== '/api/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new Event('auth:logout'));
    }
    const errorMsg = data?.error || data?.mensaje || data?.message || (endpoint === '/api/login' ? 'Contraseña incorrecta.' : 'Tu sesión expiró. Volvé a iniciar sesión.');
    throw new ApiError(errorMsg, 401, data);
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.mensaje || data?.message || `Error del servidor (${response.status})`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    login: (nombre_usuario: string, contrasena: string) =>
      request<{ message: string; token: string; usuario: { id: number; nombre: string; rol: string } }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ nombre_usuario, contrasena }),
      }),
    health: () => request<{ status: string; message: string }>('/api/health'),
    dbTest: () => request<{ status: string; connected: boolean }>('/api/test-db'),
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
    getAll: (busqueda?: string) => {
      const q = busqueda && busqueda.trim() ? `?busqueda=${encodeURIComponent(busqueda.trim())}` : '';
      return request<{ total: number; clientes: Cliente[] }>(`/api/clientes${q}`);
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
    getAll: (params?: number | { id_cliente?: number; busqueda?: string }) => {
      if (typeof params === 'number') {
        return request<{ total: number; bicicletas: Bicicleta[] }>(`/api/bicicletas?id_cliente=${params}`);
      }
      const q = new URLSearchParams();
      if (params?.id_cliente) q.append('id_cliente', String(params.id_cliente));
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; bicicletas: Bicicleta[] }>(`/api/bicicletas${qs}`);
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
    getAll: (params?: boolean | { soloActivos?: boolean; tipo?: string; estado?: string; disponibilidad?: string; busqueda?: string }) => {
      if (typeof params === 'boolean') {
        return request<{ total: number; resumen?: ResumenStock; productos: Producto[] }>(
          params ? '/api/productos?solo_activos=true' : '/api/productos'
        );
      }
      const q = new URLSearchParams();
      if (params?.soloActivos) q.append('solo_activos', 'true');
      if (params?.tipo && params.tipo !== 'todos') q.append('tipo', params.tipo);
      if (params?.estado && params.estado !== 'todos') q.append('estado', params.estado);
      if (params?.disponibilidad && params.disponibilidad !== 'todos') q.append('disponibilidad', params.disponibilidad);
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{ total: number; resumen?: ResumenStock; productos: Producto[] }>(`/api/productos${queryStr}`);
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

  // Ventas
  ventas: {
    getAll: () => request<{ total: number; ventas: Venta[] }>('/api/ventas'),
    getMetodosPago: () => request<MetodoPago[]>('/api/ventas/metodos-pago'),
    getGarantias: (params?: { busqueda?: string; estado?: string }) => {
      const q = new URLSearchParams();
      if (params?.busqueda) q.append('busqueda', params.busqueda);
      if (params?.estado && params.estado !== 'todas') q.append('estado', params.estado);
      const qs = q.toString();
      return request<{
        total: number;
        resumen?: { total: number; vigentes: number; por_vencer: number; vencidas: number };
        garantias: GarantiaBicicleta[];
      }>(qs ? `/api/ventas/garantias?${qs}` : '/api/ventas/garantias');
    },
    getById: (id: number) =>
      request<{ venta: Venta; productos_vendidos: any[] }>(`/api/ventas/${id}`),
    create: (payload: { id_cliente: number; id_usuario?: number; id_metodo_pago?: number; detalles: Array<{ id_producto: number; cantidad: number; precio_unitario: number }> }) =>
      request<{ message: string; venta: Venta; detalles?: any[] }>('/api/ventas', {
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
    getAll: (params?: { estado?: string; busqueda?: string }) => {
      const q = new URLSearchParams();
      if (params?.estado && params.estado !== 'todos') q.append('estado', params.estado);
      if (params?.busqueda && params.busqueda.trim()) q.append('busqueda', params.busqueda.trim());
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request<{
        total: number;
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
    create: (reparacion: { id_bicicleta: number; id_usuario?: number; estado: string; descripcion: string; costo_mano_obra?: number }) =>
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
    agregarRepuesto: (payload: { id_reparacion: number; id_producto: number; cantidad: number; precio_unitario: number }) =>
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
    delete: (id: number) => request<{ message: string }>(`/api/proveedores/${id}`, { method: 'DELETE' }),
  },

  // Pagos a Proveedores
  pagosProveedores: {
    getAll: (busqueda?: string) => {
      const q = busqueda && busqueda.trim() ? `?busqueda=${encodeURIComponent(busqueda.trim())}` : '';
      return request<{ total: number; total_monto?: number; pagos: PagoProveedor[] }>(`/api/pagos-proveedores${q}`);
    },
    getMetodosPago: () => request<MetodoPago[]>('/api/pagos-proveedores/metodos-pago'),
    create: (pago: { id_proveedor?: number; nombre_proveedor?: string; id_usuario: number; id_metodo_pago: number; monto_total: number; observaciones?: string }) =>
      request<{ message: string; pago: PagoProveedor }>('/api/pagos-proveedores', {
        method: 'POST',
        body: JSON.stringify(pago),
      }),
  },

  // Reportes & Dashboard
  reportes: {
    getDashboard: () => request<DashboardData>('/api/reportes/dashboard'),
    getEstadisticas: (filtros?: { fechaDesde?: string; fechaHasta?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      const qs = params.toString();
      return request<ReporteEstadisticasResponse>(qs ? `/api/reportes/estadisticas?${qs}` : '/api/reportes/estadisticas');
    },
    getVentas: (filtros?: { fechaDesde?: string; fechaHasta?: string; busqueda?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      const qs = params.toString();
      return request<ReporteVentasResponse>(qs ? `/api/reportes/ventas?${qs}` : '/api/reportes/ventas');
    },
    getReparaciones: (filtros?: { fechaDesde?: string; fechaHasta?: string; estado?: string; busqueda?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.estado) params.append('estado', filtros.estado);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      const qs = params.toString();
      return request<ReporteReparacionesResponse>(qs ? `/api/reportes/reparaciones?${qs}` : '/api/reportes/reparaciones');
    },
    getEgresos: (filtros?: { fechaDesde?: string; fechaHasta?: string; busqueda?: string }) => {
      const params = new URLSearchParams();
      if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      const qs = params.toString();
      return request<ReporteEgresosResponse>(qs ? `/api/reportes/egresos?${qs}` : '/api/reportes/egresos');
    },
  },

  // Bitácora de Auditoría (CU28)
  bitacora: {
    getAll: (filtros?: { modulo?: string; busqueda?: string; limite?: number }) => {
      const params = new URLSearchParams();
      if (filtros?.modulo) params.append('modulo', filtros.modulo);
      if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
      if (filtros?.limite) params.append('limite', String(filtros.limite));
      const qs = params.toString();
      return request<{ total: number; registros: BitacoraActividad[] }>(qs ? `/api/bitacora?${qs}` : '/api/bitacora');
    },
  },
};
