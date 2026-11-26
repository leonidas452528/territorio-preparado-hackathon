# Territorio Preparado: marco legal nacional e internacional (camino a Barcelona)

> **Para qué sirve:** saber qué normas aplican al sistema que describe el informe técnico del 17 de octubre de 2026 (alerta y red de cuidado) y a la base de datos del repo, en Colombia y al exponerlo en el **Smart City Expo World Congress de Barcelona (3 a 5 de noviembre de 2026; una fuente dice 4 a 6, confirmar en la web oficial)**. También dice qué hacer antes del viaje.
> **Fecha:** 21 de octubre de 2026. **Preparó:** William Ortiz, con Claude Code. **No es concepto jurídico:** es un análisis de cumplimiento para el equipo y debe revisarlo un abogado antes de firmar contratos o comercializar.
> **Marcas:** 📜 texto oficial leído (con el artículo); 📄 documento del proyecto leído; 🔎 fuente secundaria (prensa, firmas de abogados, portales), confirmar antes de citar en público; 🧠 conocimiento previo sin verificar. Cada fuente, incluidas las descartadas, está en `docs/cumplimiento/FUENTES.md`, sección H.

---

## 1. Resumen: los ocho puntos que importan

| # | Riesgo | Gravedad | Qué hacer |
|---|---|---|---|
| 1 | **La "alerta sísmica temprana" sale sola** (informe del 17-oct, §2.2 y anexo B). En Colombia, la alerta es un **estado que se declara** con base en el monitoreo (Ley 1523, art. 4, num. 2 📜), y **no existe todavía** un sistema nacional de alerta sísmica (hay un proyecto de ley de agosto de 2026 🔎). Difundir una falsa alarma puede ser **pánico** (Código Penal colombiano, art. 355 📜) y en España, **simular un peligro que movilice servicios de emergencia** es delito (Código Penal español, art. 561 📜) | 🔴 Alta | Presentarla como **simulación y aviso interno a la red**, nunca como alerta pública. El sistema debe **recibir** la alerta oficial (SGC, UNGRD) en formato CAP, no generarla. Marca SIMULACRO visible en todo |
| 2 | **El clasificador de reportes prioriza urgencias y propone bomberos o salud.** En la UE eso es **IA de alto riesgo** (Reglamento 2024/1689, Anexo III, punto 5 d) 📜) | 🟠 Media | Exponer en Barcelona **no es** comercializar (art. 2.8 📜). Si algún día se vende en la UE: obligaciones desde el **2-dic-2027** (Reglamento 2026/1744 🔎) y evaluación documentada (art. 6.3 y 6.4 📜) |
| 3 | **Datos de la red de cuidado:** nombre, teléfono, ubicación, rol y respuestas como "necesito apoyo". Los reportes en texto libre pueden traer **salud** o **menores** (Ley 1581, arts. 5, 6 y 7 📜) | 🟠 Media | Autorización informada antes del piloto, filtro de texto libre, mínimo necesario. En Barcelona, **solo datos sintéticos** |
| 4 | **Licencias de modelos y datos:** BERT SOS **no declara licencia** (📜 ficha en Hugging Face); xView2/xBD es **no comercial** (🔎); CARTO exige **licencia empresarial** para uso comercial (🔎); los mosaicos de OSM no tienen garantía de servicio y **prohíben el uso sin conexión** (📜 política leída) | 🟠 Media | No anunciar como producto nada que dependa de ellos. Reemplazarlos o pedir permiso; documentarlos como "investigación" |
| 5 | **Propiedad intelectual del equipo:** el software es de los participantes y la Cámara de Comercio recibe una **licencia gratuita, indefinida y mundial** para exhibirlo (TDR, 7.4 📄). No hay un acuerdo escrito **entre los cuatro integrantes** | 🟠 Media | Firmar un acuerdo de cotitularidad **antes del viaje**; registrar el software (DNDA) y pedir la marca (SIC, con extensión por el Protocolo de Madrid) |
| 6 | **Lo que se muestra en público deja de ser confidencial** (TDR, 5.3.27 📄) | 🟡 Baja | Mostrar resultados y flujo, no el código fuente, los pesos ni los datos de entrenamiento |
| 7 | **Logos de la Cámara de Comercio y de la Alcaldía:** solo se usan con autorización previa y expresa (TDR, 8.2 📄) | 🟡 Baja | Pedir la autorización por escrito o quitar los logos de las láminas |
| 8 | **Datos de visitantes en el stand:** si se recogen correos o se deja que un visitante pruebe el portal con su teléfono, aplica el **RGPD** (art. 3.2 📜) | 🟡 Baja | Demo con cuentas ficticias; si se recogen contactos, aviso de privacidad y consentimiento (modelo en el §6) |

---

## 2. Qué se evaluó

- **Informe técnico** «Territorio Preparado: sistema de alerta y red de cuidado», v1.0, 17-oct-2026, 42 páginas (📄): FastAPI y MongoDB, nueve agentes en un bus de eventos, alerta temprana preautorizada, alerta operativa con aprobación humana, notificación multicanal (portal, SMS simulado, ntfy, Telegram, correo), clasificador de reportes (TF-IDF más léxico), modelo de daño (gradient boosting), LLM local opcional, datos 100 % sintéticos.
- **Repositorio** (base de datos en Supabase, app `maqueta3d`) y los documentos de `docs/cumplimiento/` del 3 de octubre.
- **Términos y condiciones** de la convocatoria (Cámara de Comercio de Cali, 18 páginas escaneadas, leídas como imagen 📄).

---

## 3. Colombia

### 3.1 Alertas y gestión del riesgo

| Norma | Qué dice | Consecuencia para el proyecto |
|---|---|---|
| Ley 1523 de 2012, art. 4, num. 2 📜 | "**Alerta**: estado que **se declara** con anterioridad a la manifestación de un evento peligroso, con base en el monitoreo del comportamiento del respectivo fenómeno…" | Declarar una alerta es un acto de la autoridad. El sistema puede **difundir** una alerta oficial a la red, no declararla |
| Ley 1523, art. 3, principio 15 📜 | Es **obligación de las autoridades** del Sistema Nacional mantener informadas a las personas sobre las posibilidades de riesgo | Refuerza que la información oficial sale de la autoridad |
| Ley 1523, arts. 2, 12, 14, 27–29 y 55–58 📜 (ya verificados el 3-oct) | Responsabilidad compartida; el alcalde es responsable directo; el consejo coordina; la calamidad la declara el alcalde con concepto del consejo | Diseño "la tecnología organiza, la persona decide" (ADR-0003). Se mantiene |
| Ley 1341 de 2009, art. 8 📜 | En emergencias, los operadores ponen redes y servicios **a disposición de las autoridades**, gratis y con prelación | La difusión masiva por operadores es un canal **de la autoridad**, no de una plataforma privada |
| Proyecto de ley del Sistema Nacional de Alerta Sísmica Temprana (radicado el 18-ago-2026) 🔎 | SGC procesa y fija el umbral; UNGRD coordina; difusión por *cell broadcast* | **No es ley.** Si se aprueba, la alerta sísmica pública tendrá dueño legal y el proyecto debe integrarse como receptor |
| Servicio Geológico Colombiano 🔎 | Monitorea y reporta los sismos (Red Sismológica Nacional) | Fuente oficial de eventos; el informe ya advierte que el catálogo USGS llega con minutos de retraso |
| Código Penal, art. 355 📜 | "El que **por cualquier medio suscite pánico** en lugar público, abierto al público o en transporte colectivo, incurrirá en multa" | Una alerta falsa o mal marcada en un simulacro público puede encajar aquí |
| CRC, Resolución 4972 de 2016 🔎 | Obligaciones de los proveedores con el Sistema Nacional de Telecomunicaciones en Emergencias | Leer antes de cualquier acuerdo con operadores |
| CRC, Resolución 8308 de 2026 🔎 | Medidas contra fraude: alertas de llamadas sospechosas y verificación de mensajes masivos | Los SMS masivos de un piloto deben salir por remitentes verificados |

**Recomendación (no negociable para Barcelona):**
1. Cambiar el nombre visible de "alerta temprana" por **"aviso a la red (simulación)"** y explicar en una línea que, en operación real, el aviso lo **origina la autoridad** (SGC o UNGRD) y el sistema solo lo **distribuye** a la red de cuidado según un protocolo firmado.
2. Recibir las alertas oficiales en **CAP** (Common Alerting Protocol, Recomendación UIT-T X.1303 🔎), el estándar del pilar 3 de *Early Warnings for All* de la ONU 🔎.
3. Mantener `MODO=simulacro` en toda demostración y nunca enviar avisos a teléfonos de visitantes.

### 3.2 Datos personales

| Norma | Qué exige | Cómo aplica |
|---|---|---|
| Ley 1581 de 2012, art. 6 📜 | Prohibido tratar datos **sensibles** salvo autorización explícita, interés vital del titular incapacitado, defensa judicial o fines históricos, estadísticos o científicos con supresión de identidad | Los mensajes "se cayó el muro", "hay un herido" o "mi mamá no tiene sus medicamentos" pueden ser datos de salud. Filtro de texto libre y mínimo necesario |
| Ley 1581, art. 7 📜 | **Proscrito** tratar datos de niños, niñas y adolescentes, salvo los de naturaleza pública | El agravante "menores" del clasificador debe guardar solo el hecho agregado ("hay menores"), nunca datos de un menor |
| Ley 1581, art. 10 📜 | Sin autorización, entre otros: **casos de urgencia médica o sanitaria** | Cubre la atención de una urgencia, **no** el registro permanente de la red. Los representantes deben dar su autorización al inscribirse |
| Ley 1581, art. 26; Decreto 1377 de 2013, arts. 24 a 26; Circular SIC 005 de 2017 📜 (verificados el 3-oct) | Transferencias internacionales solo a países adecuados; las **transmisiones** a un encargado necesitan contrato | Supabase quedó en `us-east-1` (EE. UU. figura en la lista de la SIC). Telegram, Firebase y cualquier pasarela SMS son encargados: contrato o DPA |
| Decreto 090 de 2018 (RNBD) 🔎 | Inscripción de bases si el responsable es persona jurídica pública o supera 100.000 UVT | En un piloto, la responsable sería la Alcaldía |
| Circular Externa SIC 002 de 2024 🔎 | Datos personales en sistemas de IA: idoneidad, necesidad, razonabilidad, proporcionalidad y responsabilidad demostrada | El ciclo de reentrenamiento con "etiquetas reales" (informe §4.4) requiere autorización y anonimización previas |

**Pendiente propio:** la **encuesta de 67 respuestas** que alimenta los llamados preventivos. Confirmar que se pidió autorización y que se publica solo agregada.

### 3.3 Inteligencia artificial

- **No hay ley de IA vigente en Colombia** a septiembre de 2026; el proyecto de MinCiencias murió el 19 de junio y hay proyectos nuevos, entre ellos el PL 025 de 2026 🔎. Rigen la Ley 1581 y la Circular SIC 002 de 2024.
- **CONPES 4144 de 2025** (política nacional de IA) 🔎.
- El proyecto ya cumple las buenas prácticas que se repiten en todos los marcos: reglas explicables, umbral de confianza, revisión humana y bitácora de decisiones.

### 3.4 Propiedad intelectual (lo que más conviene resolver antes del viaje)

| Tema | Fuente | Situación |
|---|---|---|
| **Titularidad** | TDR, 7.4 📄 | Los derechos patrimoniales de lo que desarrolla el equipo son **del participante**; los morales, de los autores (Ley 23 de 1982, art. 30; Decisión Andina 351, art. 11, citados por el TDR) |
| **Licencia a la Cámara** | TDR, 7.4 📄 | Licencia **no exclusiva, gratuita, indefinida y sin límite territorial** para usar, reproducir, transformar, adaptar, comunicar, divulgar y **exhibir** resultados, con fines institucionales, académicos y de promoción. La Cámara puede mostrar el proyecto en Barcelona sin pedir permiso adicional |
| **Confidencialidad** | TDR, 5.3.27 📄 | Lo que se presenta en espacios abiertos puede ser conocido por terceros: cada equipo decide qué revela |
| **Entre los cuatro integrantes** | — | No hay acuerdo escrito. Sin él, cualquier decisión de licenciar, vender o abrir el código exige la voluntad de todos. **Firmar un acuerdo de cotitularidad**: porcentajes, quién decide, salida de un integrante, licencia del código |
| **Software** | Decreto 1360 de 1989; Decisión 351 🔎 | Se protege por derecho de autor **sin registro**. El registro ante la Dirección Nacional de Derecho de Autor es voluntario y sirve como prueba |
| **Patente** | Decisión 486, art. 15 🔎 | Los programas de ordenador **no** se consideran invenciones |
| **Marca "Territorio Preparado"** | Protocolo de Madrid: Colombia es miembro desde el 29-ago-2012 🔎 | Pedirla ante la SIC (clases sugeridas: 9 software y 42 servicios tecnológicos; confirmar con la SIC) y extenderla a la UE por el Protocolo de Madrid. En Barcelona el nombre queda expuesto a 27.000 visitantes 🔎 |
| **Uso de marcas ajenas** | TDR, 8.2 📄 | Los logos de la Cámara solo se usan con consentimiento previo y expreso; aplicar el mismo criterio a la Alcaldía, la IDESC y el SGC |

### 3.5 Licencias de terceros que usa el sistema

| Recurso | Licencia o condición | Estado | Riesgo para exhibir y comercializar |
|---|---|---|---|
| Datos IDESC y datos abiertos de Cali | CC BY y **CC BY-SA** (ya registrado en el repo) 📜 | Verificado el 3-oct | Atribución obligatoria; lo derivado de capas CC BY-SA se comparte con la misma licencia |
| Mosaicos de OpenStreetMap | Atribución visible; sin garantía de servicio; prohíbe el uso sin conexión y la descarga masiva 📜 | Política leída hoy | Para la demo sin Internet, usar PMTiles propios o OpenFreeMap |
| CARTO Positron y Voyager | Gratis con clave y uso razonable; **uso comercial exige licencia empresarial** 🔎 | Fuente secundaria | Cambiar a OpenFreeMap u OSM autoalojado antes de un piloto pago |
| OpenTopoMap | CC BY-SA (según el informe) 🧠 | Sin verificar | Atribución |
| Helsinki-NLP opus-mt-es-en | **Apache 2.0** 📜 (ficha de Hugging Face) | Verificado hoy | Sin problema; conservar el aviso |
| AventIQ-AI Bert-Disaster-SOS | **No declara licencia** 📜 (ficha de Hugging Face, sin campo de licencia) | Verificado hoy | Sin licencia rige "todos los derechos reservados". Pedir permiso al autor o reemplazarlo |
| xView2 / xBD | CC BY-NC-SA (4.0 según DrivenData y Hugging Face; 3.0 según hyper.ai) 🔎; las imágenes son de Maxar con sus propios términos | Fuente secundaria y en conflicto | **Solo investigación**; no usar en un producto pago |
| Llama 3.2 | Licencia comunitaria de Meta; los modelos **multimodales** (11B, 90B) no se licencian a personas o empresas domiciliadas en la UE; los de solo texto (1B, 3B), sí 🔎 | Fuente secundaria | El informe propone Llama 3.2 para texto: válido; evitar las versiones de visión si hay socio europeo |
| Qwen 2.5 | Apache 2.0, salvo los tamaños **3B y 72B**, con licencia propia de Qwen 🔎 | Fuente secundaria | Revisar la licencia del tamaño que se use |
| Whisper | MIT 🧠 | Sin verificar | — |
| scikit-learn (BSD-3), Leaflet (BSD-2), Chart.js (MIT) | Permisivas (según el informe) 🧠 | Sin verificar | Conservar avisos de copyright |
| MongoDB Community | SSPL 🧠 | Sin verificar | Sin problema mientras no se ofrezca MongoDB como servicio |

### 3.6 Otras normas colombianas relevantes

- **Compra pública de innovación:** la Ley 2069 de 2020, art. 36, y el Decreto 442 de 2022 permiten a las entidades comprar tecnología e innovación 🔎. Es la vía para que la Alcaldía adopte el sistema después del hackathon (el TDR, 3.9, aclara que participar no garantiza contratación 📄).
- **Accesibilidad:** la Resolución MinTIC 1519 de 2020, Anexo 1, exige WCAG 2.1 AA a los sujetos de la Ley 1712 de 2014 🔎. Aplica si la Alcaldía publica el sistema.
- **Animales:** la Ley 2474 de 2025 📜 (verificada el 3-oct). La red puede informar si un albergue recibe mascotas.

---

## 4. Barcelona y la Unión Europea

### 4.1 Exponer no es comercializar

| Norma | Texto | Lectura |
|---|---|---|
| Reglamento (UE) 2024/1689 (IA), art. 2.8 📜 | "No se aplicará a ninguna actividad de **investigación, prueba o desarrollo** relativa a sistemas de IA… **antes de su introducción en el mercado o puesta en servicio**… Las pruebas en condiciones reales no estarán cubiertas por esa exclusión" | Una demostración con datos sintéticos en una feria está fuera del reglamento. Un piloto con personas reales en la UE, no |
| Reglamento de IA, Anexo III, punto 5 d) 📜 | Alto riesgo: sistemas "para la evaluación y la clasificación de las **llamadas de emergencia** … o para el envío o el establecimiento de **prioridades en el envío de servicios de primera intervención** en situaciones de emergencia, por ejemplo, policía, bomberos y servicios de asistencia médica" | El agente de reportes (urgencia y recurso propuesto) **entra aquí** si se ofrece en la UE. **Corrige la nota del 3-oct**, que no se atrevía a afirmarlo |
| Reglamento de IA, art. 6.3 y 6.4 📜 | No es alto riesgo si, entre otras, hace una **tarea preparatoria** o no influye sustancialmente en la decisión; quien lo alegue debe **documentar** la evaluación antes de comercializarlo, y siempre es alto riesgo si hace perfiles de personas | Como el operador confirma o corrige cada asignación, podría argumentarse la letra d). Hay que documentarlo |
| Reglamento de IA, considerando 12 📜 | La definición de IA no incluye los sistemas basados en reglas definidas únicamente por personas físicas | El motor de protocolo (umbrales y plantillas) y las reglas de `planning.ts` **no son IA**; el clasificador, el modelo de daño y el LLM, sí |
| Reglamento (UE) 2026/1744 (Digital Omnibus de IA) 🔎 | Publicado el 24-jul-2026 y en vigor el 27-jul-2026. Las obligaciones de alto riesgo del Anexo III aplican desde el **2-dic-2027**; las de transparencia del art. 50, desde el 2-ago-2026 | Sin urgencia legal para Barcelona; sí para un plan de negocio europeo |

### 4.2 Datos personales en el evento

- **RGPD, art. 3.2 📜:** aplica a un responsable no establecido en la UE cuando trata datos de personas que están en la Unión y el tratamiento se relaciona con la **oferta de bienes o servicios** a esas personas o el **control de su comportamiento**.
- **Consecuencia:** mostrar el sistema con datos sintéticos no trata datos personales. Pedir correos a los visitantes para hacer seguimiento comercial, o inscribirlos en el portal, **sí**.
- **Qué hacer:** demo solo con cuentas ficticias. Si se recogen contactos, usar el aviso del §6.3 y no enviar correos comerciales sin consentimiento. En España, la Ley 34/2002 (LSSI), art. 21, regula las comunicaciones comerciales por correo electrónico 🧠.
- **Grabaciones e imágenes:** el TDR autoriza a la Cámara a captar fotos, voz y video de los participantes (§8 📄). Si el equipo graba a visitantes, pedir su permiso. No usar fotos de víctimas del sismo de agosto de 2026 sin licencia del autor y sin considerar la dignidad de las personas.

### 4.3 Alertas públicas en Europa

- **Directiva (UE) 2018/1972, art. 110**, y en España la **Ley 11/2022, art. 75** (ES-Alert) 🔎: las alertas públicas por móvil son un sistema **de la autoridad**, que los operadores deben transmitir.
- **Código Penal español, art. 561 📜:** "Quien afirme falsamente o **simule una situación de peligro** para la comunidad … y con ello provoque la movilización de los servicios de policía, asistencia o salvamento" (prisión de 3 meses y 1 día a 1 año, o multa de 3 a 18 meses).
- **En el stand:** el sonido y la vibración de la alerta del portal (informe §8.2) deben sonar solo en los teléfonos del equipo, con "SIMULACRO" en pantalla. Nunca usar tonos idénticos a ES-Alert ni enviar nada a dispositivos del público.

### 4.4 Si algún día se vende en la UE (no aplica a la demo)

- **Cyber Resilience Act**, Reglamento (UE) 2024/2847 🔎: reporte de vulnerabilidades explotadas e incidentes graves desde el 11-sep-2026, y el resto de obligaciones desde el 11-dic-2027. Aplica a productos con elementos digitales comercializados en la UE.
- **Reglamento de IA:** obligaciones de alto riesgo desde el 2-dic-2027 (§4.1).
- **RGPD completo:** representante en la UE (art. 27) 🧠, evaluación de impacto y contratos con encargados.

### 4.5 Marcos internacionales que respaldan la propuesta

| Marco | Qué aporta | Estado |
|---|---|---|
| Marco de Sendai 2015–2030 | Cuatro prioridades; la cuarta, la preparación para la respuesta | 🔎 (verificado el 3-oct) |
| *Early Warnings for All* (ONU, 2023–2027) | Cuatro pilares: conocimiento del riesgo, detección, **difusión y comunicación**, preparación y respuesta. El pilar 3 pide alertas **autorizadas** en CAP para todos los medios | 🔎 |
| CAP, Recomendación UIT-T X.1303 | Formato XML común para alertas de cualquier amenaza y por cualquier medio | 🔎 |
| Manual Esfera 2018 | Parámetros de baños, agua y área usados por la app | 🔎 |
| Manual del CICR sobre protección de datos en la acción humanitaria; Recomendación de la UNESCO sobre la ética de la IA (2021); Principios de IA de la OCDE | Referencias de ética y datos para un público internacional | 🧠 |

**Mensaje para Barcelona:** el proyecto no compite con la autoridad que emite alertas. Cubre la **última milla** que *Early Warnings for All* identifica como brecha: que el aviso oficial llegue a la red comunitaria, que se sepa quién lo leyó y que la ayuda se pida y se asigne con trazabilidad.

---

## 5. Hallazgos que cambian documentos anteriores

1. `MATRIZ_NORMATIVA.md` §4 dice "No emite alertas oficiales", pero el módulo del 17-oct **emite una alerta temprana automática**. Hay que alinear el módulo con el principio (§3.1) o justificar la excepción con un protocolo firmado por la autoridad.
2. `FUENTES.md` §E decía que no se podía confirmar el despacho de emergencias en el Anexo III del Reglamento de IA. **Ahora está confirmado con el texto oficial** (§4.1).
3. El informe propone MongoDB; el repo usa PostgreSQL en Supabase. No es un problema legal, pero los controles de datos (RLS, auditoría encadenada, exclusión de datos de personas) están probados solo en Supabase: si se usa MongoDB en el piloto, hay que rehacerlos.
4. Los datos sintéticos del informe usan nombres realistas (por ejemplo, "Álvaro Ortiz Rentería"). Para la exhibición conviene usar seudónimos evidentes ("Representante 02"), para que nadie piense que son personas reales.

---

## 6. Plan de acción antes del 3 de noviembre

| # | Acción | Responsable sugerido | Fecha |
|---|---|---|---|
| 1 | Cambiar "alerta temprana" por "aviso a la red (simulación)" en la consola, el portal y las láminas, y explicar que el aviso real lo origina la autoridad | Equipo técnico | 28-oct |
| 2 | Verificar `MODO=simulacro` y el texto SIMULACRO en todo mensaje, sonido y captura | Equipo técnico | 28-oct |
| 3 | Firmar el acuerdo de cotitularidad entre los cuatro integrantes | Todo el equipo | 30-oct |
| 4 | Pedir la marca ante la SIC y planear la extensión por el Protocolo de Madrid | Responsable legal del equipo | Antes del viaje |
| 5 | Registrar el software ante la Dirección Nacional de Derecho de Autor | Responsable legal del equipo | Antes del viaje |
| 6 | Quitar o reemplazar BERT SOS y xView2 de todo lo que se presente como producto; dejarlos como línea de investigación | Equipo técnico | 28-oct |
| 7 | Cambiar CARTO por OpenFreeMap o PMTiles en la demo y dejar visible la atribución de OSM | Equipo técnico | 28-oct |
| 8 | Pedir por escrito el permiso de uso de logos (Cámara, Alcaldía) o quitarlos | Quien presenta | 25-oct |
| 9 | Reemplazar nombres sintéticos realistas por seudónimos evidentes | Equipo técnico | 28-oct |
| 10 | Preparar las respuestas a "¿es IA de alto riesgo?" y "¿quién emite la alerta?" (§7) | Quien presenta | 31-oct |
| 11 | Confirmar la autorización de los 67 encuestados y publicar solo cifras agregadas | Responsable de la encuesta | 25-oct |
| 12 | Que un abogado revise este documento | William | Antes del viaje |

### 6.1 Leyenda para láminas y consola (español)

> **Prototipo de demostración con datos sintéticos.** No es un sistema oficial de alerta. Las alertas reales las emite la autoridad competente (en Colombia, el Servicio Geológico Colombiano y la UNGRD); Territorio Preparado las distribuye a la red de cuidado y deja cada decisión en la persona responsable (Ley 1523 de 2012).

### 6.2 Leyenda para láminas y consola (inglés)

> **Demonstration prototype with synthetic data.** Not an official warning system. Real alerts are issued by the competent authority (in Colombia, the Colombian Geological Survey and the National Disaster Risk Management Unit); Territorio Preparado relays them to the community care network and leaves every decision to an accountable person.

### 6.3 Aviso para recoger contactos en el stand (si se hace)

> *Territorio Preparado* (Cali, Colombia) recogerá tu nombre y correo solo para enviarte la información del proyecto que pediste. No los cederemos a terceros. Puedes pedir acceso, rectificación o supresión escribiendo a [correo del equipo]. Base legal: tu consentimiento (art. 6.1.a RGPD). ☐ Acepto

---

## 7. Preguntas difíciles en Barcelona y respuestas cortas

| Pregunta | Respuesta |
|---|---|
| ¿Ustedes emiten alertas sísmicas? | No. La alerta la emite la autoridad. Nosotros la llevamos a la red comunitaria, medimos quién la recibió y gestionamos la ayuda. Lo que ven es una simulación |
| ¿Es IA de alto riesgo según el AI Act? | La priorización de reportes lo sería si se comercializara en la UE (Anexo III, 5 d). Hoy es un prototipo de investigación (art. 2.8), con revisión humana obligatoria y reglas explicables, y documentaremos la evaluación del art. 6 antes de cualquier piloto europeo |
| ¿Qué datos personales guardan? | En la demo, ninguno real. En un piloto: solo los de la red que se inscribe con autorización (Ley 1581). Nunca datos de personas damnificadas: ese registro es de la autoridad |
| ¿De quién es el software? | Del equipo (términos del hackathon, 7.4). La Cámara de Comercio de Cali tiene una licencia para divulgarlo |
| ¿Con qué datos entrenaron? | Datos sintéticos. Los modelos de terceros con licencias restrictivas están marcados como investigación |
