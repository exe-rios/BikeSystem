export interface PaginacionParams {
  limite?: number | string | undefined;
  pagina?: number | string | undefined;
}

export interface PaginacionConfig {
  limitePorDefecto?: number;
  maxLimite?: number;
  opcional?: boolean;
}

export interface PaginacionResultado {
  limite: number;
  pagina: number;
  offset: number;
  tienePaginacion: boolean;
}

export interface MetaPaginacion {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

/**
 * Normaliza y valida parámetros de paginación asegurando límites y números válidos.
 */
export function normalizarPaginacion(
  params?: PaginacionParams,
  config?: PaginacionConfig
): PaginacionResultado {
  const limitePorDefecto = config?.limitePorDefecto ?? 10;
  const maxLimite = config?.maxLimite ?? 200;
  const esOpcional = config?.opcional ?? false;

  const limiteRaw = params?.limite;
  const paginaRaw = params?.pagina;

  const tienePaginacion = esOpcional
    ? (limiteRaw !== undefined && limiteRaw !== null && String(limiteRaw).toLowerCase() !== 'todos') ||
      (paginaRaw !== undefined && paginaRaw !== null)
    : true;

  let lim = limitePorDefecto;
  let pag = 1;

  if (tienePaginacion) {
    const limNum = Number(limiteRaw);
    const pagNum = Number(paginaRaw);
    lim = (!isNaN(limNum) && limNum > 0) ? Math.min(limNum, maxLimite) : limitePorDefecto;
    pag = (!isNaN(pagNum) && pagNum > 0) ? pagNum : 1;
  }

  const offset = (pag - 1) * lim;

  return {
    limite: lim,
    pagina: pag,
    offset,
    tienePaginacion
  };
}

/**
 * Concatena LIMIT y OFFSET parametrizados a una consulta SQL y añade los valores al array de parámetros.
 */
export function aplicarPaginacionSQL(
  query: string,
  params: any[],
  paginacion: PaginacionResultado
): string {
  const cleanQuery = query.trim().replace(/;$/, '');
  if (!paginacion.tienePaginacion) {
    return `${cleanQuery};`;
  }

  params.push(paginacion.limite);
  const limIdx = params.length;
  params.push(paginacion.offset);
  const offIdx = params.length;

  return `${cleanQuery} LIMIT $${limIdx} OFFSET $${offIdx};`;
}

/**
 * Calcula el metadata estándar de paginación para respuestas consistentes.
 */
export function calcularMetaPaginacion(
  total: number,
  paginacion: PaginacionResultado
): MetaPaginacion {
  const totalPaginas = paginacion.tienePaginacion
    ? (Math.ceil(total / paginacion.limite) || 1)
    : 1;

  return {
    total,
    pagina: paginacion.pagina,
    limite: paginacion.tienePaginacion ? paginacion.limite : total,
    totalPaginas
  };
}
