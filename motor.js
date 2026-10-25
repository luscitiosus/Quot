/*
 * Motor de cálculo penológico — Código Penal español (LO 10/1995, texto consolidado vigente).
 * Funciona en el navegador (window.Motor) y en Node (require('./motor')).
 *
 * Unidad interna: días. Siguiendo el art. 50.4 CP, el mes se computa como 30 días
 * y el año como 360 días. El día y el día-multa son indivisibles (art. 70.2).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Motor = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MES = 30, ANO = 360;

  // ---------------------------------------------------------------------------
  // Tipos de pena y sus límites (art. 33 para la gravedad, art. 70.3 para el
  // máximo de la pena superior en grado).
  // ---------------------------------------------------------------------------
  var TIPOS = {
    prision:        { nombre: 'Prisión', unidad: 'tiempo', maxSup: 30 * ANO, privativa: true },
    ppr:            { nombre: 'Prisión permanente revisable', unidad: 'ppr', privativa: true },
    multa:          { nombre: 'Multa', unidad: 'diasmulta', maxSup: 30 * MES },
    multa_prop:     { nombre: 'Multa proporcional', unidad: 'proporcion' },
    tbc:            { nombre: 'Trabajos en beneficio de la comunidad', unidad: 'jornadas' },
    localizacion:   { nombre: 'Localización permanente', unidad: 'dias', privativa: true },
    priv_conducir:  { nombre: 'Privación del derecho a conducir vehículos a motor y ciclomotores', unidad: 'tiempo', maxSup: 15 * ANO },
    priv_armas:     { nombre: 'Privación del derecho a la tenencia y porte de armas', unidad: 'tiempo', maxSup: 20 * ANO },
    inhab_absoluta: { nombre: 'Inhabilitación absoluta', unidad: 'tiempo', maxSup: 30 * ANO },
    inhab_especial: { nombre: 'Inhabilitación especial', unidad: 'tiempo', maxSup: 30 * ANO },
    inhab_patria:   { nombre: 'Inhabilitación especial para patria potestad, tutela, curatela, guarda o acogimiento', unidad: 'tiempo', maxSup: 30 * ANO },
    susp_empleo:    { nombre: 'Suspensión de empleo o cargo público', unidad: 'tiempo', maxSup: 8 * ANO },
    perdida_subv:   { nombre: 'Pérdida de subvenciones y beneficios fiscales o de la Seguridad Social', unidad: 'tiempo' }
  };

  // ---------------------------------------------------------------------------
  // Utilidades de duración
  // ---------------------------------------------------------------------------
  function dur(s) {
    if (typeof s === 'number') return s;
    var total = 0, re = /(\d+(?:\.\d+)?)\s*([adm])/g, m;
    while ((m = re.exec(s))) total += parseFloat(m[1]) * (m[2] === 'a' ? ANO : m[2] === 'm' ? MES : 1);
    return Math.round(total);
  }

  function desglose(d) {
    d = Math.max(0, Math.round(d));
    return { a: Math.floor(d / ANO), m: Math.floor((d % ANO) / MES), d: d % MES };
  }

  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }

  function fmtTiempo(d) {
    var x = desglose(d), partes = [];
    if (x.a) partes.push(plural(x.a, 'año', 'años'));
    if (x.m) partes.push(plural(x.m, 'mes', 'meses'));
    if (x.d || !partes.length) partes.push(plural(x.d, 'día', 'días'));
    if (partes.length === 1) return partes[0];
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }

  function fmtNumero(n) {
    return (Math.round(n * 100) / 100).toLocaleString('es-ES');
  }

  function fmtValor(t, v) {
    var u = (TIPOS[t] || {}).unidad;
    if (u === 'diasmulta') return fmtTiempo(v) + ' (' + v + ' cuotas)';
    if (u === 'jornadas') return plural(v, 'jornada', 'jornadas');
    if (u === 'dias') return plural(v, 'día', 'días');
    if (u === 'proporcion') return fmtProporcion(v);
    return fmtTiempo(v);
  }

  var NOMBRES_PROP = { 1: 'tanto', 2: 'duplo', 3: 'triplo', 4: 'cuádruplo', 5: 'quíntuplo', 6: 'séxtuplo', 10: 'décuplo' };
  function fmtProporcion(v) {
    var r = Math.round(v * 100) / 100;
    return NOMBRES_PROP[r] ? 'el ' + NOMBRES_PROP[r] + ' (×' + fmtNumero(r) + ')' : '×' + fmtNumero(r);
  }

  function fmtPena(p) {
    if (p.t === 'ppr') return TIPOS.ppr.nombre;
    var n = TIPOS[p.t].nombre;
    if (p.t === 'multa_prop') return n + ' del ' + fmtProporcion(p.min).replace(/^el /, '') + ' al ' + fmtProporcion(p.max).replace(/^el /, '') + (p.base ? ' del ' + p.base : '');
    if (p.min === p.max) return n + ' de ' + fmtValor(p.t, p.min);
    return n + ' de ' + fmtValor(p.t, p.min) + ' a ' + fmtValor(p.t, p.max);
  }

  // ---------------------------------------------------------------------------
  // Operaciones penológicas (art. 70)
  // ---------------------------------------------------------------------------
  function copia(p, cambios) {
    var r = {}, k;
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) r[k] = p[k];
    for (k in cambios) if (Object.prototype.hasOwnProperty.call(cambios, k)) r[k] = cambios[k];
    return r;
  }

  // Pena superior en grado (art. 70.1.1ª y 70.3)
  function superior(p) {
    if (p.t === 'ppr') return copia(p, {});
    if (p.t === 'multa_prop') return copia(p, { min: p.max, max: p.max * 1.5 });
    var min = p.max + 1, max = p.max + Math.floor(p.max / 2), lim = TIPOS[p.t].maxSup, nota = p.nota;
    if (lim && max > lim) { max = lim; nota = 'Tope del art. 70.3'; }
    if (min > max) min = max;
    return copia(p, { min: min, max: max, nota: nota });
  }

  // Pena inferior en grado (art. 70.1.2ª, 70.4 y 71.1)
  function inferior(p) {
    if (p.t === 'ppr') return copia(p, { t: 'prision', min: 20 * ANO, max: 30 * ANO, nota: 'Art. 70.4: inferior en grado a la prisión permanente' });
    if (p.t === 'multa_prop') return copia(p, { min: p.min / 2, max: p.min });
    var min = Math.max(1, p.min - Math.floor(p.min / 2));
    var max = Math.max(min, p.min - 1);
    return copia(p, { min: min, max: max });
  }

  function mitad(p) { return (p.min + p.max) / 2; }

  function mitadInferior(p) {
    if (p.t === 'ppr') return copia(p, {});
    if (p.t === 'multa_prop') return copia(p, { max: mitad(p) });
    return copia(p, { max: Math.floor(mitad(p)) });
  }

  function mitadSuperior(p) {
    if (p.t === 'ppr') return copia(p, {});
    if (p.t === 'multa_prop') return copia(p, { min: mitad(p) });
    var m = Math.floor(mitad(p));
    return copia(p, { min: p.max > p.min ? Math.min(m + 1, p.max) : p.min });
  }

  // Art. 74.1: mitad superior, pudiendo llegar hasta la mitad inferior de la pena superior en grado.
  function continuado(p) {
    if (p.t === 'ppr') return copia(p, {});
    return copia(p, { min: mitadSuperior(p).min, max: mitadInferior(superior(p)).max });
  }

  // Art. 432.2 in fine y similares: mitad superior, pudiendo llegar a la superior en grado.
  function mitadSuperiorHastaSuperior(p) {
    if (p.t === 'ppr') return copia(p, {});
    return copia(p, { min: mitadSuperior(p).min, max: superior(p).max });
  }

  function grados(p, n) {
    var r = p, i;
    for (i = 0; i < Math.abs(n); i++) r = n > 0 ? superior(r) : inferior(r);
    return r;
  }

  var OPS = {
    superior: superior,
    inferior: inferior,
    mitadInferior: mitadInferior,
    mitadSuperior: mitadSuperior,
    continuado: continuado,
    mitadSuperiorHastaSuperior: mitadSuperiorHastaSuperior
  };

  function aplicar(penas, fn) {
    return penas.map(function (g) { return g.map(fn); });
  }

  function aplicarGrados(penas, n) {
    return aplicar(penas, function (p) { return grados(p, n); });
  }

  // ---------------------------------------------------------------------------
  // Clasificación de la pena y del delito (arts. 13 y 33)
  // ---------------------------------------------------------------------------
  var CLASES = {
    prision:        [['menos grave', 3 * MES, 5 * ANO], ['grave', 5 * ANO + 1, Infinity], ['menos grave', 0, 3 * MES]],
    multa:          [['leve', 0, 3 * MES], ['menos grave', 3 * MES + 1, Infinity]],
    tbc:            [['leve', 0, 30], ['menos grave', 31, Infinity]],
    localizacion:   [['leve', 0, Infinity]],
    priv_conducir:  [['leve', 0, ANO], ['menos grave', ANO + 1, 8 * ANO], ['grave', 8 * ANO + 1, Infinity]],
    priv_armas:     [['leve', 0, ANO], ['menos grave', ANO + 1, 8 * ANO], ['grave', 8 * ANO + 1, Infinity]],
    inhab_especial: [['menos grave', 0, 5 * ANO], ['grave', 5 * ANO + 1, Infinity]],
    inhab_patria:   [['menos grave', 0, 5 * ANO], ['grave', 5 * ANO + 1, Infinity]],
    susp_empleo:    [['menos grave', 0, 5 * ANO], ['grave', 5 * ANO + 1, Infinity]]
  };
  var ORDEN = { leve: 1, 'menos grave': 2, grave: 3 };

  // Clase de una pena (rango). Art. 13.4: si abarca grave y menos grave, grave;
  // si abarca leve y menos grave, leve.
  function clasePena(p) {
    if (p.t === 'ppr' || p.t === 'inhab_absoluta') return 'grave';
    if (p.t === 'multa_prop') return 'menos grave';
    var tabla = CLASES[p.t];
    if (!tabla) return null;
    var toca = {};
    tabla.forEach(function (c) { if (p.max >= c[1] && p.min <= c[2]) toca[c[0]] = true; });
    if (toca.grave) return 'grave';
    if (toca.leve) return 'leve';
    if (toca['menos grave']) return 'menos grave';
    return null;
  }

  // Clase de una pena concreta (un valor)
  function claseValor(t, v) { return clasePena({ t: t, min: v, max: v }); }

  function claseDelito(penas) {
    var mejor = null;
    penas.forEach(function (g) {
      g.forEach(function (p) {
        if (p.fac || p.cond) return;
        var c = clasePena(p);
        if (c && (!mejor || ORDEN[c] > ORDEN[mejor])) mejor = c;
      });
    });
    return mejor || 'menos grave';
  }

  function maxPrision(penas) {
    var max = 0, ppr = false;
    penas.forEach(function (g) { g.forEach(function (p) {
      if (p.t === 'ppr') ppr = true;
      else if (p.t === 'prision' && p.max > max) max = p.max;
    }); });
    return { max: max, ppr: ppr };
  }

  function maxInhabilitacion(penas) {
    var max = 0;
    penas.forEach(function (g) { g.forEach(function (p) {
      if ((p.t === 'inhab_absoluta' || p.t === 'inhab_especial') && !p.fac && !p.cond && p.max > max) max = p.max;
    }); });
    return max;
  }

  // ---------------------------------------------------------------------------
  // Prescripción (arts. 131 y 133) y cancelación de antecedentes (art. 136)
  // ---------------------------------------------------------------------------
  function prescripcionDelito(penas, opts) {
    opts = opts || {};
    var clase = claseDelito(penas);
    if (opts.prescripcionAnual) return { anos: 1, motivo: 'Art. 131.1: injurias y calumnias prescriben al año' };
    if (clase === 'leve') return { anos: 1, motivo: 'Art. 131.1: delito leve' };
    var pr = maxPrision(penas), inh = maxInhabilitacion(penas);
    if (pr.ppr || pr.max >= 15 * ANO) return { anos: 20, motivo: 'Art. 131.1: pena máxima de prisión de 15 o más años' };
    if (inh > 10 * ANO || (pr.max > 10 * ANO && pr.max < 15 * ANO)) return { anos: 15, motivo: 'Art. 131.1: inhabilitación de más de 10 años o prisión de más de 10 y menos de 15' };
    if (pr.max > 5 * ANO || inh > 5 * ANO) return { anos: 10, motivo: 'Art. 131.1: prisión o inhabilitación de más de 5 años y hasta 10' };
    return { anos: 5, motivo: 'Art. 131.1: resto de delitos' };
  }

  function prescripcionPena(t, v) {
    if (t === 'ppr') return { anos: 30, motivo: 'Art. 133.1 (prisión de más de 20 años; la PPR se rige por el mismo plazo máximo)' };
    if (t === 'prision') {
      if (v > 20 * ANO) return { anos: 30, motivo: 'Art. 133.1: prisión de más de 20 años' };
      if (v >= 15 * ANO) return { anos: 25, motivo: 'Art. 133.1: prisión de 15 a 20 años' };
      if (v > 10 * ANO) return { anos: 20, motivo: 'Art. 133.1: prisión de más de 10 y menos de 15 años' };
      if (v > 5 * ANO) return { anos: 15, motivo: 'Art. 133.1: prisión de más de 5 años y hasta 10' };
    }
    if (t === 'inhab_especial' || t === 'inhab_absoluta') {
      if (v > 10 * ANO) return { anos: 20, motivo: 'Art. 133.1: inhabilitación de más de 10 años' };
      if (v > 6 * ANO) return { anos: 15, motivo: 'Art. 133.1: inhabilitación de más de 6 años y hasta 10' };
    }
    var c = claseValor(t, v);
    if (c === 'grave') return { anos: 10, motivo: 'Art. 133.1: restantes penas graves' };
    if (c === 'leve') return { anos: 1, motivo: 'Art. 133.1: penas leves' };
    return { anos: 5, motivo: 'Art. 133.1: penas menos graves' };
  }

  function cancelacion(t, v, imprudente) {
    var c = claseValor(t, v);
    if (c === 'leve') return { plazo: '6 meses', motivo: 'Art. 136.1.a: penas leves' };
    if (c !== 'grave' && (imprudente || v <= 12 * MES)) return { plazo: '2 años', motivo: 'Art. 136.1.b: penas de hasta 12 meses o por delito imprudente' };
    if (c === 'grave') return { plazo: '10 años', motivo: 'Art. 136.1.e: penas graves' };
    if (t === 'prision' && v >= 3 * ANO) return { plazo: '5 años', motivo: 'Art. 136.1.d: penas menos graves iguales o superiores a 3 años' };
    return { plazo: '3 años', motivo: 'Art. 136.1.c: restantes penas menos graves inferiores a 3 años' };
  }

  // ---------------------------------------------------------------------------
  // Circunstancias modificativas (arts. 21, 22 y 23)
  // ---------------------------------------------------------------------------
  var ATENUANTES = [
    { id: 'adiccion', art: '21.2ª', nombre: 'Grave adicción a drogas, alcohol u otras sustancias' },
    { id: 'arrebato', art: '21.3ª', nombre: 'Arrebato, obcecación u otro estado pasional' },
    { id: 'confesion', art: '21.4ª', nombre: 'Confesión antes de conocer el procedimiento' },
    { id: 'reparacion', art: '21.5ª', nombre: 'Reparación o disminución del daño antes del juicio oral' },
    { id: 'dilaciones', art: '21.6ª', nombre: 'Dilaciones extraordinarias e indebidas' },
    { id: 'analoga', art: '21.7ª', nombre: 'Atenuante analógica' }
  ];

  var AGRAVANTES = [
    { id: 'alevosia', art: '22.1ª', nombre: 'Alevosía' },
    { id: 'disfraz', art: '22.2ª', nombre: 'Disfraz, abuso de superioridad o aprovechamiento de circunstancias' },
    { id: 'precio', art: '22.3ª', nombre: 'Precio, recompensa o promesa' },
    { id: 'discriminacion', art: '22.4ª', nombre: 'Motivos racistas, de género, aporofobia u otra discriminación' },
    { id: 'ensanamiento', art: '22.5ª', nombre: 'Ensañamiento' },
    { id: 'confianza', art: '22.6ª', nombre: 'Abuso de confianza' },
    { id: 'caracter_publico', art: '22.7ª', nombre: 'Prevalimiento del carácter público' },
    { id: 'reincidencia', art: '22.8ª', nombre: 'Reincidencia' }
  ];

  // ---------------------------------------------------------------------------
  // Individualización de un delito
  // ---------------------------------------------------------------------------
  /*
   * opciones:
   *  ejecucion: 'consumado' | 'tentativa' | 'preparatorio'; gradosEjecucion: 1 | 2
   *  participacion: 'autor' | 'inductor' | 'cooperador' | 'complice'; extraneus: bool (art. 65.3)
   *  eximenteIncompleta: 0 | 1 | 2 (art. 68); errorProhibicion: 0 | 1 | 2 (art. 14.3)
   *  atenuantes: [{ id, mc }]; agravantes: [id]; mixta: 'no' | 'atenuante' | 'agravante' (art. 23)
   *  multirreincidencia: bool (art. 66.1.5ª); facultativas: bool (aplicar reglas 4ª y 5ª)
   *  gradosRegla2: 1 | 2; compensacion: 'auto' | 'neutral' | 'atenuacion' | 'cualif_atenuacion' | 'agravacion' | 'cualif_agravacion'
   *  continuado: 'no' | '74.1' | '74.2-total' | '74.2-masa1' | '74.2-masa2'
   */
  function individualizar(modalidad, delito, o) {
    o = o || {};
    var penas = modalidad.penas, pasos = [], avisos = [];
    var imprudente = !!(modalidad.imprudente || (delito && delito.imprudente));
    var claseBase = claseDelito(penas);
    var leve = claseBase === 'leve';

    pasos.push({ titulo: 'Pena señalada por la ley', ref: 'Art. ' + modalidad.art, penas: penas });

    // 1. Grado de ejecución (arts. 15-18 y 62)
    if (o.ejecucion === 'tentativa') {
      if (imprudente) avisos.push('La tentativa no es posible en los delitos imprudentes; se ignora.');
      else {
        var g = o.gradosEjecucion === 2 ? 2 : 1;
        penas = aplicarGrados(penas, -g);
        pasos.push({ titulo: 'Tentativa: inferior en ' + g + (g === 1 ? ' grado' : ' grados'), ref: 'Art. 62', penas: penas });
      }
    } else if (o.ejecucion === 'preparatorio') {
      var permitido = modalidad.preparatorios !== undefined ? modalidad.preparatorios : delito && delito.preparatorios;
      if (!permitido) avisos.push('Este delito no tiene castigados expresamente los actos preparatorios (conspiración, proposición, provocación). Art. 17.3 y 18.2: solo son punibles cuando la ley lo prevé. Verifique el precepto.');
      var gp = o.gradosEjecucion === 2 ? 2 : 1;
      penas = aplicarGrados(penas, -gp);
      pasos.push({ titulo: 'Conspiración / proposición / provocación: inferior en ' + gp + (gp === 1 ? ' grado' : ' grados'), ref: 'Arts. 17, 18' + (delito && delito.refPreparatorios ? ' y ' + delito.refPreparatorios : ''), penas: penas });
    }

    // 2. Participación (arts. 28, 29, 63 y 65.3)
    if (o.participacion === 'complice') {
      penas = aplicarGrados(penas, -1);
      pasos.push({ titulo: 'Complicidad: inferior en grado', ref: 'Art. 63', penas: penas });
    } else if ((o.participacion === 'inductor' || o.participacion === 'cooperador') && o.extraneus) {
      penas = aplicarGrados(penas, -1);
      pasos.push({ titulo: 'Extraneus (delito especial): inferior en grado (facultativo)', ref: 'Art. 65.3', penas: penas });
    }

    // 3. Eximente incompleta (arts. 21.1ª y 68)
    if (o.eximenteIncompleta === 1 || o.eximenteIncompleta === 2) {
      penas = aplicarGrados(penas, -o.eximenteIncompleta);
      pasos.push({ titulo: 'Eximente incompleta: inferior en ' + o.eximenteIncompleta + (o.eximenteIncompleta === 1 ? ' grado' : ' grados'), ref: 'Arts. 21.1ª y 68', penas: penas });
    }

    // 4. Error de prohibición vencible (art. 14.3)
    if (o.errorProhibicion === 1 || o.errorProhibicion === 2) {
      penas = aplicarGrados(penas, -o.errorProhibicion);
      pasos.push({ titulo: 'Error de prohibición vencible: inferior en ' + o.errorProhibicion + (o.errorProhibicion === 1 ? ' grado' : ' grados'), ref: 'Art. 14.3', penas: penas });
    }

    // 5. Delito continuado (art. 74)
    if (o.continuado && o.continuado !== 'no') {
      if (o.continuado === '74.1') {
        penas = aplicar(penas, continuado);
        pasos.push({ titulo: 'Delito continuado: mitad superior, hasta la mitad inferior de la superior en grado', ref: 'Art. 74.1', penas: penas });
      } else if (o.continuado === '74.2-total') {
        pasos.push({ titulo: 'Continuado patrimonial: pena según el perjuicio total (elija la modalidad conforme a la suma). Si la suma ya determina el tipo, no se aplica además la mitad superior', ref: 'Art. 74.2 (Acuerdo Pleno TS 30-10-2007)', penas: penas });
      } else {
        var gm = o.continuado === '74.2-masa2' ? 2 : 1;
        penas = aplicarGrados(penas, gm);
        pasos.push({ titulo: 'Delito masa: superior en ' + gm + (gm === 1 ? ' grado' : ' grados'), ref: 'Art. 74.2', penas: penas });
      }
      if (delito && delito.personalisimo && o.continuado !== 'no') avisos.push('Art. 74.3: los bienes eminentemente personales quedan exceptuados de la continuidad (salvo honor y libertad sexual sobre el mismo sujeto pasivo).');
    }

    // 6. Circunstancias (art. 66)
    var at = o.atenuantes || [], ag = (o.agravantes || []).slice();
    if (o.multirreincidencia && ag.indexOf('reincidencia') < 0) ag.push('reincidencia');
    var nAt = at.length + (o.mixta === 'atenuante' ? 1 : 0);
    var nMC = at.filter(function (a) { return a.mc; }).length;
    var nAg = ag.length + (o.mixta === 'agravante' ? 1 : 0);
    var regla = null, desc = '';

    if (imprudente || leve) {
      regla = '66.2';
      desc = (imprudente ? 'Delito imprudente' : 'Delito leve') + ': el tribunal aplica la pena a su prudente arbitrio, sin sujetarse a las reglas del art. 66.1';
      if (nAt || nAg) avisos.push('Las circunstancias se valoran libremente (art. 66.2); el marco no se modifica automáticamente.');
    } else if (!nAt && !nAg) {
      regla = '66.1.6ª';
      desc = 'Sin circunstancias: pena en toda su extensión';
    } else if (!nAg) {
      if (nAt === 1 && !nMC) {
        regla = '66.1.1ª'; desc = 'Una atenuante: mitad inferior';
        penas = aplicar(penas, mitadInferior);
      } else {
        var g2 = o.gradosRegla2 === 2 ? 2 : 1;
        regla = '66.1.2ª';
        desc = (nMC ? 'Atenuante muy cualificada' : 'Dos o más atenuantes') + ' sin agravantes: inferior en ' + g2 + (g2 === 1 ? ' grado' : ' grados');
        penas = aplicarGrados(penas, -g2);
        if (g2 === 2) desc += ' (regla 8ª: en toda su extensión)';
      }
    } else if (!nAt) {
      var facult = o.facultativas !== false;
      if (o.multirreincidencia && facult) {
        regla = '66.1.5ª'; desc = 'Multirreincidencia (3 o más condenas del mismo título y naturaleza): superior en grado (facultativo)';
        penas = aplicarGrados(penas, 1);
      } else if (nAg > 2 && facult) {
        regla = '66.1.4ª'; desc = 'Más de dos agravantes sin atenuantes: superior en grado, en su mitad inferior (facultativo)';
        penas = aplicar(penas, function (p) { return mitadInferior(superior(p)); });
      } else {
        regla = '66.1.3ª'; desc = (nAg === 1 ? 'Una agravante' : nAg + ' agravantes') + ': mitad superior';
        penas = aplicar(penas, mitadSuperior);
      }
    } else {
      var res = o.compensacion && o.compensacion !== 'auto' ? o.compensacion : null;
      if (!res) {
        var peso = (nAt - nMC) + 2 * nMC - nAg;
        res = peso >= 2 && nMC ? 'cualif_atenuacion' : peso > 0 ? 'atenuacion' : peso < 0 ? 'agravacion' : 'neutral';
        avisos.push('Compensación automática orientativa (art. 66.1.7ª): la valoración es del tribunal. Puede fijar el resultado manualmente.');
      }
      regla = '66.1.7ª';
      if (res === 'cualif_atenuacion') { desc = 'Concurrencia compensada con fundamento cualificado de atenuación: inferior en grado'; penas = aplicarGrados(penas, -1); }
      else if (res === 'atenuacion') { desc = 'Concurrencia compensada con predominio atenuante: mitad inferior'; penas = aplicar(penas, mitadInferior); }
      else if (res === 'agravacion' || res === 'cualif_agravacion') { desc = 'Concurrencia compensada con fundamento cualificado de agravación: mitad superior'; penas = aplicar(penas, mitadSuperior); }
      else desc = 'Atenuantes y agravantes compensadas: pena en toda su extensión';
    }
    pasos.push({ titulo: desc, ref: 'Art. ' + regla, penas: penas });

    if (modalidad.nota) avisos.unshift(modalidad.nota);

    return {
      pasos: pasos,
      final: penas,
      avisos: avisos,
      regla: regla,
      clase: claseBase,
      imprudente: imprudente
    };
  }

  // ---------------------------------------------------------------------------
  // Concursos y límites (arts. 73, 76, 77 y 78)
  // ---------------------------------------------------------------------------
  /*
   * items: [{ nombre, concreta (días de prisión, null si no es privativa), ppr: bool,
   *           maxAbstracto (máx. prisión del tipo), rango (pena principal final {min,max}) }]
   */
  function topeArt76(items, terrorismo) {
    var mas20 = items.filter(function (i) { return i.ppr || i.maxAbstracto > 20 * ANO; }).length;
    var hasta20 = items.some(function (i) { return i.maxAbstracto === 20 * ANO; });
    if (items.some(function (i) { return i.ppr; })) return { anos: null, letra: 'e', texto: 'Art. 76.1.e: uno de los delitos está castigado con prisión permanente revisable; se aplican los arts. 92 y 78 bis' };
    if (terrorismo && mas20 >= 1) return { anos: 40, letra: 'd', texto: 'Art. 76.1.d: terrorismo con algún delito castigado con más de 20 años' };
    if (mas20 >= 2) return { anos: 40, letra: 'c', texto: 'Art. 76.1.c: dos o más delitos castigados con más de 20 años' };
    if (mas20 === 1) return { anos: 30, letra: 'b', texto: 'Art. 76.1.b: algún delito castigado con más de 20 años' };
    if (hasta20) return { anos: 25, letra: 'a', texto: 'Art. 76.1.a: algún delito castigado con prisión de hasta 20 años' };
    return { anos: 20, letra: '', texto: 'Art. 76.1: límite general de 20 años' };
  }

  function concurso(tipo, items, opts) {
    opts = opts || {};
    var priv = items.filter(function (i) { return i.concreta != null; });
    var suma = priv.reduce(function (s, i) { return s + i.concreta; }, 0);
    var out = { tipo: tipo, suma: suma, notas: [] };
    if (items.some(function (i) { return i.ppr; })) {
      out.ppr = true;
      out.notas.push('Hay una pena de prisión permanente revisable: el cumplimiento se rige por los arts. 36.1, 78 bis y 92 (revisión a partir de 25 años o más según el caso).');
    }
    if (!priv.length) { out.efectiva = 0; return out; }

    var masGrave = priv.slice().sort(function (a, b) { return (b.maxAbstracto - a.maxAbstracto) || (b.concreta - a.concreta); })[0];
    var maxConcreta = Math.max.apply(null, priv.map(function (i) { return i.concreta; }));
    var tope = topeArt76(items, opts.terrorismo);
    var triple = 3 * maxConcreta;
    var limite76 = tope.anos == null ? Infinity : Math.min(triple, tope.anos * ANO);

    if (tipo === 'ideal' && priv.length >= 2) {
      var r = mitadSuperior({ t: 'prision', min: masGrave.rango.min, max: masGrave.rango.max });
      out.masGrave = masGrave.nombre;
      if (r.min > suma) {
        out.rango = null; out.efectiva = Math.min(suma, limite76);
        out.notas.push('Art. 77.2: la mitad superior de la pena más grave (' + fmtTiempo(r.min) + ' como mínimo) excede de la suma de las penas por separado; se sancionan las infracciones por separado.');
      } else {
        out.rango = { min: r.min, max: Math.min(r.max, suma) };
        out.efectiva = out.rango.min;
        out.notas.push('Art. 77.2: pena de la infracción más grave (' + masGrave.nombre + ') en su mitad superior, sin exceder la suma de las penas por separado (' + fmtTiempo(suma) + ').');
      }
    } else if (tipo === 'medial' && priv.length >= 2) {
      out.masGrave = masGrave.nombre;
      var hasta = Math.min(suma, limite76);
      out.rango = { min: Math.min(masGrave.concreta + 1, hasta), max: hasta };
      out.efectiva = out.rango.min;
      out.notas.push('Art. 77.3: pena superior a la concreta del delito más grave (' + fmtTiempo(masGrave.concreta) + ') y no superior a la suma de las penas concretas (' + fmtTiempo(suma) + '), con el límite del art. 76. Se individualiza conforme al art. 66.');
    } else {
      out.tipo = 'real';
      out.efectiva = suma;
      if (priv.length >= 2) {
        out.tope = tope;
        out.triple = triple;
        out.limite = limite76;
        if (suma > limite76) {
          out.efectiva = limite76;
          out.notas.push('Art. 76: el máximo de cumplimiento efectivo es el triple de la pena más grave (' + fmtTiempo(triple) + ')' + (tope.anos ? ' con el tope de ' + tope.anos + ' años (' + tope.texto + ')' : '') + '. Se declaran extinguidas las penas que excedan.');
          if (limite76 < suma / 2) out.notas.push('Art. 78: la pena a cumplir es inferior a la mitad de la suma; el tribunal puede acordar que beneficios penitenciarios, permisos, tercer grado y libertad condicional se computen sobre la totalidad de las penas impuestas.');
        } else {
          out.notas.push('Art. 73 y 75: cumplimiento simultáneo o sucesivo de todas las penas (suma inferior al límite del art. 76: ' + (isFinite(limite76) ? fmtTiempo(limite76) : 'arts. 92 y 78 bis') + ').');
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Ejecución: sustitución, suspensión, expulsión y libertad condicional
  // ---------------------------------------------------------------------------
  function sustitucion712(dias) {
    if (dias >= 3 * MES) return null;
    return {
      texto: 'Art. 71.2: la prisión inferior a 3 meses se sustituye obligatoriamente por multa, trabajos en beneficio de la comunidad o localización permanente.',
      multa: dias * 2, tbc: dias, localizacion: dias
    };
  }

  /*
   * p: { penas: [días de cada pena privativa], total (tras concurso), primario, respCivil, habitual,
   *      drogodependencia, enfermo, extranjero, ppr, leves (todas las penas son leves) }
   */
  function suspension(p) {
    var r = [];
    if (p.ppr) {
      r.push({ ok: false, art: '80', texto: 'La prisión permanente revisable no es suspendible por el art. 80; se rige por el art. 92.' });
      return r;
    }
    var total = p.total || 0;
    var maxInd = p.penas.length ? Math.max.apply(null, p.penas) : 0;
    if (!total) { r.push({ ok: true, art: '—', texto: 'No hay penas privativas de libertad que suspender.' }); return r; }

    var plazo = p.leves ? 'de 3 meses a 1 año (art. 81, penas leves)' : 'de 2 a 5 años (art. 81)';
    var ord = total <= 2 * ANO && p.primario && p.respCivil;
    var falta = [];
    if (total > 2 * ANO) falta.push('la pena o suma de penas supera 2 años');
    if (!p.primario) falta.push('no delinque por primera vez');
    if (!p.respCivil) falta.push('no ha satisfecho ni se ha comprometido a satisfacer la responsabilidad civil y el decomiso');
    r.push({ ok: ord, art: '80.1 y 80.2', texto: ord
      ? 'Suspensión ordinaria posible. Plazo de suspensión ' + plazo + '.'
      : 'Suspensión ordinaria no disponible: ' + falta.join('; ') + '.' });

    if (!ord) {
      var exc = maxInd <= 2 * ANO && !p.habitual && p.respCivil;
      r.push({ ok: exc, art: '80.3', texto: exc
        ? 'Suspensión excepcional posible (penas individualmente ≤ 2 años, reo no habitual): condicionada a reparar el daño y a imponer multa o trabajos en beneficio de la comunidad (art. 84.2ª/3ª) sobre al menos 1/5 de la pena.'
        : 'Suspensión excepcional no disponible' + (maxInd > 2 * ANO ? ': alguna pena individual supera 2 años' : p.habitual ? ': reo habitual' : ': exige reparación efectiva del daño') + '.' });
    }
    if (p.drogodependencia) {
      var dro = total <= 5 * ANO;
      r.push({ ok: dro, art: '80.5', texto: dro
        ? 'Suspensión por drogodependencia posible (pena ≤ 5 años, deshabituación o tratamiento certificado). Condicionada a no abandonar el tratamiento.'
        : 'Suspensión por drogodependencia no disponible: la pena supera 5 años.' });
    }
    if (p.enfermo) r.push({ ok: true, art: '80.4', texto: 'Enfermedad muy grave con padecimientos incurables: puede suspenderse cualquier pena sin sujeción a requisitos (salvo que ya tuviera otra suspendida por el mismo motivo).' });
    if (p.extranjero) {
      if (total > 5 * ANO) r.push({ ok: true, art: '89.2', texto: 'Extranjero con pena superior a 5 años: el tribunal acuerda la ejecución de todo o parte de la pena y la sustitución del resto por expulsión (prohibición de regreso de 5 a 10 años).' });
      else if (maxInd > ANO) r.push({ ok: true, art: '89.1', texto: 'Extranjero con pena de más de 1 año: regla general de sustitución por expulsión (puede ejecutarse hasta 2/3 de la pena). No procede si resulta desproporcionada por arraigo, ni para los delitos de los arts. 177 bis, 312, 313 y 318 bis.' });
      else r.push({ ok: false, art: '89', texto: 'Extranjero: no procede la sustitución por expulsión (ninguna pena supera 1 año).' });
    }
    return r;
  }

  function sumarFecha(fecha, dias) {
    var x = desglose(dias), f = new Date(fecha.getTime());
    f.setFullYear(f.getFullYear() + x.a);
    f.setMonth(f.getMonth() + x.m);
    f.setDate(f.getDate() + x.d);
    return f;
  }

  function libertadCondicional(total, p) {
    p = p || {};
    if (!total) return [];
    var r = [
      { art: '90.1', fraccion: '3/4', dias: Math.ceil(total * 3 / 4), texto: 'Régimen general: tercer grado, 3/4 de la condena y buena conducta' },
      { art: '90.2', fraccion: '2/3', dias: Math.ceil(total * 2 / 3), texto: 'Adelantamiento: 2/3 con actividades laborales, culturales u ocupacionales' }
    ];
    var dosTercios = Math.ceil(total * 2 / 3);
    var adelantado = Math.max(Math.ceil(total / 2), dosTercios - Math.floor(dosTercios / ANO) * 90);
    r.push({ art: '90.2 párr. 2', fraccion: '½ + adelanto', dias: adelantado, texto: 'Adelantamiento cualificado: hasta 90 días por año de cumplimiento efectivo sobre los 2/3, nunca antes de la mitad (estimación máxima)' });
    if (p.primario && total <= 3 * ANO && !p.sexual && !p.terrorismo) {
      r.push({ art: '90.3', fraccion: '1/2', dias: Math.ceil(total / 2), texto: 'Excepcional: primera condena de prisión no superior a 3 años' });
    }
    if (total > 5 * ANO) r.push({ art: '36.2', fraccion: '1/2', dias: Math.ceil(total / 2), texto: 'Periodo de seguridad: el tribunal puede (y en ciertos delitos debe) impedir el tercer grado hasta cumplir la mitad' });
    if (p.fechaInicio) r.forEach(function (x) { x.fecha = sumarFecha(p.fechaInicio, x.dias); });
    return r;
  }

  // Penas accesorias (arts. 55 y 56)
  function accesorias(dias, ppr) {
    if (ppr || dias >= 10 * ANO) return 'Art. 55: inhabilitación absoluta durante el tiempo de la condena (salvo que ya sea pena principal). Puede añadirse inhabilitación especial o privación de la patria potestad si guarda relación directa con el delito.';
    if (dias > 0) return 'Art. 56: el tribunal impone, según la gravedad, suspensión de empleo o cargo público, inhabilitación especial para el sufragio pasivo durante la condena, o inhabilitación especial para empleo, profesión, oficio o patria potestad si guardan relación directa con el delito.';
    return null;
  }

  function multaCuantia(dias, cuota) {
    cuota = Math.min(400, Math.max(2, cuota || 2));
    return { total: dias * cuota, cuota: cuota, subsidiaria: Math.ceil(dias / 2) };
  }

  return {
    MES: MES, ANO: ANO, TIPOS: TIPOS, ATENUANTES: ATENUANTES, AGRAVANTES: AGRAVANTES, OPS: OPS,
    dur: dur, desglose: desglose, fmtTiempo: fmtTiempo, fmtValor: fmtValor, fmtPena: fmtPena, fmtNumero: fmtNumero,
    superior: superior, inferior: inferior, mitadInferior: mitadInferior, mitadSuperior: mitadSuperior,
    continuado: continuado, grados: grados, aplicar: aplicar, aplicarGrados: aplicarGrados,
    clasePena: clasePena, claseValor: claseValor, claseDelito: claseDelito, maxPrision: maxPrision,
    prescripcionDelito: prescripcionDelito, prescripcionPena: prescripcionPena, cancelacion: cancelacion,
    individualizar: individualizar, concurso: concurso, topeArt76: topeArt76,
    sustitucion712: sustitucion712, suspension: suspension, libertadCondicional: libertadCondicional,
    accesorias: accesorias, multaCuantia: multaCuantia, sumarFecha: sumarFecha
  };
}));
