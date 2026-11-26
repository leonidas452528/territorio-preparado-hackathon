// Genera los Word de los artefactos 1 a 5 con el mismo formato y las mismas etiquetas que los artefactos oficiales,
// para que cada artefacto pueda leer el Word del anterior. Uso: EQUIPO="Nombre" node generar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } from 'docx';
import { EQUIPO, RETO, A1, A2, A3, A4, A5, FRASE, EVIDENCIA, CONVERSACIONES, URL_DEMO } from './contenido.mjs';

const OUT = path.resolve(import.meta.dirname, '..');
const F = 'Arial', W = 9906;
const t = (s, o = {}) => new TextRun({ text: s || '', font: F, size: o.size || 20, bold: o.bold, color: o.color });
// Respeta los saltos de línea del texto (el Word oficial los pierde).
const runs = (s, o) => String(s || '').split('\n').map((x, i) => new TextRun({ text: x, font: F, size: o.size || 20, bold: o.bold, color: o.color, break: i ? 1 : 0 }));
const p = (s, o = {}) => new Paragraph({ children: Array.isArray(s) ? s : runs(s, o), spacing: { after: o.after ?? 80, before: o.before ?? 0 } });
const h = s => p(s, { bold: true, size: 28, color: '003D4A', before: 240, after: 100 });
const line = { style: BorderStyle.SINGLE, size: 4, color: 'CFE3DC' };
const B = { top: line, bottom: line, left: line, right: line };
const cell = (s, w, o = {}) => new TableCell({ children: (Array.isArray(s) ? s : [s]).map(x => typeof x === 'string' ? p(x, { after: 0, bold: o.bold, color: o.color }) : x), width: { size: w, type: WidthType.DXA }, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, borders: B, margins: { top: 80, bottom: 80, left: 120, right: 120 } });
const tbl = (ws, rows) => new Table({ width: { size: ws.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: ws, rows: rows.map(cs => new TableRow({ children: cs })) });
const kv = rows => tbl([3000, 6906], rows.map(([a, b]) => [cell(a, 3000, { fill: 'E6F5F0', bold: true, color: '003D4A' }), cell(b || '(sin diligenciar)', 6906)]));
const header = (titulo, fecha, size = 36) => tbl([W], [[new TableCell({ children: [p('Hackathon Smart City Expo Cali 2026', { color: '94C463', bold: true, size: 18, after: 40 }), p(titulo, { color: 'FFFFFF', bold: true, size, after: 40 }), p(fecha, { color: 'DDE9EA', size: 19, after: 0 })], width: { size: W, type: WidthType.DXA }, shading: { fill: '003D4A', type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 220, bottom: 220, left: 220, right: 220 } })]]);
const doc = k => new Document({ creator: EQUIPO, styles: { default: { document: { run: { font: F, size: 20, color: '1E2B2E' } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: k }] });
const guardar = async (carpeta, nombre, k) => {
  const dir = path.join(OUT, carpeta); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, nombre + '.docx'); fs.writeFileSync(f, await Packer.toBuffer(doc(k))); console.log('✓', path.relative(OUT, f));
};

// Artefacto 1 · Tablero del equipo (Sesión 1, miércoles 23)
{
  const COLS = { s: 'Sabemos', u: 'Suponemos', n: 'Necesitamos saber' }, SEM = { v: 'Verde', a: 'Amarillo', r: 'Rojo' }, fillSem = { v: 'D6F0DE', a: 'FFF7B3', r: 'F9D6CF' };
  const verdes = A1.notas.filter(n => n.sem === 'v').length;
  const k = [header('Equipo ' + EQUIPO, 'Espacio 1: apertura y apropiación del reto. Miércoles 23 de septiembre de 2026.')];
  k.push(h('Equipo y reto'));
  k.push(kv([['Nombre del equipo', EQUIPO], ['Reto', RETO.t], ['Pregunta retadora', RETO.p], ['Qué pide el reto', RETO.obj], ['Integrantes', A1.integrantes]]));
  k.push(h('Misión 1: somos equipo'));
  k.push(kv([['Investigación', A1.roles.inv], ['Usuario y diseño', A1.roles.usu], ['Datos e IA', A1.roles.dat], ['Estrategia e impacto', A1.roles.est], ['Vocería y bitácora', A1.roles.voc], ['Acuerdo 1', A1.acuerdos[0]], ['Acuerdo 2', A1.acuerdos[1]], ['Acuerdo 3', A1.acuerdos[2]]]));
  k.push(p([t('La frase del equipo: ', { bold: true, color: '003D4A' }), t(FRASE)], { before: 120 }));
  k.push(h('Misión 2A: lo que sabemos'));
  const ws = [1900, 4206, 1300, 2500];
  k.push(tbl(ws, [['Columna', 'Nota', 'Semáforo', 'Fuente'].map((x, i) => cell(x, ws[i], { fill: '003D4A', bold: true, color: 'FFFFFF' })), ...['s', 'u', 'n'].flatMap(col => A1.notas.filter(n => n.col === col).map(n => [cell(COLS[n.col], ws[0]), cell(n.texto, ws[1]), cell(SEM[n.sem], ws[2], { fill: fillSem[n.sem] }), cell(n.src || '', ws[3])]))]));
  k.push(p('Notas verdes: ' + verdes, { bold: true, before: 80 }));
  k.push(h('Misión 2B: quiénes viven el reto'));
  k.push(kv([['Quién vive el problema', A1.actores.vive], ['Quién decide', A1.actores.decide], ['Quién puede ayudar', A1.actores.ayuda]]));
  k.push(p('Guía de entrevista', { bold: true, color: '003D4A', before: 160 }));
  k.push(kv(A1.preguntas.map((q, i) => ['Pregunta ' + (i + 1), q])));
  k.push(h('Tarea del jueves: lo que escuchamos'));
  A1.conversaciones.forEach((x, i) => { k.push(p('Conversación ' + (i + 1), { bold: true, color: '003D4A', before: 120 })); k.push(kv([['Con quién', x.rol], ['Qué dijo', x.dijo], ['Qué nos sorprendió o qué cambia', x.cambia]])); });
  k.push(h('Trivia Cali bio-inteligente'));
  k.push(kv(A1.trivia.map((q, i) => [(i + 1) + '. ' + q, '(sin respuesta)'])));
  k.push(h('Pasaporte bio-inteligente'));
  k.push(kv([['Misión 1', '100 puntos'], ['Misión 2', 'Pendiente'], ['Notas verdes', Math.min(verdes, 10) * 10 + ' puntos'], ['Trivia', '0 puntos'], ['Total estimado', (100 + Math.min(verdes, 10) * 10) + ' puntos. Lo valida el facilitador.']]));
  k.push(h('Entrega'));
  k.push(p('Este documento se sube a la carpeta de Drive del hackathon antes del viernes 25 de septiembre a las 8:00 p. m.'));
  await guardar('Sesion_1_miercoles_23', `Equipo ${EQUIPO} - Espacio 1`, k);
}

// Artefacto 2 · Reto acotado (Sesión 2, viernes 25, mañana)
{
  const x = A2.acotado;
  const k = [header('Artefacto 2: reto acotado — Equipo ' + EQUIPO, 'Viernes 25 de septiembre de 2026.')];
  k.push(h('Equipo y reto')); k.push(kv([['Nombre del equipo', EQUIPO], ['Reto', RETO.t], ['Frase del equipo', FRASE]]));
  k.push(h('Diagnóstico IA: recomendaciones')); k.push(p('(sin diagnóstico)'));
  k.push(h('Hallazgos clave')); A2.hallazgos.forEach((y, i) => k.push(p((i + 1) + '. ' + y.texto + ' (' + y.fuente + ')')));
  k.push(h('Reto acotado'));
  k.push(kv([['Usuario institucional (owner)', x.owner], ['Beneficiario ciudadano', x.beneficiario], ['Territorio concreto', x.territorio], ['Momento crítico de fricción', x.friccion], ['Falla del proceso actual', x.falla], ['Hipótesis No-Code (TRL 3)', x.hipotesis], ['¿Cómo podríamos…?', x.hmc]]));
  k.push(h('Referencia')); k.push(kv([['Pregunta retadora', RETO.p], ['Objetivo', RETO.obj], ['Líneas rojas', RETO.req]]));
  k.push(kv([['Evidencia', EVIDENCIA], ['Conversaciones', CONVERSACIONES]]));
  k.push(h('Confirmación de línea roja')); k.push(p('Confirmado: la solución no usa reconocimiento facial, no invade las funciones de Bomberos, no reemplaza evaluaciones estructurales ni la decisión de la autoridad.'));
  await guardar('Sesion_2_viernes_25', `Artefacto 2 - ${EQUIPO}`, k);
}

// Artefacto 3 · Ideación y filtro (Sesión 2, viernes 25, después del almuerzo)
{
  const e = A3.elegida, hallazgos = A2.hallazgos.map((y, i) => (i + 1) + '. ' + y.texto + ' (' + y.fuente + ')').join('\n');
  const contexto = 'Usuario: ' + A2.acotado.owner + ' Lugar: ' + A2.acotado.territorio + ' Momento: ' + A2.acotado.friccion;
  const k = [header('Artefacto 3: ideación y filtro — Equipo ' + EQUIPO, 'Viernes 25 de septiembre de 2026.')];
  k.push(h('Equipo y reto acotado'));
  k.push(kv([['Nombre del equipo', EQUIPO], ['Reto', RETO.t], ['"¿Cómo podríamos…?"', A2.acotado.hmc], ['Contexto', contexto], ['Nivel técnico', A3.nivel]]));
  k.push(h('Ideas generadas (' + A3.ideas.length + ')'));
  A3.ideas.forEach((x, i) => k.push(p((i + 1) + '. ' + x.nombre + ': ' + x.texto + ' | Flujo: ' + x.flujo + ' | ' + x.tech)));
  k.push(h('Matriz de impacto y factibilidad'));
  k.push(kv([['Alto impacto + Alta factibilidad', A3.matriz.aifa], ['Alto impacto + Baja factibilidad', A3.matriz.aibf], ['Bajo impacto + Alta factibilidad', A3.matriz.bifa], ['Bajo impacto + Baja factibilidad', A3.matriz.bibf]]));
  k.push(h('Idea elegida'));
  k.push(kv([['Nombre de la solución', e.nombre], ['Dependencia institucional', e.dependencia], ['Propuesta de valor', e.propuesta], ['Flujo funcional (Input→Proceso→Output)', e.flujo], ['Herramienta No-Code', e.tool], ['Por qué esta', e.porque], ['Líneas rojas', e.lineas], ['Líneas rojas del reto', RETO.req]]));
  k.push(h('Referencia: hallazgos del artefacto 2')); k.push(p(hallazgos));
  await guardar('Sesion_2_viernes_25', `Artefacto 3 - ${EQUIPO}`, k);
}

// Artefacto 4 · Propuesta de valor y plan (Sesión 2, viernes 25, tarde)
{
  const k = [header('Artefacto 4: propuesta de valor y plan — Equipo ' + EQUIPO, 'Viernes 25 de septiembre de 2026.', 34)];
  k.push(h('Equipo y reto')); k.push(kv([['Nombre del equipo', EQUIPO], ['Reto', RETO.t], ['Reto acotado', A2.acotado.hmc], ['Idea elegida', A3.elegida.propuesta]]));
  k.push(h('Propuesta de valor')); k.push(kv([['Propuesta en una frase', A4.propuesta]]));
  k.push(h('Supuestos críticos')); A4.supuestos.forEach((s, i) => k.push(p((i + 1) + '. ' + s.texto + ' (' + s.estado + ')')));
  k.push(h('Validación con usuarios')); k.push(p('(sin validación)'));
  k.push(h('Nivel de avance')); k.push(p(A4.nivel));
  k.push(h('Plan del prototipo para el sábado'));
  k.push(kv([['Qué mostrará', A4.proto.que], ['Formato', A4.proto.formato + ' — ' + A4.proto.formatoDesc], ['Distribución del equipo', A4.proto.distribucion], ['Materiales', A4.proto.materiales]]));
  k.push(h('Referencia')); k.push(kv([['Líneas rojas', RETO.req], ['Objetivo del reto', RETO.obj]]));
  await guardar('Sesion_2_viernes_25', `Artefacto 4 - ${EQUIPO}`, k);
}

// Artefacto 5 · Prototipo, prueba y bitácora: entregable final (Sesión 3, sábado 26)
{
  const k = [header('Artefacto 5: prototipo, prueba y bitácora — Equipo ' + EQUIPO, 'Sábado 26 de septiembre de 2026. Entregable final.', 32)];
  k.push(h('Equipo y reto')); k.push(kv([['Nombre del equipo', EQUIPO], ['Reto', RETO.t], ['Reto acotado', A2.acotado.hmc], ['Idea elegida', A3.elegida.propuesta]]));
  k.push(h('Prueba e iteración'));
  A5.pruebas.forEach((x, i) => { k.push(p('Prueba ' + (i + 1), { bold: true, color: '003D4A', before: 120 })); k.push(kv([['Con quién', x.con], ['Qué mostraron', x.mostro], ['Qué funcionó', x.funciono], ['Qué falló', x.fallo], ['Qué ajustaron', x.ajuste]])); });
  k.push(h('Bitácora TRL/IRL'));
  k.push(kv([['URL pública del prototipo', URL_DEMO], ['Datos de prueba cargados', A5.datos], ['Qué demuestra (TRL 3)', A5.trl], ['Evidencia de usuarios (IRL 3)', A5.irl], ['Aprendizaje 1', A5.aprendizajes[0]], ['Aprendizaje 2', A5.aprendizajes[1]], ['Aprendizaje 3', A5.aprendizajes[2]], ['Siguiente paso', A5.siguiente]]));
  k.push(h('Guion de grabación (4 minutos)')); k.push(kv(A5.guion));
  k.push(h('Referencia')); k.push(kv([['Líneas rojas', RETO.req], ['Objetivo del reto', RETO.obj]]));
  await guardar('Sesion_3_sabado_26', `Artefacto 5 - ${EQUIPO}`, k);
}
