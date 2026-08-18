import { useState, useEffect } from 'react';
import type { PagoProveedor, Proveedor, MetodoPago } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function PagoProveedores() {
    const { user } = useAuth();

    const [pagos, setPagos] = useState<PagoProveedor[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState<string>('');

    const [mostrarModal, setMostrarModal] = useState(false);

    const [nuevoPago, setNuevoPago] = useState<{
        nombre_proveedor: string;
        id_metodo_pago: number;
        monto_total: number;
        observaciones: string;
    }>({
        nombre_proveedor: '',
        id_metodo_pago: 0,
        monto_total: 0,
        observaciones: ''
    });

    const cargarDatos = async () => {
        setCargando(true);
        setError(null);
        try {
            const [resPagos, resProv, resMetodos] = await Promise.all([
                api.pagosProveedores.getAll(),
                api.proveedores.getAll(),
                api.pagosProveedores.getMetodosPago()
            ]);

            setPagos(resPagos.pagos || []);
            setProveedores(resProv.proveedores || []);
            setMetodosPago(resMetodos || []);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Error al cargar pagos y proveedores');
            }
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nuevoPago.nombre_proveedor.trim()) {
            alert('Por favor ingresa el nombre del proveedor.');
            return;
        }

        if (!nuevoPago.id_metodo_pago || nuevoPago.monto_total <= 0) {
            alert('Por favor selecciona un método de pago y un monto mayor a cero.');
            return;
        }

        setGuardando(true);
        try {
            await api.pagosProveedores.create({
                nombre_proveedor: nuevoPago.nombre_proveedor.trim(),
                id_usuario: user?.id_usuario || 1,
                id_metodo_pago: nuevoPago.id_metodo_pago,
                monto_total: Number(nuevoPago.monto_total),
                observaciones: nuevoPago.observaciones
            });

            alert('Pago a proveedor registrado exitosamente');
            setMostrarModal(false);
            setNuevoPago({ nombre_proveedor: '', id_metodo_pago: 0, monto_total: 0, observaciones: '' });
            await cargarDatos();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Error al registrar pago: ${err.message}`);
            }
        } finally {
            setGuardando(false);
        }
    };

    const pagosFiltrados = pagos.filter(p => {
        const term = busqueda.toLowerCase().trim();
        if (!term) return true;
        const prov = (p.proveedor_nombre || '').toLowerCase();
        const metodo = (p.metodo_pago_nombre || '').toLowerCase();
        const obs = (p.observaciones || '').toLowerCase();
        const usuario = (p.usuario_nombre || '').toLowerCase();
        return prov.includes(term) || metodo.includes(term) || obs.includes(term) || usuario.includes(term);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

            {/* HEADER SUPERIOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registro de Pagos a Proveedores</h1>
                    <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Historial y comprobantes de pagos efectuados a proveedores del negocio</p>
                </div>

                <button
                    onClick={() => {
                        setNuevoPago({
                            nombre_proveedor: '',
                            id_metodo_pago: metodosPago[0]?.id_metodo_pago || 1,
                            monto_total: 0,
                            observaciones: ''
                        });
                        setMostrarModal(true);
                    }}
                    style={{
                        backgroundColor: 'var(--azul-oscuro)',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                    }}
                >
                    Registrar Pago
                </button>
            </div>

            {/* CONTADORES Y BUSCADOR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                <div style={{
                    backgroundColor: 'var(--naranja-notif)',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Pagos Registrados</span>
                    <span style={{
                        backgroundColor: '#ff9248',
                        color: '#fff',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                    }}>{pagos.length}</span>
                </div>

                <input
                    type="text"
                    placeholder="Buscar por proveedor, método o detalle..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--borde-input)',
                        backgroundColor: 'var(--bg-tarjeta)',
                        color: 'var(--texto-principal)',
                        width: '320px',
                        fontSize: '0.9rem'
                    }}
                />
            </div>

            {/* ERROR */}
            {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {/* TABLA ESTILO FIGMA */}
            <div style={{
                backgroundColor: 'var(--bg-tarjeta)',
                borderRadius: '14px',
                border: '1px solid var(--borde-input)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proveedor / Empresa</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pago</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registrado Por</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                                    Cargando pagos...
                                </td>
                            </tr>
                        ) : pagosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                                    {pagos.length === 0 ? 'No hay pagos a proveedores registrados.' : 'No se encontraron pagos con ese término de búsqueda.'}
                                </td>
                            </tr>
                        ) : (
                            pagosFiltrados.map(p => (
                                <tr key={p.id_pago} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                                        {p.fecha ? new Date(p.fecha).toLocaleDateString() : 'Hoy'}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)', fontWeight: '600' }}>
                                        {p.proveedor_nombre}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                                        <span style={{ backgroundColor: 'var(--bg-principal)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--borde-input)' }}>
                                            {p.metodo_pago_nombre}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{p.usuario_nombre}</td>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', color: '#10b981', fontWeight: '700' }}>
                                        ${Number(p.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', textAlign: 'right' }}>
                                        {p.observaciones || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE REGISTRO CON INPUT LIBRE Y AUTOCOMPLETADO */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '30px',
                        borderRadius: '16px', border: '1px solid var(--borde-input)',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Registrar Pago a Proveedor</h3>
                            <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
                        </div>

                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* NOMBRE DE PROVEEDOR INGRESO DIRECTO O SELECCIÓN */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                                    Nombre del Proveedor / Empresa *
                                </label>
                                <input
                                    type="text"
                                    list="proveedores-sugeridos"
                                    placeholder="Ej: Distribuidora Shimano, Repuestos Rossi..."
                                    value={nuevoPago.nombre_proveedor}
                                    onChange={e => setNuevoPago({ ...nuevoPago, nombre_proveedor: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                                    required
                                    autoFocus
                                />
                                <datalist id="proveedores-sugeridos">
                                    {proveedores.map(prov => (
                                        <option key={prov.id_proveedor} value={prov.nombre_empresa} />
                                    ))}
                                </datalist>
                                <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', marginTop: '4px', display: 'block' }}>
                                    Puedes escribir libremente un nombre nuevo o seleccionar uno existente.
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Método de Pago *</label>
                                <select
                                    value={nuevoPago.id_metodo_pago}
                                    onChange={e => setNuevoPago({ ...nuevoPago, id_metodo_pago: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                                    required
                                >
                                    <option value={0}>Seleccione un método...</option>
                                    {metodosPago.map(mp => (
                                        <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>{mp.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Monto Total ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={nuevoPago.monto_total || ''}
                                    onChange={e => setNuevoPago({ ...nuevoPago, monto_total: Number(e.target.value) })}
                                    placeholder="0.00"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Observaciones</label>
                                <textarea
                                    value={nuevoPago.observaciones}
                                    onChange={e => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
                                    placeholder="Número de factura, comprobante de transferencia, etc."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                                    {guardando ? 'Guardando...' : 'Confirmar Pago'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
