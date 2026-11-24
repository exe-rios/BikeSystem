import { useState, useMemo } from 'react';
import type { Producto, DetalleVentaItem } from '../../../types';

/** Hook de control del carrito de compras, cálculo de subtotales y validación de stock. */
export function useCarritoVenta() {
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number>(0);
  const [metodoPagoSeleccionadoId, setMetodoPagoSeleccionadoId] = useState<number>(1);
  const [tipoPrecio, setTipoPrecio] = useState<'publico' | 'reventa'>('publico');
  const [carritoDetalle, setCarritoDetalle] = useState<DetalleVentaItem[]>([]);

  // Datos personalizados para Consumidor Final de mostrador (sin crear nuevo cliente)
  const [nombreConsumidorFinal, setNombreConsumidorFinal] = useState<string>('');
  const [apellidoConsumidorFinal, setApellidoConsumidorFinal] = useState<string>('');
  const [dniConsumidorFinal, setDniConsumidorFinal] = useState<string>('');

  // Estado del selector de artículos
  const [productoBuscadoId, setProductoBuscadoId] = useState<number>(0);
  const [cantidadAnadir, setCantidadAnadir] = useState<number | string>(1);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [errorCarrito, setErrorCarrito] = useState<string | null>(null);

  const obtenerPrecioEfectivo = (prod: Producto, modo: 'publico' | 'reventa'): number => {
    if (modo === 'reventa' && prod.precio_reventa !== null && prod.precio_reventa !== undefined && Number(prod.precio_reventa) > 0) {
      return Number(prod.precio_reventa);
    }
    return Number(prod.precio) || 0;
  };

  const cambiarTipoPrecio = (nuevoModo: 'publico' | 'reventa', productos: Producto[]) => {
    setTipoPrecio(nuevoModo);
    setCarritoDetalle(prev =>
      prev.map(item => {
        const prod = productos.find(p => p.id_producto === item.id_producto);
        if (!prod) return item;
        const nuevoUnitario = obtenerPrecioEfectivo(prod, nuevoModo);
        return {
          ...item,
          precio_unitario: nuevoUnitario,
          costo_total: Math.round(nuevoUnitario * item.cantidad * 100) / 100
        };
      })
    );
  };

  // Total calculado del carrito para vista previa del usuario
  const totalVenta = useMemo(() => {
    const suma = carritoDetalle.reduce((acc, item) => acc + (item.costo_total || (item.cantidad * item.precio_unitario)), 0);
    return Math.round(suma * 100) / 100;
  }, [carritoDetalle]);

  // Agregar artículo al carrito validando stock disponible
  const agregarAlCarrito = (productos: Producto[]) => {
    setErrorCarrito(null);
    if (productoBuscadoId === 0) {
      setErrorCarrito('Por favor selecciona un artículo del inventario.');
      return false;
    }

    const prod = productos.find(p => p.id_producto === productoBuscadoId);
    if (!prod) return false;

    const cant = Number(cantidadAnadir);
    if (!Number.isFinite(cant) || !Number.isInteger(cant) || cant <= 0) {
      setErrorCarrito('La cantidad a añadir debe ser un número entero mayor a 0.');
      return false;
    }

    if (cant > Number(prod.cantidad)) {
      setErrorCarrito(`No hay stock suficiente de "${prod.nombre}". Disponible: ${prod.cantidad}`);
      return false;
    }

    const yaExiste = carritoDetalle.find(item => item.id_producto === prod.id_producto);
    if (yaExiste) {
      const nuevaCantidad = yaExiste.cantidad + cant;
      if (nuevaCantidad > Number(prod.cantidad)) {
        setErrorCarrito(`No puedes agregar más unidades. El stock máximo disponible es ${prod.cantidad}.`);
        return false;
      }
      setCarritoDetalle(prev =>
        prev.map(item =>
          item.id_producto === prod.id_producto
            ? {
                ...item,
                cantidad: nuevaCantidad,
                costo_total: Math.round(Number(item.precio_unitario) * nuevaCantidad * 100) / 100
              }
            : item
        )
      );
      setProductoBuscadoId(0);
      setCantidadAnadir(1);
      return true;
    }

    const precioUnitario = obtenerPrecioEfectivo(prod, tipoPrecio);
    const nuevoItem: DetalleVentaItem = {
      id_producto: prod.id_producto!,
      nombre: prod.nombre,
      tipo_prod: prod.tipo_prod,
      cantidad: cant,
      precio_unitario: precioUnitario,
      costo_total: Math.round(precioUnitario * cant * 100) / 100,
      marca: prod.marca,
      modelo: prod.modelo,
      numero_serie: prod.numero_serie,
      color: prod.color,
      rodado: prod.rodado,
      talle: prod.talle,
      genero: prod.genero
    };

    setCarritoDetalle(prev => [...prev, nuevoItem]);
    setProductoBuscadoId(0);
    setCantidadAnadir(1);
    return true;
  };

  // Modificar cantidad directamente desde la lista de artículos
  const actualizarCantidadItem = (idProd: number, nuevaCantidad: number, productos: Producto[]) => {
    if (nuevaCantidad <= 0) {
      quitarDelCarrito(idProd);
      return;
    }

    const prod = productos.find(p => p.id_producto === idProd);
    if (prod && nuevaCantidad > Number(prod.cantidad)) {
      setErrorCarrito(`No hay stock suficiente de "${prod.nombre}". Disponible: ${prod.cantidad}`);
      return;
    }
    setErrorCarrito(null);

    setCarritoDetalle(prev =>
      prev.map(item => {
        if (item.id_producto === idProd) {
          return {
            ...item,
            cantidad: nuevaCantidad,
            costo_total: Math.round(Number(item.precio_unitario) * nuevaCantidad * 100) / 100
          };
        }
        return item;
      })
    );
  };

  const quitarDelCarrito = (idProd: number) => {
    setErrorCarrito(null);
    setCarritoDetalle(prev => prev.filter(item => item.id_producto !== idProd));
  };

  const limpiarCarrito = (primerMetodoPagoId: number = 1, defaultClienteId: number = 0) => {
    setCarritoDetalle([]);
    setClienteSeleccionadoId(defaultClienteId);
    setMetodoPagoSeleccionadoId(primerMetodoPagoId);
    setTipoPrecio('publico');
    setNombreConsumidorFinal('');
    setApellidoConsumidorFinal('');
    setDniConsumidorFinal('');
    setProductoBuscadoId(0);
    setCantidadAnadir(1);
    setFiltroTipo('todos');
    setErrorCarrito(null);
  };

  return {
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    metodoPagoSeleccionadoId,
    setMetodoPagoSeleccionadoId,
    tipoPrecio,
    cambiarTipoPrecio,
    nombreConsumidorFinal,
    setNombreConsumidorFinal,
    apellidoConsumidorFinal,
    setApellidoConsumidorFinal,
    dniConsumidorFinal,
    setDniConsumidorFinal,
    carritoDetalle,
    productoBuscadoId,
    setProductoBuscadoId,
    cantidadAnadir,
    setCantidadAnadir,
    filtroTipo,
    setFiltroTipo,
    errorCarrito,
    setErrorCarrito,
    totalVenta,
    agregarAlCarrito,
    actualizarCantidadItem,
    quitarDelCarrito,
    limpiarCarrito
  };
}
