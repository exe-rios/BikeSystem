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
  IngresoStock,
  DetalleReparacionItem
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

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError('Sesión expirada o no autorizada. Por favor inicia sesión nuevamente.', 401);
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

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
    getAll: () => request<{ total: number; usuarios: Usuario[] }>('/api/usuarios'),
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
    getAll: () => request<{ total: number; clientes: Cliente[] }>('/api/clientes'),
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
    getAll: (id_cliente?: number) =>
      request<{ total: number; bicicletas: Bicicleta[] }>(
        id_cliente ? `/api/bicicletas?id_cliente=${id_cliente}` : '/api/bicicletas'
      ),
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
    delete: (id: number) => request<{ message: string }>(`/api/bicicletas/${id}`, { method: 'DELETE' }),
  },

  // Productos (Inventario / Stock, incluye bicicletas nuevas a la venta)
  productos: {
    getAll: (soloActivos?: boolean) =>
      request<{ total: number; productos: Producto[] }>(
        soloActivos ? '/api/productos?solo_activos=true' : '/api/productos'
      ),
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
  },

  // Ventas
  ventas: {
    getAll: () => request<{ total: number; ventas: Venta[] }>('/api/ventas'),
    getById: (id: number) =>
      request<{ venta: Venta; productos_vendidos: any[] }>(`/api/ventas/${id}`),
    create: (payload: { id_cliente: number; id_usuario?: number; detalles: Array<{ id_producto: number; cantidad: number; precio_unitario: number }> }) =>
      request<{ message: string; venta: Venta; detalles?: any[] }>('/api/ventas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Reparaciones / Taller
  reparaciones: {
    getAll: () => request<{ total: number; reparaciones: Reparacion[] }>('/api/reparaciones'),
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

  // Ingreso de Mercadería y Remitos
  ingresos: {
    getAll: () => request<{ total: number; ingresos: IngresoStock[] }>('/api/ingresos'),
    getById: (id: number) =>
      request<{ ingreso: IngresoStock; productos_ingresados: any[] }>(`/api/ingresos/${id}`),
    create: (payload: { id_proveedor: number; num_comprobante: string; detalles: Array<{ id_producto: number; cantidad: number; precio_costo: number }> }) =>
      request<{ message: string; id_ingreso: number }>('/api/ingresos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Pagos a Proveedores
  pagosProveedores: {
    getAll: () => request<{ total: number; pagos: PagoProveedor[] }>('/api/pagos-proveedores'),
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
  },
};
