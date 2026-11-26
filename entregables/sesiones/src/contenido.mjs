// Contenido de los artefactos 1 a 5. Todo sale de docs/PROYECTO.md; lo que no existe queda como PENDIENTE.
export const EQUIPO = process.env.EQUIPO || 'NOMBRE PENDIENTE';
export const RETO = {
  t: 'RETO-01 Cali Activa: espacios públicos que se transforman para cuidar',
  p: '¿Cómo podríamos transformar los espacios públicos de Cali en una red adaptable que, según el tipo de emergencia y las necesidades de la población, permita activar y operar de manera segura y coordinada funciones temporales de atención y recuperación, y facilite posteriormente el retorno del espacio a su uso cotidiano?',
  obj: 'Diseñar y validar un prototipo de baja fidelidad para caracterizar espacios, analizar su aptitud según el tipo de emergencia, identificar las adecuaciones necesarias, activar entidades y servicios, hacer seguimiento y apoyar el retorno a su uso cotidiano.',
  req: 'No reemplaza evaluaciones estructurales ni decisiones de autoridades. Datos personales con privacidad y minimización. Las recomendaciones automatizadas deben ser comprensibles.',
};
const PENDIENTE_CONV = 'PENDIENTE: el equipo no realizó esta conversación el jueves 24. Se registrará cuando ocurra (solo el rol, sin nombres).';

export const A1 = {
  integrantes: [
    'William Ortiz, [universidad], [carrera]',
    'Herlin Echeverry, [universidad], [carrera]',
    'Pablo Arango, [universidad], [carrera]',
    'Bryan Martínez Villamarín, [universidad], [carrera]',
  ].join('\n'),
  roles: {
    inv: 'Pablo Arango',
    usu: 'Bryan Martínez Villamarín',
    dat: 'Herlin Echeverry',
    est: 'William Ortiz (marco legal y normativo)',
    voc: 'William Ortiz',
  },
  acuerdos: [
    'Toda cifra lleva su fuente con enlace; si no la tiene, se marca "(verificar)" y no se usa en el pitch.',
    'Antes de construir, cada idea pasa el filtro legal y las líneas rojas del reto.',
    'Todo avance queda registrado en la bitácora del equipo con cambios pequeños y fechados.',
  ],
  frase: [
    'las familias que deben refugiarse en espacios públicos de Cali durante una emergencia, y a la Secretaría de Gestión del Riesgo que los habilita',
    'espacios que se activan sobre la marcha, sin saber si sirven para esa amenaza, qué les falta ni qué entidad responde',
    'cada espacio se prepare antes, se active con criterios claros y vuelva a su uso cotidiano',
  ],
  // col: s = Sabemos, u = Suponemos, n = Necesitamos saber · sem: v = verde, a = amarillo, r = rojo
  notas: [
    { col: 's', sem: 'v', texto: 'En la Cancha de Hockey se reportaron más de 30 familias y 143 personas alojadas tras el sismo del 10 de agosto de 2026.', src: 'Portafolio de Retos, Alcaldía de Cali, v2.0 (2026)' },
    { col: 's', sem: 'v', texto: 'La Defensoría encontró 336 familias (1.046 personas) en 3 albergues autogestionados por la comunidad en canchas de Chiminangos I, Chiminangos II y Calimio Norte.', src: 'https://www.defensoria.gov.co/web/guest/-/defensoria-pide-atencion-urgente-para-336-familias-en-albergues-de-cali' },
    { col: 's', sem: 'v', texto: 'Cali tiene 45.138 familias inscritas en el Registro Único de Damnificados (corte al 17 de septiembre) y 3.403 edificaciones evaluadas.', src: 'https://www.elpais.com.co/cali/alcaldia-de-cali-entrega-balance-de-gestion-tras-el-sismo-mas-de-3400-edificaciones-evaluadas-y-45000-familias-damnificadas-2338.html' },
    { col: 's', sem: 'v', texto: 'Al 31 de agosto, de 43 escenarios deportivos revisados solo 12 estaban habilitados y 22 (51,2 %) esperaban inspección técnica para volver a su uso.', src: 'https://www.semana.com/nacion/cali/articulo/tras-el-terremoto-cali-informa-cuales-escenarios-deportivos-vuelven-a-estar-al-servicio-de-los-atletas-desde-este-31-de-agosto/202628/' },
    { col: 's', sem: 'v', texto: 'El 24 de febrero de 2026 el río Cauca llegó a 9,25 m y se declaró alerta naranja en el oriente de Cali.', src: 'https://cwmas.com.co/cali/2026/02/24/rio-cauca-en-alerta-naranja-aumenta-el-caudal-en-el-oriente-de-cali/' },
    { col: 's', sem: 'v', texto: 'OCHA reporta vacíos de información: cifras que no coinciden, familias sin información sobre inspecciones y fallas de agua y saneamiento en los albergues.', src: 'https://www.infobae.com/colombia/2026/09/25/ocha-alerta-vacios-de-informacion-y-atencion-tras-terremoto-que-deja-486917-afectados-en-colombia/' },
    { col: 's', sem: 'v', texto: 'Cali tiene 1.970 espacios públicos efectivos inventariados con geometría (parques, zonas verdes, plazas).', src: 'https://datos.cali.gov.co/dataset/epou-espacio-publico-efectivo' },
    { col: 's', sem: 'v', texto: 'Las canchas de Chiminangos I y II y de Calimio, usadas como albergues autogestionados, tienen amenaza alta de inundación, están en suelo licuable y quedan a entre 72 y 152 m del dique del río Cauca.', src: 'Cruce propio: amenazas del POT (IDESC, Acuerdo 0373 de 2014) + espacio público DAPM/IDESC' },
    { col: 's', sem: 'v', texto: 'El IDEAM prevé un El Niño muy fuerte con pico en noviembre de 2026: el agua también se vuelve una restricción para operar un albergue.', src: 'https://ciudadregion.com/regiones/valle-del-cauca/cali/pico-fenomeno-nino-noviembre-valle-cauca-niveles-embalses' },
    { col: 's', sem: 'a', texto: 'La cifra de fallecidos en Cali difiere entre fuentes (105 frente a 154). Falta confirmar la fecha de corte oficial.', src: 'https://www.cali.gov.co/gobierno/publicaciones/193607/terremoto-de-cali-repositorio-oficial-de-informacion/' },
    { col: 'u', sem: 'r', texto: 'Creemos que hoy no existe una ficha de aptitud de cada espacio público según el tipo de amenaza.', src: '' },
    { col: 'u', sem: 'r', texto: 'Creemos que en un albergue no está claro qué entidad responde por cada servicio (agua, baños, salud, niños).', src: '' },
    { col: 'n', sem: 'r', texto: '¿Qué aforo, baños, agua y energía tiene hoy cada escenario que se podría activar?', src: '' },
    { col: 'n', sem: 'r', texto: '¿Cómo decide hoy la Secretaría qué espacio abrir y quién registra su retorno al uso normal?', src: '' },
  ],
  actores: {
    vive: 'Familias damnificadas (con niños, adultos mayores, personas con discapacidad y migrantes); comunidades de Chiminangos I y II y Calimio Norte que montaron albergues propios; vecinos y usuarios habituales de los parques y escenarios.',
    decide: 'Secretaría de Gestión del Riesgo de Emergencias y Desastres y Consejo Municipal de Gestión del Riesgo (Ley 1523 de 2012). Líder técnico: DATIC.',
    ayuda: 'Secretaría del Deporte, DAPM, EMCALI, UAESP, ICBF, Secretaría de Salud, Bienestar Social, Bomberos, Cruz Roja, Defensa Civil, juntas de acción comunal, Defensoría del Pueblo y CVC.',
  },
  preguntas: [
    'Cuéntenos cómo se decidió qué espacio abrir como albergue después del sismo del 10 de agosto.',
    '¿Qué fue lo que más hizo falta en los primeros tres días y a quién se lo pidieron?',
    '¿Cómo supieron qué entidad debía responder por el agua, los baños, la salud o los niños?',
    '¿Qué pasó cuando el espacio tuvo que volver a su uso normal? ¿Quién lo revisó y lo entregó?',
    'Si mañana hubiera una creciente del río Cauca, ¿a dónde irían y cómo se enterarían?',
  ],
  conversaciones: [1, 2, 3].map(() => ({ rol: 'PENDIENTE', dijo: PENDIENTE_CONV, cambia: '' })),
  trivia: [
    '¿Cuál es el lema de Smart City Expo Cali 2026?',
    '¿Cuándo y dónde es Smart City Expo Cali?',
    'Nombren dos ríos de Cali que destaca el congreso.',
    'Nombren un proyecto de ciudad que muestra el enfoque bio-inteligente de Cali.',
    '¿Qué no se permite en ningún prototipo del hackathon?',
  ],
};

export const FRASE = `Queremos ayudar a ${A1.frase[0]}, que enfrenta ${A1.frase[1]}, para que ${A1.frase[2]}.`;
export const EVIDENCIA = A1.notas.filter(n => n.sem === 'v').map(n => `${n.texto} (${n.src})`).join('\n');
export const CONVERSACIONES = 'Sin conversaciones registradas (pendientes).';

export const A2 = {
  hallazgos: [
    { texto: 'La comunidad montó 3 albergues autogestionados (336 familias, 1.046 personas) en canchas de Chiminangos I y II y Calimio Norte, fuera del circuito oficial de alojamientos.', fuente: 'Defensoría del Pueblo, septiembre de 2026' },
    { texto: 'Esas canchas tienen amenaza alta de inundación, suelo licuable y quedan a entre 72 y 152 m del dique del río Cauca: se refugiaron de un sismo en un lugar expuesto a otra amenaza.', fuente: 'Cruce propio de amenazas del POT (IDESC) con el espacio público del DAPM' },
    { texto: 'La aptitud de un espacio depende de la amenaza: en el oriente, sobre el Jarillón (comunas 6, 7, 13, 14 y 21), entre el 55 y el 92 % de los espacios públicos tiene amenaza alta de inundación.', fuente: 'Cruce propio de 1.970 espacios DAPM/IDESC con las amenazas del POT' },
    { texto: 'El retorno es un cuello de botella: al 31 de agosto, 22 de 43 escenarios (51,2 %) seguían esperando inspección técnica para volver a su uso.', fuente: 'Semana, 31 de agosto de 2026' },
    { texto: 'Falta caracterización y trazabilidad: la Defensoría observó traslados de ayudas con destino desconocido y OCHA reporta cifras que no coinciden entre fuentes.', fuente: 'Defensoría del Pueblo; OCHA vía Infobae, 25 de septiembre de 2026' },
  ],
  acotado: {
    owner: 'Secretaría de Gestión del Riesgo de Emergencias y Desastres de Cali. Líder técnico: DATIC.',
    beneficiario: 'Familias que deben alojarse temporalmente en espacios públicos durante una emergencia, en especial niños, adultos mayores y personas con discapacidad (siempre en conteos agregados), y las comunidades que hoy improvisan albergues propios.',
    territorio: 'Oriente de Cali sobre el Jarillón del río Cauca (comunas 6, 7, 13, 14 y 21), con foco en Chiminangos I, Chiminangos II y Calimio Norte, y los escenarios usados tras el sismo (Cancha de Hockey Miguel Calero, Diamante de Béisbol y Unidad Deportiva Jaime Aparicio).',
    friccion: 'Las primeras horas después de la alerta, cuando hay que decidir qué espacio abrir sin saber si sirve para esa amenaza, qué le falta y quién responde; y el cierre, cuando el espacio debe volver a su uso sin una revisión ni un acta clara.',
    falla: 'Los espacios se habilitan sobre la marcha, sin una ficha de aptitud por amenaza. Las necesidades y los responsables se coordinan por teléfono, sin un registro de brechas ni seguimiento. El retorno depende de inspecciones represadas. Mientras tanto, la comunidad se refugia por su cuenta, incluso en zonas inundables.',
    hipotesis: 'Una aplicación web con datos abiertos (espacio público del DAPM/IDESC, amenazas del POT y daños del sismo) que, dada una amenaza y un conteo agregado de población, descarte los espacios expuestos, proponga hasta 3 candidatos con criterios visibles, calcule necesidades según Esfera y el responsable de cada servicio según la UNGRD, y exporte un borrador para que la autoridad decida.',
    hmc: '¿Cómo podríamos ayudar a la Secretaría de Gestión del Riesgo a preparar y activar los espacios públicos del oriente de Cali según el tipo de amenaza, con criterios visibles, necesidades calculadas y responsables claros, para que las familias no terminen refugiándose en zonas expuestas y cada espacio vuelva a su uso cotidiano?',
  },
};

export const A3 = {
  nivel: 'Avanzado',
  ideas: [
    { nombre: 'Territorio Preparado', texto: 'Propone espacios candidatos según la amenaza, calcula cuánto cabe y qué falta, y a quién le corresponde; la autoridad decide.', flujo: 'Amenaza + sector + conteo agregado → cruce con POT, IDESC y Esfera → 3 candidatos, necesidades, responsables y borrador exportable', tech: 'Otra: aplicación web (React + Leaflet) con datos abiertos' },
    { nombre: 'Cali Lista: peritaje de espacios', texto: 'Formulario de campo para caracterizar cada espacio y su entorno (salud, Bomberos, agua, MIO) con un puntaje de aptitud.', flujo: 'Visita de campo → ficha nivel A (espacio) + nivel B (entorno) → puntaje 60/40 y función recomendada', tech: 'AppSheet' },
    { nombre: 'Tablero de brechas por entidad', texto: 'Muestra qué le falta a cada espacio activo y qué entidad debe cubrirlo.', flujo: 'Necesidades Esfera − existencias → brecha por servicio → responsable UNGRD → estado', tech: 'Looker Studio' },
    { nombre: 'Kit modular reutilizable + IoT', texto: 'Módulos de PVC que se usan en ferias y CicloVida y, en una emergencia, cubren la falta de área cubierta; sensores sin cámaras.', flujo: 'Brecha de área → kits en bodega → instalación → nivel del tanque y conteo anónimo (SIMULADO)', tech: 'Figma' },
    { nombre: 'Aviso comunitario de puntos confirmados', texto: 'Informa a toda la población solo los puntos que la autoridad ya confirmó, sin identificar a nadie.', flujo: 'Apertura confirmada → aviso con ubicación y horario → difusión masiva (SIMULADA)', tech: 'Glide' },
    { nombre: 'Checklist y acta de retorno', texto: 'Guía la devolución del espacio a su uso cotidiano con revisión, retiro de equipos y acta.', flujo: 'Fin de la operación → checklist por servicio → acta de entrega → espacio disponible', tech: 'Softr' },
    { nombre: 'Adecuaciones permanentes priorizadas', texto: 'Recomienda dónde instalar tomas de agua, puntos para baños, energía solar y anclajes según la probabilidad de uso.', flujo: 'Historial de amenazas + uso probable → ranking de espacios → lista de adecuaciones', tech: 'Looker Studio' },
    { nombre: 'Registro de albergues autogestionados', texto: 'Las juntas de acción comunal reportan conteos agregados de sus albergues para que la Alcaldía los vea.', flujo: 'Reporte de la JAC (conteos por ciclo vital) → mapa de albergues comunitarios → alerta si están en zona de amenaza', tech: 'Glide' },
  ],
  matriz: {
    aifa: 'Territorio Preparado (integra el tablero de brechas y el checklist de retorno)',
    aibf: 'Kit modular + IoT; adecuaciones permanentes; registro de albergues autogestionados (exige un protocolo de datos con las JAC)',
    bifa: 'Aviso comunitario de puntos confirmados; Cali Lista como formulario aislado',
    bibf: 'Ninguna',
  },
  elegida: {
    nombre: 'Territorio Preparado',
    dependencia: 'Secretaría de Gestión del Riesgo de Emergencias y Desastres de Cali, con DATIC como líder técnico',
    propuesta: 'Territorio Preparado ayuda a la Secretaría de Gestión del Riesgo a preparar espacios públicos para cada tipo de amenaza: propone candidatos con criterios visibles, dimensiona su ocupación y hace visibles los servicios pendientes y sus responsables; la autoridad decide la activación.',
    flujo: 'Input: amenaza, sector y conteo agregado de población (SIMULADO) → Proceso: cruce con 1.970 espacios DAPM/IDESC, amenazas del POT y daños del sismo; descarte de expuestos; cálculo de área útil, agua, baños y área cubierta (Esfera); responsable por servicio (UNGRD) → Output: 3 candidatos explicados, brechas por entidad, borrador exportable y aviso comunitario solo tras la confirmación.',
    tool: 'Otra: aplicación web con datos abiertos (React + Leaflet), publicada en GitHub Pages',
    porque: 'Es la única que conecta todo el ciclo que pide el reto (caracterizar, decidir, activar, seguir y retornar) con datos reales de Cali, y ya demuestra la lógica (TRL 3) sin tocar datos personales. Las demás ideas quedan como módulos: el peritaje de Cali Lista alimenta la ficha, el tablero muestra las brechas y el kit cubre el área faltante.',
    lineas: 'Cumple todas',
  },
};

export const A4 = {
  propuesta: 'Para la Secretaría de Gestión del Riesgo de Emergencias y Desastres de Cali, que necesita decidir con criterios qué espacio público activar ante cada amenaza, qué le falta y quién debe responder, nuestra solución Territorio Preparado propone espacios candidatos y dimensiona su preparación mediante el cruce explicable de datos abiertos (inventario DAPM/IDESC, amenazas del POT y daños del sismo) con los estándares Esfera y la matriz de responsables de la UNGRD, a diferencia de hoy, cuando los espacios se habilitan sobre la marcha y la comunidad termina montando albergues por su cuenta en zonas inundables.',
  supuestos: [
    { texto: 'Hay datos abiertos suficientes para una primera preselección de espacios por amenaza.', estado: 'Validado con evidencia' },
    { texto: 'La Secretaría usaría una recomendación explicable si la decisión de activar sigue siendo suya.', estado: 'Por validar' },
    { texto: 'EMCALI, UAESP, ICBF y Salud aceptan una matriz de responsables por servicio basada en el Protocolo de Alojamientos Temporales de la UNGRD.', estado: 'Por validar' },
    { texto: 'Las juntas de acción comunal compartirían conteos agregados de los albergues autogestionados.', estado: 'Por validar' },
    { texto: 'Medir la superficie útil, los accesos y los servicios de los espacios priorizados es viable antes de la próxima temporada de lluvias.', estado: 'Por validar' },
  ],
  nivel: 'TRL 3: prototipo en entorno controlado',
  proto: {
    que: 'El recorrido completo con datos reales: elegir la amenaza (inundación) y un escenario de 300 personas (SIMULADO); ver cómo se descartan los espacios expuestos; revisar un candidato real (epou-9465, Colinas del Sur, 447,21 m²); comprobar el cálculo de acopio (20 módulos no caben, 16 sí, con reservas SIMULADAS); ver las necesidades de agua, baños y área cubierta con su responsable; exportar el borrador; y cambiar a sismo para ver que la propuesta cambia.',
    formato: 'SaaS Web (formulario + lógica), Dashboard de datos',
    formatoDesc: 'Aplicación web pública en GitHub Pages (mapa Leaflet, maqueta 3D y lógica explicable), con respaldo en video y capturas.',
    distribucion: 'Herlin: demo en vivo y ajustes de la app. William: marco legal, respuestas al jurado y bitácora. Pablo: módulo preventivo (peritaje del entorno) y diapositivas. Bryan: pitch de 1 minuto, grabación y ensayo con cronómetro.',
    materiales: 'Portátil con la app abierta y probada, cargador, datos móviles o hotspot, video y capturas de respaldo sin conexión, y el guion impreso del pitch.',
  },
};

export const URL_DEMO = 'https://leonidas452528.github.io/hackaton-camaracomercio2026/';
export const A5 = {
  pruebas: [1, 2, 3].map(i => ({ con: 'PENDIENTE (sábado 26)', mostro: '', funciono: '', fallo: '', ajuste: '' })),
  datos: 'Datos reales y públicos: 1.970 espacios públicos efectivos (DAPM/IDESC), 1.021 registros de escenarios deportivos, amenazas del POT (inundación, licuación y remoción), 1.090 puntos de daño del sismo (Copernicus EMSR916 e ICube-SERTIT). Datos SIMULADOS y rotulados: la población del escenario, las reservas de área del acopio, el IoT del kit y la difusión SMS. Sin datos personales.',
  trl: 'Demuestra la lógica del reto en un entorno controlado: caracteriza espacios reales, descarta los expuestos según la amenaza, propone candidatos con criterios visibles, calcula la ocupación máxima por área y las necesidades (Esfera), asigna responsables (UNGRD), exporta un borrador y muestra el ciclo de retorno. La compilación y 22 pruebas automáticas pasan.',
  irl: 'Evidencia documental de que el problema existe: la Defensoría (albergues autogestionados en zona inundable y ayudas con destino desconocido), OCHA (vacíos de información) y los reportes de escenarios que siguen esperando inspección. PENDIENTE: validación directa con la Secretaría de Gestión del Riesgo o con una JAC de Chiminangos o Calimio.',
  aprendizajes: [
    'Un espacio no es "apto" en general: su aptitud depende de la amenaza, y un buen refugio para el sismo puede estar en zona inundable.',
    'Un dato desconocido no vale cero: el sistema debe mostrar lo que falta medir en vez de inventar capacidad.',
    'Proponer no es habilitar: la comunidad solo debe recibir avisos de puntos que la autoridad ya confirmó.',
  ],
  siguiente: 'Validar el flujo con la Secretaría de Gestión del Riesgo y una JAC del oriente; medir en campo la superficie útil y los servicios de los espacios priorizados; integrar el peritaje del entorno (módulo preventivo) y un canal de avisos real y autorizado.',
  guion: [
    ['[00:00–01:00] Dolor territorial y cifras', 'El 10 de agosto, un sismo de 7,4 sacudió Cali: 45.138 familias quedaron inscritas como damnificadas. Canchas y coliseos se volvieron albergues sin saber si estaban preparados. La Defensoría encontró 1.046 personas en tres albergues montados por la propia comunidad en Chiminangos y Calimio, y nuestro cruce con el POT muestra que esas canchas están a entre 72 y 152 metros del dique del río Cauca, con amenaza alta de inundación y suelo licuable. Y con El Niño llegando a su pico en noviembre, el agua también se vuelve una restricción.'],
    ['[01:00–02:15] Demostración en vivo del software', 'Esto es Territorio Preparado. Elegimos la amenaza, inundación, y un escenario de 300 personas (simulado). El mapa usa datos reales: 1.970 espacios públicos del DAPM y las amenazas del POT. El sistema descarta los espacios expuestos y propone tres candidatos, explicando por qué. Revisamos uno real en Colinas del Sur: 447 metros cuadrados. Si intentamos ubicar 20 módulos de acopio, el sistema lo bloquea porque no caben; con 16, sí. Luego calcula el agua, los baños y el área cubierta que se necesitan, y qué entidad responde por cada servicio. Exportamos el borrador. Si cambiamos a sismo, la propuesta cambia.'],
    ['[02:15–03:15] Valor público e IRL 3', 'El valor está en que las decisiones se vuelven explicables: por qué un lugar se propone, cuánto se puede ocupar y qué falta. El sistema propone y la autoridad decide (Ley 1523). No reemplaza la evaluación estructural ni a Bomberos, y no usa datos personales: solo conteos agregados, sin reconocimiento facial. La evidencia de que el problema existe viene de la Defensoría y de OCHA. El siguiente paso es validarlo con la Secretaría de Gestión del Riesgo y las juntas de acción comunal del oriente.'],
    ['[03:15–04:00] Equipo y cierre', 'Somos William Ortiz, Herlin Echeverry, Pablo Arango y Bryan Martínez Villamarín. Unimos marco legal, datos, diseño y tecnología para que, la próxima vez, el parque esté listo antes de la emergencia. Territorio Preparado: la ciudad propone con datos; la autoridad decide.'],
  ],
};
