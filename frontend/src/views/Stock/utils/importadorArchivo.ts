import * as XLSX from 'xlsx';
import type { ItemCargaMasivaInput, CotizacionProveedorInput } from '../../../types';

export interface FacturaDetectadaPdf {
  numero?: string;
  fecha?: string;
  fecha_vencimiento?: string;
  total?: number;
  moneda?: 'ARS' | 'USD';
}

export interface ResultadoParseoArchivo {
  formato: 'xlsx' | 'csv' | 'pdf';
  items: ItemCargaMasivaInput[];
  cotizacionesProveedores: CotizacionProveedorInput[];
  hojasProcesadas: string[];
  advertencias: string[];
  proveedorDetectado?: string;
  facturaDetectada?: FacturaDetectadaPdf;
}

const normalizarTextoClave = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parsearNumeroFlexible = (valor: unknown): number => {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (valor === null || valor === undefined) return 0;
  const raw = String(valor).trim();
  if (!raw) return 0;
  // Extraer el primer bloque numérico válido para evitar concatenar dígitos sueltos de una descripción
  const match = raw.match(/-?\d[\d.,]*/);
  if (!match) return 0;
  let s = match[0];

  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');

  if (tieneComa && tienePunto) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    const partes = s.split(',');
    if (partes[1] && partes[1].length <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (tienePunto) {
    const partes = s.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const num = Number(s);
  return isNaN(num) ? 0 : num;
};

const normalizarTipoProducto = (valor: unknown, tipoFallback = 'repuesto'): string => {
  const v = normalizarTextoClave(String(valor || ''));
  if (!v) return tipoFallback;
  if (v.includes('bici')) return 'bicicleta';
  if (v.includes('acces') || v.includes('indum')) return 'accesorio';
  if (v.includes('rep') || v.includes('comp')) return 'repuesto';
  return tipoFallback;
};

const normalizarGenero = (valor: unknown): string => {
  const v = normalizarTextoClave(String(valor || ''));
  if (v.includes('nino') || v.includes('nina') || v.includes('nena') || v.includes('nene') || v.includes('infantil') || v.includes('kids') || v.includes('junior')) return 'niño/a';
  if (v.includes('hombre') || v === 'm' || v.includes('masc') || v.includes('caballero')) return 'hombre';
  if (v.includes('mujer') || v === 'f' || v.includes('fem') || v.includes('dama') || v.includes('lady')) return 'mujer';
  return 'unisex';
};

const MARCAS_CONOCIDAS: Array<{ patron: RegExp; nombre: string }> = [
  { patron: /\bSLP\b/i, nombre: 'SLP' },
  { patron: /\bVENZO\b/i, nombre: 'Venzo' },
  { patron: /\bVAIRO\b/i, nombre: 'Vairo' },
  { patron: /\bSCOTT\b/i, nombre: 'Scott' },
  { patron: /\bSHIMANO\b/i, nombre: 'Shimano' },
  { patron: /\bSRAM\b/i, nombre: 'SRAM' },
  { patron: /\bKMC\b/i, nombre: 'KMC' },
  { patron: /\bGTMRK\b/i, nombre: 'GTMRK' },
  { patron: /\bOBOR\b/i, nombre: 'Obor' },
  { patron: /\bMAXXIS\b/i, nombre: 'Maxxis' },
  { patron: /\bKENDA\b/i, nombre: 'Kenda' },
  { patron: /\bCHAOYANG\b/i, nombre: 'Chaoyang' },
  { patron: /\bTOPMEGA\b/i, nombre: 'Topmega' },
  { patron: /\bRALEIGH\b/i, nombre: 'Raleigh' },
  { patron: /\bFIRE\s*BIRD\b/i, nombre: 'Fire Bird' },
  { patron: /\bOXEA\b/i, nombre: 'Oxea' },
  { patron: /\bSPY\b/i, nombre: 'Spy' },
  { patron: /\bPHILCO\b/i, nombre: 'Philco' },
  { patron: /\bMOTOMEL\b/i, nombre: 'Motomel' },
  { patron: /\bBATTLE\b/i, nombre: 'Battle' },
  { patron: /\bOLMO\b/i, nombre: 'Olmo' },
  { patron: /\bZION\b/i, nombre: 'Zion' },
  { patron: /\bNORDIC\b/i, nombre: 'Nordic' },
  { patron: /\bENRIQUE\b/i, nombre: 'Enrique' },
  { patron: /\bTOMASELLI\b/i, nombre: 'Tomaselli' },
  { patron: /\bSUNTOUR\b/i, nombre: 'Suntour' },
  { patron: /\bROCK\s*SHOX\b/i, nombre: 'RockShox' },
  { patron: /\bTEKTRO\b/i, nombre: 'Tektro' },
  { patron: /\bTRINX\b/i, nombre: 'Trinx' },
  { patron: /\bSPECIALIZED\b/i, nombre: 'Specialized' },
  { patron: /\bTREK\b/i, nombre: 'Trek' },
  { patron: /\bGIANT\b/i, nombre: 'Giant' },
  { patron: /\bMERIDA\b/i, nombre: 'Merida' },
  { patron: /\bCANNONDALE\b/i, nombre: 'Cannondale' },
  { patron: /\bORBEA\b/i, nombre: 'Orbea' },
  { patron: /\bBIANCHI\b/i, nombre: 'Bianchi' },
  { patron: /\bCOLNER\b/i, nombre: 'Colner' },
  { patron: /\bMAZZI\b/i, nombre: 'Mazzi' },
  { patron: /\bSARS\b/i, nombre: 'Sars' },
  { patron: /\bRIVA\b/i, nombre: 'Riva' },
  { patron: /\bVOLTA\b/i, nombre: 'Volta' },
  { patron: /\bSTARK\b/i, nombre: 'Stark' },
  { patron: /\bKLATTER\b/i, nombre: 'Klatter' },
  { patron: /\bSBK\b/i, nombre: 'SBK' },
  { patron: /\bFIERCE\b/i, nombre: 'Fierce' },
  { patron: /\bTEKNIAL\b/i, nombre: 'Teknial' },
  { patron: /\bFUJI\b/i, nombre: 'Fuji' },
  { patron: /\bCUBE\b/i, nombre: 'Cube' },
  { patron: /\bNINER\b/i, nombre: 'Niner' },
  { patron: /\bGT\b/i, nombre: 'GT' },
  { patron: /\bAND[\s-]?ES\b/i, nombre: 'And-es' },
  { patron: /\bLOOK\b/i, nombre: 'Look' },
  { patron: /\bPERETTI\b/i, nombre: 'Peretti' },
  { patron: /\bGIRO\b/i, nombre: 'Giro' },
  { patron: /\bZEFAL\b/i, nombre: 'Zefal' },
  { patron: /\bTOPEAK\b/i, nombre: 'Topeak' },
  { patron: /\bMTI\b/i, nombre: 'MTI' },
  { patron: /\bVADER\b/i, nombre: 'Vader' },
  { patron: /\bDDK\b/i, nombre: 'DDK' },
  { patron: /\bSELLE\s+ROYAL\b/i, nombre: 'Selle Royal' }
];

const PALABRAS_NO_MARCA_BICI = new Set([
  'MTB', 'NINO', 'NIÑO', 'NENA', 'NIÑA', 'PASEO', 'RUTA', 'GRAVEL', 'URBANA',
  'PLAYERA', 'PLEGABLE', 'BMX', 'FIXIE', 'DAMA', 'LADY', 'HOMBRE', 'MUJER',
  'INFANTIL', 'ALUMINIO', 'ACERO', 'CARBONO', 'RODADO', 'TALLE', 'PRO'
]);

const DICCIONARIO_COLORES: Record<string, string> = {
  negro: 'Negro', negra: 'Negro', black: 'Negro',
  blanco: 'Blanco', blanca: 'Blanco', white: 'Blanco',
  gris: 'Gris', grey: 'Gris', gray: 'Gris', grafito: 'Grafito', titanio: 'Titanio',
  rojo: 'Rojo', roja: 'Rojo', red: 'Rojo',
  azul: 'Azul', blue: 'Azul', marino: 'Marino', petroleo: 'Petróleo',
  verde: 'Verde', green: 'Verde', menta: 'Menta', oliva: 'Oliva', militar: 'Militar',
  amarillo: 'Amarillo', amarilla: 'Amarillo', yellow: 'Amarillo',
  rosa: 'Rosa', pink: 'Rosa', fucsia: 'Fucsia', coral: 'Coral',
  celeste: 'Celeste', turquesa: 'Turquesa', aqua: 'Aqua', acqua: 'Aqua', cyan: 'Cyan',
  naranja: 'Naranja', orange: 'Naranja',
  violeta: 'Violeta', morado: 'Morado', lila: 'Lila', purpura: 'Púrpura',
  bordo: 'Bordó', bordó: 'Bordó',
  dorado: 'Dorado', gold: 'Dorado',
  plateado: 'Plateado', plata: 'Plata', silver: 'Plata', cromo: 'Cromo', cromado: 'Cromado',
  bronce: 'Bronce', cobre: 'Cobre',
  marron: 'Marrón', beige: 'Beige', crema: 'Crema', arena: 'Arena',
  camuflado: 'Camuflado', fluo: 'Fluo', fluor: 'Fluo', neon: 'Neón'
};

export interface AtributosExtraidos {
  marca?: string;
  modelo?: string;
  rodado?: string;
  talle?: string;
  color?: string;
  genero?: 'hombre' | 'mujer' | 'unisex' | 'niño/a';
}

const REGEX_INICIO_REPUESTO = /^\s*(?:ruedas?|cubiertas?|c[aá]maras?|cuadro|horquilla|asiento|palancas?|manubrio|casco|guantes?|calza|camiseta|aceite|cadena|freno|mazas?|pi[nñ][oó]n|llantas?|inflador|candado|luz|luces|canasto|sillita|pedales?|stem|vela|descarrilador|cambio|shifter|cable|funda|parche|rayos?|niples|pu[nñ]os?|carama[nñ]ola|porta\w*|adaptador|arandela|bujes?|suplemento)\b/i;

const REGEX_PALABRAS_REPUESTO_O_ACCESORIO = /\b(ruedas?|cubiertas?|c[aá]maras?|cuadro|horquilla|asiento|palancas?|manubrio|casco|guantes?|calza|camiseta|aceite|cadena|freno|mazas?|pi[nñ][oó]n|llantas?|inflador|candado|luz|luces|canasto|sillita|pedales?|stem|vela|descarrilador|cambio|shifter|cable|funda|parche|rayos?|niples|pu[nñ]os?|carama[nñ]ola|porta\w*|adaptador|arandela|bujes?|suplemento)\b/i;

const REGEX_MARCAS_BICICLETA = /\b(SCOTT|VAIRO|VENZO|TOPMEGA|RALEIGH|OLMO|SLP|VOLTA|TEKNIAL|FUJI|CUBE|NINER|ZION|FIRE\s*BIRD|NORDIC|ENRIQUE|TOMASELLI|OXEA|SPY|PHILCO|MOTOMEL|BATTLE|RIVA|STARK|KLATTER|SBK|FIERCE|TRINX|SPECIALIZED|TREK|GIANT|MERIDA|CANNONDALE|ORBEA|BIANCHI|COLNER|MAZZI|AND[\s-]?ES|GT)\b/i;

const REGEX_PALABRAS_BICICLETA = /\b(bicicletas?|bici|camicleta|playera|freestyle|full\s+dama|spinning|mtb|bmx|gravel|plegable|fixie)\b/i;

/** Determina si una fila sin columna TIPO explícita corresponde a una bicicleta completa. */
function inferirTipoProductoFila(nombre: string, tipoDefaultHoja: string, permitirAutodetectarBici = true): string {
  // Si empieza explícitamente con un repuesto/accesorio (ej. "ruedas crossmark", "cuadro y horquilla...")
  if (REGEX_INICIO_REPUESTO.test(nombre)) {
    return tipoDefaultHoja === 'accesorio' ? 'accesorio' : 'repuesto';
  }
  const tieneMarcaORodadoBici = REGEX_MARCAS_BICICLETA.test(nombre) || /\brod(?:ado)?\b/i.test(nombre) || REGEX_PALABRAS_BICICLETA.test(nombre);
  if (REGEX_PALABRAS_REPUESTO_O_ACCESORIO.test(nombre) && !tieneMarcaORodadoBici) {
    return tipoDefaultHoja === 'accesorio' ? 'accesorio' : 'repuesto';
  }
  if (tipoDefaultHoja === 'bicicleta') {
    return 'bicicleta';
  }
  if (permitirAutodetectarBici && tipoDefaultHoja === 'repuesto' && REGEX_PALABRAS_BICICLETA.test(nombre) && !REGEX_PALABRAS_REPUESTO_O_ACCESORIO.test(nombre)) {
    return 'bicicleta';
  }
  return tipoDefaultHoja;
}

/** Extrae automáticamente marca, modelo, rodado, talle, color y género desde la descripción de un artículo. */
export function extraerAtributosDesdeDescripcion(descripcion: string, esBicicleta: boolean): AtributosExtraidos {
  const texto = String(descripcion || '').trim();
  if (!texto) return {};

  // 1. Marca
  let marca: string | undefined;
  let patronMarcaUsado: RegExp | undefined;
  for (const m of MARCAS_CONOCIDAS) {
    if (m.patron.test(texto)) {
      marca = m.nombre;
      patronMarcaUsado = m.patron;
      break;
    }
  }
  if (!marca && esBicicleta) {
    const matchMarcaBici = texto.match(/\bBICICLETA\s+([A-ZÁÉÍÓÚÑ0-9]{2,20})\b/i);
    if (matchMarcaBici && matchMarcaBici[1]) {
      const candidata = matchMarcaBici[1].toUpperCase();
      if (!PALABRAS_NO_MARCA_BICI.has(candidata) && !/^R\d+$/.test(candidata) && !/^T\d+$/.test(candidata)) {
        marca = matchMarcaBici[1];
      }
    }
  }

  if (!esBicicleta) {
    return { marca };
  }

  // 2. Rodado (ej. R29, R20, R27.5, ROD 26, Rod, 26, 29", 700C, número suelto 24/26/29, GRAVEL)
  let rodado: string | undefined;
  const matchRodado =
    texto.match(/\bR\s*-?\s*(12|14|16|18|20|24|26|27[.,]5|28|29)\b/i) ||
    texto.match(/\bROD(?:ADO)?[.,\s:=-]*(12|14|16|18|20|24|26|27[.,]5|28|29|700)\b/i) ||
    texto.match(/\b(12|14|16|18|20|24|26|27[.,]5|28|29)\s*"/i) ||
    texto.match(/\b(27[.,]5|700)C?\b/i) ||
    texto.match(/(?<![.,\d])\b(12|14|16|20|24|26|27[.,]5|29)\b(?![.,]\d|\s*(?:v|vel|hs|km|gr|g|kg|mm|cm)\b)/i);
  if (matchRodado && matchRodado[1]) {
    rodado = matchRodado[1].replace(',', '.');
  } else if (/\bGRAVEL\b/i.test(texto)) {
    rodado = 'Gravel';
  }

  // 3. Talle (ej. T19, T16, T17, TALLE M, T-L, TALLE 18, SIZE S, 17")
  let talle: string | undefined;
  const matchTalle =
    texto.match(/\bT(?:ALLE|ALLA)?\.?\s*[:=-]?\s*(XXS|XS|S|M|L|XL|XXL|1[3-9]|2[0-3])\b/i) ||
    texto.match(/\b(?:SIZE|SZ)\.?\s*[:=-]?\s*(XXS|XS|S|M|L|XL|XXL|1[3-9]|2[0-3])\b/i) ||
    texto.match(/\b(1[4-9]|2[0-2])\s*(?:"|PULG)\b/i);
  if (matchTalle && matchTalle[1]) {
    talle = matchTalle[1].toUpperCase();
  }

  // 4. Género (ej. NIÑO/NIÑA/NENA/INFANTIL -> niño/a; LADY/DAMA/MUJER -> mujer; HOMBRE/CABALLERO -> hombre; sino unisex)
  let genero: 'hombre' | 'mujer' | 'unisex' | 'niño/a' = 'unisex';
  if (/\b(NI[NÑ][OA]S?|NEN[AE]S?|INFANTIL|KIDS|JUNIOR|BOY|GIRL)\b/i.test(texto)) {
    genero = 'niño/a';
  } else if (/\b(LADY|DAMA|DAMAS|MUJER|MUJERES|FEMENIN[AO]|WOMAN|WOMEN)\b/i.test(texto)) {
    genero = 'mujer';
  } else if (/\b(HOMBRE|MASCULIN[AO]|CABALLERO|VAR[OÓ]N|MEN|MAN)\b/i.test(texto)) {
    genero = 'hombre';
  }

  // 5. Color (extraer colores en orden de aparición sin duplicados, ej. "GRIS NEGRO BLANCO" -> "Gris Negro Blanco")
  const tokensTexto = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const coloresDetectados: string[] = [];
  for (const tok of tokensTexto) {
    const colorNorm = DICCIONARIO_COLORES[tok];
    if (colorNorm && !coloresDetectados.includes(colorNorm)) {
      coloresDetectados.push(colorNorm);
    }
  }
  const color = coloresDetectados.length > 0
    ? coloresDetectados.join(' ').slice(0, 30)
    : undefined;

  // 6. Modelo (limpiando la marca y palabras genéricas para extraer el modelo comercial)
  let modeloBase = texto;
  if (patronMarcaUsado) {
    modeloBase = modeloBase.replace(patronMarcaUsado, ' ');
  }
  modeloBase = modeloBase
    .replace(/\bBICICLETAS?\b/gi, ' ')
    .replace(/\bROD(?:ADO)?[.,\s:=-]*(?:12|14|16|18|20|24|26|27[.,]5|28|29|700)\b/gi, ' ')
    .replace(/\bR\s*-?\s*(?:12|14|16|18|20|24|26|27[.,]5|28|29)\b/gi, ' ')
    .replace(/\b(?:NI[NÑ][OA]S?\/?[AO]?|NEN[AE]S?|VAR[OÓ]N|DAMA|LADY|HOMBRE|MUJER|INFANTIL)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,/-]+|[\s,/-]+$/g, '')
    .trim();
  const modelo = modeloBase.length >= 1 ? modeloBase.slice(0, 50) : undefined;

  return { marca, modelo, rodado, talle, color, genero };
}

const inferirTipoPorNombreHoja = (nombreHoja: string, nombreArchivo = ''): string => {
  const n = normalizarTextoClave(nombreHoja);
  if (n.includes('indum') || n.includes('acces')) return 'accesorio';
  if (n.includes('bici')) return 'bicicleta';
  const esHojaGenerica = /^(hoja|sheet)\d*$/.test(n);
  if (esHojaGenerica && normalizarTextoClave(nombreArchivo).includes('bici')) {
    return 'bicicleta';
  }
  return 'repuesto';
};

const redondear2 = (n: number): number => Math.round(n * 100) / 100;

/** Extrae tabla de cotizaciones por proveedor (ej. PERETTI -> 1785) de filas superiores de una planilla. */
function extraerCotizacionesSuperiores(rows: unknown[][], hastaFila: number, mapa: Map<string, CotizacionProveedorInput>): void {
  const palabrasIgnorar = new Set([
    'costo', 'valor', 'tipo_de_cambio', 'producto', 'articulo', 'proveedor',
    'valor_de_venta', 'reventa', 'importados', 'cargar_dolar_oficial_venta_lista_iva'
  ]);

  for (let r = 0; r < hastaFila; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length - 1; c++) {
      const texto = String(row[c] ?? '').trim();
      const valNum = parsearNumeroFlexible(row[c + 1]);
      const norm = normalizarTextoClave(texto);
      // Cotizaciones válidas de dólar (evitando fechas seriales de Excel > 30000)
      if (texto.length >= 2 && !palabrasIgnorar.has(norm) && !/^\d+$/.test(texto) && Number.isFinite(valNum) && valNum >= 50 && valNum < 30000) {
        if (!mapa.has(norm)) {
          mapa.set(norm, {
            nombre_proveedor: texto,
            cotizacion_dolar: redondear2(valNum)
          });
        }
      }
    }
  }
}

function buscarIndiceColumna(headers: string[], aliases: string[], excluirIndices?: Set<number>): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h, i) => !excluirIndices?.has(i) && h === alias);
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const idx = headers.findIndex((h, i) => !excluirIndices?.has(i) && h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

const SUBHEADERS_CONOCIDOS = new Set([
  'valor_en_dolares', 'valor_dolares', 'valor_dolar', 'costo_usd', 'costo_dolares',
  'valor_en_pesos', 'valor_pesos', 'costo_pesos', 'costo_ars',
  'valor_publico', 'valor_al_publico', 'precio_publico', 'precio_venta',
  'valor_reventa', 'precio_reventa', 'ganancia', 'porcentaje_ganancia',
  'porcentaje_reventa', 'porc_reventa'
]);

function parsearHojaMatriz(
  rows: unknown[][],
  nombreHoja: string,
  monedaDefault: 'ARS' | 'USD',
  cotizacionesMap: Map<string, CotizacionProveedorInput>,
  stockFallback = 0,
  nombreArchivo = ''
): ItemCargaMasivaInput[] {
  if (rows.length === 0) return [];

  // 1. Buscar la fila real de encabezados (hasta fila 30)
  let headerIdx = -1;
  const maxScan = Math.min(rows.length, 30);
  for (let r = 0; r < maxScan; r++) {
    const normas = (rows[r] || []).map(c => normalizarTextoClave(String(c ?? '')));
    const tieneProducto = normas.some(n => ['producto', 'nombre', 'descripcion', 'item', 'articulo'].includes(n));
    const siguienteNormas = (rows[r + 1] || []).map(c => normalizarTextoClave(String(c ?? '')));
    const combinadas = [...normas, ...siguienteNormas];
    const tieneColumnaClave = combinadas.some(n =>
      [
        'proveedor', 'precio', 'precio_venta', 'precio_publico', 'precio_ars', 'precio_pesos',
        'precio_lista', 'precio_contado', 'pvp', 'valor_publico', 'valor_al_publico',
        'valor_en_dolares', 'valor_dolares', 'valor_en_pesos', 'valor_pesos', 'costo_pesos',
        'precio_usd', 'importe', 'valor', 'codigo', 'cod', 'sku'
      ].includes(n)
    );
    if (tieneProducto && tieneColumnaClave) {
      headerIdx = r;
      break;
    }
  }

  if (headerIdx === -1) return [];

  // 2. Extraer cotizaciones por proveedor encima del encabezado
  extraerCotizacionesSuperiores(rows, headerIdx, cotizacionesMap);

  // 3. Combinar encabezado principal + sub-encabezado sin pisar columnas clave (ej. CODIGO, PRODUCTO)
  const filaH1 = (rows[headerIdx] || []).map(c => normalizarTextoClave(String(c ?? '')));
  const filaH2 = (rows[headerIdx + 1] || []).map(c => normalizarTextoClave(String(c ?? '')));
  const tieneSubHeader = filaH2.some(n => SUBHEADERS_CONOCIDOS.has(n));

  const maxCols = Math.max(filaH1.length, filaH2.length);
  const headersCombinados: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    const h1 = filaH1[c] || '';
    const h2 = filaH2[c] || '';
    if (tieneSubHeader && h2 && (SUBHEADERS_CONOCIDOS.has(h2) || !h1)) {
      headersCombinados.push(h2);
    } else {
      headersCombinados.push(h1);
    }
  }

  const startDataIdx = tieneSubHeader ? headerIdx + 2 : headerIdx + 1;
  const tipoDefaultHoja = inferirTipoPorNombreHoja(nombreHoja, nombreArchivo);
  const hojaNorm = normalizarTextoClave(nombreHoja);
  const archivoNorm = normalizarTextoClave(nombreArchivo);
  const esContextoSoloRepuestos =
    archivoNorm.includes('repuesto') ||
    ['comunes', 'especiales', 'cubiertas', 'camaras', 'repuestos', 'indumentaria', 'accesorios'].some(k => hojaNorm.includes(k));

  const idxNombre = buscarIndiceColumna(headersCombinados, ['producto', 'nombre', 'descripcion', 'item', 'name', 'articulo']);
  if (idxNombre === -1) return [];

  const colsAsignadas = new Set<number>([idxNombre]);
  const idxId = buscarIndiceColumna(headersCombinados, ['id_producto', 'id'], colsAsignadas);
  if (idxId !== -1) colsAsignadas.add(idxId);

  const idxCodigo = buscarIndiceColumna(
    headersCombinados,
    [
      'codigo', 'cod', 'sku', 'codigo_articulo', 'codigo_producto', 'cod_art', 'cod_prod',
      'codigo_barras', 'codigo_de_barras', 'cod_barra', 'cod_barras', 'barcode', 'ean',
      'plu', 'referencia', 'ref', 'nro_articulo', 'num_articulo', 'codigo_interno',
      'articulo', 'art'
    ],
    colsAsignadas
  );
  if (idxCodigo !== -1) colsAsignadas.add(idxCodigo);

  const idxProveedor = buscarIndiceColumna(headersCombinados, ['proveedor'], colsAsignadas);
  const idxTipo = buscarIndiceColumna(headersCombinados, ['tipo_prod', 'tipo', 'categoria', 'rubro'], colsAsignadas);
  const idxMarca = buscarIndiceColumna(headersCombinados, ['marca', 'fabricante', 'brand'], colsAsignadas);
  const idxModelo = buscarIndiceColumna(headersCombinados, ['modelo', 'model'], colsAsignadas);
  const idxCantidad = buscarIndiceColumna(headersCombinados, ['cantidad', 'stock', 'unidades', 'cant', 'qty'], colsAsignadas);
  const idxStockMin = buscarIndiceColumna(headersCombinados, ['stock_minimo', 'minimo', 'alerta_stock', 'stock_min'], colsAsignadas);
  const idxMoneda = buscarIndiceColumna(headersCombinados, ['moneda', 'currency', 'divisa'], colsAsignadas);

  const colsPrecioUsadas = new Set<number>(colsAsignadas);
  const idxCostoUsd = buscarIndiceColumna(headersCombinados, ['valor_en_dolares', 'valor_dolares', 'valor_dolar', 'costo_usd', 'costo_dolares'], colsPrecioUsadas);
  if (idxCostoUsd !== -1) colsPrecioUsadas.add(idxCostoUsd);

  const idxCostoArs = buscarIndiceColumna(headersCombinados, ['valor_en_pesos', 'valor_pesos', 'costo_pesos', 'costo_ars'], colsPrecioUsadas);
  if (idxCostoArs !== -1) colsPrecioUsadas.add(idxCostoArs);

  const idxPrecioUsd = buscarIndiceColumna(headersCombinados, ['precio_usd', 'usd', 'precio_dolares'], colsPrecioUsadas);
  if (idxPrecioUsd !== -1) colsPrecioUsadas.add(idxPrecioUsd);

  const idxValorReventa = buscarIndiceColumna(headersCombinados, ['valor_reventa', 'precio_reventa', 'reventa'], colsPrecioUsadas);
  if (idxValorReventa !== -1) colsPrecioUsadas.add(idxValorReventa);

  const idxValorPublico = buscarIndiceColumna(
    headersCombinados,
    [
      'valor_publico', 'valor_al_publico', 'valor_contado', 'precio_publico', 'precio_bonif', 'precio_bonificado',
      'precio_neto', 'precio_unitario', 'precio_venta', 'precio_ars', 'precio_pesos',
      'precio_en_pesos', 'precio_contado', 'precio_lista', 'valor_lista', 'pvp', 'precio', 'valor', 'importe', 'price'
    ],
    colsPrecioUsadas
  );

  // Buscar % reventa inmediatamente anterior a valor reventa (en hojas como COMUNES el sub-encabezado puede venir vacío)
  let idxPorcReventa = -1;
  if (idxValorReventa > 0) {
    const hPrev = headersCombinados[idxValorReventa - 1] || '';
    if (hPrev.includes('porc') || hPrev.includes('reventa') || hPrev === '') {
      idxPorcReventa = idxValorReventa - 1;
    }
  }
  if (idxPorcReventa === -1) {
    idxPorcReventa = buscarIndiceColumna(headersCombinados, ['porcentaje_reventa', 'porc_reventa']);
  }

  // Buscar % ganancia inmediatamente anterior a valor público (evitando confundir con % de reventa)
  let idxGanancia = -1;
  if (idxValorPublico > 0) {
    for (let c = idxValorPublico - 1; c >= 0; c--) {
      if (c === idxPorcReventa || c === idxValorReventa) break;
      if (headersCombinados[c].includes('ganancia') || headersCombinados[c].includes('porc')) {
        idxGanancia = c;
        break;
      }
    }
  }
  if (idxGanancia === -1) {
    idxGanancia = buscarIndiceColumna(headersCombinados, ['ganancia', 'porcentaje_ganancia']);
  }

  const idxColor = buscarIndiceColumna(headersCombinados, ['color']);
  const idxRodado = buscarIndiceColumna(headersCombinados, ['rodado']);
  const idxTalle = buscarIndiceColumna(headersCombinados, ['talle', 'talla', 'size']);
  const idxGenero = buscarIndiceColumna(headersCombinados, ['genero', 'sexo']);

  const items: ItemCargaMasivaInput[] = [];

  for (let r = startDataIdx; r < rows.length; r++) {
    const row = rows[r] || [];
    const nombre = String(row[idxNombre] ?? '').trim();
    if (!nombre || nombre.length < 2) continue;

    // Ignorar encabezados repetidos dentro de una misma hoja
    if (normalizarTextoClave(nombre) === 'producto' || normalizarTextoClave(nombre) === 'nombre') continue;

    const proveedorFila = idxProveedor !== -1 ? String(row[idxProveedor] ?? '').trim() : '';
    const costoUsd = idxCostoUsd !== -1 ? parsearNumeroFlexible(row[idxCostoUsd]) : 0;
    const costoArs = idxCostoArs !== -1 ? parsearNumeroFlexible(row[idxCostoArs]) : 0;
    const precioUsdDirecto = idxPrecioUsd !== -1 ? parsearNumeroFlexible(row[idxPrecioUsd]) : 0;
    const valorPublico = idxValorPublico !== -1 ? parsearNumeroFlexible(row[idxValorPublico]) : 0;
    const gananciaRaw = idxGanancia !== -1 ? parsearNumeroFlexible(row[idxGanancia]) : 0;
    const valorReventaRaw = idxValorReventa !== -1 ? parsearNumeroFlexible(row[idxValorReventa]) : 0;
    const porcReventaRaw = idxPorcReventa !== -1 && row[idxPorcReventa] !== null && row[idxPorcReventa] !== undefined && String(row[idxPorcReventa]).trim() !== ''
      ? parsearNumeroFlexible(row[idxPorcReventa])
      : -1;

    // Filtrar filas separadoras de sección (ej. "IMPORTADOS", "CUADROS") o notas sin precio válido
    const tienePrecioValido = valorPublico > 0 || costoArs > 0 || precioUsdDirecto > 0 || (costoUsd > 0 && proveedorFila.length > 0);
    if (!tienePrecioValido) continue;

    const tipoExplicito = idxTipo !== -1 ? String(row[idxTipo] ?? '').trim() : '';
    const tipo_prod = tipoExplicito
      ? normalizarTipoProducto(tipoExplicito, tipoDefaultHoja)
      : inferirTipoProductoFila(nombre, tipoDefaultHoja, !esContextoSoloRepuestos);

    let nombreFinal = nombre;
    if (hojaNorm.includes('cubierta') && !/\bcubiertas?\b/i.test(nombreFinal)) {
      nombreFinal = `Cubierta ${nombreFinal}`;
    } else if (hojaNorm.includes('camara') && !/\bc[aá]maras?\b/i.test(nombreFinal)) {
      nombreFinal = `Cámara ${nombreFinal}`;
    }
    const idRaw = idxId !== -1 ? Number(row[idxId]) : undefined;
    const codigoCol = idxCodigo !== -1
      ? String(row[idxCodigo] ?? '').trim()
      : (idxNombre > 0 && !headersCombinados[0] ? String(row[0] ?? '').trim() : '');
    const codigo = codigoCol;
    const marca = idxMarca !== -1 ? String(row[idxMarca] ?? '').trim() : '';
    const modelo = idxModelo !== -1 ? String(row[idxModelo] ?? '').trim() : '';
    const cantidad = idxCantidad !== -1 ? Math.max(0, Math.trunc(parsearNumeroFlexible(row[idxCantidad]))) : stockFallback;
    const stock_minimo = idxStockMin !== -1 ? Math.max(0, Math.trunc(parsearNumeroFlexible(row[idxStockMin]))) : 0;

    const monedaRaw = idxMoneda !== -1 ? String(row[idxMoneda] ?? '').trim().toUpperCase() : '';
    const monedaExplicitaUsd = monedaRaw.includes('USD') || monedaRaw.includes('U$S') || monedaRaw.includes('DOLAR');
    const monedaExplicitaArs = monedaRaw.includes('ARS') || monedaRaw.includes('PESO') || monedaRaw === '$';
    let monedaFinal: 'ARS' | 'USD' = monedaExplicitaUsd ? 'USD' : (monedaExplicitaArs ? 'ARS' : monedaDefault);

    const gananciaFactor = gananciaRaw > 0
      ? (gananciaRaw > 10 ? Math.round((gananciaRaw / 100) * 10000) / 10000 : Math.round(gananciaRaw * 10000) / 10000)
      : 0;
    const precioArsBase = valorPublico > 0
      ? valorPublico
      : (costoArs > 0 ? (gananciaFactor > 0 ? costoArs * (1 + gananciaFactor) : costoArs) : 0);

    let precioArsFinal = precioArsBase > 0 ? redondear2(precioArsBase) : 0;
    let precioUsdFinal: number | undefined = undefined;
    let costoUsdFinal: number | undefined = undefined;
    let gananciaFinal: number | undefined = undefined;
    let porcentajeReventaFinal: number | undefined = undefined;
    let precioReventaArsFinal: number | undefined = undefined;
    let precioReventaUsdFinal: number | undefined = undefined;

    if (porcReventaRaw >= 0) {
      porcentajeReventaFinal = porcReventaRaw > 10
        ? Math.round((porcReventaRaw / 100) * 10000) / 10000
        : Math.round(porcReventaRaw * 10000) / 10000;
    }

    const usarFlujoCostoUsd =
      costoUsd > 0 &&
      !monedaExplicitaArs &&
      (monedaExplicitaUsd || monedaDefault === 'USD' || precioArsBase <= 0);

    if (usarFlujoCostoUsd) {
      monedaFinal = 'USD';
      costoUsdFinal = redondear2(costoUsd);
      gananciaFinal = gananciaFactor;

      const cotProv = proveedorFila ? cotizacionesMap.get(normalizarTextoClave(proveedorFila))?.cotizacion_dolar : undefined;
      const dolarEfectivo = cotProv || (costoArs > 0 ? costoArs / costoUsd : 0);

      if (valorPublico > 0 && dolarEfectivo > 0) {
        precioUsdFinal = redondear2(valorPublico / dolarEfectivo);
        precioArsFinal = redondear2(valorPublico);
      } else {
        precioUsdFinal = redondear2(costoUsd * (1 + gananciaFinal));
        precioArsFinal = dolarEfectivo > 0 ? redondear2(precioUsdFinal * dolarEfectivo) : redondear2(precioArsBase);
      }

      if (porcentajeReventaFinal !== undefined) {
        precioReventaUsdFinal = redondear2(costoUsd * (1 + porcentajeReventaFinal));
        precioReventaArsFinal = valorReventaRaw > 0
          ? redondear2(valorReventaRaw)
          : (dolarEfectivo > 0 ? redondear2(precioReventaUsdFinal * dolarEfectivo) : undefined);
      } else if (valorReventaRaw > 0 && dolarEfectivo > 0) {
        precioReventaArsFinal = redondear2(valorReventaRaw);
        precioReventaUsdFinal = redondear2(valorReventaRaw / dolarEfectivo);
      }
    } else if (precioUsdDirecto > 0 && !monedaExplicitaArs) {
      monedaFinal = 'USD';
      precioUsdFinal = redondear2(precioUsdDirecto);
      if (valorReventaRaw > 0) {
        precioReventaArsFinal = redondear2(valorReventaRaw);
      }
    } else if (monedaFinal === 'USD' && precioArsBase > 0) {
      precioUsdFinal = redondear2(precioArsBase);
      precioArsFinal = 0;
      if (valorReventaRaw > 0) {
        precioReventaUsdFinal = redondear2(valorReventaRaw);
      }
    } else {
      if (monedaExplicitaArs && costoUsd > 0) {
        costoUsdFinal = redondear2(costoUsd);
      }
      if (gananciaFactor > 0) {
        gananciaFinal = gananciaFactor;
      }
      if (valorReventaRaw > 0) {
        precioReventaArsFinal = redondear2(valorReventaRaw);
      }
    }

    const esBici = tipo_prod === 'bicicleta';
    const attrs = extraerAtributosDesdeDescripcion(nombre, esBici);
    const marcaFinal = marca || attrs.marca || '';
    const modeloFinal = modelo || attrs.modelo || '';
    const colorRaw = idxColor !== -1 && row[idxColor] ? String(row[idxColor]).trim() : '';
    const rodadoRaw = idxRodado !== -1 && row[idxRodado] ? String(row[idxRodado]).trim() : '';
    const talleRaw = idxTalle !== -1 && row[idxTalle] ? String(row[idxTalle]).trim() : '';
    const generoRaw = idxGenero !== -1 && row[idxGenero] ? String(row[idxGenero]).trim() : '';

    items.push({
      id_producto: idRaw && Number.isInteger(idRaw) && idRaw > 0 ? idRaw : undefined,
      codigo: codigo ? codigo.slice(0, 50) : undefined,
      nombre: nombreFinal.slice(0, 100),
      tipo_prod,
      marca: marcaFinal.slice(0, 50),
      modelo: modeloFinal.slice(0, 50),
      nombre_proveedor: proveedorFila ? proveedorFila.slice(0, 70) : undefined,
      cantidad,
      stock_minimo,
      precio: precioArsFinal,
      precio_usd: precioUsdFinal,
      costo_usd: costoUsdFinal,
      porcentaje_ganancia: gananciaFinal,
      porcentaje_reventa: porcentajeReventaFinal,
      precio_reventa: precioReventaArsFinal,
      precio_reventa_usd: precioReventaUsdFinal,
      moneda: monedaFinal,
      color: (colorRaw || (esBici ? attrs.color : '') || '').slice(0, 30) || undefined,
      rodado: (rodadoRaw || (esBici ? attrs.rodado : '') || '').slice(0, 20) || undefined,
      talle: (talleRaw || (esBici ? attrs.talle : '') || '').slice(0, 20) || undefined,
      genero: esBici ? (generoRaw ? normalizarGenero(generoRaw) : (attrs.genero || 'unisex')) : undefined
    });
  }

  return items;
}

async function parsearExcelOCsv(
  file: File,
  formato: 'xlsx' | 'csv',
  monedaDefault: 'ARS' | 'USD',
  stockFallback = 0
): Promise<ResultadoParseoArchivo> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo no contiene ninguna hoja de datos.');
  }

  const cotizacionesMap = new Map<string, CotizacionProveedorInput>();
  const allItems: ItemCargaMasivaInput[] = [];
  const hojasProcesadas: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const parsed = parsearHojaMatriz(rows, sheetName, monedaDefault, cotizacionesMap, stockFallback, file.name);
    if (parsed.length > 0) {
      hojasProcesadas.push(sheetName);
      allItems.push(...parsed);
    }
  }

  if (allItems.length === 0) {
    throw new Error('No se encontraron productos válidos en ninguna hoja. Verificá que exista una columna "PRODUCTO" o "NOMBRE" junto a "PRECIO" o "VALOR".');
  }

  const advertencias: string[] = [];
  if (hojasProcesadas.length > 1) {
    advertencias.push(`Se leyeron ${hojasProcesadas.length} hojas (${hojasProcesadas.join(', ')}) con ${allItems.length} productos.`);
  }
  if (cotizacionesMap.size > 0) {
    advertencias.push(`Se detectaron ${cotizacionesMap.size} cotización(es) de dólar propias por proveedor desde la planilla.`);
  }

  return {
    formato,
    items: allItems,
    cotizacionesProveedores: Array.from(cotizacionesMap.values()),
    hojasProcesadas,
    advertencias
  };
}

interface PdfTextToken {
  str: string;
  x: number;
  y: number;
  width: number;
}

type RolColumnaPdf = 'codigo' | 'cantidad' | 'descripcion' | 'precio' | 'precio_bonif' | 'total' | 'moneda' | 'otro';

interface ColumnaHeaderPdf {
  rol: RolColumnaPdf;
  norm: string;
  xInicio: number;
  xFin: number;
}

const clasificarColumnaPdf = (norm: string): RolColumnaPdf => {
  if (['codigo', 'cod', 'sku', 'cod_art', 'cod_prod', 'codigo_articulo'].includes(norm)) return 'codigo';
  if (['cant', 'cantidad', 'unidades', 'qty', 'unid'].includes(norm)) return 'cantidad';
  if (['descripcion', 'producto', 'nombre', 'articulo', 'detalle', 'item'].includes(norm)) return 'descripcion';
  if (['precio_bonif', 'precio_bonificado', 'precio_neto', 'bonif', 'p_bonif'].includes(norm)) return 'precio_bonif';
  if (['precio', 'precio_unitario', 'p_unit', 'valor', 'price'].includes(norm)) return 'precio';
  if (['total', 'importe', 'subtotal'].includes(norm)) return 'total';
  if (['moneda', 'divisa'].includes(norm)) return 'moneda';
  return 'otro';
};

const agruparTokensEnCeldas = (linea: PdfTextToken[], gapMinimo: number): Array<{ text: string; xInicio: number; xFin: number }> => {
  const ordenada = [...linea].sort((a, b) => a.x - b.x);
  const celdas: Array<{ text: string; xInicio: number; xFin: number }> = [];
  let text = '';
  let xInicio = 0;
  let xFin = -1;

  for (const tok of ordenada) {
    if (xFin === -1) {
      text = tok.str;
      xInicio = tok.x;
      xFin = tok.x + tok.width;
    } else {
      const gap = tok.x - xFin;
      if (gap > gapMinimo) {
        celdas.push({ text: text.trim(), xInicio, xFin });
        text = tok.str;
        xInicio = tok.x;
        xFin = tok.x + tok.width;
      } else {
        text += ` ${tok.str}`;
        xFin = Math.max(xFin, tok.x + tok.width);
      }
    }
  }
  if (text.trim()) {
    celdas.push({ text: text.trim(), xInicio, xFin });
  }
  return celdas;
};

const esNumeroDecimalFactura = (texto: string): boolean => /^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:[.,]\d{1,2})?$/.test(texto.trim());

const detectarProveedorPdf = (lineasPagina1: PdfTextToken[][]): string | undefined => {
  const textoCabecera = lineasPagina1
    .slice(0, 15)
    .map(l => l.map(t => t.str).join(' '))
    .join(' ');
  if (/bici\s*peretti/i.test(textoCabecera)) return 'PERETTI';
  return undefined;
};

const convertirFechaArgAIso = (ddmmyyyy: string): string | undefined => {
  const m = ddmmyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
};

/** Extrae número de factura, fecha, vencimiento y total final desde las páginas de un PDF. */
export function extraerDatosFacturaPdf(paginasLineas: PdfTextToken[][][]): FacturaDetectadaPdf | undefined {
  if (paginasLineas.length === 0) return undefined;

  const textoP1 = paginasLineas[0]
    .slice(0, 22)
    .map(l => [...l].sort((a, b) => a.x - b.x).map(t => t.str).join(' '))
    .join('\n');

  const resultado: FacturaDetectadaPdf = {};

  // 1. Número de factura (ej. "Nº 0015-00081166" o "0015-00081165")
  const matchNum =
    textoP1.match(/N[º°o]\s*[:.]?\s*(\d{4,5}-\d{6,8})/i) ||
    textoP1.match(/\b(\d{4,5}-\d{6,8})\b/);
  if (matchNum && matchNum[1]) {
    resultado.numero = matchNum[1].trim();
  }

  // 2. Fecha de emisión (ej. "Fecha: 16/11/2026")
  const matchFecha = textoP1.match(/Fecha\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (matchFecha && matchFecha[1]) {
    resultado.fecha = matchFecha[1].trim();
  }

  // 3. Fecha de vencimiento (ej. "Fecha Vencimiento 16/12/2026")
  const matchVto = textoP1.match(/Fecha\s+Vencimiento\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (matchVto && matchVto[1]) {
    resultado.fecha_vencimiento = convertirFechaArgAIso(matchVto[1].trim());
  }

  // 4. Total final de la factura en la última página (debajo de la línea de TOTAL:)
  const ultimaPagina = paginasLineas[paginasLineas.length - 1];
  const idxLineaTotalHeader = ultimaPagina.findIndex(l => {
    const t = l.map(x => x.str).join(' ').toUpperCase();
    return t.includes('TOTAL:') && (t.includes('SUB TOTAL') || t.includes('I.V.A') || t.includes('IVA'));
  });

  if (idxLineaTotalHeader !== -1) {
    for (let i = idxLineaTotalHeader; i < Math.min(ultimaPagina.length, idxLineaTotalHeader + 6); i++) {
      const textoLinea = ultimaPagina[i].map(t => t.str).join(' ').trim();
      const matchMonedaMonto = textoLinea.match(/(?:^|[\s:])(ARS|USD|U\$S|\$)\s*([\d.,]+)/i);
      if (matchMonedaMonto && matchMonedaMonto[2]) {
        const val = parsearNumeroFlexible(matchMonedaMonto[2]);
        if (val > 0) {
          resultado.total = redondear2(val);
          resultado.moneda = /USD|U\$S/i.test(matchMonedaMonto[1]) ? 'USD' : 'ARS';
          break;
        }
      }
    }
  }

  // Fallback si el total está en la misma línea que "TOTAL:" (otras facturas)
  if (!resultado.total) {
    for (let i = ultimaPagina.length - 1; i >= 0; i--) {
      const textoLinea = ultimaPagina[i].map(t => t.str).join(' ').trim();
      const matchTotalInline = textoLinea.match(/\bTOTAL\s*:?\s*(ARS|USD|U\$S|\$)?\s*([\d.,]+)/i);
      if (matchTotalInline && matchTotalInline[2]) {
        const val = parsearNumeroFlexible(matchTotalInline[2]);
        if (val > 0) {
          resultado.total = redondear2(val);
          resultado.moneda = matchTotalInline[1] && /USD|U\$S/i.test(matchTotalInline[1]) ? 'USD' : 'ARS';
          break;
        }
      }
    }
  }

  if (!resultado.numero && !resultado.fecha && !resultado.total) {
    return undefined;
  }
  return resultado;
}

/**
 * Parsea facturas y listas de precios PDF con encabezados de columnas (ej. CODIGO | CANT. | DESCRIPCION | PRECIO | PRECIO BONIF. | TOTAL),
 * respetando páginas múltiples, descripciones multilínea y filtrando líneas de transporte y totales.
 */
export function parsearFacturaPdfEstructurada(
  paginasLineas: PdfTextToken[][][],
  monedaDefault: 'ARS' | 'USD'
): { items: ItemCargaMasivaInput[]; proveedorDetectado?: string; duplicadosConsolidados: number } {
  const items: ItemCargaMasivaInput[] = [];
  const proveedorDetectado = paginasLineas.length > 0 ? detectarProveedorPdf(paginasLineas[0]) : undefined;

  for (const lineas of paginasLineas) {
    // 1. Buscar fila de encabezado de tabla en esta página
    let headerIdx = -1;
    let columnasHeader: ColumnaHeaderPdf[] = [];

    for (let i = 0; i < lineas.length; i++) {
      const celdas = agruparTokensEnCeldas(lineas[i], 6);
      if (celdas.length < 3) continue;
      const cols: ColumnaHeaderPdf[] = celdas.map(c => {
        const norm = normalizarTextoClave(c.text);
        return { rol: clasificarColumnaPdf(norm), norm, xInicio: c.xInicio, xFin: c.xFin };
      });
      const tieneDesc = cols.some(c => c.rol === 'descripcion');
      const tienePrecioOCant = cols.some(c => c.rol === 'precio' || c.rol === 'precio_bonif' || c.rol === 'cantidad');
      if (tieneDesc && tienePrecioOCant) {
        headerIdx = i;
        columnasHeader = cols;
        break;
      }
    }

    if (headerIdx === -1) continue;

    const colCodigo = columnasHeader.find(c => c.rol === 'codigo');
    const colCant = columnasHeader.find(c => c.rol === 'cantidad');
    const colDesc = columnasHeader.find(c => c.rol === 'descripcion');
    const idxCodigoCol = columnasHeader.findIndex(c => c.rol === 'codigo');
    const idxCantCol = columnasHeader.findIndex(c => c.rol === 'cantidad');
    const idxDescCol = columnasHeader.findIndex(c => c.rol === 'descripcion');
    const idxPrecioCol = columnasHeader.findIndex(c => c.rol === 'precio');
    const idxPrecioBonifCol = columnasHeader.findIndex(c => c.rol === 'precio_bonif');
    const idxTotalCol = columnasHeader.findIndex(c => c.rol === 'total');

    let ultimoItemPagina: ItemCargaMasivaInput | null = null;
    let ultimaYPagina = 0;

    for (let i = headerIdx + 1; i < lineas.length; i++) {
      const linea = lineas[i];
      const yActual = linea[0]?.y ?? 0;
      const textoCompleto = linea.map(t => t.str).join(' ').trim();
      const textoUpper = textoCompleto.toUpperCase();

      // Saltar "Transporte:" al inicio o fin de página
      if (/^TRANSPORTE\s*:/i.test(textoCompleto)) {
        ultimoItemPagina = null;
        continue;
      }

      // Cortar al llegar al pie de factura (totales, impuestos, observaciones, CAE, pie de impresión)
      if (
        /\b(SUB\s*TOTAL|SUBTOTAL|IMP\.\s*INTERNOS|PERCEPCI[OÓ]N|SON\s+PESOS|OBSERVACIONES:|CAE:|IMPRESO\s+POR)\b/i.test(textoUpper) ||
        /^\d{5}[A-Z]{2}\d+;/.test(textoCompleto)
      ) {
        break;
      }

      const celdasBrutas = agruparTokensEnCeldas(linea, 3);
      if (celdasBrutas.length === 0) continue;

      // Detectar continuación de descripción en una segunda línea (solo texto debajo de DESCRIPCION, sin montos)
      if (
        ultimoItemPagina &&
        colDesc &&
        celdasBrutas.length <= 2 &&
        ultimaYPagina - yActual > 0 &&
        ultimaYPagina - yActual <= 18
      ) {
        const inicioLinea = celdasBrutas[0].xInicio;
        const limiteIzqDesc = colCant ? colCant.xFin + 2 : (colCodigo ? colCodigo.xFin + 10 : 100);
        const limiteDerDesc = columnasHeader.find(c => c.rol === 'precio' || c.rol === 'precio_bonif' || c.rol === 'total')?.xInicio ?? 340;
        const soloTextoDesc =
          inicioLinea >= limiteIzqDesc &&
          celdasBrutas[celdasBrutas.length - 1].xInicio < limiteDerDesc &&
          !esNumeroDecimalFactura(textoCompleto);

        if (soloTextoDesc) {
          ultimoItemPagina.nombre = `${ultimoItemPagina.nombre} ${textoCompleto}`.replace(/\s+/g, ' ').trim().slice(0, 100);
          ultimaYPagina = yActual;
          continue;
        }
      }

      // Separar tokens de moneda sueltos (ARS / USD / U$S) para no correr los índices de columnas
      let monedaFila: 'ARS' | 'USD' = monedaDefault;
      const celdas: Array<{ text: string; xInicio: number; xFin: number }> = [];
      for (const c of celdasBrutas) {
        const up = c.text.trim().toUpperCase();
        if (up === 'ARS' || up === 'PESOS') {
          monedaFila = 'ARS';
        } else if (up === 'USD' || up === 'U$S' || up === 'US$') {
          monedaFila = 'USD';
        } else {
          celdas.push(c);
        }
      }

      if (celdas.length < 2) continue;

      let codigoVal = '';
      let cantRaw = '';
      let descVal = '';
      let precioVal = 0;
      let precioBonifVal = 0;
      let totalVal = 0;

      if (celdas.length === columnasHeader.length) {
        // Mapeo directo 1 a 1 cuando coinciden todas las columnas
        codigoVal = idxCodigoCol !== -1 ? celdas[idxCodigoCol].text : '';
        cantRaw = idxCantCol !== -1 ? celdas[idxCantCol].text : '';
        descVal = idxDescCol !== -1 ? celdas[idxDescCol].text : '';
        precioVal = idxPrecioCol !== -1 ? parsearNumeroFlexible(celdas[idxPrecioCol].text) : 0;
        precioBonifVal = idxPrecioBonifCol !== -1 ? parsearNumeroFlexible(celdas[idxPrecioBonifCol].text) : 0;
        totalVal = idxTotalCol !== -1 ? parsearNumeroFlexible(celdas[idxTotalCol].text) : 0;
      } else {
        // Mapeo por posición X usando las columnas del header
        for (const c of celdas) {
          let mejorCol = columnasHeader[0];
          let mejorDist = Infinity;
          for (const col of columnasHeader) {
            const centroCol = (col.xInicio + col.xFin) / 2;
            const centroCelda = (c.xInicio + c.xFin) / 2;
            const dist = Math.abs(centroCol - centroCelda);
            if (dist < mejorDist) {
              mejorDist = dist;
              mejorCol = col;
            }
          }
          if (mejorCol.rol === 'codigo') codigoVal = codigoVal ? `${codigoVal} ${c.text}` : c.text;
          else if (mejorCol.rol === 'cantidad') cantRaw = c.text;
          else if (mejorCol.rol === 'descripcion') descVal = descVal ? `${descVal} ${c.text}` : c.text;
          else if (mejorCol.rol === 'precio') precioVal = parsearNumeroFlexible(c.text);
          else if (mejorCol.rol === 'precio_bonif') precioBonifVal = parsearNumeroFlexible(c.text);
          else if (mejorCol.rol === 'total') totalVal = parsearNumeroFlexible(c.text);
        }
      }

      const nombreLimpio = descVal.replace(/\s+/g, ' ').trim();
      if (nombreLimpio.length < 2) continue;

      const cantidadNum = cantRaw && esNumeroDecimalFactura(cantRaw)
        ? Math.max(0, Math.trunc(parsearNumeroFlexible(cantRaw)))
        : 1;

      const precioUnitario = precioBonifVal > 0
        ? precioBonifVal
        : (precioVal > 0 ? precioVal : (totalVal > 0 && cantidadNum > 0 ? redondear2(totalVal / cantidadNum) : 0));

      if (precioUnitario <= 0) continue;

      const esBici = /\b(bici|bicicleta|mtb\s+r2\d)\b/i.test(nombreLimpio) && !/\b(asiento|cable|caja|cambio|collar|cubierta|eje|freno|horquilla|inflador|maza|pi[nñ]on|pu[nñ]o|luz|candado|carama[nñ]ola|patin|cadena)\b/i.test(nombreLimpio);

      const nuevoItem: ItemCargaMasivaInput = {
        codigo: codigoVal ? codigoVal.trim().slice(0, 50) : undefined,
        nombre: nombreLimpio.slice(0, 100),
        tipo_prod: esBici ? 'bicicleta' : 'repuesto',
        marca: '',
        modelo: '',
        nombre_proveedor: proveedorDetectado,
        cantidad: cantidadNum,
        stock_minimo: 0,
        precio: monedaFila === 'ARS' ? redondear2(precioUnitario) : 0,
        precio_usd: monedaFila === 'USD' ? redondear2(precioUnitario) : undefined,
        moneda: monedaFila,
        genero: esBici ? 'unisex' : undefined
      };

      items.push(nuevoItem);
      ultimoItemPagina = nuevoItem;
      ultimaYPagina = yActual;
    }
  }

  // Completar marca y especificaciones de bicicleta (rodado, talle, color, género)
  // una vez unidas todas las líneas multilínea de cada descripción
  for (const it of items) {
    const esBici = it.tipo_prod === 'bicicleta';
    const attrs = extraerAtributosDesdeDescripcion(it.nombre, esBici);
    if (!it.marca && attrs.marca) {
      it.marca = attrs.marca.slice(0, 50);
    }
    if (esBici) {
      if (!it.rodado && attrs.rodado) it.rodado = attrs.rodado.slice(0, 20);
      if (!it.talle && attrs.talle) it.talle = attrs.talle.slice(0, 20);
      if (!it.color && attrs.color) it.color = attrs.color.slice(0, 30);
      it.genero = attrs.genero || it.genero || 'unisex';
    }
  }

  // Consolidar renglones idénticos de una misma factura (mismo código, descripción, precio y moneda)
  const consolidados: ItemCargaMasivaInput[] = [];
  const indicePorClave = new Map<string, number>();
  let duplicadosConsolidados = 0;

  for (const it of items) {
    if (it.codigo) {
      const clave = `${it.codigo.toLowerCase()}|${it.nombre.toLowerCase()}|${it.moneda}|${it.precio ?? ''}|${it.precio_usd ?? ''}`;
      const idxExist = indicePorClave.get(clave);
      if (idxExist !== undefined) {
        consolidados[idxExist].cantidad = Number(consolidados[idxExist].cantidad || 0) + Number(it.cantidad || 0);
        duplicadosConsolidados++;
        continue;
      }
      indicePorClave.set(clave, consolidados.length);
    }
    consolidados.push(it);
  }

  return { items: consolidados, proveedorDetectado, duplicadosConsolidados };
}

async function parsearPdf(file: File, monedaDefault: 'ARS' | 'USD'): Promise<ResultadoParseoArchivo> {
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const paginasLineas: PdfTextToken[][][] = [];
  const filasExtraidas: string[][] = [];

  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      try {
        const textContent = await page.getTextContent();

        const tokens: PdfTextToken[] = [];
        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            tokens.push({
              str: item.str.trim(),
              x: Number(transform[4]) || 0,
              y: Number(transform[5]) || 0,
              width: Number(item.width) || 0
            });
          }
        }

        tokens.sort((a, b) => b.y - a.y || a.x - b.x);
        const lineas: PdfTextToken[][] = [];
        for (const tok of tokens) {
          const ultimaLinea = lineas[lineas.length - 1];
          if (!ultimaLinea || Math.abs(ultimaLinea[0].y - tok.y) > 4) {
            lineas.push([tok]);
          } else {
            ultimaLinea.push(tok);
          }
        }

        paginasLineas.push(lineas);

        for (const linea of lineas) {
          const celdas = agruparTokensEnCeldas(linea, 8);
          if (celdas.length > 0) {
            filasExtraidas.push(celdas.map(c => c.text));
          }
        }
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdf.destroy().catch(() => {});
  }

  if (filasExtraidas.length === 0) {
    throw new Error('El PDF no contiene texto seleccionable (podría ser una imagen escaneada). Convertilo a Excel/CSV o usá un PDF digital.');
  }

  const advertencias: string[] = [
    'Los archivos PDF pueden variar según el diseño de cada proveedor. Revisá y corregí las filas en la tabla previa antes de confirmar.'
  ];

  const facturaDetectada = extraerDatosFacturaPdf(paginasLineas);
  const estructurado = parsearFacturaPdfEstructurada(paginasLineas, monedaDefault);
  if (estructurado.items.length > 0) {
    if (estructurado.duplicadosConsolidados > 0) {
      advertencias.unshift(`Se agruparon ${estructurado.duplicadosConsolidados} renglón(es) idéntico(s) del mismo código sumando sus cantidades.`);
    }
    if (pdf.numPages > 1) {
      advertencias.unshift(`Se detectaron ${estructurado.items.length} artículo(s) en ${pdf.numPages} páginas de la factura PDF.`);
    }
    return {
      formato: 'pdf',
      items: estructurado.items,
      cotizacionesProveedores: [],
      hojasProcesadas: Array.from({ length: pdf.numPages }, (_, i) => `Pág. ${i + 1}`),
      advertencias,
      proveedorDetectado: estructurado.proveedorDetectado,
      facturaDetectada
    };
  }

  const cotizacionesMap = new Map<string, CotizacionProveedorInput>();
  const itemsPorMatriz = parsearHojaMatriz(filasExtraidas, 'PDF', monedaDefault, cotizacionesMap);
  if (itemsPorMatriz.length > 0) {
    return {
      formato: 'pdf',
      items: itemsPorMatriz,
      cotizacionesProveedores: Array.from(cotizacionesMap.values()),
      hojasProcesadas: ['PDF'],
      advertencias,
      proveedorDetectado: estructurado.proveedorDetectado,
      facturaDetectada
    };
  }

  const itemsFallback: ItemCargaMasivaInput[] = [];
  for (const cols of filasExtraidas) {
    const lineaCompleta = cols.join(' ').trim();
    if (lineaCompleta.length < 4) continue;

    const ultimaCol = cols[cols.length - 1] || '';
    const matchPrecio = ultimaCol.match(/(?:U\$S|USD|\$)?\s*([\d.,]+)$/i);
    if (!matchPrecio) continue;

    const precioDetectado = parsearNumeroFlexible(matchPrecio[1]);
    if (precioDetectado <= 0) continue;

    const esUsd = /USD|U\$S/i.test(lineaCompleta);
    const monedaItem: 'ARS' | 'USD' = esUsd ? 'USD' : monedaDefault;

    let cantidadDetectada = 1;
    let nombreCols = cols.slice(0, -1);
    if (nombreCols.length >= 2 && /^\d{1,5}$/.test(nombreCols[nombreCols.length - 1].trim())) {
      cantidadDetectada = Math.max(0, parseInt(nombreCols[nombreCols.length - 1].trim(), 10));
      nombreCols = nombreCols.slice(0, -1);
    }

    const nombre = nombreCols.join(' ').trim().slice(0, 100);
    if (nombre.length < 2) continue;

    itemsFallback.push({
      nombre,
      tipo_prod: /bici|mtb|rodado|r29|r26/i.test(nombre) ? 'bicicleta' : 'repuesto',
      marca: '',
      modelo: '',
      cantidad: cantidadDetectada,
      stock_minimo: 0,
      precio: monedaItem === 'ARS' ? precioDetectado : 0,
      precio_usd: monedaItem === 'USD' ? precioDetectado : undefined,
      moneda: monedaItem,
      genero: /bici|mtb|rodado|r29|r26/i.test(nombre) ? 'unisex' : undefined
    });
  }

  if (itemsFallback.length === 0) {
    throw new Error('No se pudieron detectar filas con nombre y precio en este PDF. Te recomendamos descargar la plantilla Excel/CSV.');
  }

  return {
    formato: 'pdf',
    items: itemsFallback,
    cotizacionesProveedores: [],
    proveedorDetectado: estructurado.proveedorDetectado,
    facturaDetectada,
    hojasProcesadas: ['PDF'],
    advertencias
  };
}

/** Parsea un archivo .xlsx, .csv o .pdf en un lote estructurado de productos para previsualización. */
export async function parsearArchivoProductos(
  file: File,
  monedaDefault: 'ARS' | 'USD',
  stockFallback = 0
): Promise<ResultadoParseoArchivo> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'xlsx' || ext === 'xls') {
    return parsearExcelOCsv(file, 'xlsx', monedaDefault, stockFallback);
  }
  if (ext === 'csv') {
    return parsearExcelOCsv(file, 'csv', monedaDefault, stockFallback);
  }
  if (ext === 'pdf') {
    return parsearPdf(file, monedaDefault);
  }
  throw new Error('Formato no soportado. Seleccioná un archivo Excel (.xlsx), CSV (.csv) o PDF (.pdf).');
}

/** Genera y descarga una plantilla oficial lista para completar e importar en BikeSystem. */
export function descargarPlantillaImportacion(formato: 'xlsx' | 'csv'): void {
  const filasEjemplo = [
    {
      codigo: '0010487',
      nombre: 'Cadena Shimano HG40 6/7/8v',
      tipo_prod: 'repuesto',
      marca: 'Shimano',
      modelo: 'CN-HG40',
      proveedor: 'SHIMANO',
      cantidad: 10,
      stock_minimo: 3,
      moneda: 'USD',
      precio: 12.5,
      color: '',
      rodado: '',
      talle: '',
      genero: ''
    },
    {
      codigo: 'BICI-VNZ-29M',
      nombre: 'Bicicleta MTB Venzo Loki R29',
      tipo_prod: 'bicicleta',
      marca: 'Venzo',
      modelo: 'Loki',
      proveedor: 'E.PEREYRA',
      cantidad: 2,
      stock_minimo: 1,
      moneda: 'ARS',
      precio: 650000,
      color: 'Negro/Rojo',
      rodado: '29',
      talle: 'M',
      genero: 'unisex'
    },
    {
      codigo: '0016930',
      nombre: 'Casco Urbano Pro',
      tipo_prod: 'accesorio',
      marca: 'Giro',
      modelo: 'Register',
      proveedor: 'INDUBIKE',
      cantidad: 5,
      stock_minimo: 2,
      moneda: 'USD',
      precio: 45,
      color: '',
      rodado: '',
      talle: '',
      genero: ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(filasEjemplo);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  if (formato === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_carga_masiva_bikesystem.csv';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(wb, 'plantilla_carga_masiva_bikesystem.xlsx');
  }
}
