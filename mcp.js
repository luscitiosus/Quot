/*
 * Servidor MCP (Model Context Protocol) de la calculadora de penas.
 * Transporte "Streamable HTTP" sin estado: cada POST a /mcp lleva un mensaje JSON-RPC
 * y recibe la respuesta en JSON. Sin dependencias externas.
 */
'use strict';

const M = require('./motor');
const C = require('./delitos');

const VERSION_PROTOCOLO = '2025-06-18';
const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const ANO = M.ANO;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

function buscarModalidad(id) {
  for (const d of C) for (const m of d.modalidades) if (m.id === id) return { d, m };
  return null;
}

function penasTexto(penas) {
  return penas.map(g => g.map(p => M.fmtPena(p) + (p.cond ? ' [' + p.cond + ']' : '') + (p.fac ? ' [facultativa]' : '') + (p.nota ? ' [' + p.nota + ']' : '')).join(' o ')).join(' + ');
}

// Acepta días (número) o texto tipo "2a6m10d", "18m", "3 años"
function leerDuracion(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.round(v);
  const s = norm(v).replace(/anos?|años?/g, 'a').replace(/mes(es)?/g, 'm').replace(/dias?/g, 'd').replace(/\s+/g, '');
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const d = M.dur(s);
  return d > 0 ? d : null;
}

function opcionesDe(a) {
  a = a || {};
  return {
    ejecucion: a.ejecucion || 'consumado',
    gradosEjecucion: a.grados_ejecucion === 2 ? 2 : 1,
    participacion: a.participacion || 'autor',
    extraneus: !!a.extraneus,
    eximenteIncompleta: a.eximente_incompleta || 0,
    errorProhibicion: a.error_prohibicion || 0,
    atenuantes: (a.atenuantes || []).map(x => typeof x === 'string' ? { id: x, mc: (a.muy_cualificadas || []).indexOf(x) >= 0 } : { id: x.id, mc: !!x.muy_cualificada }),
    agravantes: a.agravantes || [],
    mixta: a.mixta_parentesco || 'no',
    multirreincidencia: !!a.multirreincidencia,
    facultativas: a.aplicar_facultativas !== false,
    gradosRegla2: a.grados_regla_2 === 2 ? 2 : 1,
    compensacion: a.compensacion || 'auto',
    continuado: a.continuado || 'no'
  };
}

function calcularUno(a) {
  const hit = buscarModalidad(a.modalidad_id);
  if (!hit) throw new Error('Modalidad desconocida: "' + a.modalidad_id + '". Use buscar_delitos para obtener el identificador.');
  const res = M.individualizar(hit.m, hit.d, opcionesDe(a));
  const alt = a.alternativa || 0;
  const principal = res.final[0][alt] || res.final[0][0];
  let concreta = null;
  if (principal.t !== 'ppr' && principal.t !== 'multa_prop') {
    concreta = leerDuracion(a.pena_concreta);
    if (concreta == null) concreta = principal.min;
  }
  return { d: hit.d, m: hit.m, res, principal, concreta };
}

function informeUno(x, i) {
  const { d, m, res, principal, concreta } = x;
  const l = [];
  l.push((i != null ? 'DELITO ' + (i + 1) + ': ' : '') + d.nombre + ' — ' + m.nombre + ' (art. ' + m.art + ' CP)');
  l.push('Clase de delito: ' + res.clase + (res.imprudente ? ' (imprudente)' : ''));
  l.push('Recorrido penológico:');
  res.pasos.forEach((p, k) => l.push('  ' + (k + 1) + '. ' + p.titulo + ' [' + p.ref + ']: ' + penasTexto(p.penas)));
  l.push('Marco penal resultante: ' + penasTexto(res.final));
  l.push('Pena principal considerada: ' + M.fmtPena(principal));
  if (res.avisos.length) { l.push('Avisos:'); res.avisos.forEach(a => l.push('  - ' + a)); }
  const pd = M.prescripcionDelito(m.penas, { prescripcionAnual: d.prescripcionAnual });
  l.push('Prescripción del delito: ' + pd.anos + ' años (' + pd.motivo + ')');
  if (principal.t === 'ppr') {
    l.push('Pena concreta: prisión permanente revisable. ' + M.accesorias(0, true));
  } else if (concreta != null) {
    l.push('Pena concreta: ' + M.TIPOS[principal.t].nombre + ' de ' + M.fmtValor(principal.t, concreta) + ' (pena ' + M.claseValor(principal.t, concreta) + ')' +
      (concreta < principal.min || concreta > principal.max ? ' — ATENCIÓN: fuera del marco resultante' : ''));
    const pp = M.prescripcionPena(principal.t, concreta);
    l.push('Prescripción de la pena: ' + pp.anos + ' años (' + pp.motivo + ')');
    const ca = M.cancelacion(principal.t, concreta, res.imprudente);
    l.push('Cancelación de antecedentes: ' + ca.plazo + ' (' + ca.motivo + ')');
    if (principal.t === 'prision') {
      l.push('Penas accesorias: ' + M.accesorias(concreta));
      const s = M.sustitucion712(concreta);
      if (s) l.push(s.texto + ' Equivale a ' + s.multa + ' cuotas de multa, ' + s.tbc + ' jornadas de TBC o ' + s.localizacion + ' días de localización permanente.');
    }
    if (principal.t === 'multa') {
      const q = M.multaCuantia(concreta, 0);
      l.push('Responsabilidad personal subsidiaria si no se paga: ' + M.fmtTiempo(q.subsidiaria) + ' (art. 53.1). Importe = días × cuota (2 a 400 €).');
    }
  }
  return l.join('\n');
}

// ---------------------------------------------------------------------------
// Herramientas
// ---------------------------------------------------------------------------
const PROP_OPCIONES = {
  modalidad_id: { type: 'string', description: 'Identificador de la modalidad, obtenido con buscar_delitos (p. ej. "138.1", "242.1", "180-179.1").' },
  alternativa: { type: 'integer', minimum: 0, description: 'Índice de la pena alternativa elegida dentro del primer grupo (0 = la primera, p. ej. prisión; 1 = multa). Por defecto 0.' },
  ejecucion: { type: 'string', enum: ['consumado', 'tentativa', 'preparatorio'], description: 'Grado de ejecución. "preparatorio" = conspiración, proposición o provocación.' },
  grados_ejecucion: { type: 'integer', enum: [1, 2], description: 'Grados de rebaja por tentativa o actos preparatorios (art. 62).' },
  participacion: { type: 'string', enum: ['autor', 'inductor', 'cooperador', 'complice'] },
  extraneus: { type: 'boolean', description: 'Inductor o cooperador sin la cualidad personal del autor en delito especial (art. 65.3).' },
  eximente_incompleta: { type: 'integer', enum: [0, 1, 2], description: 'Grados de rebaja por eximente incompleta (art. 68).' },
  error_prohibicion: { type: 'integer', enum: [0, 1, 2], description: 'Grados de rebaja por error de prohibición vencible (art. 14.3).' },
  atenuantes: { type: 'array', items: { type: 'string', enum: M.ATENUANTES.map(a => a.id) }, description: 'Atenuantes del art. 21: ' + M.ATENUANTES.map(a => a.id + ' (' + a.art + ')').join(', ') },
  muy_cualificadas: { type: 'array', items: { type: 'string' }, description: 'Atenuantes (de la lista anterior) que se aprecian como muy cualificadas.' },
  agravantes: { type: 'array', items: { type: 'string', enum: M.AGRAVANTES.map(a => a.id) }, description: 'Agravantes del art. 22: ' + M.AGRAVANTES.map(a => a.id + ' (' + a.art + ')').join(', ') },
  mixta_parentesco: { type: 'string', enum: ['no', 'atenuante', 'agravante'], description: 'Circunstancia mixta de parentesco (art. 23).' },
  multirreincidencia: { type: 'boolean', description: 'Tres o más condenas previas del mismo título y naturaleza (art. 66.1.5ª).' },
  aplicar_facultativas: { type: 'boolean', description: 'Aplicar las agravaciones facultativas de las reglas 4ª y 5ª del art. 66.1. Por defecto true.' },
  grados_regla_2: { type: 'integer', enum: [1, 2], description: 'Grados de rebaja con dos o más atenuantes o una muy cualificada (art. 66.1.2ª).' },
  compensacion: { type: 'string', enum: ['auto', 'neutral', 'atenuacion', 'cualif_atenuacion', 'agravacion'], description: 'Resultado de compensar atenuantes y agravantes (art. 66.1.7ª).' },
  continuado: { type: 'string', enum: ['no', '74.1', '74.2-total', '74.2-masa1', '74.2-masa2'], description: 'Delito continuado (74.1) o patrimonial / delito masa (74.2).' },
  pena_concreta: { type: ['string', 'number'], description: 'Pena concreta que se impone dentro del marco (días o texto como "2a6m"). Por defecto, el mínimo del marco resultante.' }
};

const HERRAMIENTAS = [
  {
    name: 'buscar_delitos',
    title: 'Buscar delitos del Código Penal',
    description: 'Busca en el catálogo de delitos del Código Penal español (42 delitos, 228 modalidades) y devuelve el identificador de cada modalidad con su artículo y su pena. Úsala antes de calcular_pena para obtener el modalidad_id.',
    inputSchema: { type: 'object', properties: { consulta: { type: 'string', description: 'Texto o artículo a buscar (p. ej. "robo violencia", "179", "alcohol"). Vacío lista los delitos.' } } },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'calcular_pena',
    title: 'Calcular la pena de un delito',
    description: 'Individualiza la pena de un delito del Código Penal español: aplica grado de ejecución, participación, eximentes incompletas, circunstancias (art. 66), continuidad (art. 74) y devuelve el recorrido penológico, el marco resultante, prescripción, cancelación de antecedentes y penas accesorias.',
    inputSchema: { type: 'object', properties: PROP_OPCIONES, required: ['modalidad_id'] },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'calcular_condena',
    title: 'Calcular una condena con varios delitos',
    description: 'Calcula una condena con uno o varios delitos: concurso real, ideal o medial (arts. 73, 76 y 77), límite de cumplimiento del art. 76, suspensión de la ejecución (art. 80), expulsión (art. 89) y libertad condicional con fechas estimadas (arts. 36 y 90).',
    inputSchema: {
      type: 'object',
      properties: {
        delitos: { type: 'array', minItems: 1, items: { type: 'object', properties: PROP_OPCIONES, required: ['modalidad_id'] }, description: 'Lista de delitos, cada uno con las mismas opciones que calcular_pena.' },
        concurso: { type: 'string', enum: ['real', 'ideal', 'medial'], description: 'Relación entre los delitos. Por defecto real.' },
        primario: { type: 'boolean', description: 'Delinque por primera vez (art. 80.2.1ª). Por defecto true.' },
        responsabilidad_civil: { type: 'boolean', description: 'Ha satisfecho o asume la responsabilidad civil y el decomiso. Por defecto true.' },
        habitual: { type: 'boolean' },
        drogodependencia: { type: 'boolean', description: 'Delinquió por dependencia y está en tratamiento certificado (art. 80.5).' },
        enfermo_grave: { type: 'boolean', description: 'Enfermedad muy grave con padecimientos incurables (art. 80.4).' },
        extranjero: { type: 'boolean' },
        terrorismo: { type: 'boolean' },
        fecha_inicio: { type: 'string', description: 'Fecha de inicio de cumplimiento (AAAA-MM-DD) para estimar fechas.' },
        abono_dias: { type: 'integer', minimum: 0, description: 'Días de prisión preventiva a abonar (art. 58).' }
      },
      required: ['delitos']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'grados_pena',
    title: 'Pena superior e inferior en grado',
    description: 'Calcula, para cualquier marco penal, la pena superior e inferior en uno y dos grados, las mitades y el marco del delito continuado (arts. 70 y 74).',
    inputSchema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['prision', 'multa', 'inhab_especial', 'inhab_absoluta', 'priv_conducir', 'priv_armas', 'tbc'], description: 'Clase de pena. Por defecto prisión.' },
        minimo: { type: ['string', 'number'], description: 'Mínimo (días o texto como "6m", "1a").' },
        maximo: { type: ['string', 'number'], description: 'Máximo (días o texto como "3a").' }
      },
      required: ['minimo', 'maximo']
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }
];

const AVISO = '\n\nCálculo orientativo conforme al Código Penal vigente (BOE-A-1995-25444, incl. LO 1/2026); meses de 30 días y años de 360 (art. 50.4). La individualización final corresponde al tribunal.';

function hBuscar(a) {
  const palabras = norm(a.consulta).split(/\s+/).filter(w => w && ['de', 'del', 'la', 'el', 'con', 'en', 'y', 'o', 'a', 'por', 'art', 'articulo'].indexOf(w) < 0);
  const l = [];
  C.forEach(d => {
    const mods = d.modalidades.filter(m => {
      const texto = norm(d.nombre + ' ' + d.titulo + ' ' + m.nombre + ' art ' + m.art + ' ' + m.id);
      return palabras.every(w => texto.indexOf(w) >= 0);
    });
    if (!mods.length) return;
    l.push('■ ' + d.nombre + ' (' + d.titulo + ')' + (d.imprudente ? ' — imprudente' : ''));
    mods.forEach(m => l.push('  · modalidad_id "' + m.id + '" — art. ' + m.art + ': ' + m.nombre + ' → ' + penasTexto(m.penas)));
  });
  return l.length ? l.join('\n') : 'Sin resultados para "' + a.consulta + '". Pruebe con otra palabra o con el número de artículo.';
}

function hCalcular(a) { return informeUno(calcularUno(a)) + AVISO; }

function hCondena(a) {
  const xs = (a.delitos || []).map(calcularUno);
  if (!xs.length) throw new Error('Indique al menos un delito.');
  const l = xs.map((x, i) => informeUno(x, i));
  const items = xs.map((x, i) => ({
    nombre: 'Delito ' + (i + 1) + ' (art. ' + x.m.art + ')',
    concreta: x.principal.t === 'prision' ? x.concreta : null,
    ppr: x.principal.t === 'ppr',
    maxAbstracto: M.maxPrision(x.m.penas).max,
    rango: x.principal.t === 'prision' ? { min: x.principal.min, max: x.principal.max } : null
  }));
  const tipo = a.concurso || 'real';
  const c = M.concurso(tipo, items, { terrorismo: !!a.terrorismo });
  const r = ['', '=== RESULTADO GLOBAL (concurso ' + c.tipo + ') ==='];
  const priv = items.filter(i => i.concreta != null);
  if (c.ppr) r.push('Pena: prisión permanente revisable.');
  else if (priv.length) {
    if (c.rango) r.push('Marco del concurso: de ' + M.fmtTiempo(c.rango.min) + ' a ' + M.fmtTiempo(c.rango.max) + ' de prisión.');
    r.push('Suma aritmética de prisión: ' + M.fmtTiempo(c.suma));
    if (c.limite && isFinite(c.limite)) r.push('Límite del art. 76: ' + M.fmtTiempo(c.limite));
    r.push('Prisión a cumplir: ' + M.fmtTiempo(c.efectiva));
  } else r.push('No hay penas de prisión.');
  c.notas.forEach(n => r.push('- ' + n));

  const sus = M.suspension({
    penas: priv.map(i => i.concreta), total: c.tipo === 'real' ? c.suma : c.efectiva, ppr: c.ppr,
    leves: xs.every(x => x.res.clase === 'leve'),
    primario: a.primario !== false, respCivil: a.responsabilidad_civil !== false, habitual: !!a.habitual,
    drogodependencia: !!a.drogodependencia, enfermo: !!a.enfermo_grave, extranjero: !!a.extranjero
  });
  r.push('', 'Suspensión y sustitución:');
  sus.forEach(s => r.push('  [' + (s.ok ? 'SÍ' : 'NO') + '] Art. ' + s.art + ': ' + s.texto));

  if (!c.ppr && c.efectiva > 0) {
    const abono = Math.max(0, parseInt(a.abono_dias, 10) || 0);
    const f = a.fecha_inicio && !isNaN(Date.parse(a.fecha_inicio)) ? new Date(a.fecha_inicio + 'T00:00:00') : null;
    const fmtF = dias => f ? ' → ' + M.sumarFecha(f, Math.max(0, dias - abono)).toISOString().slice(0, 10) : '';
    const sexual = xs.some(x => x.d.titulo === 'Contra la libertad sexual');
    r.push('', 'Libertad condicional y tercer grado' + (abono ? ' (abono de ' + abono + ' días)' : '') + ':');
    M.libertadCondicional(c.efectiva, { primario: a.primario !== false, sexual, terrorismo: !!a.terrorismo })
      .forEach(x => r.push('  Art. ' + x.art + ' (' + x.fraccion + '): ' + M.fmtTiempo(x.dias) + fmtF(x.dias) + ' — ' + x.texto));
    r.push('  Licenciamiento definitivo: ' + M.fmtTiempo(c.efectiva) + fmtF(c.efectiva));
  }
  return l.join('\n\n') + '\n' + r.join('\n') + AVISO;
}

function hGrados(a) {
  const t = a.tipo || 'prision';
  const p = { t, min: leerDuracion(a.minimo), max: leerDuracion(a.maximo) };
  if (p.min == null || p.max == null || p.min > p.max) throw new Error('Indique un mínimo y un máximo válidos (mínimo ≤ máximo).');
  const f = x => 'de ' + M.fmtValor(t, x.min) + ' a ' + M.fmtValor(t, x.max) + (x.nota ? ' [' + x.nota + ']' : '');
  return [
    'Pena tipo (' + M.TIPOS[t].nombre + '): ' + f(p),
    'Mitad inferior: ' + f(M.mitadInferior(p)),
    'Mitad superior: ' + f(M.mitadSuperior(p)),
    'Superior en grado: ' + f(M.superior(p)),
    'Superior en dos grados: ' + f(M.grados(p, 2)),
    'Inferior en grado: ' + f(M.inferior(p)),
    'Inferior en dos grados: ' + f(M.grados(p, -2)),
    'Delito continuado (art. 74.1): ' + f(M.continuado(p)),
    'Superior en grado en su mitad inferior (art. 66.1.4ª): ' + f(M.mitadInferior(M.superior(p)))
  ].join('\n') + AVISO;
}

const MANEJADORES = { buscar_delitos: hBuscar, calcular_pena: hCalcular, calcular_condena: hCondena, grados_pena: hGrados };

// ---------------------------------------------------------------------------
// JSON-RPC
// ---------------------------------------------------------------------------
function responder(msg) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return { jsonrpc: '2.0', id: msg && msg.id != null ? msg.id : null, error: { code: -32600, message: 'Petición JSON-RPC no válida' } };
  }
  const esNotificacion = msg.id === undefined || msg.id === null;
  if (esNotificacion) return null;
  const ok = result => ({ jsonrpc: '2.0', id: msg.id, result });
  const p = msg.params || {};

  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: PROTOCOLOS.indexOf(p.protocolVersion) >= 0 ? p.protocolVersion : VERSION_PROTOCOLO,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'calculadora-penas', title: 'Calculadora de penas (Código Penal español)', version: '1.1.0' },
        instructions: 'Calculadora de penas del Código Penal español. Para calcular: 1) buscar_delitos para obtener el modalidad_id; 2) calcular_pena para un delito o calcular_condena para varios delitos, concursos, suspensión y libertad condicional. grados_pena calcula grados y mitades de cualquier marco. Responde en español y recuerda que el cálculo es orientativo.'
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: HERRAMIENTAS });
    case 'tools/call': {
      const fn = MANEJADORES[p.name];
      if (!fn) return { jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Herramienta desconocida: ' + p.name } };
      try {
        return ok({ content: [{ type: 'text', text: fn(p.arguments || {}) }] });
      } catch (e) {
        return ok({ content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true });
      }
    }
    case 'resources/list': return ok({ resources: [] });
    case 'prompts/list': return ok({ prompts: [] });
    default:
      return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Método no soportado: ' + msg.method } };
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id'
};

function manejarMcp(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.method !== 'POST') {
    // Sin flujo SSE iniciado por el servidor (servidor sin estado)
    res.writeHead(405, Object.assign({ Allow: 'POST, OPTIONS' }, CORS));
    return res.end();
  }
  let cuerpo = '';
  req.setEncoding('utf8');
  req.on('data', t => { cuerpo += t; if (cuerpo.length > 1e6) req.destroy(); });
  req.on('end', () => {
    let msg;
    try { msg = JSON.parse(cuerpo); } catch (e) {
      res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, CORS));
      return res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON no válido' } }));
    }
    const salida = Array.isArray(msg) ? msg.map(responder).filter(Boolean) : responder(msg);
    if (salida === null || (Array.isArray(salida) && !salida.length)) {
      res.writeHead(202, CORS);
      return res.end();
    }
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, CORS));
    res.end(JSON.stringify(salida));
  });
}

module.exports = { manejarMcp, responder, HERRAMIENTAS };
