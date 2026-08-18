import { useState, useEffect } from 'react';
import type { Venta, Cliente, Producto, DetalleVentaItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface VentaDetallada {
  venta: Venta & {
    cliente_nombre?: string;
    cliente_apellido?: string;
    cliente_dni?: string;
    cliente_telefono?: string;
    cliente_email?: string;
    cliente_direccion?: string;
    vendedor?: string;
  };
  productos_vendidos: Array<{
    id_detalle_venta: number;
    id_producto: number;
    nombre: string;
    marca?: string;
    modelo?: string;
    tipo_prod?: string;
    numero_serie?: string;
    color?: string;
    rodado?: string;
    talle?: string;
    cantidad: number;
    precio_unitario: number;
    costo_total: number;
  }>;
}

export function VentasView() {
  const { user } = useAuth();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [busquedaVenta, setBusquedaVenta] = useState<string>('');

  // Modal Nueva Venta State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number>(0);
  const [carritoDetalle, setCarritoDetalle] = useState<DetalleVentaItem[]>([]);

  // Item selector state
  const [productoBuscadoId, setProductoBuscadoId] = useState<number>(0);
  const [cantidadAnadir, setCantidadAnadir] = useState<number>(1);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Modal Detalle de Venta (Visualización al hacer clic en una fila)
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaDetallada | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);

  // Calculation
  const totalVenta = carritoDetalle.reduce((acc, item) => acc + (item.costo_total || (item.cantidad * item.precio_unitario)), 0);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [dataVentas, dataClientes, dataProds] = await Promise.all([
        api.ventas.getAll(),
        api.clientes.getAll(),
        api.productos.getAll()
      ]);

      setVentas(dataVentas.ventas || []);
      setClientes(dataClientes.clientes || []);
      setProductos(dataProds.productos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al conectar con el servidor.');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleVerDetalleVenta = async (idVenta: number) => {
    setCargandoDetalle(true);
    setMostrarModalDetalle(true);
    try {
      const data = await api.ventas.getById(idVenta);
      setVentaSeleccionada(data as VentaDetallada);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al cargar detalle del comprobante: ${err.message}`);
      }
      setMostrarModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleAgregarAlDetalle = () => {
    if (productoBuscadoId === 0) {
      alert('Por favor selecciona un producto.');
      return;
    }

    const prod = productos.find(p => p.id_producto === productoBuscadoId);
    if (!prod) return;

    if (cantidadAnadir > prod.cantidad) {
      alert(`No hay suficiente stock. Stock disponible: ${prod.cantidad}`);
      return;
    }

    const yaExiste = carritoDetalle.find(item => item.id_producto === prod.id_producto);
    if (yaExiste) {
      alert('Este producto ya está en el detalle. Elimínalo primero si deseas cambiar la cantidad.');
      return;
    }

    const nuevoItem: DetalleVentaItem = {
      id_producto: prod.id_producto!,
      nombre: prod.nombre,
      tipo_prod: prod.tipo_prod,
      cantidad: cantidadAnadir,
      precio_unitario: Number(prod.precio),
      costo_total: Number(prod.precio) * cantidadAnadir,
      marca: prod.marca,
      modelo: prod.modelo,
      numero_serie: prod.numero_serie,
      color: prod.color,
      rodado: prod.rodado,
      talle: prod.talle
    };

    setCarritoDetalle([...carritoDetalle, nuevoItem]);
    setProductoBuscadoId(0);
    setCantidadAnadir(1);
  };

  const handleQuitarDelDetalle = (idProd: number) => {
    setCarritoDetalle(carritoDetalle.filter(item => item.id_producto !== idProd));
  };

  const handleFinalizarVenta = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clienteSeleccionadoId === 0) {
      alert('Por favor selecciona un cliente responsable.');
      return;
    }

    if (carritoDetalle.length === 0) {
      alert('Agrega al menos un producto a la venta.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_cliente: clienteSeleccionadoId,
        id_usuario: user?.id_usuario || 1,
        detalles: carritoDetalle.map(item => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        }))
      };

      await api.ventas.create(payload);
      alert('¡Venta completada y stock descontado exitosamente!');

      setCarritoDetalle([]);
      setClienteSeleccionadoId(0);
      setMostrarModal(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al procesar la venta: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  // Filtrado de productos en el selector de la venta (solo productos activos)
  const productosFiltrados = productos.filter(p => {
    if (p.activo === false) return false;
    const prodTipo = (p.tipo_prod || '').toLowerCase().trim();
    const filtro = filtroTipo.toLowerCase().trim();
    return filtro === 'todos' || prodTipo.startsWith(filtro) || filtro.startsWith(prodTipo);
  });

  const productoSeleccionado = productos.find(p => p.id_producto === productoBuscadoId);

  // Filtrado de la tabla principal de ventas
  const ventasFiltradas = ventas.filter(v => {
    const termino = busquedaVenta.toLowerCase().trim();
    if (!termino) return true;
    const nombreCliente = `${v.cliente_nombre || ''} ${v.cliente_apellido || ''}`.toLowerCase();
    const comprobante = `fac-${String(v.id_venta).padStart(6, '0')}`.toLowerCase();
    const vendedor = (v.vendedor || '').toLowerCase();
    return nombreCliente.includes(termino) || comprobante.includes(termino) || vendedor.includes(termino) || String(v.id_venta).includes(termino);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Módulo de Ventas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Registro de transacciones comerciales, bicicletas y repuestos</p>
        </div>

        <button
          onClick={() => {
            setCarritoDetalle([]);
            setClienteSeleccionadoId(0);
            setProductoBuscadoId(0);
            setMostrarModal(true);
          }}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Nueva Venta
        </button>
      </div>

      {/* CONTADORES Y BUSCADOR DE VENTAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Comprobantes</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{ventas.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por comprobante, cliente o vendedor..."
          value={busquedaVenta}
          onChange={e => setBusquedaVenta(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '340px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* MENSAJE DE ERROR */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444',
          color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* TABLA DE VENTAS INTERACTIVA */}
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
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Vendedor</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando ventas...
                </td>
              </tr>
            ) : ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {ventas.length === 0 ? 'No hay ventas registradas en el sistema.' : 'No se encontraron ventas con el filtro de búsqueda.'}
                </td>
              </tr>
            ) : (
              ventasFiltradas.map(v => {
                const nombreCliente = v.cliente_nombre ? `${v.cliente_apellido}, ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;

                return (
                  <tr
                    key={v.id_venta}
                    onClick={() => v.id_venta != null && handleVerDetalleVenta(v.id_venta)}
                    style={{
                      borderBottom: '1px solid var(--borde-input)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.03)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '700' }}>
                      FAC-{String(v.id_venta).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                      {nombreCliente}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                      {v.fecha ? new Date(v.fecha).toLocaleDateString() : 'Hoy'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>
                      {v.vendedor || 'Sistema'}
                    </td>
                    <td style={{ padding: '16px', fontWeight: '800', color: '#16a34a', textAlign: 'right', fontSize: '1.05rem' }}>
                      ${Number(v.costo_total).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (v.id_venta != null) handleVerDetalleVenta(v.id_venta);
                        }}
                        style={{
                          backgroundColor: 'rgba(37, 99, 235, 0.08)',
                          color: 'var(--azul-oscuro)',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--azul-oscuro)';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
                          e.currentTarget.style.color = 'var(--azul-oscuro)';
                        }}
                      >
                        <span>Ver Detalle</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DETALLE COMPLETO DE VENTA (AL HACER CLIC EN UNA VENTA) --- */}
      {mostrarModalDetalle && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div className="imprimible" style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '720px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            {cargandoDetalle || !ventaSeleccionada ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                Cargando comprobante de venta...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
                <div className="imprimir-membrete">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>DN BIKE</h1>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#444' }}>Venta de Bicicletas, Repuestos y Taller Especializado</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace' }}>COMPROBANTE DE VENTA NO VALIDO COMO FACTURA</h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}</p>
                    </div>
                  </div>
                </div>

                {/* Cabecera del Comprobante (Pantalla y Normal) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Comprobante de Venta Emitido
                    </span>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--azul-oscuro)' }}>
                      FAC-{String(ventaSeleccionada.venta.id_venta).padStart(6, '0')}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                      Fecha: {ventaSeleccionada.venta.fecha ? new Date(ventaSeleccionada.venta.fecha).toLocaleDateString() : 'Hoy'}
                    </span>
                  </div>

                  <div className="no-imprimir" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                        backgroundColor: 'var(--bg-principal)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                      }}
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarModalDetalle(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)', padding: '0 4px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Datos del Cliente y Vendedor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-principal)', padding: '16px', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente Comprador</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '0.95rem' }}>
                      {ventaSeleccionada.venta.cliente_apellido}, {ventaSeleccionada.venta.cliente_nombre}
                    </p>
                    {ventaSeleccionada.venta.cliente_dni && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                        DNI: {ventaSeleccionada.venta.cliente_dni}
                      </p>
                    )}
                    {ventaSeleccionada.venta.cliente_telefono && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                        Tel: {ventaSeleccionada.venta.cliente_telefono}
                      </p>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Atendido Por</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '0.95rem' }}>
                      {ventaSeleccionada.venta.vendedor || 'Sistema'}
                    </p>
                  </div>
                </div>

                {/* Tabla de Artículos Facturados */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '700' }}>Artículos Facturados</h4>
                  <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', color: 'var(--texto-mutado)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Descripción</th>
                          <th style={{ padding: '10px 14px', color: 'var(--texto-mutado)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Cant.</th>
                          <th style={{ padding: '10px 14px', color: 'var(--texto-mutado)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ padding: '10px 14px', color: 'var(--texto-mutado)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventaSeleccionada.productos_vendidos.map((prod, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: '600' }}>{prod.nombre}</div>
                              {(prod.marca || prod.modelo) && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>
                                  {prod.marca} {prod.modelo}
                                </div>
                              )}
                              {prod.tipo_prod === 'bicicleta' && prod.numero_serie && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '700', marginTop: '2px' }}>
                                  🚲 Cuadro N° Serie: {prod.numero_serie} {prod.rodado ? `(R${prod.rodado})` : ''} {prod.talle ? `[Talle ${prod.talle}]` : ''} {prod.color ? `Color: ${prod.color}` : ''}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600' }}>
                              {prod.cantidad}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              ${Number(prod.precio_unitario).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>
                              ${Number(prod.costo_total).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Final */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '2px solid var(--borde-input)' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>Total:</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a' }}>
                    ${Number(ventaSeleccionada.venta.costo_total).toLocaleString()}
                  </span>
                </div>

                {/* PIE DE PÁGINA IMPRESIÓN */}
                <div className="imprimir-membrete" style={{ marginTop: '16px', paddingTop: '12px', fontSize: '0.8rem', borderTop: '1px dashed #666', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Garantía:</strong> 6 meses en cuadros nuevos. 3 meses en componentes mecánicos.<br />
                    ¡Gracias por elegir <strong>DN BIKE</strong>!
                  </div>
                  <div style={{ textAlign: 'center', width: '220px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '24px' }}>
                    Firma / Conformidad
                  </div>
                </div>

                <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarModalDetalle(false)}
                    style={{
                      padding: '10px 24px', backgroundColor: 'var(--azul-oscuro)', color: '#fff',
                      border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VENTANA EMERGENTE: NUEVA VENTA (MODAL) --- */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '740px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Generar Comprobante de Venta</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleFinalizarVenta} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* SELECCIÓN DE CLIENTE */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Cliente Comprador *</label>
                <select
                  value={clienteSeleccionadoId}
                  onChange={e => setClienteSeleccionadoId(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    border: '1px solid var(--borde-input)', fontSize: '0.9rem',
                    backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)'
                  }}
                  required
                >
                  <option value={0}>Seleccionar Cliente</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.apellido} {c.nombre} (DNI: {c.dni})
                    </option>
                  ))}
                </select>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed var(--borde-input)', margin: '4px 0' }} />

              {/* SELECCIÓN DE PRODUCTOS DESDE STOCK */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Agregar Artículos del Inventario</label>

                  {/* Filtros dinámicos funcionales */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['todos', 'bicicleta', 'accesorio', 'repuesto', 'componente'].map(tipo => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setFiltroTipo(tipo)}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                          textTransform: 'capitalize', fontWeight: '600',
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
                    <option value={0}>Seleccionar Producto ({productosFiltrados.length} disponibles)</option>
                    {productosFiltrados.map(p => (
                      <option key={p.id_producto} value={p.id_producto} disabled={p.cantidad <= 0}>
                        {p.nombre} {p.marca ? `(${p.marca})` : ''} - ${Number(p.precio).toLocaleString()} [Stock: {p.cantidad}]
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={cantidadAnadir}
                    onChange={e => setCantidadAnadir(Number(e.target.value))}
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
                      backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px',
                      borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem'
                    }}
                  >
                    + Añadir
                  </button>
                </div>

                {/* INFO EXTRA SI ES BICICLETA */}
                {productoSeleccionado && (productoSeleccionado.tipo_prod || '').toLowerCase().includes('bicicleta') && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: '8px', fontSize: '0.85rem', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>
                    <strong>Bicicleta seleccionada:</strong> {productoSeleccionado.nombre} {productoSeleccionado.marca ? `| Marca: ${productoSeleccionado.marca}` : ''} {productoSeleccionado.numero_serie ? `| N° Serie: ${productoSeleccionado.numero_serie}` : ''} {productoSeleccionado.rodado ? `| R${productoSeleccionado.rodado}` : ''} {productoSeleccionado.talle ? `| Talle ${productoSeleccionado.talle}` : ''}
                  </div>
                )}
              </div>

              {/* DETALLE DE ITEMS EN EL CARRITO */}
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
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                          No has agregado ningún artículo a la venta.
                        </td>
                      </tr>
                    ) : (
                      carritoDetalle.map(item => (
                        <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                          <td style={{ padding: '10px', fontWeight: '500' }}>
                            {item.nombre}
                            {(item.tipo_prod || '').toLowerCase().includes('bicicleta') && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#2563eb', fontWeight: '600' }}>
                                Rodado a registrar (N° Serie: {item.numero_serie || 'N/A'})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>{item.cantidad}</td>
                          <td style={{ padding: '10px' }}>${item.precio_unitario.toLocaleString()}</td>
                          <td style={{ padding: '10px', fontWeight: '600' }}>${(item.precio_unitario * item.cantidad).toLocaleString()}</td>
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
                  <span style={{ fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>Total a Facturar: </span>
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
                    disabled={guardando || carritoDetalle.length === 0}
                    style={{
                      padding: '10px 20px', border: 'none', borderRadius: '8px',
                      backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600',
                      cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1
                    }}
                  >
                    {guardando ? 'Procesando Venta...' : 'Completar Venta'}
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