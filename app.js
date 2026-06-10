// ══════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════════════════
//
//  La base de datos usa la DIRECCIÓN como clave,
//  igual que el sistema Python:
//  { "Av. Corrientes 1234": { nombre, sitio, direccion, equipos } }

let db = cargarDB();
let clienteActual = null;

// Etiquetas legibles para cada tipo de equipo
const TIPO_LABEL = {
  Split:       'Split Pared',
  BajaSilueta: 'Baja Silueta',
  Rooftop:     'Rooftop'
};


// ══════════════════════════════════════════════════════
//  BASE DE DATOS LOCAL (localStorage)
// ══════════════════════════════════════════════════════

function cargarDB() {
  try { return JSON.parse(localStorage.getItem('ann_db') || '{}'); }
  catch { return {}; }
}

function guardarDB() {
  localStorage.setItem('ann_db', JSON.stringify(db));
}

// Guarda el cliente actual en la base y persiste
function syncDB() {
  db[clienteActual.direccion] = clienteActual;
  guardarDB();
}


// ══════════════════════════════════════════════════════
//  UTILIDADES GENERALES
// ══════════════════════════════════════════════════════

// Muestra una notificación temporal en la esquina inferior derecha
function toast(msg, ms = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.display = 'none', ms);
}

// Muestra el paso indicado (1 a 4) y oculta los demás
function activarPaso(n) {
  for (let i = 1; i <= 4; i++) {
    const s   = document.getElementById(`step${i}`);
    const sec = document.getElementById(`section${i}`);
    if (i < n)       { s.className = 'step done';   sec.style.display = 'none'; }
    else if (i === n){ s.className = 'step active'; sec.style.display = 'block'; }
    else             { s.className = 'step';        sec.style.display = 'none'; }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irPaso(n) { activarPaso(n); }

// Mostrar la fecha actual en el header
document.getElementById('headerFecha').textContent =
  new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });


// ══════════════════════════════════════════════════════
//  PASO 1 — CLIENTE
// ══════════════════════════════════════════════════════

function buscarCliente() {
  const dir = document.getElementById('buscar_dir').value.trim();
  if (!dir) { toast('Ingresá una dirección'); return; }

  if (db[dir]) {
    // Cliente encontrado → cargarlo y pasar a equipos
    clienteActual = JSON.parse(JSON.stringify(db[dir])); // copia profunda
    toast(`Cliente encontrado: ${clienteActual.nombre}`);
    irPasoEquipos();
  } else {
    // No existe → mostrar formulario de registro
    document.getElementById('formNuevoCliente').style.display = 'block';
    document.getElementById('listaClientesCard').style.display = 'none';
    toast('Dirección nueva — completá los datos del cliente');
  }
}

function registrarCliente() {
  const dir    = document.getElementById('buscar_dir').value.trim();
  const nombre = document.getElementById('nuevo_nombre').value.trim();
  const sitio  = document.getElementById('nuevo_sitio').value.trim();
  if (!nombre) { toast('El nombre es obligatorio'); return; }

  clienteActual = { nombre, sitio, direccion: dir, equipos: [] };
  db[dir] = clienteActual;
  guardarDB();
  document.getElementById('formNuevoCliente').style.display = 'none';
  toast('Cliente registrado');
  irPasoEquipos();
}

function cancelarNuevoCliente() {
  document.getElementById('formNuevoCliente').style.display = 'none';
}

function mostrarListaClientes() {
  document.getElementById('listaClientesCard').style.display = 'block';
  document.getElementById('formNuevoCliente').style.display = 'none';

  const cont = document.getElementById('listaClientesContenido');
  const dirs = Object.keys(db);

  if (!dirs.length) {
    cont.innerHTML = '<p style="color:var(--muted);font-size:13px;">No hay clientes registrados aún.</p>';
    return;
  }

  cont.innerHTML = dirs.map(dir => {
    const c = db[dir];
    return `
      <div class="client-item" onclick="seleccionarClienteDeLista('${dir.replace(/'/g,"\\'")}')">
        <div class="client-info">
          <strong>${c.nombre}</strong>
          <span>${dir}${c.sitio ? ' · ' + c.sitio : ''}</span>
        </div>
        <div class="client-count">${c.equipos.length} equipo(s)</div>
        <button class="btn-icon" style="color:var(--danger)"
          onclick="event.stopPropagation(); eliminarCliente('${dir.replace(/'/g,"\\'")}')">x</button>
      </div>`;
  }).join('');
}

function ocultarListaClientes() {
  document.getElementById('listaClientesCard').style.display = 'none';
}

function seleccionarClienteDeLista(dir) {
  clienteActual = JSON.parse(JSON.stringify(db[dir]));
  document.getElementById('buscar_dir').value = dir;
  ocultarListaClientes();
  toast(`${clienteActual.nombre}`);
  irPasoEquipos();
}

function eliminarCliente(dir) {
  if (!confirm(`¿Eliminar a "${db[dir].nombre}"? Se perderán todos sus equipos.`)) return;
  delete db[dir];
  guardarDB();
  mostrarListaClientes();
  toast('Cliente eliminado');
}


// ══════════════════════════════════════════════════════
//  PASO 2 — EQUIPOS
// ══════════════════════════════════════════════════════

function irPasoEquipos() {
  renderClienteResumen();
  renderListaEquipos();
  document.getElementById('btnIrChecklist').disabled = clienteActual.equipos.length === 0;
  activarPaso(2);
}

function renderClienteResumen() {
  const c = clienteActual;
  document.getElementById('clienteResumen').innerHTML =
    `<strong style="color:var(--text);font-size:15px;">${c.nombre}</strong> &nbsp;·&nbsp;
     ${c.direccion}${c.sitio ? ' &nbsp;·&nbsp; ' + c.sitio : ''}`;
}

function renderListaEquipos() {
  const cont = document.getElementById('listaEquipos');
  if (!clienteActual.equipos.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = clienteActual.equipos.map((eq, i) => {
    const tieneManto = eq.mantenimiento && Object.keys(eq.mantenimiento).length > 0;
    return `
      <div class="eq-item">
        <div class="eq-badge ${tieneManto ? 'ok' : 'pendiente'}">
          ${TIPO_LABEL[eq.clase] || eq.clase}
        </div>
        <div class="eq-info">
          <strong>${eq.marca} ${eq.modelo}</strong>
          ${eq.ubicacion} · ${eq.refrigerante || '—'} · ${eq.frigorias ? eq.frigorias + ' fg' : '—'}
          ${tieneManto ? '<span style="color:var(--accent);font-size:11px;margin-left:6px;">con mantenimiento</span>' : ''}
        </div>
        <button class="btn-icon" onclick="eliminarEquipo(${i})" title="Eliminar">x</button>
      </div>`;
  }).join('');
}

function agregarEquipo() {
  const ubicacion       = document.getElementById('eq_ubicacion').value.trim();
  const clase           = document.getElementById('eq_tipo').value;
  const marca           = document.getElementById('eq_marca').value.trim();
  const modelo          = document.getElementById('eq_modelo').value.trim();
  const frigorias       = document.getElementById('eq_frigorias').value;
  const consumo_kw      = document.getElementById('eq_consumo_kw').value;
  const refrigerante    = document.getElementById('eq_refrigerante').value;
  const refrigerante_gs = document.getElementById('eq_refrigerante_gs').value;

  // Validaciones
  if (!ubicacion || !clase)              { toast('Ubicación y tipo son obligatorios'); return; }
  if (frigorias && Number(frigorias) < 0)   { toast('Frigorías no puede ser negativo'); return; }
  if (consumo_kw && Number(consumo_kw) < 0) { toast('Consumo no puede ser negativo'); return; }

  const nuevo = {
    clase, ubicacion, marca, modelo,
    frigorias:       frigorias       ? Number(frigorias)       : '',
    consumo_kw:      consumo_kw      ? Number(consumo_kw)      : '',
    refrigerante,
    refrigerante_gs: refrigerante_gs ? Number(refrigerante_gs) : '',
    mantenimiento: {}
  };

  // Insertar y ordenar alfabéticamente por ubicación (igual que el .py)
  clienteActual.equipos.push(nuevo);
  clienteActual.equipos.sort((a, b) =>
    a.ubicacion.toLowerCase().localeCompare(b.ubicacion.toLowerCase())
  );

  syncDB();
  renderListaEquipos();
  document.getElementById('btnIrChecklist').disabled = false;

  // Limpiar el formulario
  ['eq_ubicacion','eq_marca','eq_modelo','eq_frigorias','eq_consumo_kw','eq_refrigerante_gs']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('eq_tipo').value = '';
  document.getElementById('eq_refrigerante').value = '';

  toast('Equipo agregado');
}

function eliminarEquipo(i) {
  if (!confirm('¿Eliminar este equipo?')) return;
  clienteActual.equipos.splice(i, 1);
  syncDB();
  renderListaEquipos();
  document.getElementById('btnIrChecklist').disabled = clienteActual.equipos.length === 0;
  toast('Equipo eliminado');
}


// ══════════════════════════════════════════════════════
//  PASO 3 — CHECKLIST DE MANTENIMIENTO
// ══════════════════════════════════════════════════════

function irPaso3() {
  if (!clienteActual.equipos.length) { toast('Agregá al menos un equipo'); return; }
  renderChecklist();
  activarPaso(3);
}

function renderChecklist() {
  const cont = document.getElementById('checklistContainer');
  cont.innerHTML = '';

  clienteActual.equipos.forEach((eq, i) => {
    const m = eq.mantenimiento || {};

    cont.innerHTML += `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:16px;">

        <div style="font-weight:800;font-size:14px;letter-spacing:.5px;text-transform:uppercase;
                    color:var(--accent2);margin-bottom:16px;">
          ${TIPO_LABEL[eq.clase] || eq.clase} · ${eq.ubicacion}
          <span style="color:var(--muted);font-size:11px;font-weight:500;
                       margin-left:8px;text-transform:none;">${eq.marca} ${eq.modelo}</span>
        </div>

        <div class="checklist">
          ${checkItem(i, 'filtros',      'Filtros limpios',      m.filtros)}
          ${checkItem(i, 'drenaje',      'Drenaje despejado',    m.drenaje)}
          ${checkItem(i, 'condensadora', 'Condensadora limpia',  m.condensadora)}
        </div>

        <div class="inline-row">
          <div class="form-group">
            <label>Presión de Refrigerante</label>
            <input type="number" min="0" placeholder="Ej: 210"
              value="${m.presion || ''}"
              onchange="clienteActual.equipos[${i}].mantenimiento.presion = this.value; syncDB();" />
          </div>
          <span class="unit">PSI</span>

          <div class="form-group">
            <label>Consumo actual</label>
            <input type="number" min="0" step="0.1" placeholder="Ej: 4.5"
              value="${m.consumo_actual || ''}"
              onchange="clienteActual.equipos[${i}].mantenimiento.consumo_actual = this.value; syncDB();" />
          </div>
          <span class="unit">A</span>
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label>Observaciones</label>
          <textarea placeholder="Novedades, reparaciones, recomendaciones..."
            onchange="clienteActual.equipos[${i}].mantenimiento.observaciones = this.value; syncDB();"
          >${m.observaciones || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Fotos del Equipo</label>
          <div class="photo-drop" id="drop_${i}"
            ondragover="event.preventDefault(); this.classList.add('dragover')"
            ondragleave="this.classList.remove('dragover')"
            ondrop="handleDrop(event, ${i})">
            <input type="file" accept="image/*" multiple onchange="handleFotos(this, ${i})" />
            <div class="icon"></div>
            <p>Arrastrá o hacé clic — podés subir varias fotos</p>
          </div>
          <div class="photo-grid" id="photoGrid_${i}"></div>
        </div>

      </div>`;

    // Renderizar fotos ya guardadas para este equipo
    setTimeout(() => renderFotos(i), 0);
  });
}

// Genera el HTML de un ítem del checklist
function checkItem(eqIdx, key, label, valorActual) {
  const checked = valorActual === 'Si' ? 'checked' : '';
  return `
    <div class="check-item">
      <input type="checkbox" id="chk_${eqIdx}_${key}" ${checked}
        onchange="
          clienteActual.equipos[${eqIdx}].mantenimiento['${key}'] = this.checked ? 'Si' : 'No';
          syncDB();
        " />
      <label for="chk_${eqIdx}_${key}">${label}</label>
    </div>`;
}


// ── FOTOS ─────────────────────────────────────────────

function handleFotos(input, i) {
  [...input.files].forEach(file => cargarFoto(file, i));
}

function handleDrop(e, i) {
  e.preventDefault();
  document.getElementById(`drop_${i}`).classList.remove('dragover');
  [...e.dataTransfer.files]
    .filter(f => f.type.startsWith('image/'))
    .forEach(f => cargarFoto(f, i));
}

function cargarFoto(file, i) {
  const reader = new FileReader();
  reader.onload = e => {
    if (!clienteActual.equipos[i].mantenimiento.fotos)
      clienteActual.equipos[i].mantenimiento.fotos = [];
    clienteActual.equipos[i].mantenimiento.fotos.push(e.target.result);
    syncDB();
    renderFotos(i);
  };
  reader.readAsDataURL(file);
}

function renderFotos(i) {
  const grid = document.getElementById(`photoGrid_${i}`);
  if (!grid) return;
  const fotos = clienteActual.equipos[i].mantenimiento?.fotos || [];
  grid.innerHTML = fotos.map((src, fi) => `
    <div class="photo-thumb">
      <img src="${src}" />
      <button class="remove-photo" onclick="eliminarFoto(${i}, ${fi})">x</button>
    </div>`).join('');
}

function eliminarFoto(eqIdx, fotoIdx) {
  clienteActual.equipos[eqIdx].mantenimiento.fotos.splice(fotoIdx, 1);
  syncDB();
  renderFotos(eqIdx);
}


// ══════════════════════════════════════════════════════
//  PASO 4 — REPORTE
// ══════════════════════════════════════════════════════

function irPaso4() {
  renderReporte();
  activarPaso(4);
}

function renderReporte() {
  const c = clienteActual;
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  let html = `
    <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div style="font-size:20px;font-weight:800;letter-spacing:2px;text-transform:uppercase;
                  color:var(--accent);margin-bottom:4px;">ANN Multiservicios</div>
      <div style="color:var(--muted);font-size:13px;">Reporte Técnico · ${fecha}</div>
      <div style="margin-top:10px;font-size:14px;">
        <strong>Cliente:</strong> ${c.nombre} &nbsp;|&nbsp;
        <strong>Dirección:</strong> ${c.direccion}
        ${c.sitio ? ` &nbsp;|&nbsp; <strong>Sitio:</strong> ${c.sitio}` : ''}
      </div>
    </div>`;

  c.equipos.forEach(eq => {
    const m = eq.mantenimiento || {};

    const checks = [
      ['Filtros limpios',     m.filtros],
      ['Drenaje despejado',   m.drenaje],
      ['Condensadora limpia', m.condensadora],
    ].map(([label, val]) => `
      <div class="check-row">
        <span>${label}</span>
        ${val === 'Si'  ? '<span class="ok-label">OK</span>'
        : val === 'No' ? '<span class="no-label">NO OK</span>'
        :                '<span style="color:var(--muted)">—</span>'}
      </div>`).join('');

    const fotosHtml = (m.fotos && m.fotos.length)
      ? `<div class="reporte-fotos">${m.fotos.map(s => `<img src="${s}" />`).join('')}</div>`
      : '';

    html += `
      <div class="reporte-eq">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="background:var(--accent);color:#000;font-weight:800;font-size:10px;
                       letter-spacing:1px;padding:3px 10px;border-radius:4px;text-transform:uppercase;">
            ${TIPO_LABEL[eq.clase] || eq.clase}
          </span>
          <span style="font-weight:700;font-size:15px;">${eq.ubicacion}</span>
          <span style="color:var(--muted);font-size:13px;">${eq.marca} ${eq.modelo}</span>
        </div>

        <div class="reporte-meta">
          <span>Refrigerante: <strong>${eq.refrigerante || '—'} · ${eq.refrigerante_gs ? eq.refrigerante_gs + 'g' : '—'}</strong></span>
          <span>Frigorías: <strong>${eq.frigorias || '—'}</strong></span>
          <span>Consumo nominal: <strong>${eq.consumo_kw ? eq.consumo_kw + ' kW' : '—'}</strong></span>
          <span>Presión: <strong>${m.presion ? m.presion + ' PSI' : '—'}</strong></span>
          <span>Consumo actual: <strong>${m.consumo_actual ? m.consumo_actual + ' A' : '—'}</strong></span>
        </div>

        ${checks}

        ${m.observaciones
          ? `<div style="margin-top:10px;font-size:13px;color:var(--muted);">
               <strong style="color:var(--text);">Observaciones:</strong> ${m.observaciones}
             </div>`
          : ''}

        ${fotosHtml}
      </div>`;
  });

  document.getElementById('reporteContenido').innerHTML = html;
}

function exportarJSON() {
  // Copia sin fotos para mantener el archivo liviano
  const data = JSON.parse(JSON.stringify(clienteActual));
  data.equipos.forEach(eq => {
    if (eq.mantenimiento) eq.mantenimiento.fotos = '[ver sistema]';
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reporte_${clienteActual.nombre}_${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.json`
    .replace(/\s+/g, '_');
  a.click();
  toast('JSON exportado');
}

function nuevoReporte() {
  if (!confirm('¿Comenzar un nuevo reporte? Los datos guardados se mantienen en la base.')) return;
  clienteActual = null;
  document.getElementById('buscar_dir').value    = '';
  document.getElementById('nuevo_nombre').value  = '';
  document.getElementById('nuevo_sitio').value   = '';
  document.getElementById('formNuevoCliente').style.display  = 'none';
  document.getElementById('listaClientesCard').style.display = 'none';
  activarPaso(1);
}
