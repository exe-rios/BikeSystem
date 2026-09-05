import { useState, useMemo } from 'react';
import type { Producto, DetalleVentaItem } from '../../../types';

export function useCarritoVenta() {
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number>(0);
  const [metodoPagoSeleccionadoId, setMetodoPagoSeleccionadoId] = useState<number>(1);
  const [carritoDetalle, setCarritoDetalle] = useState<DetalleVentaItem[]>([]);

  // Estado del selector de artículos
  const [productoBuscadoId, setProductoBuscadoId] = useState<number>(0);
  const [cantidadAnadir, setCantidadAnadir] = useState<number | string>(1);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  // Total calculado del carrito para vista previa del usuario
  const totalVenta = useMemo(() => {
    return carritoDetalle.reduce((acc, item) => acc + (item.costo_total || (item.cantidad * item.precio_unitario)), 0);
  }, [carritoDetalle]);

  // Agregar artículo al carrito validando stock disponible
  const agregarAlCarrito = (productos: Producto[]) => {
    if (productoBuscadoId === 0) {
      alert('Por favor selecciona un producto.');
      return false;
    }

    const prod = productos.find(p => p.id_producto === productoBuscadoId);
    if (!prod) return false;

    const cant = parseInt(String(cantidadAnadir), 10);
    if (isNaN(cant) || cant <= 0) {
      alert('La cantidad a añadir debe ser un número entero mayor a 0.');
      return false;
    }

    if (cant > Number(prod.cantidad)) {
      alert(`No hay stock suficiente de "${prod.nombre}". Disponible: ${prod.cantidad}`);
      return false;
    }

    const yaExiste = carritoDetalle.find(item => item.id_producto === prod.id_producto);
    if (yaExiste) {
      const nuevaCantidad = yaExiste.cantidad + cant;
      if (nuevaCantidad > Number(prod.cantidad)) {
        alert(`No puedes agregar más unidades. El stock máximo disponible es ${prod.cantidad}.`);
        return false;
      }
      setCarritoDetalle(prev =>
        prev.map(item =>
          item.id_producto === prod.id_producto
            ? {
                ...item,
                cantidad: nuevaCantidad,
                costo_total: Number(item.precio_unitario) * nuevaCantidad
              }
            : item
        )
      );
      setProductoBuscadoId(0);
      setCantidadAnadir(1);
      return true;
    }

    const nuevoItem: DetalleVentaItem = {
      id_producto: prod.id_producto!,
      nombre: prod.nombre,
      tipo_prod: prod.tipo_prod,
      cantidad: cant,
      precio_unitario: Number(prod.precio) || 0,
      costo_total: (Number(prod.precio) || 0) * cant,
      marca: prod.marca,
      modelo: prod.modelo,
      numero_serie: prod.numero_serie,
      color: prod.color,
      rodado: prod.rodado,
      talle: prod.talle
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
      alert(`No hay stock suficiente de "${prod.nombre}". Disponible: ${prod.cantidad}`);
      return;
    }

    setCarritoDetalle(prev =>
      prev.map(item => {
        if (item.id_producto === idProd) {
          return {
            ...item,
            cantidad: nuevaCantidad,
            costo_total: item.precio_unitario * nuevaCantidad
          };
        }
        return item;
      })
    );
  };

  const quitarDelCarrito = (idProd: number) => {
    setCarritoDetalle(prev => prev.filter(item => item.id_producto !== idProd));
  };

  const limpiarCarrito = (primerMetodoPagoId: number = 1) => {
    setCarritoDetalle([]);
    setClienteSeleccionadoId(0);
    setMetodoPagoSeleccionadoId(primerMetodoPagoId);
    setProductoBuscadoId(0);
    setCantidadAnadir(1);
    setFiltroTipo('todos');
  };

  return {
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    metodoPagoSeleccionadoId,
    setMetodoPagoSeleccionadoId,
    carritoDetalle,
    productoBuscadoId,
    setProductoBuscadoId,
    cantidadAnadir,
    setCantidadAnadir,
    filtroTipo,
    setFiltroTipo,
    totalVenta,
    agregarAlCarrito,
    actualizarCantidadItem,
    quitarDelCarrito,
    limpiarCarrito
  };
}
