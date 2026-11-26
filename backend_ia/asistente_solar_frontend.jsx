// ☀️ Solaris — Asistente Solar Rural
// Frontend completo: Chat + Diagnóstico Visual + Predicción Energética
// Stack: React 18 (CDN) + Babel Standalone + Flask API

const { useState, useEffect, useRef, useCallback } = React;

// URL dinámica: si se abre desde ngrok/red usa el mismo host; en local usa localhost:5000
// URL dinámica: usa el mismo host/puerto desde donde se sirve el frontend
// - localhost → http://localhost:8080
// - ngrok     → https://abc123.ngrok.io  (misma origin, sin puerto)
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : window.location.origin;

// ─── Utilidades ────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const alertClass = (nivel) => {
  if (nivel === 'critico')     return 'alert-banner alert-critical';
  if (nivel === 'advertencia') return 'alert-banner alert-warning';
  if (nivel === 'normal')      return 'alert-banner alert-normal';
  return 'alert-banner alert-info';
};

const dotClass = (v) => {
  if (v === 'activo' || v?.includes('GGUF') || v?.includes('RAG') || v?.includes('Fallback'))
    return 'status-dot dot-green';
  if (v?.includes('inactivo')) return 'status-dot dot-yellow';
  return 'status-dot dot-gray';
};

// ─── Banco completo de preguntas sugeridas ─────────────────────
// Pool oficial de 30 preguntas para el auditorio
const PREGUNTAS_SUGERIDAS = [
  // Bloque 1: Conceptos Básicos
  { categoria: '☀️ Conceptos Básicos',  pregunta: '¿Qué es la energía solar y cómo me da luz en la casa?' },
  { categoria: '☀️ Conceptos Básicos',  pregunta: '¿Por qué es mejor usar el sol que prender una planta de gasolina?' },
  { categoria: '☀️ Conceptos Básicos',  pregunta: '¿Si el día está nublado o llueve, mis paneles siguen cargando?' },
  { categoria: '☀️ Conceptos Básicos',  pregunta: '¿Puedo tener luz toda la noche con este sistema?' },
  { categoria: '☀️ Conceptos Básicos',  pregunta: '¿Cuántos años me van a durar los paneles antes de tener que cambiarlos?' },
  // Bloque 2: Componentes
  { categoria: '🔧 Componentes',        pregunta: '¿Para qué sirve exactamente el panel que va en el techo?' },
  { categoria: '🔧 Componentes',        pregunta: '¿Qué hace la batería y por qué es tan pesada?' },
  { categoria: '🔧 Componentes',        pregunta: '¿Qué es esa cajita con luces que va conectada a la batería (Regulador)?' },
  { categoria: '🔧 Componentes',        pregunta: '¿Para qué sirve el aparato que tiene un enchufe normal (Inversor)?' },
  { categoria: '🔧 Componentes',        pregunta: '¿Puedo usar una batería de carro vieja para mi sistema solar?' },
  // Bloque 3: Instalación
  { categoria: '🏗️ Instalación',        pregunta: '¿Para qué lado debe mirar el panel para que reciba más sol?' },
  { categoria: '🏗️ Instalación',        pregunta: '¿Qué pasa si le da la sombra de un árbol a una esquinita del panel?' },
  { categoria: '🏗️ Instalación',        pregunta: '¿Cómo se deben conectar los cables para no causar un corto?' },
  { categoria: '🏗️ Instalación',        pregunta: '¿Es mejor poner los paneles en el techo o en una estructura en el suelo?' },
  { categoria: '🏗️ Instalación',        pregunta: '¿Qué herramientas básicas necesito para instalar mi kit solar?' },
  // Bloque 4: Uso de energía
  { categoria: '⚡ Qué Conectar',       pregunta: '¿Puedo conectar una nevera de las normales a mi sistema solar?' },
  { categoria: '⚡ Qué Conectar',       pregunta: '¿Cuántos bombillos puedo dejar prendidos toda la noche?' },
  { categoria: '⚡ Qué Conectar',       pregunta: '¿Puedo usar una plancha o una licuadora con el sol?' },
  { categoria: '⚡ Qué Conectar',       pregunta: '¿Mi televisor gasta mucha energía de la batería?' },
  { categoria: '⚡ Qué Conectar',       pregunta: '¿Cómo sé si me estoy gastando la carga muy rápido?' },
  // Bloque 5: Mantenimiento
  { categoria: '🧹 Mantenimiento',      pregunta: '¿Cómo se deben limpiar los paneles cuando tienen mucho polvo o basura?' },
  { categoria: '🧹 Mantenimiento',      pregunta: '¿Cada cuánto tiempo tengo que subirme a limpiar los paneles?' },
  { categoria: '🧹 Mantenimiento',      pregunta: '¿Qué le pasa a la batería si le cae agua de lluvia?' },
  { categoria: '🧹 Mantenimiento',      pregunta: '¿Cómo me doy cuenta si la batería ya se está dañando?' },
  { categoria: '🧹 Mantenimiento',      pregunta: '¿Qué hago si veo un cable pelado o que está echando chispas?' },
  // Bloque 6: Emergencias
  { categoria: '🚨 Emergencias',        pregunta: '¿Por qué hoy no prendieron los bombillos si ayer hizo mucho sol?' },
  { categoria: '🚨 Emergencias',        pregunta: '¿Qué significa si la luz del regulador se pone de color rojo?' },
  { categoria: '🚨 Emergencias',        pregunta: '¿Por qué el inversor está haciendo un pitido muy fuerte?' },
  { categoria: '🚨 Emergencias',        pregunta: '¿Qué hago si los cables que salen del panel están muy calientes?' },
  { categoria: '🚨 Emergencias',        pregunta: '¿A quién debo avisar o qué debo revisar si nada funciona de repente?' },
];

const CATEGORIAS = [...new Set(PREGUNTAS_SUGERIDAS.map(p => p.categoria))];

const QUICK_QUESTIONS = [
  '¿Cuántos paneles necesito?',
  '¿Cómo limpio los paneles?',
  '¿Qué subsidios hay del IPSE?',
  '¿Cuánto cuesta instalar?',
  '¿Por qué mi batería no carga?',
  '¿Qué es una zona ZNI?',
];

const TIPS = [
  { icon: '💧', text: 'Limpia los paneles cada 2-4 semanas con agua y trapo suave.' },
  { icon: '🌳', text: 'Poda ramas que puedan dar sombra a tus paneles.' },
  { icon: '🔌', text: 'Revisa los cables mensualmente — un cable suelto puede parar todo.' },
  { icon: '🔋', text: 'Nunca descargues las baterías por debajo del 50%.' },
  { icon: '🧭', text: 'Los paneles deben mirar al norte en Colombia, inclinados 10-15°.' },
  { icon: '🏛️', text: 'El IPSE tiene subsidios de hasta 80% para zonas ZNI.' },
];

// ─── Listbox de preguntas sugeridas ────────────────────────────
function ListboxPreguntas({ onSelect }) {
  const [catActiva, setCatActiva] = useState(CATEGORIAS[0]);
  const [busqueda,  setBusqueda]  = useState('');

  const filtradas = PREGUNTAS_SUGERIDAS.filter(p => {
    const matchCat = p.categoria === catActiva;
    const matchBus = busqueda === '' ||
      p.pregunta.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Buscador */}
      <input
        type="text"
        placeholder="🔍 Buscar pregunta..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          padding: '6px 10px',
          border: '1px solid var(--solar-border)',
          borderRadius: 8,
          fontSize: '0.8rem',
          background: '#FAFAF9',
          outline: 'none',
        }}
      />

      {/* Tabs de categoría */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4,
      }}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => { setCatActiva(cat); setBusqueda(''); }}
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              borderRadius: 12,
              border: '1px solid',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s',
              background:     catActiva === cat ? 'var(--solar-orange)' : '#F5F5F4',
              color:          catActiva === cat ? 'white'               : '#57534E',
              borderColor:    catActiva === cat ? 'var(--solar-orange)' : 'var(--solar-border)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{
        maxHeight: 220,
        overflowY: 'auto',
        border: '1px solid var(--solar-border)',
        borderRadius: 8,
        background: 'white',
      }}>
        {filtradas.length === 0 && (
          <div style={{ padding: '12px 14px', color: '#A8A29E', fontSize: '0.82rem', textAlign: 'center' }}>
            Sin resultados para "{busqueda}"
          </div>
        )}
        {filtradas.map((item, i) => (
          <div
            key={i}
            onClick={() => onSelect(item.pregunta)}
            style={{
              padding: '9px 12px',
              fontSize: '0.83rem',
              color: '#292524',
              cursor: 'pointer',
              borderBottom: i < filtradas.length - 1 ? '1px solid #F5F5F4' : 'none',
              transition: 'background 0.1s',
              lineHeight: 1.4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <span style={{ marginRight: 6, opacity: 0.6 }}>▶</span>
            {item.pregunta}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componentes menores ────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="msg-wrap assistant">
      <div className="typing-dots">
        <div className="dot-pulse"></div>
        <div className="dot-pulse"></div>
        <div className="dot-pulse"></div>
      </div>
    </div>
  );
}

function WelcomeCard({ onQuick }) {
  return (
    <div className="welcome-card">
      <div className="welcome-icon">☀️</div>
      <div className="welcome-title">¡Hola! Soy Solaris</div>
      <div className="welcome-desc">
        Tu asistente de energía solar para comunidades rurales de Colombia.<br />
        Puedo ayudarte con instalación, mantenimiento y subsidios solares.<br />
        <br />
        <strong>Pregúntame lo que necesites:</strong>
      </div>
      <div className="quick-questions" style={{ marginTop: 16, justifyContent: 'center' }}>
        {QUICK_QUESTIONS.map(q => (
          <span key={q} className="quick-btn" onClick={() => onQuick(q)}>{q}</span>
        ))}
      </div>
    </div>
  );
}

function Message({ msg }) {
  const hasAlert = msg.alertas && msg.alertas.length > 0;
  const hasDiag  = msg.diagnostico_visual;

  return (
    <div className={`msg-wrap ${msg.role}`}>
      <div className="msg-bubble">{msg.content}</div>

      {hasAlert && msg.alertas.map((a, i) => (
        <div key={i} className={`${alertClass(a.nivel)} alert-in-chat`}>
          {a.mensaje}
        </div>
      ))}

      {hasDiag && hasDiag.nivel_alerta !== 'no_disponible' && (
        <div className={`${alertClass(hasDiag.nivel_alerta)} alert-in-chat`}>
          <strong>Diagnóstico visual:</strong> {hasDiag.mensaje}
          {hasDiag.recomendaciones?.length > 0 && (
            <ul className="rec-list" style={{ marginTop: 6 }}>
              {hasDiag.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="msg-meta">{msg.time}</div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────
function Sidebar({ status, prediction, sensorVal, setSensorVal, onSensorCheck, loading, onSelectPregunta }) {
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const predLines = prediction
    ? prediction.split('\n').filter(l => l.includes('→'))
    : [];

  return (
    <div className="sidebar">
      {/* Estado del sistema */}
      <div className="sidebar-section">
        <div className="section-title">Estado del sistema</div>
        <div className="status-row">
          <span className="status-label">🧠 Asistente IA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#57534E' }}>{status?.llm || '...'}</span>
            <div className={dotClass(status?.llm)}></div>
          </div>
        </div>
        <div className="status-row">
          <span className="status-label">📊 Predictor</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#57534E' }}>{status?.predictor || '...'}</span>
            <div className={dotClass(status?.predictor)}></div>
          </div>
        </div>
        <div className="status-row">
          <span className="status-label">👁️ Visión</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', color: '#57534E' }}>
              {status?.vision ? (status.vision.length > 16 ? 'instalando...' : status.vision) : '...'}
            </span>
            <div className={dotClass(status?.vision)}></div>
          </div>
        </div>
      </div>

      {/* Sensor */}
      <div className="sidebar-section">
        <div className="section-title">Revisar mi sistema</div>
        <div className="input-group">
          <label>⚡ Producción actual (kWh)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={sensorVal}
            onChange={e => setSensorVal(e.target.value)}
            placeholder="Ej: 3.5"
          />
        </div>
        <button
          className="btn btn-solar"
          style={{ width: '100%' }}
          onClick={onSensorCheck}
          disabled={loading || !sensorVal}
        >
          {loading ? <><span className="spinner"></span> Analizando...</> : '⚡ Analizar mi producción'}
        </button>
      </div>

      {/* Predicción */}
      {predLines.length > 0 && (
        <div className="sidebar-section">
          <div className="section-title">Producción estimada (próx. horas)</div>
          {predLines.map((line, i) => {
            const [hora, val] = line.split('→');
            return (
              <div key={i} className="pred-row">
                <span className="pred-hour">{hora?.trim()}</span>
                <span className="pred-val">{val?.trim()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tip rotativo */}
      <div className="sidebar-section">
        <div className="section-title">Consejo del día</div>
        <div className="tip-card">
          <span className="tip-icon">{TIPS[tipIdx].icon}</span>
          {TIPS[tipIdx].text}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#A8A29E', textAlign: 'center', marginTop: 4 }}>
          {tipIdx + 1} / {TIPS.length} — se actualiza automáticamente
        </div>
      </div>

      {/* Listbox de preguntas sugeridas */}
      <div className="sidebar-section">
        <div className="section-title">Preguntas sugeridas</div>
        <ListboxPreguntas onSelect={onSelectPregunta} />
      </div>
    </div>
  );
}

// ─── Tab: Chat ──────────────────────────────────────────────────
function ChatTab({ messages, loading, onSend, onQuick }) {
  const [input, setInput]   = useState('');
  const endRef              = useRef(null);
  const textareaRef         = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    onSend(q);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuick = (q) => {
    onQuick(q);
  };

  return (
    <div className="tab-panel active">
      <div className="messages-container">
        {messages.length === 0
          ? <WelcomeCard onQuick={handleQuick} />
          : messages.map((m, i) => <Message key={i} msg={m} />)
        }
        {loading && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      <div className="input-area">
        <div className="quick-questions">
          {QUICK_QUESTIONS.slice(0, 4).map(q => (
            <span key={q} className="quick-btn" onClick={() => handleQuick(q)}>{q}</span>
          ))}
        </div>
        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe tu pregunta sobre energía solar..."
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? <span className="spinner"></span> : '➤ Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Diagnóstico Visual ────────────────────────────────────
function VisionTab({ onDiagnosisComplete }) {
  const [dragging, setDragging] = useState(false);
  const [preview,  setPreview]  = useState(null);
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [chatSent, setChatSent] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null); setPreview(null); setResult(null);
    setError(null); setChatSent(false);
  };

  const handleFile = (f) => {
    if (!f) return;
    // Aceptar cualquier imagen aunque el tipo MIME no esté bien detectado
    if (f.type && !f.type.startsWith('image/')) {
      setError(`Tipo de archivo no soportado: ${f.type}. Usa JPG, PNG o WEBP.`);
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setChatSent(false);
    const reader = new FileReader();
    reader.onload  = e => setPreview(e.target.result);
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const diagnose = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('image', file);

    try {
      const res = await fetch(`${API}/api/diagnose`, {
        method: 'POST',
        body: form,
        // NO establecer Content-Type manualmente — el browser lo hace con el boundary correcto
      });

      if (!res.ok) {
        const txt = await res.text();
        setError(`Error del servidor (${res.status}): ${txt.slice(0, 120)}`);
        return;
      }

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Mostrar resultado en esta misma tab PRIMERO
      setResult(data.diagnostico);

    } catch (e) {
      setError(
        `No se pudo conectar (${API}). ` +
        '¿Está corriendo server.py en el puerto 8080?'
      );
    } finally {
      setLoading(false);
    }
  };

  const enviarAChat = () => {
    if (!result || chatSent) return;
    setChatSent(true);
    onDiagnosisComplete && onDiagnosisComplete(result);
  };

  const nivelColor = {
    normal:       '#16A34A',
    advertencia:  '#D97706',
    critico:      '#DC2626',
    info:         '#2563EB',
    no_disponible:'#78716C',
    error:        '#DC2626',
  };

  const nivelIcon = {
    normal: '✅', advertencia: '⚠️', critico: '🚨',
    info: 'ℹ️', no_disponible: '⚙️', error: '❌',
  };

  return (
    <div className="tab-panel active">
      <div className="vision-panel">

        {/* ── Zona de upload ── */}
        <div
          className={`upload-area ${dragging ? 'drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          style={{ cursor: file ? 'default' : 'pointer', minHeight: preview ? 'auto' : 140 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {preview ? (
            <img
              src={preview}
              alt="Panel seleccionado"
              style={{ maxHeight: 260, maxWidth: '100%', borderRadius: 10, objectFit: 'contain' }}
            />
          ) : (
            <>
              <div className="upload-icon">📸</div>
              <div className="upload-text">Arrastra una foto de tus paneles aquí</div>
              <div className="upload-sub">o haz clic para seleccionar (JPG, PNG, WEBP)</div>
            </>
          )}
        </div>

        {/* ── Botones de acción ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {/* Siempre visible: botón para seleccionar archivo */}
          <button
            className="btn btn-secondary"
            style={{ minWidth: 130 }}
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            📂 {file ? 'Cambiar foto' : 'Seleccionar foto'}
          </button>

          {file && (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={diagnose}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner"></span>&nbsp; Analizando con YOLOv8...</>
                : '🔍 Analizar paneles con IA'}
            </button>
          )}

          {file && (
            <button className="btn btn-secondary" onClick={reset} disabled={loading}>
              🗑️ Limpiar
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="alert-banner alert-critical" style={{ marginTop: 14 }}>
            ❌ {error}
          </div>
        )}

        {/* ── Resultado del diagnóstico ── */}
        {result && (
          <div className="diagnosis-result" style={{ marginTop: 18 }}>

            {/* Cabecera con nivel */}
            <div className="diagnosis-header" style={{
              background: nivelColor[result.nivel_alerta] + '15',
              borderBottom: `2px solid ${nivelColor[result.nivel_alerta]}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.3rem' }}>{nivelIcon[result.nivel_alerta]}</span>
              <span style={{ color: nivelColor[result.nivel_alerta], fontWeight: 700 }}>
                Diagnóstico: {result.nivel_alerta.toUpperCase()}
              </span>
            </div>

            <div className="diagnosis-body">
              {/* Mensaje principal */}
              <div className={alertClass(result.nivel_alerta)} style={{ marginBottom: 16 }}>
                {result.mensaje}
              </div>

              {/* Imagen analizada (thumbnail) */}
              {preview && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#57534E', marginBottom: 6 }}>
                    Imagen analizada:
                  </div>
                  <img
                    src={preview}
                    alt="analizada"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--solar-border)' }}
                  />
                </div>
              )}

              {/* Detecciones */}
              {result.detecciones?.length > 0 ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: '#57534E' }}>
                    Objetos detectados ({result.detecciones.length}):
                  </div>
                  {result.detecciones.map((d, i) => (
                    <div key={i} className="detection-item">
                      <span style={{ fontSize: '0.85rem' }}>
                        {d.descripcion || d.clase}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="conf-bar">
                          <div className="conf-fill" style={{
                            width: `${d.confianza * 100}%`,
                            background: d.confianza > 0.7 ? '#16A34A' : '#D97706',
                          }}></div>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#78716C', width: 34, textAlign: 'right' }}>
                          {Math.round(d.confianza * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: '0.84rem', color: '#78716C', marginBottom: 10 }}>
                  No se detectaron anomalías visibles en la imagen.
                </div>
              )}

              {/* Recomendaciones */}
              {result.recomendaciones?.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', margin: '14px 0 8px', color: '#57534E' }}>
                    Recomendaciones:
                  </div>
                  <ul className="rec-list">
                    {result.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}

              {/* Botón: enviar a chat */}
              <button
                className="btn btn-solar"
                style={{ width: '100%', marginTop: 16 }}
                onClick={enviarAChat}
                disabled={chatSent}
              >
                {chatSent
                  ? '✅ Diagnóstico enviado al chat'
                  : '💬 Preguntar a Solaris sobre este diagnóstico'}
              </button>
            </div>
          </div>
        )}

        {/* ── Cards informativas (solo cuando no hay resultado) ── */}
        {!result && !loading && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '🟡', title: 'Suciedad',     desc: 'Polvo o suciedad que reduce la producción hasta un 30%' },
              { icon: '🟠', title: 'Sombras',       desc: 'Ramas u objetos que bloqueen aunque sea una esquina del panel' },
              { icon: '🔴', title: 'Daño físico',   desc: 'Grietas, roturas o celdas quemadas visibles' },
              { icon: '🔌', title: 'Cables',        desc: 'Conectores sueltos, pelados o con señales de quemado' },
            ].map(item => (
              <div key={item.title} style={{
                background: 'white', border: '1px solid var(--solar-border)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#78716C', lineHeight: 1.45 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Principal ──────────────────────────────────────────────
function App() {
  const [activeTab,  setActiveTab]  = useState('chat');
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [status,     setStatus]     = useState({});
  const [prediction, setPrediction] = useState('');
  const [sensorVal,  setSensorVal]  = useState('');

  // Cargar estado del servidor al iniciar
  useEffect(() => {
    fetch(`${API}/api/status`)
      .then(r => r.json())
      .then(d => {
        setStatus(d);
        // Cargar predicción
        return fetch(`${API}/api/prediction`);
      })
      .then(r => r.json())
      .then(d => setPrediction(d.resumen || ''))
      .catch(() => setStatus({ error: 'Servidor no disponible' }));
  }, []);

  const historialParaAPI = () =>
    messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

  const sendMessage = useCallback(async (texto, extraPayload = {}) => {
    const userMsg = { role: 'user', content: texto, time: ts() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const payload = {
      pregunta: texto,
      historial: historialParaAPI(),
      ...extraPayload,
    };

    try {
      const res  = await fetch(`${API}/api/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Error del servidor: ' + data.error,
          time: ts(),
        }]);
        return;
      }

      const assistantMsg = {
        role:              'assistant',
        content:           data.respuesta || '(Sin respuesta)',
        alertas:           data.alertas || [],
        diagnostico_visual: data.diagnostico_visual,
        modo:              data.modo,
        time:              ts(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ No se pudo conectar con el servidor. Asegúrate de que server.py esté corriendo en el puerto 5000.',
        time: ts(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const handleSensorCheck = () => {
    const val = parseFloat(sensorVal);
    if (isNaN(val)) return;
    const q = `Mi sistema está produciendo ${val} kWh ahora mismo. ¿Es normal? ¿Debo preocuparme?`;
    sendMessage(q, { produccion_real: val });
    setSensorVal('');
  };

  const handleDiagnosisComplete = (diag) => {
    if (!diag) return;
    const pregunta = `Acabo de analizar mis paneles con la cámara. El diagnóstico indica: "${diag.mensaje}". ¿Qué debo hacer?`;
    sendMessage(pregunta);
    setActiveTab('chat');
  };

  // Badge del modo LLM en header
  const llmMode = status?.llm;
  const llmBadge = llmMode?.includes('GGUF')     ? 'badge badge-green'
                 : llmMode?.includes('RAG')       ? 'badge badge-yellow'
                 : llmMode?.includes('Fallback')  ? 'badge badge-gray'
                 : status?.error                  ? 'badge badge-red'
                 : 'badge badge-gray';

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="header-logo">☀️</div>
        <div className="header-title">
          <h1>Solaris — Asistente Solar Rural</h1>
          <p>Energía solar para comunidades ZNI de Colombia · Programa FAZNI · IPSE</p>
        </div>
        <div className="header-badge">
          <span className={llmBadge}>{llmMode || (status?.error ? 'Offline' : '...')}</span>
          <span className="badge badge-yellow">☀️ Hackathon 2025</span>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="layout">
        <Sidebar
          status={status}
          prediction={prediction}
          sensorVal={sensorVal}
          setSensorVal={setSensorVal}
          onSensorCheck={handleSensorCheck}
          loading={loading}
          onSelectPregunta={(q) => { setActiveTab('chat'); sendMessage(q); }}
        />

        <div className="main">
          {/* TABS */}
          <div className="tabs">
            <div
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat con Solaris
            </div>
            <div
              className={`tab ${activeTab === 'vision' ? 'active' : ''}`}
              onClick={() => setActiveTab('vision')}
            >
              📸 Diagnóstico Visual
            </div>
          </div>

          {/* TAB PANELS */}
          {activeTab === 'chat' && (
            <ChatTab
              messages={messages}
              loading={loading}
              onSend={sendMessage}
              onQuick={sendMessage}
            />
          )}
          {activeTab === 'vision' && (
            <VisionTab onDiagnosisComplete={handleDiagnosisComplete} />
          )}
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
