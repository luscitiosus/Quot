/*
 * Catálogo de delitos del Código Penal español con sus marcos penales.
 * Penas comprobadas contra el texto consolidado del BOE (BOE-A-1995-25444),
 * incluida la reforma de la LO 1/2026, de 8 de abril.
 *
 * Estructura de "penas": lista de grupos que se imponen conjuntamente; dentro de
 * cada grupo, las penas son alternativas ("prisión ... o multa ...").
 * Marcas: cond = solo si concurre el presupuesto indicado; fac = facultativa.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./motor'));
  else root.DELITOS = factory(root.Motor);
}(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  function P(t, min, max, extra) {
    var p = { t: t, min: t === 'multa_prop' ? min : M.dur(min), max: t === 'multa_prop' ? max : M.dur(max) };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  }
  var pr = function (a, b, e) { return P('prision', a, b, e); };
  var mu = function (a, b, e) { return P('multa', a, b, e); };
  var mp = function (a, b, base, e) { var x = P('multa_prop', a, b, e); x.base = base; return x; };
  var tbc = function (a, b, e) { return P('tbc', a, b, e); };
  var loc = function (a, b, e) { return P('localizacion', a, b, e); };
  var cond = function (a, b, c) { return P('priv_conducir', a, b, c ? { cond: c } : null); };
  var armas = function (a, b, e) { return P('priv_armas', a, b, e); };
  var inhE = function (a, b, e) { return P('inhab_especial', a, b, e); };
  var inhA = function (a, b, e) { return P('inhab_absoluta', a, b, e); };
  var inhP = function (a, b) { return P('inhab_patria', a, b, { fac: true }); };
  var subv = function (a, b) { return P('perdida_subv', a, b); };
  var PPR = { t: 'ppr' };

  function m(id, art, nombre, penas, extra) {
    var o = { id: id, art: art, nombre: nombre, penas: penas };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  // Modalidad derivada de otra mediante una operación penológica
  function d(id, art, nombre, base, op, extra) {
    var penas = typeof op === 'number' ? M.aplicarGrados(base.penas, op) : M.aplicar(base.penas, M.OPS[op]);
    return m(id, art, nombre, penas, extra);
  }

  // --- Homicidio y sus formas ---
  var h138 = m('138.1', '138.1', 'Homicidio (tipo básico)', [[pr('10a', '15a')]]);
  var a139 = m('139.1', '139.1', 'Asesinato (alevosía, precio, ensañamiento o para facilitar/ocultar otro delito)', [[pr('15a', '25a')]]);

  var hi1 = m('142.1', '142.1', 'Homicidio por imprudencia grave', [[pr('1a', '4a')],
    [cond('1a', '6a', 'si se cometió con vehículo a motor o ciclomotor')],
    [armas('1a', '6a', { cond: 'si se cometió con arma de fuego' })],
    [inhE('3a', '6a', { cond: 'si hubo imprudencia profesional' })]]);

  var s1432 = m('143.2', '143.2', 'Cooperación necesaria al suicidio', [[pr('2a', '5a')]]);
  var s1433 = m('143.3', '143.3', 'Cooperación ejecutiva al suicidio (hasta ejecutar la muerte)', [[pr('6a', '10a')]]);

  // --- Lesiones ---
  var l1471 = m('147.1', '147.1', 'Lesiones con tratamiento médico o quirúrgico', [[pr('3m', '3a'), mu('6m', '12m')]]);
  var mvg1 = m('153.1', '153.1', 'Maltrato ocasional a pareja o ex pareja mujer, o persona vulnerable conviviente', [[pr('6m', '1a'), tbc(31, 80)], [armas('1a1d', '3a')], [inhP('3m', '5a')]]);
  var mvg2 = m('153.2', '153.2', 'Maltrato ocasional a otros familiares del art. 173.2', [[pr('3m', '1a'), tbc(31, 80)], [armas('1a1d', '3a')], [inhP('6m', '3a')]]);
  var vh = m('173.2', '173.2', 'Violencia habitual en el ámbito familiar', [[pr('6m', '3a')], [armas('3a', '5a')], [inhP('1a', '5a')]]);
  var lim = { cond1: [cond('1a', '4a', 'si se cometió con vehículo a motor o ciclomotor')], arma1: [armas('1a', '4a', { cond: 'si se cometió con arma de fuego' })], prof: [inhE('6m', '4a', { cond: 'si hubo imprudencia profesional' })] };

  // --- Libertad ---
  var det = m('163.1', '163.1', 'Detención ilegal por particular', [[pr('4a', '6a')]]);
  var sec = m('164', '164', 'Secuestro (con exigencia de condición)', [[pr('6a', '10a')]]);
  var am1 = m('169.1a', '169.1º', 'Amenaza condicional de mal delictivo, consiguiendo el propósito', [[pr('1a', '5a')]]);
  var am2 = m('169.1b', '169.1º', 'Amenaza condicional de mal delictivo, sin conseguir el propósito', [[pr('6m', '3a')]]);
  var coa = m('172.1', '172.1', 'Coacciones (tipo básico)', [[pr('6m', '3a'), mu('12m', '24m')]]);
  var coaL = m('172.2', '172.2', 'Coacción leve a pareja o ex pareja mujer, o persona vulnerable conviviente', [[pr('6m', '1a'), tbc(31, 80)], [armas('1a1d', '3a')], [inhP('3m', '5a')]]);
  var trata = m('177bis.1', '177 bis.1', 'Trata de seres humanos (tipo básico)', [[pr('5a', '8a')]]);

  // --- Libertad sexual ---
  var as1 = m('178.1', '178.1', 'Agresión sexual (tipo básico)', [[pr('1a', '4a')]]);
  var as3 = m('178.3', '178.3', 'Agresión sexual con violencia, intimidación o voluntad anulada', [[pr('1a', '5a')]]);
  var v1 = m('179.1', '179.1', 'Violación (acceso carnal o introducción de miembros u objetos)', [[pr('4a', '12a')]]);
  var v2 = m('179.2', '179.2', 'Violación con violencia, intimidación o voluntad anulada', [[pr('6a', '12a')]]);
  var ag1 = m('180-178.1', '180.1', 'Agresión del 178.1 con alguna circunstancia del art. 180', [[pr('2a', '8a')]]);
  var ag3 = m('180-178.3', '180.1', 'Agresión del 178.3 con alguna circunstancia del art. 180', [[pr('5a', '10a')]]);
  var ag179 = m('180-179.1', '180.1', 'Violación del 179.1 con alguna circunstancia del art. 180', [[pr('7a', '15a')]]);
  var ag1792 = m('180-179.2', '180.1', 'Violación del 179.2 con alguna circunstancia del art. 180', [[pr('12a', '15a')]]);
  var me1 = m('181.1', '181.1', 'Actos de carácter sexual con menor de 16 años', [[pr('2a', '6a')]]);
  var me2 = m('181.2', '181.2', 'Actos sexuales con menor de 16 con violencia, intimidación o modalidades del 178.2', [[pr('5a', '10a')]]);
  var me4a = m('181.4-1', '181.4', 'Acceso carnal con menor de 16 años (casos del 181.1)', [[pr('8a', '12a')]]);
  var me4b = m('181.4-2', '181.4', 'Acceso carnal con menor de 16 años (casos del 181.2)', [[pr('12a', '15a')]]);

  // --- Patrimonio ---
  var hu = m('234.1', '234.1', 'Hurto (más de 400 €)', [[pr('6m', '18m')]]);
  var huL = m('234.2', '234.2', 'Hurto leve (hasta 400 €)', [[mu('1m', '3m')]]);
  var hu235 = m('235.1', '235.1', 'Hurto agravado (art. 235: valor artístico, móviles, multirreincidencia, organización…)', [[pr('1a', '3a')]]);
  var rf = m('240.1', '240.1', 'Robo con fuerza en las cosas', [[pr('1a', '3a')]]);
  var rv = m('242.1', '242.1', 'Robo con violencia o intimidación', [[pr('2a', '5a')]]);
  var rvc = m('242.2', '242.2', 'Robo con violencia o intimidación en casa habitada o local abierto al público', [[pr('3a6m', '5a')]]);
  var uso = m('244.1', '244.1', 'Hurto de uso de vehículo (restituido en 48 h)', [[tbc(31, 90), mu('2m', '12m')]]);
  var es = m('248', '248', 'Estafa (tipo básico, más de 400 €)', [[pr('6m', '3a')]]);
  var es250 = m('250.1', '250.1', 'Estafa agravada (art. 250.1: vivienda, más de 50.000 €, abuso de relaciones, estafa procesal…)', [[pr('1a', '6a')], [mu('6m', '12m')]]);
  var es2502 = m('250.2', '250.2', 'Estafa hiperagravada (más de 250.000 € o concurrencia del 250.1.1º con 4º-7º)', [[pr('4a', '8a')], [mu('12m', '24m')]]);
  var es249 = m('249.1', '249.1', 'Estafa informática o con tarjetas e instrumentos de pago', [[pr('6m', '3a')]]);
  var rec = m('298.1', '298.1', 'Receptación (tipo básico)', [[pr('6m', '2a')]]);
  var recA = m('298.1-ag', '298.1 párr. 2', 'Receptación agravada (bienes culturales, cableado, primera necesidad, especial gravedad)', [[pr('1a', '3a')]]);
  var bl = m('301.1', '301.1', 'Blanqueo de capitales (doloso)', [[pr('6m', '6a')], [mp(1, 3, 'valor de los bienes')], [inhE('1a', '3a', { fac: true })]]);

  // --- Hacienda y Seguridad Social ---
  var df = m('305.1', '305.1', 'Delito contra la Hacienda Pública (cuota superior a 120.000 €)', [[pr('1a', '5a')], [mp(1, 6, 'cuota defraudada')], [subv('3a', '6a')]]);
  var dss = m('307.1', '307.1', 'Delito contra la Seguridad Social (más de 50.000 € en 4 años)', [[pr('1a', '5a')], [mp(1, 6, 'cuantía defraudada')], [subv('3a', '6a')]]);

  // --- Salud pública ---
  var dr1 = m('368-grave', '368', 'Tráfico de drogas que causan grave daño a la salud', [[pr('3a', '6a')], [mp(1, 3, 'valor de la droga')]]);
  var dr2 = m('368-nograve', '368', 'Tráfico de drogas que no causan grave daño a la salud', [[pr('1a', '3a')], [mp(1, 2, 'valor de la droga')]]);
  function agr369(base, id, nombre) {
    var x = d(id, '369.1', nombre, base, 1);
    x.penas = x.penas.map(function (g) { return g.map(function (p) { return p.t === 'multa_prop' ? mp(1, 4, 'valor de la droga') : p; }); });
    return x;
  }

  // --- Seguridad vial ---
  var sv379 = [[pr('3m', '6m'), mu('6m', '12m'), tbc(31, 90)], [cond('1a1d', '4a')]];

  // --- Orden público ---
  var des1 = m('557.1', '557.1', 'Desórdenes públicos (actuando en grupo con violencia o intimidación)', [[pr('6m', '3a')]]);
  var des2 = m('557.2', '557.2', 'Desórdenes por multitud idónea para afectar gravemente al orden público', [[pr('3a', '5a')], [inhE('3a', '5a')]]);

  var CATALOGO = [
    // ======================= VIDA =======================
    { id: 'homicidio', titulo: 'Contra la vida', nombre: 'Homicidio', preparatorios: true, refPreparatorios: '141', personalisimo: true,
      modalidades: [h138,
        d('138.2', '138.2', 'Homicidio agravado (circunstancias del 140.1 o atentado del 550): superior en grado', h138, 1)] },
    { id: 'asesinato', titulo: 'Contra la vida', nombre: 'Asesinato', preparatorios: true, refPreparatorios: '141', personalisimo: true,
      modalidades: [a139,
        d('139.2', '139.2', 'Asesinato con más de una circunstancia del 139.1: mitad superior', a139, 'mitadSuperior'),
        m('140.1', '140.1', 'Asesinato hiperagravado (víctima menor de 16 o vulnerable, tras delito sexual, organización criminal)', [[PPR]]),
        m('140.2', '140.2', 'Asesinato de más de dos personas', [[PPR]])] },
    { id: 'homicidio_imprudente', titulo: 'Contra la vida', nombre: 'Homicidio imprudente', imprudente: true, personalisimo: true,
      modalidades: [hi1,
        d('142bis-1', '142 bis', 'Homicidio por imprudencia grave de notoria gravedad con dos o más víctimas: superior en un grado', hi1, 1),
        d('142bis-2', '142 bis', 'Homicidio por imprudencia grave con número muy elevado de fallecidos: superior en dos grados', hi1, 2),
        m('142.2', '142.2', 'Homicidio por imprudencia menos grave', [[mu('3m', '18m')],
          [cond('3m', '18m', 'si se cometió con vehículo a motor o ciclomotor')],
          [armas('3m', '18m', { fac: true, cond: 'si se cometió con arma de fuego' })]])] },
    { id: 'suicidio', titulo: 'Contra la vida', nombre: 'Inducción y cooperación al suicidio', personalisimo: true,
      modalidades: [m('143.1', '143.1', 'Inducción al suicidio', [[pr('4a', '8a')]]), s1432, s1433,
        d('143.4-2a', '143.4', 'Eutanasia fuera de la LORE (cooperación necesaria): inferior en un grado', s1432, -1),
        d('143.4-2b', '143.4', 'Eutanasia fuera de la LORE (cooperación necesaria): inferior en dos grados', s1432, -2),
        d('143.4-3a', '143.4', 'Eutanasia fuera de la LORE (ejecución de la muerte): inferior en un grado', s1433, -1),
        d('143.4-3b', '143.4', 'Eutanasia fuera de la LORE (ejecución de la muerte): inferior en dos grados', s1433, -2)] },

    // ======================= LESIONES =======================
    { id: 'lesiones', titulo: 'Lesiones', nombre: 'Lesiones dolosas', preparatorios: true, refPreparatorios: '151', personalisimo: true,
      modalidades: [l1471,
        m('147.2', '147.2', 'Lesión leve sin tratamiento médico (delito leve)', [[mu('1m', '3m')]]),
        m('147.3', '147.3', 'Maltrato de obra sin lesión (delito leve)', [[mu('1m', '2m')]]),
        m('148', '148', 'Lesiones agravadas (armas, alevosía, ensañamiento, menor de 14, pareja mujer, vulnerable)', [[pr('2a', '5a')]]),
        m('149.1', '149.1', 'Pérdida de órgano o miembro principal, sentido, impotencia, esterilidad, grave deformidad o enfermedad', [[pr('6a', '12a')]]),
        m('149.2', '149.2', 'Mutilación genital', [[pr('6a', '12a')], [P('inhab_patria', '4a', '10a', { fac: true, cond: 'si la víctima es menor o persona con discapacidad' })]]),
        m('150', '150', 'Pérdida de órgano o miembro no principal, o deformidad', [[pr('3a', '6a')]])] },
    { id: 'lesiones_imprudentes', titulo: 'Lesiones', nombre: 'Lesiones imprudentes', imprudente: true, personalisimo: true,
      modalidades: [
        m('152.1.1', '152.1.1º', 'Imprudencia grave con lesiones del 147.1', [[pr('3m', '6m'), mu('6m', '18m')], lim.cond1, lim.arma1, lim.prof]),
        m('152.1.2', '152.1.2º', 'Imprudencia grave con lesiones del 149', [[pr('1a', '3a')], lim.cond1, lim.arma1, lim.prof]),
        m('152.1.3', '152.1.3º', 'Imprudencia grave con lesiones del 150', [[pr('6m', '2a')], lim.cond1, lim.arma1, lim.prof]),
        m('152.2-147', '152.2', 'Imprudencia menos grave con lesiones del 147.1', [[mu('1m', '2m')], [cond('3m', '18m', 'si se cometió con vehículo a motor o ciclomotor')], [armas('3m', '1a', { fac: true, cond: 'si se cometió con arma de fuego' })]]),
        m('152.2-149', '152.2', 'Imprudencia menos grave con lesiones de los arts. 149 o 150', [[mu('3m', '12m')], [cond('3m', '18m', 'si se cometió con vehículo a motor o ciclomotor')], [armas('3m', '1a', { fac: true, cond: 'si se cometió con arma de fuego' })]])] },
    { id: 'violencia_genero', titulo: 'Lesiones', nombre: 'Violencia de género y doméstica', personalisimo: true,
      modalidades: [mvg1,
        d('153.3-1', '153.3', 'Maltrato del 153.1 en presencia de menores, con armas, en domicilio o quebrantando: mitad superior', mvg1, 'mitadSuperior'),
        d('153.4-1', '153.4', 'Maltrato del 153.1 atenuado por las circunstancias del autor y del hecho: inferior en grado', mvg1, -1),
        mvg2,
        d('153.3-2', '153.3', 'Maltrato del 153.2 con agravación del 153.3: mitad superior', mvg2, 'mitadSuperior'),
        vh,
        d('173.2-ag', '173.2 párr. 2', 'Violencia habitual en presencia de menores, con armas, en domicilio o quebrantando: mitad superior', vh, 'mitadSuperior'),
        m('173.4', '173.4', 'Injuria o vejación injusta leve a persona del 173.2 (delito leve)', [[loc(5, 30), tbc(5, 30), mu('1m', '4m')]])] },

    // ======================= LIBERTAD =======================
    { id: 'detencion', titulo: 'Contra la libertad', nombre: 'Detenciones ilegales y secuestro', preparatorios: true, refPreparatorios: '168',
      modalidades: [det,
        d('163.2', '163.2', 'Detención ilegal con liberación en los 3 primeros días sin lograr el objeto: inferior en grado', det, -1),
        m('163.3', '163.3', 'Detención ilegal de más de 15 días', [[pr('5a', '8a')]]),
        m('163.4', '163.4', 'Aprehensión de una persona para presentarla a la autoridad fuera de los casos legales', [[mu('3m', '6m')]]),
        sec,
        d('164-15d', '164', 'Secuestro de más de 15 días: superior en grado', sec, 1),
        d('164-3d', '164', 'Secuestro con liberación en 3 días sin lograr el objeto: inferior en grado', sec, -1)] },
    { id: 'amenazas', titulo: 'Contra la libertad', nombre: 'Amenazas',
      modalidades: [am1,
        d('169.1a-ag', '169.1º párr. 2', 'Amenaza condicional conseguida, por escrito, teléfono o en nombre de grupos: mitad superior', am1, 'mitadSuperior'),
        am2,
        d('169.1b-ag', '169.1º párr. 2', 'Amenaza condicional no conseguida, por escrito, teléfono o en nombre de grupos: mitad superior', am2, 'mitadSuperior'),
        m('169.2', '169.2º', 'Amenaza no condicional de mal delictivo', [[pr('6m', '2a')]])] },
    { id: 'coacciones', titulo: 'Contra la libertad', nombre: 'Coacciones y acoso',
      modalidades: [coa,
        d('172.1-ag', '172.1 párr. 2-3', 'Coacción para impedir un derecho fundamental o el disfrute de la vivienda: mitad superior', coa, 'mitadSuperior'),
        coaL,
        d('172.2-ag', '172.2 párr. 3', 'Coacción leve del 172.2 en presencia de menores, en domicilio o quebrantando: mitad superior', coaL, 'mitadSuperior'),
        m('172.3', '172.3', 'Coacción leve (delito leve)', [[mu('1m', '3m')]]),
        m('172.3-fam', '172.3 párr. 2', 'Coacción leve a persona del art. 173.2 (delito leve)', [[loc(5, 30), tbc(5, 30), mu('1m', '4m')]]),
        m('172ter.1', '172 ter.1', 'Acoso (stalking)', [[pr('3m', '2a'), mu('6m', '24m')]]),
        m('172ter.1-vuln', '172 ter.1', 'Acoso a víctima especialmente vulnerable', [[pr('6m', '2a')]]),
        m('172ter.2', '172 ter.2', 'Acoso a persona del art. 173.2', [[pr('1a', '2a'), tbc(60, 120)]]),
        m('172ter.5', '172 ter.5', 'Uso de la imagen ajena para perfiles falsos o anuncios con acoso o humillación', [[pr('3m', '1a'), mu('6m', '12m')]])] },
    { id: 'trato_degradante', titulo: 'Contra la integridad moral', nombre: 'Trato degradante y acoso laboral o inmobiliario', personalisimo: true,
      modalidades: [m('173.1', '173.1', 'Trato degradante, acoso laboral grave, acoso inmobiliario u ocultación del paradero de un cadáver', [[pr('6m', '2a')]])] },
    { id: 'trata', titulo: 'Contra la integridad moral', nombre: 'Trata de seres humanos', preparatorios: true, refPreparatorios: '177 bis.8', personalisimo: true,
      modalidades: [trata,
        d('177bis.4', '177 bis.4', 'Trata con peligro para la vida, víctima vulnerable o menor, o desplazada por conflicto: superior en grado', trata, 1),
        m('177bis.4-2', '177 bis.4 in fine', 'Trata con más de una circunstancia del apartado 4: superior en grado en su mitad superior', M.aplicar(M.aplicarGrados(trata.penas, 1), M.mitadSuperior)),
        m('177bis.5', '177 bis.5', 'Trata prevaliéndose de la condición de autoridad o funcionario', [[M.superior(trata.penas[0][0])], [inhA('6a', '12a')]]),
        m('177bis.6', '177 bis.6', 'Trata en el seno de una organización', [[M.superior(trata.penas[0][0])], [inhE(M.superior(trata.penas[0][0]).min, M.superior(trata.penas[0][0]).max, { nota: 'Por el tiempo de la condena' })]])] },

    // ======================= LIBERTAD SEXUAL =======================
    { id: 'agresion_sexual', titulo: 'Contra la libertad sexual', nombre: 'Agresión sexual y violación', personalisimo: true,
      modalidades: [as1, as3,
        m('178.4', '178.4', 'Agresión sexual de menor entidad (sin violencia ni intimidación ni circunstancias del 180)', [[M.mitadInferior(as1.penas[0][0]), mu('18m', '24m')]]),
        v1, v2, ag1, ag3, ag179, ag1792,
        d('180.2-178.1', '180.2', 'Agresión del 178.1 con dos o más circunstancias del 180: mitad superior', ag1, 'mitadSuperior'),
        d('180.2-178.3', '180.2', 'Agresión del 178.3 con dos o más circunstancias del 180: mitad superior', ag3, 'mitadSuperior'),
        d('180.2-179.1', '180.2', 'Violación del 179.1 con dos o más circunstancias del 180: mitad superior', ag179, 'mitadSuperior'),
        d('180.2-179.2', '180.2', 'Violación del 179.2 con dos o más circunstancias del 180: mitad superior', ag1792, 'mitadSuperior')] },
    { id: 'agresion_menores', titulo: 'Contra la libertad sexual', nombre: 'Agresiones sexuales a menores de 16 años', personalisimo: true,
      modalidades: [me1, me2,
        d('181.3', '181.3', 'Actos del 181.1 de menor entidad: inferior en grado', me1, -1),
        me4a, me4b,
        d('181.5-1', '181.5', 'Actos del 181.1 con circunstancias del 181.5: mitad superior', me1, 'mitadSuperior'),
        d('181.5-2', '181.5', 'Actos del 181.2 con circunstancias del 181.5: mitad superior', me2, 'mitadSuperior'),
        d('181.5-4a', '181.5', 'Acceso carnal (181.4, casos del 181.1) con circunstancias del 181.5: mitad superior', me4a, 'mitadSuperior'),
        d('181.5-4b', '181.5', 'Acceso carnal (181.4, casos del 181.2) con circunstancias del 181.5: mitad superior', me4b, 'mitadSuperior')] },
    { id: 'acoso_sexual', titulo: 'Contra la libertad sexual', nombre: 'Acoso sexual',
      modalidades: [m('184.1', '184.1', 'Acoso sexual en relación laboral, docente o de servicios', [[pr('6m', '12m'), mu('10m', '15m')], [inhE('12m', '15m')]]),
        m('184.2', '184.2', 'Acoso sexual con prevalimiento de superioridad o anuncio de un mal', [[pr('1a', '2a')], [inhE('18m', '24m')]]),
        m('184.3', '184.3', 'Acoso sexual en centros de menores, internamiento o custodia', [[pr('1a', '2a')], [inhE('18m', '24m')]])] },

    // ======================= OMISIÓN DE SOCORRO =======================
    { id: 'omision_socorro', titulo: 'Omisión del deber de socorro', nombre: 'Omisión del deber de socorro',
      modalidades: [m('195.1', '195.1', 'Omisión del deber de socorro', [[mu('3m', '12m')]]),
        m('195.3-fort', '195.3', 'Omisión de socorro a víctima de accidente fortuito causado por el omitente', [[pr('6m', '18m')]]),
        m('195.3-impr', '195.3', 'Omisión de socorro a víctima de accidente imprudente causado por el omitente', [[pr('6m', '4a')]])] },

    // ======================= INTIMIDAD =======================
    { id: 'intimidad', titulo: 'Contra la intimidad', nombre: 'Descubrimiento y revelación de secretos',
      modalidades: [m('197.1', '197.1', 'Apoderamiento de papeles, mensajes o interceptación de comunicaciones', [[pr('1a', '4a')], [mu('12m', '24m')]]),
        m('197.2', '197.2', 'Acceso, apoderamiento o alteración de datos personales reservados', [[pr('1a', '4a')], [mu('12m', '24m')]]),
        m('197.3', '197.3', 'Difusión, revelación o cesión de lo descubierto', [[pr('2a', '5a')]]),
        m('197.3-2', '197.3 párr. 2', 'Difusión por quien conoce el origen ilícito sin haber participado', [[pr('1a', '3a')], [mu('12m', '24m')]]),
        m('197.4', '197.4', 'Cometido por responsables de ficheros o con datos personales de la víctima', [[pr('3a', '5a')]]),
        m('197.7', '197.7', 'Difusión inconsentida de imágenes íntimas obtenidas con anuencia', [[pr('3m', '1a'), mu('6m', '12m')]]),
        m('197.7-2', '197.7 párr. 2', 'Reenvío de imágenes íntimas por quien las recibe', [[mu('1m', '3m')]]),
        m('197bis.1', '197 bis.1', 'Acceso ilícito a sistemas de información (hacking)', [[pr('6m', '2a')]]),
        m('197bis.2', '197 bis.2', 'Interceptación de transmisiones de datos', [[pr('3m', '2a'), mu('3m', '12m')]])] },
    { id: 'allanamiento', titulo: 'Contra la intimidad', nombre: 'Allanamiento de morada',
      modalidades: [m('202.1', '202.1', 'Allanamiento de morada', [[pr('6m', '2a')]]),
        m('202.2', '202.2', 'Allanamiento de morada con violencia o intimidación', [[pr('1a', '4a')], [mu('6m', '12m')]])] },

    // ======================= HONOR =======================
    { id: 'honor', titulo: 'Contra el honor', nombre: 'Calumnias e injurias', prescripcionAnual: true,
      modalidades: [m('206-pub', '206', 'Calumnia con publicidad', [[pr('6m', '2a'), mu('12m', '24m')]]),
        m('206', '206', 'Calumnia sin publicidad', [[mu('6m', '12m')]]),
        m('209-pub', '209', 'Injurias graves con publicidad', [[mu('6m', '14m')]]),
        m('209', '209', 'Injurias graves sin publicidad', [[mu('3m', '7m')]])] },

    // ======================= FAMILIA =======================
    { id: 'familia', titulo: 'Contra las relaciones familiares', nombre: 'Abandono de familia e impago de pensiones',
      modalidades: [m('226', '226', 'Abandono de familia (incumplimiento de deberes de asistencia)', [[pr('3m', '6m'), mu('6m', '12m')], [inhP('4a', '10a')]]),
        m('227', '227', 'Impago de pensiones (2 meses consecutivos o 4 no consecutivos)', [[pr('3m', '1a'), mu('6m', '24m')]])] },

    // ======================= PATRIMONIO =======================
    { id: 'hurto', titulo: 'Contra el patrimonio', nombre: 'Hurto',
      modalidades: [hu, huL,
        d('234.3-1', '234.3', 'Hurto de más de 400 € neutralizando alarmas o dispositivos de seguridad: mitad superior', hu, 'mitadSuperior'),
        d('234.3-2', '234.3', 'Hurto leve neutralizando alarmas o dispositivos de seguridad: mitad superior', huL, 'mitadSuperior'),
        m('234.2-multi', '234.2 párr. 1 in fine', 'Hurto de hasta 400 € con tres condenas previas de la misma naturaleza (una al menos leve)', hu.penas, { nota: 'LO 1/2026: se aplica la pena del 234.1 por multirreincidencia.' }),
        hu235,
        d('235.2', '235.2', 'Hurto con dos o más circunstancias del art. 235: mitad superior', hu235, 'mitadSuperior')] },
    { id: 'robo_fuerza', titulo: 'Contra el patrimonio', nombre: 'Robo con fuerza en las cosas', preparatorios: true, refPreparatorios: '269',
      modalidades: [rf,
        m('240.2', '240.2', 'Robo con fuerza con circunstancias del art. 235', [[pr('2a', '5a')]]),
        m('241.1', '241.1', 'Robo con fuerza en casa habitada, edificio o local abierto al público', [[pr('2a', '5a')]]),
        m('241.1-2', '241.1 párr. 2', 'Robo con fuerza en establecimiento abierto al público fuera del horario', [[pr('1a', '5a')]]),
        m('241.4', '241.4', 'Robo en casa habitada o local de especial gravedad o con circunstancias del 235', [[pr('2a', '6a')]])] },
    { id: 'robo_violencia', titulo: 'Contra el patrimonio', nombre: 'Robo con violencia o intimidación', preparatorios: true, refPreparatorios: '269', personalisimo: true,
      modalidades: [rv, rvc,
        d('242.3-1', '242.3', 'Robo con violencia usando armas o medios peligrosos: mitad superior', rv, 'mitadSuperior'),
        d('242.3-2', '242.3', 'Robo con violencia en casa habitada usando armas: mitad superior', rvc, 'mitadSuperior'),
        d('242.4', '242.4', 'Robo con violencia o intimidación de menor entidad: inferior en grado', rv, -1)] },
    { id: 'extorsion', titulo: 'Contra el patrimonio', nombre: 'Extorsión', preparatorios: true, refPreparatorios: '269',
      modalidades: [m('243', '243', 'Extorsión', [[pr('1a', '5a')]])] },
    { id: 'uso_vehiculo', titulo: 'Contra el patrimonio', nombre: 'Hurto y robo de uso de vehículos',
      modalidades: [uso, d('244.2', '244.2', 'Uso de vehículo empleando fuerza en las cosas: mitad superior', uso, 'mitadSuperior')] },
    { id: 'usurpacion', titulo: 'Contra el patrimonio', nombre: 'Usurpación',
      modalidades: [m('245.1', '245.1', 'Ocupación de inmueble con violencia o intimidación', [[pr('1a', '2a')]]),
        m('245.2', '245.2', 'Ocupación pacífica de inmueble que no constituye morada', [[mu('3m', '6m')]])] },
    { id: 'estafa', titulo: 'Contra el patrimonio', nombre: 'Estafa', preparatorios: true, refPreparatorios: '269',
      modalidades: [es,
        m('248-leve', '248 párr. 3', 'Estafa leve (hasta 400 €)', [[mu('1m', '3m')]]),
        m('248-multi', '248 párr. 3 in fine', 'Estafa de hasta 400 € con tres condenas previas de la misma naturaleza (una al menos leve)', es.penas, { nota: 'LO 1/2026: se aplica la pena del párrafo segundo por multirreincidencia.' }),
        es249,
        d('249.3', '249.3', 'Tenencia o tráfico de instrumentos de pago obtenidos ilícitamente: mitad inferior', es249, 'mitadInferior'),
        es250, es2502] },
    { id: 'apropiacion', titulo: 'Contra el patrimonio', nombre: 'Apropiación indebida y administración desleal', preparatorios: true, refPreparatorios: '269',
      modalidades: [m('253.1', '253.1', 'Apropiación indebida (más de 400 €)', es.penas),
        m('253.2', '253.2', 'Apropiación indebida leve (hasta 400 €)', [[mu('1m', '3m')]]),
        m('253-250', '253.1 y 250.1', 'Apropiación indebida agravada (circunstancias del 250.1)', es250.penas),
        m('253-2502', '253.1 y 250.2', 'Apropiación indebida hiperagravada (250.2)', es2502.penas),
        m('252.1', '252.1', 'Administración desleal (más de 400 €)', es.penas),
        m('252.2', '252.2', 'Administración desleal leve (hasta 400 €)', [[mu('1m', '3m')]]),
        m('252-250', '252.1 y 250.1', 'Administración desleal agravada (circunstancias del 250.1)', es250.penas)] },
    { id: 'danos', titulo: 'Contra el patrimonio', nombre: 'Daños',
      modalidades: [m('263.1', '263.1', 'Daños (más de 400 €)', [[mu('6m', '24m')]]),
        m('263.1-leve', '263.1 párr. 2', 'Daños leves (hasta 400 €)', [[mu('1m', '3m')]]),
        m('263.2', '263.2', 'Daños agravados (contra la autoridad, bienes públicos, ruina, especial gravedad…)', [[pr('1a', '3a')], [mu('12m', '24m')]]),
        m('264.1', '264.1', 'Daños informáticos', [[pr('6m', '3a')]]),
        m('264.2', '264.2', 'Daños informáticos agravados (organización, infraestructura crítica, especial gravedad…)', [[pr('2a', '5a')], [mp(1, 10, 'perjuicio ocasionado')]])] },
    { id: 'receptacion', titulo: 'Contra el orden socioeconómico', nombre: 'Receptación y blanqueo', preparatorios: true, refPreparatorios: '304 (blanqueo)',
      modalidades: [rec, recA,
        d('298.2-1', '298.2', 'Receptación para traficar: mitad superior', rec, 'mitadSuperior'),
        d('298.2-2', '298.2', 'Receptación agravada para traficar: mitad superior', recA, 'mitadSuperior'),
        bl,
        d('301.1-drogas', '301.1 párr. 2-3', 'Blanqueo procedente de tráfico de drogas, corrupción, trata u otros delitos del párr. 3: mitad superior', bl, 'mitadSuperior'),
        m('301.3', '301.3', 'Blanqueo por imprudencia grave', [[pr('6m', '2a')], [mp(1, 3, 'valor de los bienes')]], { imprudente: true })] },

    // ======================= HACIENDA Y SS =======================
    { id: 'hacienda', titulo: 'Contra la Hacienda Pública y la Seguridad Social', nombre: 'Delito fiscal y contra la Seguridad Social',
      modalidades: [df,
        d('305.6-1', '305.6', 'Delito fiscal con pago y reconocimiento en 2 meses desde la citación: inferior en un grado', df, -1),
        d('305.6-2', '305.6', 'Delito fiscal con pago y reconocimiento en 2 meses desde la citación: inferior en dos grados', df, -2),
        m('305.3', '305.3 párr. 2', 'Fraude a la Hacienda de la UE de más de 10.000 € y hasta 100.000 €', [[pr('3m', '1a'), mp(1, 3, 'cuantía defraudada')], [subv('6m', '2a')]]),
        dss,
        d('307.5-1', '307.5', 'Delito contra la SS con pago y reconocimiento en 2 meses: inferior en un grado', dss, -1),
        d('307.5-2', '307.5', 'Delito contra la SS con pago y reconocimiento en 2 meses: inferior en dos grados', dss, -2)] },

    // ======================= SEGURIDAD COLECTIVA =======================
    { id: 'incendios', titulo: 'Contra la seguridad colectiva', nombre: 'Incendios',
      modalidades: [m('351', '351', 'Incendio con peligro para la vida o integridad de las personas', [[pr('10a', '20a')]]),
        d('351-menor', '351', 'Incendio con peligro de menor entidad: inferior en grado', { penas: [[pr('10a', '20a')]] }, -1),
        m('352', '352', 'Incendio forestal sin peligro para las personas', [[pr('1a', '5a')], [mu('12m', '18m')]]),
        m('352-peligro', '352 párr. 2', 'Incendio forestal con peligro para las personas', [[pr('10a', '20a')], [mu('12m', '24m')]])] },
    { id: 'drogas', titulo: 'Contra la seguridad colectiva', nombre: 'Tráfico de drogas', preparatorios: true, refPreparatorios: '373',
      modalidades: [dr1, dr2,
        d('368.2-g', '368 párr. 2', 'Drogas de grave daño, escasa entidad: inferior en grado', dr1, -1),
        d('368.2-ng', '368 párr. 2', 'Drogas sin grave daño, escasa entidad: inferior en grado', dr2, -1),
        agr369(dr1, '369-g', 'Drogas de grave daño con agravantes del 369 (notoria importancia, menores, establecimiento…): superior en grado'),
        agr369(dr2, '369-ng', 'Drogas sin grave daño con agravantes del 369: superior en grado'),
        d('370-g1', '370', 'Drogas de grave daño de extrema gravedad, jefes de organización o uso de menores: superior en un grado', dr1, 1),
        d('370-g2', '370', 'Drogas de grave daño de extrema gravedad, jefes de organización o uso de menores: superior en dos grados', dr1, 2)] },
    { id: 'seguridad_vial', titulo: 'Contra la seguridad vial', nombre: 'Delitos contra la seguridad vial',
      modalidades: [m('379.1', '379.1', 'Exceso de velocidad (+60 km/h urbana, +80 km/h interurbana)', sv379),
        m('379.2', '379.2', 'Conducción bajo la influencia de alcohol o drogas', sv379),
        m('380', '380', 'Conducción temeraria con peligro concreto', [[pr('6m', '2a')], [cond('1a1d', '6a')]]),
        m('381.1', '381.1', 'Conducción con manifiesto desprecio por la vida, con peligro concreto', [[pr('2a', '5a')], [mu('12m', '24m')], [cond('6a', '10a')]]),
        m('381.2', '381.2', 'Conducción con manifiesto desprecio por la vida, sin peligro concreto', [[pr('1a', '2a')], [mu('6m', '12m')], [cond('6a', '10a')]]),
        m('382bis.2', '382 bis.2', 'Abandono del lugar del accidente causado por imprudencia', [[pr('6m', '4a')], [cond('1a', '4a')]]),
        m('382bis.3', '382 bis.3', 'Abandono del lugar del accidente fortuito', [[pr('3m', '6m')], [cond('6m', '2a')]]),
        m('383', '383', 'Negativa a someterse a las pruebas de alcohol o drogas', [[pr('6m', '1a')], [cond('1a1d', '4a')]]),
        m('384', '384', 'Conducción sin permiso (sin puntos, privado judicialmente o sin haberlo obtenido nunca)', [[pr('3m', '6m'), mu('12m', '24m'), tbc(31, 90)]])] },

    // ======================= FALSEDADES =======================
    { id: 'falsedades', titulo: 'Falsedades', nombre: 'Falsedades documentales',
      modalidades: [m('390', '390.1', 'Falsedad en documento por autoridad o funcionario', [[pr('3a', '6a')], [mu('6m', '24m')], [inhE('2a', '6a')]]),
        m('392.1', '392.1', 'Falsedad por particular en documento público, oficial o mercantil', [[pr('6m', '3a')], [mu('6m', '12m')]]),
        m('392.2-trafico', '392.2', 'Tráfico con documento de identidad falso', [[pr('6m', '3a')], [mu('6m', '12m')]]),
        m('392.2-uso', '392.2', 'Uso de documento de identidad falso', [[pr('6m', '1a')], [mu('3m', '6m')]]),
        m('395', '395', 'Falsedad en documento privado para perjudicar a otro', [[pr('6m', '2a')]])] },

    // ======================= ADMINISTRACIÓN PÚBLICA =======================
    { id: 'administracion', titulo: 'Contra la Administración pública', nombre: 'Prevaricación, cohecho, tráfico de influencias y malversación',
      modalidades: [m('404', '404', 'Prevaricación administrativa', [[inhE('9a', '15a')]]),
        m('419', '419', 'Cohecho propio (acto contrario a los deberes del cargo)', [[pr('3a', '6a')], [mu('12m', '24m')], [inhE('9a', '12a')]]),
        m('428', '428', 'Tráfico de influencias por funcionario', [[pr('6m', '2a')], [mp(1, 2, 'beneficio perseguido u obtenido')], [inhE('5a', '9a')]]),
        d('428-ob', '428 in fine', 'Tráfico de influencias obteniendo el beneficio: mitad superior', { penas: [[pr('6m', '2a')], [mp(1, 2, 'beneficio perseguido u obtenido')], [inhE('5a', '9a')]] }, 'mitadSuperior'),
        m('432.1', '432.1', 'Malversación (apropiación de patrimonio público)', [[pr('2a', '6a')], [inhE('6a', '10a')]]),
        m('432.2', '432.2', 'Malversación agravada (grave daño al servicio, más de 50.000 €, bienes culturales)', [[pr('4a', '8a')], [inhA('10a', '20a')]]),
        m('432.2-250', '432.2 in fine', 'Malversación de más de 250.000 €: mitad superior, pudiendo llegar a la superior en grado', [[M.OPS.mitadSuperiorHastaSuperior(pr('4a', '8a'))], [inhA('10a', '20a')]]),
        m('432.3', '432.3', 'Malversación de menos de 4.000 €', [[pr('1a', '2a')], [mu('3m1d', '12m')], [inhE('1a', '5a')]])] },

    // ======================= JUSTICIA =======================
    { id: 'justicia', titulo: 'Contra la Administración de Justicia', nombre: 'Falso testimonio y quebrantamiento',
      modalidades: [m('458.1', '458.1', 'Falso testimonio', [[pr('6m', '2a')], [mu('3m', '6m')]]),
        m('458.2', '458.2', 'Falso testimonio contra el reo en causa criminal', [[pr('1a', '3a')], [mu('6m', '12m')]]),
        d('458.2-cond', '458.2 in fine', 'Falso testimonio contra el reo con sentencia condenatoria: superior en grado', { penas: [[pr('1a', '3a')], [mu('6m', '12m')]] }, 1),
        m('468.1-priv', '468.1', 'Quebrantamiento de condena o medida estando privado de libertad', [[pr('6m', '1a')]]),
        m('468.1', '468.1', 'Quebrantamiento de condena o medida en los demás casos', [[mu('12m', '24m')]]),
        m('468.2', '468.2', 'Quebrantamiento de pena o medida del art. 48 en violencia doméstica o de género', [[pr('6m', '1a')]]),
        m('468.3', '468.3', 'Inutilización de dispositivos telemáticos de control', [[mu('6m', '12m')]])] },

    // ======================= ORDEN PÚBLICO =======================
    { id: 'atentado', titulo: 'Contra el orden público', nombre: 'Atentado, resistencia y desobediencia',
      modalidades: [m('550-aut', '550.2', 'Atentado contra autoridad', [[pr('1a', '4a')], [mu('3m', '6m')]]),
        m('550-ag', '550.2', 'Atentado contra agentes de la autoridad o funcionarios (incl. docentes y sanitarios)', [[pr('6m', '3a')]]),
        m('550.3', '550.3', 'Atentado contra miembros del Gobierno, parlamentarios, jueces, fiscales…', [[pr('1a', '6a')], [mu('6m', '12m')]]),
        m('556.1', '556.1', 'Resistencia o desobediencia grave', [[pr('3m', '1a'), mu('6m', '18m')]]),
        m('556.2', '556.2', 'Falta de respeto y consideración a la autoridad (delito leve)', [[mu('1m', '3m')]])] },
    { id: 'desordenes', titulo: 'Contra el orden público', nombre: 'Desórdenes públicos', preparatorios: false, refPreparatorios: '557.4 (solo 557.2 y 557.3)',
      modalidades: [des1, des2,
        d('557.3-1', '557.3', 'Desórdenes del 557.1 portando instrumentos peligrosos o con pillaje: mitad superior', des1, 'mitadSuperior'),
        d('557.3-2', '557.3', 'Desórdenes del 557.2 portando instrumentos peligrosos o con pillaje: mitad superior', des2, 'mitadSuperior', { preparatorios: true }),
        d('557.3-fuego', '557.3 párr. 2', 'Desórdenes del 557.1 portando armas de fuego: superior en grado', des1, 1),
        m('557.5', '557.5', 'Provocar avalancha o estampida en lugar concurrido', [[pr('6m', '2a')]])] },
    { id: 'armas', titulo: 'Contra el orden público', nombre: 'Tenencia ilícita de armas',
      modalidades: [m('564.1.1', '564.1.1º', 'Tenencia ilícita de armas cortas', [[pr('1a', '2a')]]),
        m('564.1.2', '564.1.2º', 'Tenencia ilícita de armas largas', [[pr('6m', '1a')]]),
        m('564.2-c', '564.2', 'Armas cortas sin marcas, introducidas ilegalmente o transformadas', [[pr('2a', '3a')]]),
        m('564.2-l', '564.2', 'Armas largas sin marcas, introducidas ilegalmente o transformadas', [[pr('1a', '2a')]])] },
    { id: 'organizacion', titulo: 'Contra el orden público', nombre: 'Organización criminal',
      modalidades: [m('570bis-dir-g', '570 bis.1', 'Dirigir u organizar una organización criminal para delitos graves', [[pr('4a', '8a')]]),
        m('570bis-dir', '570 bis.1', 'Dirigir u organizar una organización criminal para otros delitos', [[pr('3a', '6a')]]),
        m('570bis-par-g', '570 bis.1', 'Participar o cooperar en organización criminal para delitos graves', [[pr('2a', '5a')]]),
        m('570bis-par', '570 bis.1', 'Participar o cooperar en organización criminal para otros delitos', [[pr('1a', '3a')]])] },
    { id: 'odio', titulo: 'Contra la Constitución', nombre: 'Delitos de odio (art. 510)',
      modalidades: [m('510.1', '510.1', 'Incitación pública al odio, hostilidad, discriminación o violencia', [[pr('1a', '4a')], [mu('6m', '12m')]]),
        m('510.2', '510.2', 'Lesión de la dignidad por motivos discriminatorios o enaltecimiento', [[pr('6m', '2a')], [mu('6m', '12m')]]),
        d('510.3', '510.3', 'Incitación del 510.1 por medios de comunicación o internet: mitad superior', { penas: [[pr('1a', '4a')], [mu('6m', '12m')]] }, 'mitadSuperior')] }
  ];

  return CATALOGO;
}));
