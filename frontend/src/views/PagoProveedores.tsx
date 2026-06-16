import { useState, useEffect } from 'react';
import type { PagoProveedor, Proveedor, MetodoPago } from '../types';

export function PagoProveedores() {
    const [pagos, setPagos] = useState<PagoProveedor[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [mostrarModal, setMostrarModal] = useState(false);

    // Simulando que el usuario logueado es el ID 1 (Debería venir del Auth Context)
    const [nuevoPago, setNuevoPago] = useState({
        id_proveedor: 0,
        id_usuario: 1,
        id_metodo_pago: 0,
        monto_total: 0,
        observaciones: ''
    });

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            // Intentar cargar datos del backend, o usar fallback
            const token = localStorage.getItem('token') || '';
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const [resPagos, resProv, resMetodos] = await Promise.all([
                fetch('http://localhost:3000/api/pagos-proveedores', { headers }).catch(() => null),
                fetch('http://localhost:3000/api/proveedores', { headers }).catch(() => null),
                fetch('http://localhost:3000/api/pagos-proveedores/metodos-pago', { headers }).catch(() => null)
            ]);

            if (resPagos && resPagos.ok) {
                const data = await resPagos.json();
                setPagos(data.pagos || []);
            }

            if (resProv && resProv.ok) {
                const data = await resProv.json();
                setProveedores(data.proveedores || []);
            }

            if (resMetodos && resMetodos.ok) {
                const data = await resMetodos.json();
                setMetodosPago(data || []);
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    };

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nuevoPago.id_proveedor || !nuevoPago.id_metodo_pago || nuevoPago.monto_total <= 0) {
            alert('Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea mayor a 0');
            return;
        }

        try {
            const token = localStorage.getItem('token') || '';
            const response = await fetch('http://localhost:3000/api/pagos-proveedores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(nuevoPago)
            });

            if (response.ok) {
                alert('Pago registrado exitosamente');
                setMostrarModal(false);
                setNuevoPago({ id_proveedor: 0, id_usuario: 1, id_metodo_pago: 0, monto_total: 0, observaciones: '' });
                cargarDatos();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error al guardar el pago', error);
            alert('Error de conexión al guardar el pago');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>

            {/* HEADER SUPERIOR ESTILO FIGMA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Pagos a Proveedores</h1>
                    <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Gestión y registro de pagos realizados a proveedores</p>
                </div>

                <button
                    onClick={() => setMostrarModal(true)}
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
                    ➕ Registrar Pago
                </button>
            </div>

            {/* BLOQUE DE CONTADORES SUPERIORES */}
            <div style={{ display: 'flex', gap: '15px' }}>
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
            </div>

            {/* TABLA ESTILO FIGMA (Contenedor Blanco con Sombra y Bordes Redondos) */}
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
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proveedor</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pago</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagos.map(p => (
                            <tr key={p.id_pago} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                                    {p.fecha ? new Date(p.fecha).toLocaleDateString() : 'N/A'}
                                </td>
                                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{p.proveedor_nombre}</td>
                                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{p.metodo_pago_nombre}</td>
                                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{p.usuario_nombre}</td>
                                <td style={{ padding: '16px', fontSize: '0.95rem', color: '#10b981', fontWeight: '600' }}>
                                    ${Number(p.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', textAlign: 'right' }}>
                                    {p.observaciones || '-'}
                                </td>
                            </tr>
                        ))}
                        {pagos.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                                    No hay pagos a proveedores registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL FLOTANTE DE REGISTRO */}
            {mostrarModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '30px',
                        borderRadius: '16px', border: '1px solid var(--borde-input)',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registrar Pago a Proveedor</h3>
                            <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
                        </div>

                        <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Proveedor *</label>
                                <select
                                    value={nuevoPago.id_proveedor}
                                    onChange={e => setNuevoPago({ ...nuevoPago, id_proveedor: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: '#fff' }}
                                >
                                    <option value={0}>Seleccione un proveedor...</option>
                                    {proveedores.map(prov => (
                                        <option key={prov.id_proveedor} value={prov.id_proveedor}>{prov.nombre_empresa}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Método de Pago *</label>
                                <select
                                    value={nuevoPago.id_metodo_pago}
                                    onChange={e => setNuevoPago({ ...nuevoPago, id_metodo_pago: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: '#fff' }}
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
                                    min="0"
                                    value={nuevoPago.monto_total || ''}
                                    onChange={e => setNuevoPago({ ...nuevoPago, monto_total: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Observaciones</label>
                                <textarea
                                    value={nuevoPago.observaciones}
                                    onChange={e => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Opcional..."
                                />
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '8px' }}>
                                Confirmar Pago
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
