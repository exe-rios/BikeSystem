import { useState, useEffect } from 'react';
import iconCarrito from '../assets/Fotinhos/carrito.png';
import iconReparar from '../assets/Fotinhos/reparar.png';
import iconAlerta from '../assets/Fotinhos/alerta.png';
import iconGrafico from '../assets/Fotinhos/grafico-de-barras.png';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardData, Venta, Reparacion } from '../types';

interface InicioViewProps {
  onNavigate: (view: string) => void;
}

export function InicioView({ onNavigate }: InicioViewProps) {
  const { user } = useAuth();
  const userRole = (user?.rol || 'EMPLEADO').toUpperCase();
  const esAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ultimasVentas, setUltimasVentas] = useState<Venta[]>([]);
  const [ultimasReparaciones, setUltimasReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDashboard = async () => {
    setCargando(true);
    setError(null);
    try {
      const [dataDashboard, dataVentas, dataRep] = await Promise.all([
        api.reportes.getDashboard().catch(() => null),
        api.ventas.getAll().catch(() => ({ total: 0, ventas: [] })),
        api.reparaciones.getAll().catch(() => ({ total: 0, reparaciones: [] }))
      ]);

      if (dataDashboard) {
        setDashboard(dataDashboard);
      }
      setUltimasVentas(dataVentas.ventas?.slice(0, 5) || []);
      setUltimasReparaciones(dataRep.reparaciones?.slice(0, 5) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar el resumen del dashboard');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const totalReparacionesActivas = dashboard?.taller_activo?.reduce((acc, t) => acc + Number(t.cantidad), 0) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--texto-principal)', padding: '4px' }}>

      {/* HEADER */}
      <div>
        <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Ventana principal</h1>
        <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
          {esAdmin ? 'Visión general y métricas del negocio en tiempo real' : 'Panel de operaciones diarias de ventas y taller'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* ACCIONES RÁPIDAS */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 12px 0', color: 'var(--texto-mutado)' }}>Acciones Rápidas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <button
            onClick={() => onNavigate('ventas')}
            style={{
              height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
            }}
          >
            <img src={iconCarrito} alt="Nueva Venta" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            Nueva Venta
          </button>
          <button
            onClick={() => onNavigate('reparaciones')}
            style={{
              height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            <img src={iconReparar} alt="Nueva Reparación" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            Gestionar Taller
          </button>
        </div>
      </div>

      {/* BLOQUES CENTRALES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* PANEL: ALERTAS DE STOCK */}
        <div style={{
          backgroundColor: 'var(--bg-tarjeta)',
          borderRadius: '14px',
          border: '1px solid var(--borde-input)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0 0 16px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={iconAlerta} alt="Alertas de Stock" style={{ width: '22px', height: '22px' }} />
              Alertas de Stock Bajo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cargando ? (
                <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>Verificando stock...</p>
              ) : (!dashboard?.alertas_stock || dashboard.alertas_stock.length === 0) ? (
                <div style={{ padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', color: '#065f46', fontSize: '0.9rem', fontWeight: '500' }}>
                  ✓ Todos los productos tienen stock por encima del mínimo.
                </div>
              ) : (
                dashboard.alertas_stock.map((item) => (
                  <div key={item.id_producto} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>{item.nombre} {item.marca ? `(${item.marca})` : ''}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Stock: {item.cantidad} / Mínimo: {item.stock_minimo}</p>
                      </div>
                      <span style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>BAJO</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate('stock')}
            style={{ width: '100%', marginTop: '16px', padding: '11px', backgroundColor: 'transparent', color: 'var(--texto-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}
          >
            Ver inventario completo →
          </button>
        </div>

        {/* PANEL DERECHO: RESUMEN FINANCIERO (ADMIN) O ESTADO DE TALLER (EMPLEADO) */}
        <div style={{
          backgroundColor: 'var(--bg-tarjeta)',
          borderRadius: '14px',
          border: '1px solid var(--borde-input)',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
        }}>
          {esAdmin ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <img src={iconGrafico} alt="Estadísticas del Mes" style={{ width: '24px', height: '24px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Resumen Financiero del Mes</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Ventas Mostrador</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>
                    ${Number(dashboard?.finanzas?.ventas_mostrador || 0).toLocaleString()}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Ingresos Taller</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#ea580c' }}>
                    ${Number(dashboard?.finanzas?.ingresos_taller || 0).toLocaleString()}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Total Recaudado Mes</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>
                    ${Number(dashboard?.finanzas?.total_mes || 0).toLocaleString()}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Reparaciones Activas</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                    {totalReparacionesActivas} orden{totalReparacionesActivas === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <img src={iconReparar} alt="Carga de Taller" style={{ width: '24px', height: '24px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Carga de Trabajo del Taller</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '16px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', fontWeight: '600' }}>Órdenes Recibidas</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#b45309' }}>
                    {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('recibida'))?.cantidad || 0}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'rgba(234, 88, 12, 0.08)', borderRadius: '10px', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#c2410c', fontWeight: '600' }}>En Reparación</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#c2410c' }}>
                    {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('reparación') || t.estado.toLowerCase().includes('reparacion'))?.cantidad || 0}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'rgba(13, 148, 136, 0.08)', borderRadius: '10px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f766e', fontWeight: '600' }}>Listas para Entrega</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: '#0f766e' }}>
                    {dashboard?.taller_activo?.find(t => t.estado.toLowerCase().includes('lista'))?.cantidad || 0}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>Total en Proceso</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1.5rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                    {totalReparacionesActivas}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* RECUADROS INFERIORES EN GRID: ÚLTIMAS VENTAS Y ÚLTIMAS ÓRDENES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ÚLTIMAS VENTAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Últimas Ventas Emitidas</h3>
          <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>FAC</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Cliente</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVentas.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>
                      Sin ventas recientes
                    </td>
                  </tr>
                ) : (
                  ultimasVentas.map((v) => (
                    <tr key={v.id_venta} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--texto-mutado)' }}>
                        FAC-{String(v.id_venta).padStart(4, '0')}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
                        {v.cliente_nombre ? `${v.cliente_apellido}, ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', textAlign: 'right' }}>
                        ${Number(v.costo_total).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ÚLTIMAS ÓRDENES DE TALLER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--texto-principal)' }}>Últimas Reparaciones Ingresadas</h3>
          <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Orden</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Bicicleta</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimasReparaciones.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.85rem' }}>
                      Sin órdenes recientes
                    </td>
                  </tr>
                ) : (
                  ultimasReparaciones.map((r) => (
                    <tr key={r.id_reparacion} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--texto-mutado)' }}>
                        #{r.id_reparacion}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: '500' }}>
                        {r.marca} {r.modelo}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          backgroundColor:
                            r.estado === 'Lista' ? '#ccfbf1' :
                              r.estado === 'En Reparación' ? '#ffedd5' :
                                r.estado === 'Recibida' ? '#fef3c7' : '#f1f5f9',
                          color:
                            r.estado === 'Lista' ? '#0f766e' :
                              r.estado === 'En Reparación' ? '#c2410c' :
                                r.estado === 'Recibida' ? '#b45309' : '#475569'
                        }}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}