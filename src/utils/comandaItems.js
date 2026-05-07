// ============================================================
// src/utils/comandaItems.js — Utilidades para líneas de pedido
// ============================================================

const obtenerProductoBase = (item) => {
  if (!item || typeof item === 'string') return null;
  return item.id_producto || item.producto || item;
};

export const obtenerIdProducto = (item) => {
  if (!item) return null;
  if (typeof item === 'string') return String(item);

  const base = obtenerProductoBase(item);
  const id = base?._id || base?.id || item.id_producto || item.producto || item._id || item.id;
  return id ? String(id) : null;
};

export const obtenerCantidad = (item) => {
  const cantidad = Number(item?.cantidad ?? item?.qty ?? 1);
  return Number.isFinite(cantidad) && cantidad > 0 ? Math.floor(cantidad) : 1;
};

export const obtenerObservacion = (item) => String(item?.observacion ?? item?.observaciones ?? '').trim();

export const normalizarLineasPedido = (items = []) => {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const producto = obtenerProductoBase(item);
    const id_producto = obtenerIdProducto(item) || `tmp-${index}`;

    return {
      uid: item?.uid || `${id_producto}-${index}`,
      id_producto,
      producto: producto && producto._id ? producto : null,
      nombre: producto?.nombre || item?.nombre || 'Producto',
      precio: Number(producto?.precio ?? item?.precio ?? 0),
      costo: item?.costo ?? producto?.costo ?? null,
      cantidad: obtenerCantidad(item),
      observacion: obtenerObservacion(item),
    };
  }).filter(Boolean);
};

export const agruparLineasPedido = (items = []) => {
  const grupos = new Map();

  normalizarLineasPedido(items).forEach((item) => {
    const key = `${item.id_producto}::${item.observacion || ''}`;
    const actual = grupos.get(key);
    if (actual) {
      actual.cantidad += item.cantidad;
      return;
    }

    grupos.set(key, { ...item });
  });

  return [...grupos.values()];
};

export const expandirLineasPedido = (items = []) => {
  return normalizarLineasPedido(items).flatMap((item) => {
    const cantidad = Math.max(1, Number(item.cantidad || 1));
    return Array.from({ length: cantidad }, () => ({
      ...item.producto,
      _id: item.producto?._id || item.id_producto,
      uid: Math.random().toString(36).slice(2, 11),
      cantidad: 1,
      observacion: item.observacion,
    }));
  });
};

export const calcularTotalLineasPedido = (items = []) => {
  return normalizarLineasPedido(items).reduce((acc, item) => acc + (Number(item.precio || 0) * Number(item.cantidad || 1)), 0);
};

export const formatearObservacion = (texto = '') => {
  const limpio = String(texto || '').trim().toLowerCase();
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};
