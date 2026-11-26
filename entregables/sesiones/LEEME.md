# Entregables por sesión: qué subir, en qué orden y qué falta

**Solo local: esta carpeta no se sube a GitHub** (está en `.git/info/exclude`), porque el equipo no quiere mostrar la idea todavía.

Cada Word replica **el formato exacto** (títulos y etiquetas) del artefacto oficial que lo genera. Así, el artefacto siguiente puede leerlo al subirlo. El nombre del equipo aparece como `NOMBRE PENDIENTE`: cuando lo decidan, vuelvan a generar todo con un comando (ver el final).

## Orden de entrega
| Sesión | Artefacto (enlace oficial) | Archivo de esta carpeta | Qué hacer |
|---|---|---|---|
| 1 · Mié 23 | Tablero del equipo · https://claude.ai/artifact/LAmBJHeusdaZ48dwDgkpLx | `Sesion_1_miercoles_23/Equipo … - Espacio 1.docx` | ⚠️ **El plazo era el viernes 25 a las 8:00 p. m. y ya pasó.** Hablen con los facilitadores. Pueden llenar el tablero con este contenido y descargar el Word oficial. |
| 2 · Vie 25 (mañana) | Artefacto 2: acotar el reto · https://claude.ai/artifact/W2gqfgJFZjHU33PMR6Lqmt | `Sesion_2_viernes_25/Artefacto 2 - ….docx` | Suban el Word del artefacto 1, revisen los campos y confirmen la línea roja |
| 2 · Vie 25 (almuerzo) | Artefacto 3: ideación y filtro · https://claude.ai/artifact/5Bwp37CYVRW8DypdZdASi8 | `Sesion_2_viernes_25/Artefacto 3 - ….docx` | 8 ideas, matriz e idea elegida |
| 2 · Vie 25 (tarde) | Artefacto 4: propuesta y plan · https://claude.ai/artifact/EggcCaEL6xavWRHpkY9KAU | `Sesion_2_viernes_25/Artefacto 4 - ….docx` | Hagan la **validación**, aunque sea con "Simular un usuario con Claude", marcada como simulación |
| 3 · Sáb 26 | Artefacto 5: prototipo y bitácora · https://claude.ai/artifact/8yLQNLcNt8FF3aMcmewD81 | `Sesion_3_sabado_26/Artefacto 5 - ….docx` | **Entregable final para el Drive**: URL, bitácora y guion de 4 minutos. Además, el pitch de 1 minuto |

**Recomendado:** abran cada artefacto oficial, suban el Word anterior, copien los textos de estos documentos en sus campos y descarguen **el Word que genera el artefacto**. Ese es el que evalúa la interventoría. Los Word de esta carpeta sirven como respaldo con el mismo formato ("si pierden un Word, pueden llenar los campos a mano", según la guía oficial).

## Lo que el equipo debe completar (no se inventó nada)
- [ ] **Nombre del equipo** (ver `NOMBRES_EQUIPO.md`).
- [ ] **Universidad y carrera** de cada integrante (artefacto 1).
- [ ] **Confirmar los roles** propuestos: Investigación (Pablo), Usuario y diseño (Bryan), Datos e IA (Herlin), Estrategia e impacto (William) y Vocería y bitácora (William).
- [ ] **Trivia** del artefacto 1: respóndanla en el tablero.
- [ ] **Las 3 conversaciones del jueves:** no se hicieron y figuran como PENDIENTE. Si hablan con alguien (una JAC, un voluntario de un albergue o la Secretaría), escriban solo su rol, nunca el nombre.
- [ ] **Validación del artefacto 4:** figura "(sin validación)". Como mínimo, usen "Simular un usuario con Claude" y regístrenlo **como simulación**; no sustituye a una persona real. Por ahora el nivel declarado es **TRL 3**. IRL 3 queda pendiente porque no hay evidencia directa de usuarios.
- [ ] **Pruebas del sábado (artefacto 5):** cada vez que muestren el prototipo a un mentor, un usuario u otro equipo, registren con quién, qué mostraron, qué funcionó, qué falló y qué ajustaron.
- [ ] **Distribución del sábado** (artefacto 4): confírmenla entre ustedes.

## Riesgos que conviene saber
- **Herramienta No-Code:** el reto pide una hipótesis "No-Code", pero el prototipo es una aplicación web en React. Se declaró como "Otra: aplicación web". Si el jurado lo exige, respondan que la lógica se puede replicar en Sheets + Looker Studio.
- **Confidencialidad:** el repositorio de GitHub es público y la demo está en línea. Cualquiera con el enlace puede ver la idea.
- **Cifras:** no usen la cifra de fallecidos (105 o 154) hasta confirmarla.

## Volver a generar con el nombre definitivo
```
cd ~/hackathon-cali-2026/entregables/sesiones/src
EQUIPO="Nombre del equipo" node generar.mjs
```
El contenido está en `src/contenido.mjs`. Si corrigen algo allí, se actualizan los 5 Word.
