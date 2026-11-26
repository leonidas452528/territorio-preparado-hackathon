# Resumen de la sesión con Claude: 25 y 26 de septiembre de 2026 (noche)

**Proyecto:** Territorio Preparado · RETO-01 Cali Activa · Hackathon Smart City Expo Cali 2026
**Equipo:** William Ortiz · Herlin Echeverry · Pablo Arango · **Bryan Martínez Villamarín**
**Repositorio:** `~/hackathon-cali-2026` → github.com/leonidas452528/hackaton-camaracomercio2026 (público)

## 1. Lo que se hizo
1. **Contexto cargado:** la bitácora (`docs/PROYECTO.md`), `AGENTS.md`, la idea integrada y los pendientes.
2. **Forks integrados en `main`:**
   - Herlin (rama `propuesta-cali-activa`, 24 commits): app y maqueta 3D (`maqueta3d/`), video de 80 s, presentación PPTX y PDF, propuesta en Word y PDF, y el nuevo nombre del producto, **Territorio Preparado**.
   - Pablo (1 commit): `docs/modulo_preventivo.pdf`, con el peritaje del espacio y de su entorno y el puntaje 60/40.
3. **Integrante nuevo:** Bryan Martínez Villamarín actualizado en los Markdown, en los 2 PPTX y en el DOCX (con sus PDF regenerados).
4. **Auditoría:** `npm run build` sin errores y `npm test` con **22 de 22 pruebas aprobadas**. Las pruebas de navegador (Playwright) no se corrieron.
5. **Pitch de 1 minuto:** `entregables/pitch-1min/Guion_1_minuto.md`, con 4 diapositivas y unas 150 palabras. La distancia al dique quedó corregida: "a entre 72 y 152 metros".
6. **Guía del día en PDF:** `entregables/guia-25-sep/Guia_del_dia_25sep.pdf` (5 páginas), con cronología, auditoría, pitch, respuestas para el jurado y checklist.
7. **Bitácora actualizada:** `docs/PROYECTO.md` (pendientes nuevos) y `docs/PROYECTO.pdf` regenerado.
8. **Demo publicada:** https://leonidas452528.github.io/hackaton-camaracomercio2026/ (`.github/workflows/pages.yml`, que compila, prueba y publica en cada push a `main`).
9. **Documentos por sesión (SOLO LOCAL, no están en GitHub):** en `entregables/sesiones/`, con el mismo formato y las mismas etiquetas que los artefactos oficiales:
   - Sesión 1: `Equipo NOMBRE PENDIENTE - Espacio 1.docx`
   - Sesión 2: `Artefacto 2`, `3` y `4 - NOMBRE PENDIENTE.docx`
   - Sesión 3: `Artefacto 5 - NOMBRE PENDIENTE.docx` (entregable final con la URL, la bitácora y el guion de 4 minutos) y `Guion_1_minuto.md`
   - `LEEME.md` y `.pdf` (orden de subida y qué falta), `NOMBRES_EQUIPO.md` y `.pdf` (propuestas de nombre)
   - Para regenerar con el nombre definitivo: `cd entregables/sesiones/src && EQUIPO="Nombre" node generar.mjs`

## 2. Estado de git al apagar
- En GitHub: todo hasta `4f25c97` (la publicación de la demo).
- **Solo local, sin push:** `2e04de5` (corrección de la distancia en el pitch) y la carpeta `entregables/sesiones/` (excluida de git a propósito).

## 3. Decisiones pendientes del equipo
- [ ] **Confidencialidad:** el repositorio y la demo son públicos, pero el equipo no quiere mostrar la idea todavía.
  - Opción A (recomendada): volver el repositorio privado y publicar de nuevo la demo justo antes de entregar. En una cuenta gratuita, un repositorio privado no puede tener GitHub Pages.
  - Opción B: retirar solo la demo.
  - Opción C: dejarlo como está.
- [ ] **Nombre del equipo.** Top 3: **Samán**, **Umbral** y **Antes**. El nombre del producto sigue siendo Territorio Preparado.
- [ ] Confirmar los roles: Pablo en investigación, Bryan en usuario y diseño, Herlin en datos e IA, y William en estrategia y vocería.

## 4. Lo que falta para cumplir con el evento
- [ ] ⚠️ **Artefacto 1: el plazo venció el viernes 25 a las 8:00 p. m.** Hablar con los facilitadores. No se ha subido nada al Drive.
- [ ] Llenar cada artefacto oficial con estos textos y subir **el Word que genera el artefacto**.
- [ ] Universidades y carreras de los integrantes, y la trivia del tablero.
- [ ] 3 conversaciones reales (solo el rol, sin nombres). Hoy están como PENDIENTE; **no se inventan**.
- [ ] Validación del artefacto 4, como mínimo con la simulación de Claude marcada como simulación. Hoy solo se declara TRL 3.
- [ ] Sábado: registrar cada prueba del prototipo (con quién, qué funcionó, qué falló y qué se ajustó).
- [ ] Armar las 4 diapositivas del pitch de 1 minuto y ensayarlo 3 veces con cronómetro.
- [ ] Llevar el video y las capturas de respaldo sin conexión.
- [ ] Marco legal (William): verificar la Circular SIC 002 de 2024 y el CONPES 4144 de 2025, no citar la cifra de fallecidos (105 o 154) y quitar los correos y teléfonos de `prototipo/datos/raw/sismo/men_sedes.csv`.
- [ ] Riesgo: el reto pide No-Code y el prototipo es una app en React. Respuesta: "la lógica se replica en Sheets + Looker Studio".

## 5. Para retomar
Abre Claude Code en `~/hackathon-cali-2026` y di: "entra en contexto de la hackatón". La memoria y `AGENTS.md` cargan el resto.
