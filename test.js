// Pruebas del motor penológico: node test.js
'use strict';
const assert = require('assert');
const M = require('./motor');
const C = require('./delitos');

const A = M.ANO, D = M.dur;
const pr = (a, b) => ({ t: 'prision', min: D(a), max: D(b) });
let n = 0;
function caso(nombre, fn) { fn(); n++; console.log('✓ ' + nombre); }
function rango(p, a, b) { assert.deepStrictEqual([p.min, p.max], [D(a), D(b)]); }
const modalidad = (d, m) => C.find(x => x.id === d).modalidades.find(x => x.id === m);

caso('Art. 70.1.1ª: superior en grado del homicidio (10-15) = 15a1d-22a6m', () => rango(M.superior(pr('10a', '15a')), '15a1d', '22a6m'));
caso('Art. 70.1.2ª: inferior en grado del homicidio = 5a-9a11m29d', () => rango(M.inferior(pr('10a', '15a')), '5a', '9a11m29d'));
caso('Mitad superior del homicidio = 12a6m1d-15a', () => rango(M.mitadSuperior(pr('10a', '15a')), '12a6m1d', '15a'));
caso('Mitad inferior del hurto (6-18 meses) = 6m-12m', () => rango(M.mitadInferior(pr('6m', '18m')), '6m', '12m'));
caso('Art. 70.3: superior en grado de 15-25 años topa en 30 años', () => rango(M.superior(pr('15a', '25a')), '25a1d', '30a'));
caso('Art. 70.4: inferior en grado a la PPR = 20-30 años', () => rango(M.inferior({ t: 'ppr' }), '20a', '30a'));
caso('Inferior en dos grados a la PPR = 10a-19a11m29d', () => rango(M.grados({ t: 'ppr' }, -2), '10a', '19a11m29d'));
caso('Art. 70.3.9º: multa superior en grado topa en 30 meses', () => rango(M.superior({ t: 'multa', min: D('12m'), max: D('24m') }), '24m1d', '30m'));
caso('Art. 74.1: continuado de estafa (6m-3a) = 1a9m1d-3a9m', () => rango(M.continuado(pr('6m', '3a')), '1a9m1d', '3a9m'));

caso('Clase: homicidio imprudente menos grave (multa 3-18 m) es delito leve (art. 13.4)', () => assert.strictEqual(M.claseDelito(modalidad('homicidio_imprudente', '142.2').penas), 'leve'));
caso('Clase: robo con violencia (2-5 años) es menos grave', () => assert.strictEqual(M.claseDelito(modalidad('robo_violencia', '242.1').penas), 'menos grave'));
caso('Clase: homicidio es grave', () => assert.strictEqual(M.claseDelito(modalidad('homicidio', '138.1').penas), 'grave'));

caso('Tentativa de homicidio con una atenuante: 5a a 7a5m29d', () => {
  const r = M.individualizar(modalidad('homicidio', '138.1'), C[0], { ejecucion: 'tentativa', gradosEjecucion: 1, atenuantes: [{ id: 'confesion' }] });
  rango(r.final[0][0], '5a', '7a5m29d');
  assert.strictEqual(r.regla, '66.1.1ª');
});
caso('Cómplice de robo con violencia: inferior en grado (1a-1a11m29d)', () => {
  const r = M.individualizar(modalidad('robo_violencia', '242.1'), null, { participacion: 'complice' });
  rango(r.final[0][0], '1a', '1a11m29d');
});
caso('Dos atenuantes sin agravantes: inferior en un grado', () => {
  const r = M.individualizar(modalidad('robo_violencia', '242.1'), null, { atenuantes: [{ id: 'confesion' }, { id: 'reparacion' }], gradosRegla2: 1 });
  rango(r.final[0][0], '1a', '1a11m29d');
});
caso('Tres agravantes: superior en grado en su mitad inferior', () => {
  const r = M.individualizar(modalidad('robo_violencia', '242.1'), null, { agravantes: ['disfraz', 'precio', 'reincidencia'] });
  rango(r.final[0][0], '5a1d', '6a3m');
  assert.strictEqual(r.regla, '66.1.4ª');
});
caso('Imprudente: no se aplican las reglas del art. 66.1', () => {
  const d = C.find(x => x.id === 'homicidio_imprudente');
  const r = M.individualizar(d.modalidades[0], d, { agravantes: ['reincidencia'] });
  assert.strictEqual(r.regla, '66.2');
  rango(r.final[0][0], '1a', '4a');
});
caso('Asesinato hiperagravado en tentativa: 20-30 años', () => {
  const r = M.individualizar(modalidad('asesinato', '140.1'), null, { ejecucion: 'tentativa', gradosEjecucion: 1 });
  rango(r.final[0][0], '20a', '30a');
});

caso('Art. 76: tres robos de 5 años → límite triple 15 años', () => {
  const it = { concreta: D('5a'), maxAbstracto: D('5a'), rango: { min: D('2a'), max: D('5a') } };
  const c = M.concurso('real', [it, it, it, it]);
  assert.strictEqual(c.suma, D('20a'));
  assert.strictEqual(c.efectiva, D('15a'));
});
caso('Art. 76: tope de 20 años con delitos menores', () => {
  const it = { concreta: D('9a'), maxAbstracto: D('12a'), rango: { min: D('6a'), max: D('12a') } };
  const c = M.concurso('real', [it, it, it]);
  assert.strictEqual(c.efectiva, D('20a'));
});
caso('Art. 76.1.b: tope de 30 años si un delito tiene más de 20 años', () => {
  const a = { concreta: D('25a'), maxAbstracto: D('25a'), rango: { min: D('15a'), max: D('25a') } };
  const b = { concreta: D('15a'), maxAbstracto: D('15a'), rango: { min: D('10a'), max: D('15a') } };
  assert.strictEqual(M.concurso('real', [a, b]).efectiva, D('30a'));
});
caso('Art. 77.3: medial = desde la concreta más grave + 1 día hasta la suma', () => {
  const a = { concreta: D('2a'), maxAbstracto: D('3a'), rango: { min: D('6m'), max: D('3a') } };
  const b = { concreta: D('1a'), maxAbstracto: D('3a'), rango: { min: D('6m'), max: D('3a') } };
  const c = M.concurso('medial', [a, b]);
  assert.deepStrictEqual([c.rango.min, c.rango.max], [D('2a1d'), D('3a')]);
});

caso('Art. 80: pena de 2 años a primario con RC satisfecha es suspendible', () => {
  const s = M.suspension({ penas: [D('2a')], total: D('2a'), primario: true, respCivil: true });
  assert.ok(s[0].ok);
});
caso('Art. 80.3: dos penas de 18 meses (suma > 2 años) → excepcional', () => {
  const s = M.suspension({ penas: [D('18m'), D('18m')], total: D('3a'), primario: true, respCivil: true });
  assert.ok(!s[0].ok && s[1].ok);
});
caso('Art. 131: homicidio (máx. 15 años) prescribe a los 20; detención ilegal a los 10; robo con violencia a los 5', () => {
  assert.strictEqual(M.prescripcionDelito(modalidad('homicidio', '138.1').penas).anos, 20);
  assert.strictEqual(M.prescripcionDelito(modalidad('detencion', '163.1').penas).anos, 10);
  assert.strictEqual(M.prescripcionDelito(modalidad('robo_violencia', '242.1').penas).anos, 5);
});
caso('Art. 136: cancelación de 2 años para pena de 1 año', () => assert.strictEqual(M.cancelacion('prision', D('1a')).plazo, '2 años'));
caso('Art. 71.2: prisión de 2 meses se sustituye (120 cuotas)', () => assert.strictEqual(M.sustitucion712(D('2m')).multa, 120));
caso('Catálogo: todos los marcos son coherentes (mín ≤ máx)', () => {
  C.forEach(d => d.modalidades.forEach(m => m.penas.forEach(g => g.forEach(p => {
    if (p.t !== 'ppr') assert.ok(p.min <= p.max, d.id + ' ' + m.id);
  }))));
});

console.log('\n' + n + ' pruebas superadas');
