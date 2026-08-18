import { useState, useEffect } from 'react';
import type { IngresoStock, Proveedor, Producto } from '../types';
import { api } from '../services/api';

interface DetalleIngresoForm {
  id_producto: number;
  nombre: string;
  cantidad: number;
  precio_costo: number;
}

export function IngresosView() {
  const [ingresos, setIngresos] = useState<IngresoStock[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal Nuevo Ingreso
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [idProveedorSeleccionado, setIdProveedorSeleccionado] = useState<number>(0);
  const [numComprobante, setNumComprobante] = useState<string>('');
  const [detallesIngreso, setDetallesIngreso] = useState<DetalleIngresoForm[]>([]);

  // Item selector state
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<number>(0);
  const [cantidadIngresar, setCantidadIngresar] = useState<number>(1);
  const [precioCosto, setPrecioCosto] = useState<number>(0);

  // Modal Ver Detalle de Remito Histórico
  const [remitoSeleccionado, setRemitoSeleccionado] = useState<{
    ingreso: IngresoStock;
    productos_ingresados: any[];
  } | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState<boolean>(false);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [resIngresos, resProvs, resProds] = await Promise.all([
        api.ingresos.getAll(),
        api.proveedores.getAll(),
        api.productos.getAll()
      ]);
      setIngresos(resIngresos.ingresos || []);
      setProveedores(resProvs.proveedores || []);
      setProductos(resProds.productos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar datos de ingresos de mercadería.');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleVerDetalleRemito = async (idIngreso: number) => {
    setCargandoDetalle(true);
    setMostrarModalDetalle(true);
    try {
      const data = await api.ingresos.getById(idIngreso);
      setRemitoSeleccionado(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al cargar remito: ${err.message}`);
      }
      setMostrarModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleAgregarArticulo = () => {
    if (productoSeleccionadoId === 0) {
      alert('Por favor selecciona un producto a ingresar.');
      return;
    }
    if (cantidadIngresar <= 0) {
      alert('La cantidad a ingresar debe ser mayor a cero.');
      return;
    }

    const prod = productos.find(p => p.id_producto === productoSeleccionadoId);
    if (!prod) return;

    const yaExiste = detallesIngreso.find(d => d.id_producto === prod.id_producto);
    if (yaExiste) {
      alert('Este producto ya fue agregado al remito. Quítalo primero para modificar la cantidad.');
      return;
    }

    const nuevoItem: DetalleIngresoForm = {
      id_producto: prod.id_producto!,
      nombre: `${prod.nombre} ${prod.marca ? `(${prod.marca})` : ''}`,
      cantidad: cantidadIngresar,
      precio_costo: Number(precioCosto) || 0
    };

    setDetallesIngreso([...detallesIngreso, nuevoItem]);
    setProductoSeleccionadoId(0);
    setCantidadIngresar(1);
    setPrecioCosto(0);
  };

  const handleQuitarArticulo = (idProd: number) => {
    setDetallesIngreso(detallesIngreso.filter(d => d.id_producto !== idProd));
  };

  const handleGuardarIngreso = async (e: React.FormEvent) => {
    e.preventDefault();

    if (idProveedorSeleccionado === 0) {
      alert('Por favor selecciona el proveedor emisor del remito.');
      return;
    }

    if (detallesIngreso.length === 0) {
      alert('Agrega al menos un producto a la recepción de mercadería.');
      return;
    }

    setGuardando(true);
    try {
      await api.ingresos.create({
        id_proveedor: idProveedorSeleccionado,
        num_comprobante: numComprobante.trim() || 'REM-S/N',
        detalles: detallesIngreso.map(d => ({
          id_producto: d.id_producto,
          cantidad: d.cantidad,
          precio_costo: d.precio_costo
        }))
      });

      alert('¡Mercadería ingresada exitosamente! El stock fue sumado en el inventario.');
      setMostrarModal(false);
      setDetallesIngreso([]);
      setIdProveedorSeleccionado(0);
      setNumComprobante('');
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar ingreso: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const ingresosFiltrados = ingresos.filter(i => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    const comp = (i.num_comprobante || '').toLowerCase();
    const prov = (i.proveedor || '').toLowerCase();
    const user = (i.usuario_registro || '').toLowerCase();
    return comp.includes(term) || prov.includes(term) || user.includes(term);
  });

  const totalCostoRemito = detallesIngreso.reduce((acc, item) => acc + (item.cantidad * item.precio_costo), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>
            Recepción de Mercadería (Remitos)
          </h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Ingreso de stock, control de remitos y compras mayoristas a proveedores
          </p>
        </div>

        <button
          onClick={() => {
            setDetallesIngreso([]);
            setIdProveedorSeleccionado(0);
            setNumComprobante('');
            setMostrarModal(true);
          }}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Recepcionar Mercadería
        </button>
      </div>

      {/* CONTADOR Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Remitos Registrados</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{ingresos.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por N° remito, proveedor o usuario..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', width: '340px', fontSize: '0.9rem'
          }}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE REMITOS */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Comprobante / Remito</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Proveedor</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Fecha Ingreso</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Recepcionado Por</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Total Artículos</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando historial de remitos...
                </td>
              </tr>
            ) : ingresosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {ingresos.length === 0 ? 'No hay remitos registrados en el sistema.' : 'No se encontraron remitos con ese filtro.'}
                </td>
              </tr>
            ) : (
              ingresosFiltrados.map(i => (
                <tr
                  key={i.id_ingreso}
                  style={{ borderBottom: '1px solid var(--borde-input)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.03)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: '700', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                    {i.num_comprobante || `REM-${i.id_ingreso}`}
                  </td>
                  <td style={{ padding: '16px', fontWeight: '600', color: 'var(--texto-principal)', fontSize: '0.95rem' }}>
                    {i.proveedor}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                    {i.fecha_ingreso ? new Date(i.fecha_ingreso).toLocaleDateString() : 'Hoy'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                    {i.usuario_registro || 'Sistema'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: '#10b981', fontSize: '0.95rem' }}>
                    {i.total_items || 0} ítems
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => i.id_ingreso != null && handleVerDetalleRemito(i.id_ingreso)}
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--azul-oscuro)',
                        border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', padding: '6px 14px',
                        fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      Ver Remito
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL NUEVO REMITO / INGRESO DE MERCADERÍA --- */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '780px', maxWidth: '95vw', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Recepcionar Remito de Proveedor</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarIngreso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Proveedor Emisor *</label>
                  <select
                    value={idProveedorSeleccionado}
                    onChange={e => setIdProveedorSeleccionado(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                    required
                  >
                    <option value={0}>Seleccionar Proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre_empresa} {p.cuit ? `(CUIT: ${p.cuit})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>N° de Remito / Factura de Compra *</label>
                  <input
                    type="text"
                    placeholder="Ej: REM-0001-00045892"
                    value={numComprobante}
                    onChange={e => setNumComprobante(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed var(--borde-input)', margin: '4px 0' }} />

              {/* SELECTOR DE PRODUCTOS A INGRESAR */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>Artículos a Ingresar</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 95px 125px 105px', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={productoSeleccionadoId}
                    onChange={e => setProductoSeleccionadoId(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  >
                    <option value={0}>Seleccionar Producto ({productos.length})</option>
                    {productos.map(p => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.nombre} {p.marca ? `(${p.marca})` : ''} [Stock: {p.cantidad}]
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={cantidadIngresar}
                    onChange={e => setCantidadIngresar(Number(e.target.value))}
                    placeholder="Cant."
                    title="Cantidad a ingresar"
                    style={{ width: '100%', padding: '10px 6px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioCosto || ''}
                    onChange={e => setPrecioCosto(Number(e.target.value))}
                    placeholder="P. Costo ($)"
                    title="Precio de costo unitario"
                    style={{ width: '100%', padding: '10px 8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />

                  <button
                    type="button"
                    onClick={handleAgregarArticulo}
                    style={{ width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 0', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap' }}
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* TABLA DE DETALLES TEMPORALES */}
              <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Artículo</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)', textAlign: 'center' }}>Cantidad a Sumar</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Precio de Costo</th>
                      <th style={{ padding: '10px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Subtotal</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesIngreso.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                          No has agregado artículos al remito aún.
                        </td>
                      </tr>
                    ) : (
                      detallesIngreso.map(item => (
                        <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                          <td style={{ padding: '10px', fontWeight: '600' }}>{item.nombre}</td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>+{item.cantidad}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>${item.precio_costo.toLocaleString()}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>${(item.cantidad * item.precio_costo).toLocaleString()}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleQuitarArticulo(item.id_producto)}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>Total Costo Estimado: </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#16a34a' }}>${totalCostoRemito.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '10px 18px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                  <button
                    type="submit"
                    disabled={guardando || detallesIngreso.length === 0}
                    style={{
                      padding: '10px 20px', backgroundColor: 'var(--azul-oscuro)', color: '#fff',
                      border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1
                    }}
                  >
                    {guardando ? 'Guardando...' : 'Confirmar e Incrementar Stock'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VISUALIZAR REMITO HISTÓRICO --- */}
      {mostrarModalDetalle && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '640px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            {cargandoDetalle || !remitoSeleccionado ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>Cargando remito...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--borde-input)', paddingBottom: '14px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--azul-oscuro)' }}>
                      {remitoSeleccionado.ingreso.num_comprobante}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                      Fecha: {remitoSeleccionado.ingreso.fecha_ingreso ? new Date(remitoSeleccionado.ingreso.fecha_ingreso).toLocaleDateString() : 'Hoy'}
                    </span>
                  </div>
                  <button onClick={() => setMostrarModalDetalle(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
                </div>

                <div style={{ backgroundColor: 'var(--bg-principal)', padding: '14px', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <div style={{ fontWeight: '700', fontSize: '1rem' }}>🏢 {remitoSeleccionado.ingreso.proveedor}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', marginTop: '4px' }}>
                    Recepcionado por: {remitoSeleccionado.ingreso.usuario_registro || 'Sistema'}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Artículos Ingresados</h4>
                  <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '10px', color: 'var(--texto-mutado)' }}>Producto</th>
                          <th style={{ padding: '10px', color: 'var(--texto-mutado)', textAlign: 'center' }}>Cantidad Sumada</th>
                          <th style={{ padding: '10px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Precio de Costo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remitoSeleccionado.productos_ingresados.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                            <td style={{ padding: '10px', fontWeight: '600' }}>
                              {item.nombre} {item.marca ? `(${item.marca})` : ''}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: '700', color: '#10b981' }}>
                              +{item.cantidad}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              ${Number(item.precio_costo).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarModalDetalle(false)}
                    style={{ padding: '10px 20px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
