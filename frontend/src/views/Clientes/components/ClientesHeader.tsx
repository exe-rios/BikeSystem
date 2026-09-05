interface ClientesHeaderProps {
  totalClientes: number;
  busqueda: string;
  setBusqueda: (v: string) => void;
  onAbrirNuevo: () => void;
}

export function ClientesHeader({
  totalClientes,
  busqueda,
  setBusqueda,
  onAbrirNuevo
}: ClientesHeaderProps) {
  return (
    <>
      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Clientes</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Listado y registro de usuarios del sistema</p>
        </div>

        <button
          onClick={onAbrirNuevo}
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
          Registrar Cliente
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
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Total Clientes Registrados</span>
          <span style={{
            backgroundColor: '#ff9248',
            color: '#fff',
            padding: '2px 10px',
            borderRadius: '20px',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}>{totalClientes}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre, apellido, DNI..."
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
    </>
  );
}
