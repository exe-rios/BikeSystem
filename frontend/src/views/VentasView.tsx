import { useState, useEffect } from 'react';
import type { Venta, Cliente, ProductoStock, DetalleVentaItem } from '../types';

// URL base de tu backend
const API_URL = 'http://localhost:3000';

export function VentasView() {
  // --- ESTADOS DE DATOS REALES DESDE EL BACKEND ---
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [stock, setStock] = useState<ProductoStock[]>([]);

  // Estados de carga y error
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- ESTADOS DE CONTROL DEL MODAL ---
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number>(0);
  const [tipoPago, setTipoPago] = useState<'Efectivo' | 'Tarjeta de Débito' | 'Tarjeta de Crédito' | 'Transferencia'>('Efectivo');
  const [carritoDetalle, setCarritoDetalle] = useState<DetalleVentaItem[]>([]);

  // Estados para añadir producto al detalle
  const [productoBuscadoId, setProductoBuscadoId] = useState<number>(0);
  const [cantidadAñadir, setCantidadAñadir] = useState<number>(1);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Total acumulado dinámico
  const totalVenta = carritoDetalle.reduce((acc, item) => acc + item.subtotal, 0);

  // Helper seguro para procesar la respuesta sin que rompa
  const fetchSeguroJson = async (url: string, headers: Record<string, string>) => {
    const response = await fetch(url, { headers });

    // Manejo específico si el Token expiró o no es válido (HTTP 401)
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Tu sesión ha expirado o el token es inválido. Por favor, vuelve a iniciar sesión.');
    }

    if (response.status === 404) {
      throw new Error(`La ruta ${url} no existe en el servidor (Error 404).`);
    }

    if (!response.ok) {
      throw new Error(`Error en el servidor al consultar ${url} (Estado HTTP ${response.status}).`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`El servidor no devolvió una respuesta JSON válida en ${url}.`);
    }

    return response.json();
  };

  // Helper para garantizar que el dato siempre sea un Array (evita el error .filter is not a function)
  const normalizarArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Si el backend devuelve objetos como { productos: [...] } o { data: [...] }
      if (Array.isArray(data.productos)) return data.productos;
      if (Array.isArray(data.stock)) return data.stock;
      if (Array.isArray(data.ventas)) return data.ventas;
      if (Array.isArray(data.clientes)) return data.clientes;
      if (Array.isArray(data.data)) return data.data;
    }
    return [];
  };

  // --- OBTENER DATOS DEL BACKEND AL CARGAR ---
  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const [dataVentas, dataClientes, dataStock] = await Promise.all([
        fetchSeguroJson(`${API_URL}/api/ventas`, headers),
        fetchSeguroJson(`${API_URL}/api/clientes`, headers),
        fetchSeguroJson(`${API_URL}/api/productos`, headers) 
      ]);

      setVentas(normalizarArray(dataVentas));
      setClientes(normalizarArray(dataClientes));
      setStock(normalizarArray(dataStock));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al conectar con el backend.');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- MÉTODOS DEL MODAL ---
  const handleAgregarAlDetalle = () => {
    if (productoBuscadoId === 0) {
      alert('Por favor selecciona un producto.');
      return;
    }

    const listaStock = Array.isArray(stock) ? stock : [];
    const prod = listaStock.find(p => p.id_producto === productoBuscadoId);
    if (!prod) return;

    if (cantidadAñadir > prod.cantidad) {
      alert(`No hay suficiente stock. Stock disponible: ${prod.cantidad}`);
      return;
    }

    const yaExiste = carritoDetalle.find(item => item.id_producto === prod.id_producto);
    if (yaExiste) {
      alert('Este producto ya está en el detalle. Elimínalo si deseas cambiar la cantidad.');
      return;
    }

    const nuevoItem: DetalleVentaItem = {
      id_producto: prod.id_producto,
      nombre: `${prod.nombre} (${prod.marca} ${prod.modelo})`,
      tipo_producto: prod.tipo_producto,
      cantidad: cantidadAñadir,
      precioUnitario: prod.precio,
      subtotal: prod.precio * cantidadAñadir,
      numero_serie: prod.numero_serie,
      marca: prod.marca,
      modelo: prod.modelo,
      color: prod.color,
      rodado: prod.rodado,
      talle: prod.talle
    };

    setCarritoDetalle([...carritoDetalle, nuevoItem]);
    setProductoBuscadoId(0);
    setCantidadAñadir(1);
  };

  const handleQuitarDelDetalle = (idProd: number) => {
    setCarritoDetalle(carritoDetalle.filter(item => item.id_producto !== idProd));
  };

  // --- ENVIAR LA VENTA AL BACKEND ---
  const handleFinalizarVenta = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clienteSeleccionadoId === 0) {
      alert('Por favor selecciona un cliente.');
      return;
    }

    if (carritoDetalle.length === 0) {
      alert('Agrega al menos un producto a la venta.');
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token') || '';
      const payload = {
        id_cliente: clienteSeleccionadoId,
        tipo_pago: tipoPago,
        total: totalVenta,
        detalles: carritoDetalle
      };

      const response = await fetch(`${API_URL}/api/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.mensaje || 'Error al procesar la venta');
        } else {
          throw new Error(`El servidor devolvió un error (Estado ${response.status})`);
        }
      }

      alert('¡Venta registrada con éxito!');

      // Limpiar modal y refrescar la tabla/stock desde el backend
      setCarritoDetalle([]);
      setClienteSeleccionadoId(0);
      setMostrarModal(false);
      cargarDatos();

    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Ocurrió un error: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  // 🛡️ Productos filtrados con validación de seguridad contra valores no-array
  const listaStockSegura = Array.isArray(stock) ? stock : [];
  const productosFiltrados = listaStockSegura.filter(p => filtroTipo === 'todos' || p.tipo_producto === filtroTipo);

  // 🛡️ Listas de ventas y clientes con seguridad contra valores no-array
  const listaVentasSegura = Array.isArray(ventas) ? ventas : [];
  const listaClientesSegura = Array.isArray(clientes) ? clientes : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Módulo de Ventas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>Registro de transacciones comerciales y facturas emitidas</p>
        </div>

        <button 
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          🛒 Nueva Venta
        </button>
      </div>

      {/* MENSAJE DE ERROR */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444',
          color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* TABLA DE VENTAS */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Comprobante</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Fecha</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Método</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando ventas desde el servidor...
                </td>
              </tr>
            ) : listaVentasSegura.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  No hay ventas registradas en el sistema.
                </td>
              </tr>
            ) : (
              listaVentasSegura.map(v => {
                const clienteObj = listaClientesSegura.find(c => c.id_cliente === v.id_cliente);
                const nombreCliente = clienteObj ? `${clienteObj.apellido}, ${clienteObj.nombre}` : `Cliente #${v.id_cliente}`;

                return (
                  <tr key={v.id_venta} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', fontFamily: 'monospace' }}>
                      FAC-{String(v.id_venta).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                      {nombreCliente}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{v.fecha}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                        {v.tipo_pago}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '700', color: '#16a34a', textAlign: 'right' }}>
                      ${v.total ? v.total.toLocaleString() : 0}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- VENTANA EMERGENTE (MODAL) --- */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '700px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Generar Comprobante de Venta</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleFinalizarVenta} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* DATOS GENERALES: CLIENTE Y MÉTODO PAGO */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Cliente *</label>
                  <select 
                    value={clienteSeleccionadoId}
                    onChange={e => setClienteSeleccionadoId(Number(e.target.value))}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid var(--borde-input)', fontSize: '0.9rem',
                      backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                    }}
                  >
                    <option value={0}>-- Seleccionar Cliente --</option>
                    {listaClientesSegura.map(c => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.apellido}, {c.nombre} (DNI: {c.dni})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Método de Pago</label>
                  <select 
                    value={tipoPago}
                    onChange={e => setTipoPago(e.target.value as "Efectivo" | "Tarjeta de Débito" | "Tarjeta de Crédito" | "Transferencia")}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid var(--borde-input)', fontSize: '0.9rem',
                      backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                    }}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  </select>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed var(--borde-input)', margin: '4px 0' }} />

              {/* SELECCIÓN DE PRODUCTOS DESDE STOCK */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Agregar Productos del Stock</label>
                  
                  {/* Filtros dinámicos */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['todos', 'bicicleta', 'accesorio', 'repuesto'].map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setFiltroTipo(tipo)}
                        style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                          textTransform: 'capitalize',
                          backgroundColor: filtroTipo === tipo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                          color: filtroTipo === tipo ? '#fff' : 'var(--texto-mutado)'
                        }}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px' }}>
                  <select 
                    value={productoBuscadoId} 
                    onChange={e => setProductoBuscadoId(Number(e.target.value))}
                    style={{
                      padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                      fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                    }}
                  >
                    <option value={0}>-- Seleccionar Producto --</option>
                    {productosFiltrados.map(p => (
                      <option key={p.id_producto} value={p.id_producto} disabled={p.cantidad <= 0}>
                        {p.nombre} - ${p.precio ? p.precio.toLocaleString() : 0} (Stock: {p.cantidad}) {p.tipo_producto === 'bicicleta' ? `[SN: ${p.numero_serie}]` : ''}
                      </option>
                    ))}
                  </select>

                  <input 
                    type="number" 
                    min="1" 
                    value={cantidadAñadir}
                    onChange={e => setCantidadAñadir(Number(e.target.value))}
                    placeholder="Cant."
                    style={{
                      padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                      fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                    }}
                  />

                  <button 
                    type="button"
                    onClick={handleAgregarAlDetalle}
                    style={{
                      backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 16px',
                      borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                    }}
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* DETALLE DE ITEMS */}
              <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Detalle</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Cant.</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Precio U.</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Subtotal</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carritoDetalle.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                          No agregaste ningún item a la venta.
                        </td>
                      </tr>
                    ) : (
                      carritoDetalle.map(item => (
                        <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                          <td style={{ padding: '10px', fontWeight: '500' }}>
                            {item.nombre}
                            {item.tipo_producto === 'bicicleta' && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>
                                🚲 Bici a enlazar (N° Serie: {item.numero_serie})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{item.cantidad}</td>
                          <td style={{ padding: '10px' }}>${item.precioUnitario ? item.precioUnitario.toLocaleString() : 0}</td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>${item.subtotal ? item.subtotal.toLocaleString() : 0}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <button 
                              type="button" 
                              onClick={() => handleQuitarDelDetalle(item.id_producto)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER DEL MODAL */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>Total: </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginLeft: '6px' }}>
                    ${totalVenta.toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setMostrarModal(false)}
                    disabled={guardando}
                    style={{
                      padding: '10px 18px', border: '1px solid var(--borde-input)', borderRadius: '8px',
                      backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={guardando}
                    style={{
                      padding: '10px 20px', border: 'none', borderRadius: '8px',
                      backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600',
                      cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1
                    }}
                  >
                    {guardando ? 'Procesando...' : 'Completar Venta'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}