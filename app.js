/* Interfaz de la calculadora de penas. Depende de motor.js y delitos.js. */
(function () {
  'use strict';

  var M = window.Motor, C = window.DELITOS;
  var ANO = M.ANO;
  var entradas = [], seq = 0;

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function eur(n) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }
  function fecha(d) { return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; }

  function delitoPorId(id) { return C.filter(function (d) { return d.id === id; })[0] || C[0]; }
  function modalidadPorId(d, id) { return d.modalidades.filter(function (m) { return m.id === id; })[0] || d.modalidades[0]; }

  function penaHTML(p) {
    var extra = '';
    if (p.cond) extra += ' <span class="etiqueta">' + esc(p.cond) + '</span>';
    if (p.fac) extra += ' <span class="etiqueta">facultativa</span>';
    if (p.nota) extra += ' <span class="etiqueta">' + esc(p.nota) + '</span>';
    return esc(M.fmtPena(p)) + extra;
  }

  function penasHTML(penas) {
    return penas.map(function (g) {
      return '<span class="pena-linea">' + g.map(penaHTML).join(' <span class="alt">o</span> ') + '</span>';
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Tarjetas de delito
  // ---------------------------------------------------------------------------
  function rellenarDelitos(e, filtro) {
    var sel = $('[data-k="delito"]', e.el), actual = sel.value, f = norm(filtro || '');
    var grupos = {}, orden = [];
    C.forEach(function (d) {
      var texto = norm(d.nombre + ' ' + d.titulo + ' ' + d.modalidades.map(function (m) { return m.nombre + ' art ' + m.art; }).join(' '));
      if (f && texto.indexOf(f) < 0) return;
      if (!grupos[d.titulo]) { grupos[d.titulo] = []; orden.push(d.titulo); }
      grupos[d.titulo].push(d);
    });
    sel.innerHTML = orden.map(function (t) {
      return '<optgroup label="' + esc(t) + '">' + grupos[t].map(function (d) {
        return '<option value="' + d.id + '">' + esc(d.nombre) + '</option>';
      }).join('') + '</optgroup>';
    }).join('') || '<option value="">Sin resultados</option>';
    if (actual && $$('option', sel).some(function (o) { return o.value === actual; })) sel.value = actual;
    rellenarModalidades(e, f);
  }

  function rellenarModalidades(e, filtro) {
    var d = delitoPorId($('[data-k="delito"]', e.el).value), sel = $('[data-k="modalidad"]', e.el), actual = sel.value;
    sel.innerHTML = d.modalidades.map(function (m) {
      return '<option value="' + esc(m.id) + '">Art. ' + esc(m.art) + ' · ' + esc(m.nombre) + '</option>';
    }).join('');
    if (actual && d.modalidades.some(function (m) { return m.id === actual; })) sel.value = actual;
    else if (filtro) {
      var hit = d.modalidades.filter(function (m) { return norm(m.nombre + ' art ' + m.art).indexOf(filtro) >= 0; })[0];
      if (hit) sel.value = hit.id;
    }
  }

  function rellenarCircunstancias(e) {
    $('[data-zona="atenuantes"]', e.el).innerHTML = M.ATENUANTES.map(function (a) {
      return '<div class="fila-atenuante"><label><input type="checkbox" data-at="' + a.id + '"> <span>' + esc(a.nombre) + ' <small>(' + a.art + ')</small></span></label>' +
        '<label class="mc"><input type="checkbox" data-mc="' + a.id + '"> muy cualificada</label></div>';
    }).join('');
    $('[data-zona="agravantes"]', e.el).innerHTML = M.AGRAVANTES.map(function (a) {
      return '<label><input type="checkbox" data-ag="' + a.id + '"> <span>' + esc(a.nombre) + ' <small>(' + a.art + ')</small></span></label>';
    }).join('');
  }

  function leerOpciones(e) {
    var el = e.el, v = function (k) { return $('[data-k="' + k + '"]', el); };
    return {
      ejecucion: v('ejecucion').value,
      gradosEjecucion: num(v('gradosEjecucion').value),
      participacion: v('participacion').value,
      extraneus: v('extraneus').checked,
      eximenteIncompleta: num(v('eximenteIncompleta').value),
      errorProhibicion: num(v('errorProhibicion').value),
      mixta: v('mixta').value,
      gradosRegla2: num(v('gradosRegla2').value),
      compensacion: v('compensacion').value,
      multirreincidencia: v('multirreincidencia').checked,
      facultativas: v('facultativas').checked,
      continuado: v('continuado').value,
      atenuantes: $$('[data-at]', el).filter(function (i) { return i.checked; }).map(function (i) {
        return { id: i.dataset.at, mc: $('[data-mc="' + i.dataset.at + '"]', el).checked };
      }),
      agravantes: $$('[data-ag]', el).filter(function (i) { return i.checked; }).map(function (i) { return i.dataset.ag; })
    };
  }

  function crearEntrada(origen) {
    var el = $('#tpl-delito').content.firstElementChild.cloneNode(true);
    var e = { id: ++seq, el: el, alt: {}, altDe: null, concreta: null, concretaManual: false, multaDias: null, multaManual: false, cuota: 10, base: '' };
    rellenarCircunstancias(e);
    $('#lista-delitos').appendChild(el);
    rellenarDelitos(e, '');
    if (origen) {
      $$('[data-k], [data-at], [data-mc], [data-ag]', origen.el).forEach(function (src) {
        var sel = src.dataset.k ? '[data-k="' + src.dataset.k + '"]' : src.dataset.at ? '[data-at="' + src.dataset.at + '"]' : src.dataset.mc ? '[data-mc="' + src.dataset.mc + '"]' : '[data-ag="' + src.dataset.ag + '"]';
        var dst = $(sel, el);
        if (!dst) return;
        if (src.type === 'checkbox') dst.checked = src.checked;
        else if (src.dataset.k === 'delito') { dst.value = src.value; rellenarModalidades(e); }
        else if (src.dataset.k !== 'buscar') dst.value = src.value;
      });
      ['alt', 'concreta', 'concretaManual', 'multaDias', 'multaManual', 'cuota', 'base'].forEach(function (k) {
        e[k] = k === 'alt' ? JSON.parse(JSON.stringify(origen.alt)) : origen[k];
      });
    }
    el.addEventListener('input', function (ev) { cambio(e, ev); });
    el.addEventListener('change', function (ev) { if (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox' || ev.target.type === 'radio') return; cambio(e, ev); });
    el.addEventListener('click', function (ev) { clic(e, ev); });
    entradas.push(e);
    renumerar();
    recalcular(e);
    return e;
  }

  function reiniciarConcreta(e) { e.alt = {}; e.concretaManual = false; e.multaManual = false; }

  function cambio(e, ev) {
    var t = ev.target, k = t.dataset.k, parcial = false;
    if (k === 'buscar') { rellenarDelitos(e, t.value); reiniciarConcreta(e); }
    else if (k === 'delito') { rellenarModalidades(e); reiniciarConcreta(e); }
    else if (k === 'modalidad') reiniciarConcreta(e);
    else if (t.dataset.alt != null) { e.alt[t.dataset.alt] = num(t.value); e.concretaManual = false; e.multaManual = false; }
    else if (t.dataset.conc) {
      var z = $('[data-zona="concreta"]', e.el);
      e.concreta = num($('[data-conc="a"]', z).value) * ANO + num($('[data-conc="m"]', z).value) * M.MES + num($('[data-conc="d"]', z).value);
      if (e.principal && e.principal.t !== 'prision' && $('[data-conc="n"]', z)) e.concreta = num($('[data-conc="n"]', z).value);
      e.concretaManual = true; parcial = true;
    } else if (t.dataset.multa) {
      if (t.dataset.multa === 'dias') { e.multaDias = num(t.value); e.multaManual = true; }
      if (t.dataset.multa === 'cuota') e.cuota = parseFloat(t.value) || 0;
      if (t.dataset.multa === 'base') e.base = t.value;
      parcial = true;
    }
    recalcular(e, parcial);
  }

  function clic(e, ev) {
    var b = ev.target.closest('[data-accion]');
    if (!b) return;
    var a = b.dataset.accion;
    if (a === 'eliminar') {
      if (entradas.length === 1) return;
      entradas.splice(entradas.indexOf(e), 1);
      e.el.remove();
      renumerar();
      recalcularGlobal();
    } else if (a === 'duplicar') {
      crearEntrada(e);
    } else if (a.indexOf('conc-') === 0 && e.principal) {
      var p = e.principal;
      e.concreta = a === 'conc-min' ? p.min : a === 'conc-max' ? p.max : Math.floor((p.min + p.max) / 2);
      e.concretaManual = true;
      recalcular(e);
    }
  }

  function renumerar() {
    entradas.forEach(function (e, i) { $('.delito__num', e.el).textContent = i + 1; });
    $$('[data-accion="eliminar"]').forEach(function (b) { b.disabled = entradas.length === 1; });
  }

  // ---------------------------------------------------------------------------
  // Cálculo y presentación de un delito
  // ---------------------------------------------------------------------------
  function recalcular(e, parcial) {
    var el = e.el, d = delitoPorId($('[data-k="delito"]', el).value), mod = modalidadPorId(d, $('[data-k="modalidad"]', el).value);
    var o = leerOpciones(e);

    $('[data-mostrar="grados-ejecucion"]', el).hidden = o.ejecucion === 'consumado';
    $('[data-mostrar="extraneus"]', el).hidden = !(o.participacion === 'inductor' || o.participacion === 'cooperador');
    var nC = o.atenuantes.length + o.agravantes.length + (o.mixta !== 'no' ? 1 : 0);
    $('[data-zona="contador"]', el).textContent = nC ? '(' + nC + ' seleccionada' + (nC > 1 ? 's' : '') + ')' : '';

    // Alternativas: el primer grupo es la pena principal
    if (e.altDe !== mod.id) {
      e.altDe = mod.id;
      $('[data-zona="alternativas"]', el).innerHTML = mod.penas.map(function (g, gi) {
        if (g.length < 2) return '';
        return '<fieldset><legend>Pena alternativa que se elige' + (gi === 0 ? ' (principal)' : '') + '</legend>' + g.map(function (p, pi) {
          return '<label><input type="radio" name="alt-' + e.id + '-' + gi + '" data-alt="' + gi + '" value="' + pi + '"' + ((e.alt[gi] || 0) === pi ? ' checked' : '') + '> ' + esc(M.TIPOS[p.t].nombre) + '</label>';
        }).join('') + '</fieldset>';
      }).join('');
    }

    var res = M.individualizar(mod, d, o);
    var principal = res.final[0][e.alt[0] || 0] || res.final[0][0];
    e.d = d; e.mod = mod; e.res = res; e.principal = principal;

    // Pasos y marco final
    var html = '<h3>Recorrido penológico</h3><ol class="pasos">' + res.pasos.map(function (p) {
      return '<li><div>' + esc(p.titulo) + '</div><div class="ref">' + esc(p.ref) + '</div><div class="penas">' + penasHTML(p.penas) + '</div></li>';
    }).join('') + '</ol>';
    html += '<div class="marco-final"><h3>Marco penal resultante</h3><div class="principal">' + penaHTML(principal) + '</div>';
    var resto = res.final.map(function (g, gi) { return gi === 0 ? g.filter(function (p) { return p !== principal; }) : g; })
      .filter(function (g) { return g.length; });
    if (resto.length) html += '<div>' + resto.map(function (g, gi) {
      var esAltPrincipal = gi === 0 && res.final[0].length > 1 && g.indexOf(principal) < 0 && res.final[0].indexOf(g[0]) >= 0;
      return '<span class="pena-linea">' + (esAltPrincipal ? '<span class="alt">Alternativa no elegida: </span>' : '+ ') + g.map(penaHTML).join(' <span class="alt">o</span> ') + '</span>';
    }).join('') + '</div>';
    html += '</div>';
    if (res.avisos.length) html += '<ul class="avisos">' + res.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>';
    $('[data-zona="salida"]', el).innerHTML = html;

    // Pena concreta
    if (principal.t === 'ppr') e.concreta = null;
    else if (!e.concretaManual || e.concreta == null) e.concreta = principal.t === 'multa_prop' ? null : principal.min;
    if (!parcial) pintarConcreta(e);
    pintarMulta(e, parcial);
    pintarEfectos(e);
    recalcularGlobal();
  }

  function pintarConcreta(e) {
    var p = e.principal, z = $('[data-zona="concreta"]', e.el);
    if (p.t === 'ppr') { z.innerHTML = '<p>Pena única: <strong>prisión permanente revisable</strong> (revisión conforme al art. 92; tercer grado no antes de 15 o 20 años, art. 36.1).</p>'; return; }
    if (p.t === 'multa_prop') { z.innerHTML = '<p>La pena principal es una multa proporcional: indique la base de cálculo más abajo.</p>'; return; }
    var u = M.TIPOS[p.t].unidad, x = M.desglose(e.concreta), campos;
    if (u === 'tiempo') {
      campos = '<fieldset class="duracion"><legend>' + esc(M.TIPOS[p.t].nombre) + '</legend>' +
        '<input type="number" min="0" data-conc="a" value="' + x.a + '" aria-label="años"><span>años</span>' +
        '<input type="number" min="0" max="11" data-conc="m" value="' + x.m + '" aria-label="meses"><span>meses</span>' +
        '<input type="number" min="0" max="29" data-conc="d" value="' + x.d + '" aria-label="días"><span>días</span></fieldset>';
    } else {
      campos = '<label>' + esc(M.TIPOS[p.t].nombre) + ' (' + (u === 'diasmulta' ? 'días-multa' : u === 'jornadas' ? 'jornadas' : 'días') + ')' +
        '<input type="number" min="1" data-conc="n" value="' + e.concreta + '"></label>';
    }
    z.innerHTML = '<div class="concreta-fila">' + campos +
      '<div class="botones"><button type="button" class="boton boton--mini" data-accion="conc-min">Mínimo</button>' +
      '<button type="button" class="boton boton--mini" data-accion="conc-mid">Punto medio</button>' +
      '<button type="button" class="boton boton--mini" data-accion="conc-max">Máximo</button></div></div>' +
      '<div data-zona="fuera"></div>';
  }

  function pintarMulta(e, parcial) {
    var z = $('[data-zona="multa"]', e.el), p = e.principal, html = '';
    var multas = [], props = [];
    e.res.final.forEach(function (g, gi) {
      var elegida = gi === 0 ? p : g[e.alt[gi] || 0];
      if (elegida && elegida.t === 'multa') multas.push({ pena: elegida, principal: elegida === p });
      if (elegida && elegida.t === 'multa_prop') props.push(elegida);
    });
    var m = multas[0];
    if (m) {
      if (m.principal) e.multaDias = e.concreta;
      else if (!e.multaManual || e.multaDias == null) e.multaDias = m.pena.min;
      var c = M.multaCuantia(e.multaDias, e.cuota);
      html += '<h3>Multa por días-cuota (arts. 50 y 53)</h3><div class="concreta-fila">';
      if (!m.principal) html += '<label>Días-multa (' + esc(M.fmtValor('multa', m.pena.min)) + ' a ' + esc(M.fmtValor('multa', m.pena.max)) + ')<input type="number" min="1" data-multa="dias" value="' + e.multaDias + '"></label>';
      html += '<label>Cuota diaria (2 a 400 €)<input type="number" min="2" max="400" step="0.5" data-multa="cuota" value="' + e.cuota + '"></label></div>';
      html += '<div class="chips"><div class="chip"><b>Importe total</b>' + eur(c.total) + ' (' + e.multaDias + ' cuotas × ' + eur(c.cuota) + ')</div>' +
        '<div class="chip"><b>Responsabilidad personal subsidiaria</b>' + (e.principal.t === 'prision' && e.concreta > 5 * ANO ? 'No se impone: prisión superior a 5 años (art. 53.3)' : esc(M.fmtTiempo(c.subsidiaria)) + ' de privación de libertad si no se paga (1 día por cada 2 cuotas; también por TBC con conformidad)') + '</div></div>';
      if (e.cuota < 2 || e.cuota > 400) html += '<p class="fuera">La cuota debe estar entre 2 y 400 € (art. 50.4).</p>';
    }
    if (props.length) {
      var base = parseFloat(String(e.base).replace(',', '.')) || 0;
      html += '<h3>Multa proporcional</h3><div class="concreta-fila"><label>Importe de referencia (' + esc(props[0].base || 'base') + ') en €<input type="number" min="0" step="0.01" data-multa="base" value="' + esc(e.base) + '"></label></div>';
      if (base) html += '<div class="chips">' + props.map(function (q) {
        return '<div class="chip"><b>' + esc(M.fmtPena(q)) + '</b>De ' + eur(base * q.min) + ' a ' + eur(base * q.max) + '</div>';
      }).join('') + '<div class="chip"><b>Responsabilidad subsidiaria</b>A prudente arbitrio, máximo 1 año (art. 53.2)</div></div>';
    }
    if (parcial) {
      // Actualiza solo los importes sin perder el foco del campo que se está editando
      var activo = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.multa : null;
      if (activo) {
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        $$('.chips', z).forEach(function (n, i) { var nuevo = $$('.chips', tmp)[i]; if (nuevo) n.innerHTML = nuevo.innerHTML; });
        if ($$('.chips', tmp).length !== $$('.chips', z).length) z.innerHTML = html;
        return;
      }
    }
    z.innerHTML = html;
  }

  function chip(t, v) { return '<div class="chip"><b>' + esc(t) + '</b>' + v + '</div>'; }

  function pintarEfectos(e) {
    var p = e.principal, res = e.res, html = '<div class="chips">';
    html += chip('Clase de delito (arts. 13 y 33)', esc(res.clase.charAt(0).toUpperCase() + res.clase.slice(1)) + (res.imprudente ? ' · imprudente' : ''));
    var pd = M.prescripcionDelito(e.mod.penas, { prescripcionAnual: e.d.prescripcionAnual });
    html += chip('Prescripción del delito', pd.anos + ' años <small>(' + esc(pd.motivo) + ')</small>');
    var fz = $('[data-zona="fuera"]', e.el);
    if (fz) fz.innerHTML = '';
    if (p.t === 'ppr') {
      html += chip('Prescripción de la pena', '30 años <small>(art. 133.1)</small>');
      html += chip('Penas accesorias', esc(M.accesorias(0, true)));
    } else if (e.concreta != null) {
      if (fz && (e.concreta < p.min || e.concreta > p.max)) fz.innerHTML = '<p class="fuera">La pena concreta está fuera del marco resultante (' + esc(M.fmtValor(p.t, p.min)) + ' a ' + esc(M.fmtValor(p.t, p.max)) + ').</p>';
      html += chip('Pena concreta', '<strong>' + esc(M.TIPOS[p.t].nombre + ' de ' + M.fmtValor(p.t, e.concreta)) + '</strong> · pena ' + esc(M.claseValor(p.t, e.concreta) || '—'));
      var pp = M.prescripcionPena(p.t, e.concreta);
      html += chip('Prescripción de la pena impuesta', pp.anos + (pp.anos === 1 ? ' año' : ' años') + ' <small>(' + esc(pp.motivo) + ')</small>');
      var ca = M.cancelacion(p.t, e.concreta, res.imprudente);
      html += chip('Cancelación de antecedentes', esc(ca.plazo) + ' sin delinquir desde la extinción <small>(' + esc(ca.motivo) + ')</small>');
      if (p.t === 'prision') {
        html += chip('Penas accesorias', esc(M.accesorias(e.concreta)));
        var s = M.sustitucion712(e.concreta);
        if (s) html += chip('Sustitución obligatoria', esc(s.texto) + ' Equivale a ' + s.multa + ' cuotas de multa, ' + s.tbc + ' jornadas de TBC o ' + s.localizacion + ' días de localización permanente.');
      }
    }
    html += '</div>';
    $('[data-zona="efectos"]', e.el).innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Resultado global
  // ---------------------------------------------------------------------------
  function recalcularGlobal() {
    var tipo = $('#c-concurso').value;
    var items = entradas.map(function (e, i) {
      var p = e.principal;
      return {
        nombre: 'Delito ' + (i + 1) + ' (art. ' + e.mod.art + ')',
        concreta: p.t === 'prision' ? e.concreta : null,
        ppr: p.t === 'ppr',
        maxAbstracto: M.maxPrision(e.mod.penas).max,
        rango: p.t === 'prision' ? { min: p.min, max: p.max } : null
      };
    });
    var c = M.concurso(tipo, items, { terrorismo: $('#c-terrorismo').checked });
    var abono = num($('#c-abono').value);
    var html = '<h3>Penas impuestas</h3><div class="desplazable"><table class="tabla"><thead><tr><th>Delito</th><th>Pena principal concreta</th></tr></thead><tbody>';
    entradas.forEach(function (e, i) {
      var p = e.principal;
      var txt = p.t === 'ppr' ? 'Prisión permanente revisable' : e.concreta != null ? M.TIPOS[p.t].nombre + ' de ' + M.fmtValor(p.t, e.concreta) : M.fmtPena(p);
      html += '<tr><td>' + (i + 1) + '. ' + esc(e.mod.nombre) + ' <small>(art. ' + esc(e.mod.art) + ')</small></td><td>' + esc(txt) + '</td></tr>';
    });
    html += '</tbody></table></div>';

    var privativas = items.filter(function (i) { return i.concreta != null; });
    if (c.ppr) {
      html += '<p class="cifra">Prisión permanente revisable</p>';
    } else if (privativas.length) {
      if (c.rango) html += '<h3>Marco del concurso</h3><p>' + esc(M.fmtTiempo(c.rango.min)) + ' a ' + esc(M.fmtTiempo(c.rango.max)) + ' de prisión</p>';
      html += '<h3>' + (c.tipo === 'real' && privativas.length > 1 ? 'Cumplimiento efectivo máximo de prisión' : 'Prisión a cumplir') + '</h3>';
      html += '<p class="cifra">' + esc(M.fmtTiempo(c.efectiva)) + '</p>';
      if (privativas.length > 1) html += '<p>Suma aritmética: ' + esc(M.fmtTiempo(c.suma)) + (c.limite && isFinite(c.limite) ? ' · Límite del art. 76: ' + esc(M.fmtTiempo(c.limite)) : '') + '</p>';
    } else {
      html += '<p>No hay penas de prisión: no se aplican los límites del art. 76 ni la libertad condicional.</p>';
    }
    if (c.notas.length) html += '<ul class="avisos">' + c.notas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    if (tipo !== 'real' && privativas.length < 2) html += '<ul class="avisos"><li>El concurso ideal o medial requiere al menos dos delitos castigados con prisión.</li></ul>';

    // Suspensión y sustitución
    var penasInd = privativas.map(function (i) { return i.concreta; });
    var totalSusp = c.tipo === 'real' ? c.suma : c.efectiva;
    var leves = entradas.every(function (e) { return e.res.clase === 'leve'; });
    var sus = M.suspension({
      penas: penasInd, total: totalSusp, ppr: c.ppr, leves: leves,
      primario: $('#c-primario').checked, respCivil: $('#c-respcivil').checked, habitual: $('#c-habitual').checked,
      drogodependencia: $('#c-droga').checked, enfermo: $('#c-enfermo').checked, extranjero: $('#c-extranjero').checked
    });
    html += '<h3>Suspensión y sustitución (arts. 80 a 89)</h3>' + sus.map(function (s) {
      return '<div class="estado ' + (s.ok ? 'estado--ok' : 'estado--no') + '"><span class="art">Art. ' + esc(s.art) + '.</span> ' + esc(s.texto) + '</div>';
    }).join('');

    // Libertad condicional y fechas
    if (!c.ppr && c.efectiva > 0) {
      var f = $('#c-fecha').value ? new Date($('#c-fecha').value + 'T00:00:00') : null;
      var sexual = entradas.some(function (e) { return e.d.titulo === 'Contra la libertad sexual'; });
      var lc = M.libertadCondicional(c.efectiva, { primario: $('#c-primario').checked, sexual: sexual, terrorismo: $('#c-terrorismo').checked });
      html += '<h3>Libertad condicional y tercer grado (arts. 36.2 y 90)</h3><div class="desplazable"><table class="tabla"><thead><tr><th>Supuesto</th><th>Cumplido</th>' + (f ? '<th>Fecha estimada</th>' : '') + '</tr></thead><tbody>';
      lc.forEach(function (x) {
        var dias = Math.max(0, x.dias - abono);
        html += '<tr><td><strong>Art. ' + esc(x.art) + '</strong> · ' + esc(x.texto) + '</td><td>' + esc(x.fraccion) + ': ' + esc(M.fmtTiempo(x.dias)) + '</td>' + (f ? '<td>' + fecha(M.sumarFecha(f, dias)) + '</td>' : '') + '</tr>';
      });
      var licencia = Math.max(0, c.efectiva - abono);
      html += '<tr><td><strong>Licenciamiento definitivo</strong></td><td>' + esc(M.fmtTiempo(c.efectiva)) + (abono ? ' (− ' + abono + ' días de abono)' : '') + '</td>' + (f ? '<td>' + fecha(M.sumarFecha(f, licencia)) + '</td>' : '') + '</tr>';
      html += '</tbody></table></div>';
      if (!f) html += '<p><small>Indique la fecha de inicio de cumplimiento para obtener fechas estimadas.</small></p>';
      if ($('#c-terrorismo').checked) html += '<ul class="avisos"><li>Terrorismo u organización criminal: no se aplican los apartados 2 y 3 del art. 90 y se exigen los requisitos del art. 90.8.</li></ul>';
    }
    $('#resumen-salida').innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Calculadora rápida de grados
  // ---------------------------------------------------------------------------
  function calcGrados() {
    var t = $('#g-tipo').value;
    var leer = function (p) { return num($('#g-' + p + '-a').value) * ANO + num($('#g-' + p + '-m').value) * M.MES + num($('#g-' + p + '-d').value); };
    var p = { t: t, min: leer('min'), max: leer('max') };
    var filas;
    if (!p.max || p.min > p.max) filas = [['Error', 'El mínimo debe ser menor o igual que el máximo.']];
    else filas = [
      ['Pena tipo', p],
      ['Mitad inferior', M.mitadInferior(p)],
      ['Mitad superior', M.mitadSuperior(p)],
      ['Superior en grado', M.superior(p)],
      ['Superior en dos grados', M.grados(p, 2)],
      ['Inferior en grado', M.inferior(p)],
      ['Inferior en dos grados', M.grados(p, -2)],
      ['Continuado (art. 74.1)', M.continuado(p)],
      ['Superior en grado, mitad inferior (art. 66.1.4ª)', M.mitadInferior(M.superior(p))]
    ];
    $('#g-resultado').innerHTML = '<tbody>' + filas.map(function (f) {
      return '<tr><th>' + esc(f[0]) + '</th><td>' + (typeof f[1] === 'string' ? esc(f[1]) : esc(M.fmtValor(t, f[1].min) + ' a ' + M.fmtValor(t, f[1].max)) + (f[1].nota ? ' <span class="etiqueta">' + esc(f[1].nota) + '</span>' : '')) + '</td></tr>';
    }).join('') + '</tbody>';
  }

  // ---------------------------------------------------------------------------
  // Tema
  // ---------------------------------------------------------------------------
  function aplicarTema(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  try { aplicarTema(localStorage.getItem('tema')); } catch (err) { /* sin almacenamiento */ }
  $('#btn-tema').addEventListener('click', function () {
    var actual = document.documentElement.getAttribute('data-theme');
    var oscuro = actual ? actual === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var nuevo = oscuro ? 'light' : 'dark';
    aplicarTema(nuevo);
    try { localStorage.setItem('tema', nuevo); } catch (err) { /* sin almacenamiento */ }
  });

  $('#btn-imprimir').addEventListener('click', function () { window.print(); });
  $('#btn-anadir').addEventListener('click', function () {
    var e = crearEntrada();
    e.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#resumen').addEventListener('input', recalcularGlobal);
  $('#resumen').addEventListener('change', recalcularGlobal);
  $('#herramienta-grados').addEventListener('input', calcGrados);
  $('#herramienta-grados').addEventListener('change', calcGrados);

  crearEntrada();
  calcGrados();
}());
