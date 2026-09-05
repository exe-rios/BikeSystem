import iconCarrito from '../../../assets/Fotinhos/carrito.png';
import iconReparar from '../../../assets/Fotinhos/reparar.png';

interface InicioAccionesRapidasProps {
  onNavigate: (view: string) => void;
}

export function InicioAccionesRapidas({ onNavigate }: InicioAccionesRapidasProps) {
  return (
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
          <img src={iconCarrito} alt="Nueva Venta" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
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
          <img src={iconReparar} alt="Nueva Reparación" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          Gestionar Taller
        </button>
      </div>
    </div>
  );
}
