import React, { useState, useRef, useEffect } from 'react';
import './Jarvis.css';

const TIPOS_J = [
  { value: "Basura acumulada",     icon: "🗑️" },
  { value: "Alumbrado defectuoso", icon: "💡" },
  { value: "Daño en vía pública",  icon: "🚧" },
  { value: "Riesgo para peatones", icon: "⚠️" },
  { value: "Problema de agua",     icon: "💧" },
  { value: "Alcantarillado",       icon: "🔧" },
  { value: "Seguridad ciudadana",  icon: "🔵" },
  { value: "Áreas verdes",         icon: "🌿" },
  { value: "Otro",                 icon: "📋" },
];

const ZONAS_J = [
  "La Tuliheuca", "Naos", "Santa Elena", "San Nicolás",
  "Marañonal", "Barrio Balboa Centro", "Av. Las Américas",
  "Calle P.P. Sánchez", "El Hatillo", "Otra zona",
];

const API = "https://balboa-alerta-1.onrender.com";
const WA_NUMBER = "50762240260";

const WELCOME_MSG = "¡Hola! Soy JARVIS 🤖, el asistente de Balboa Alerta.\n¿En qué puedo ayudarte hoy?";

export default function Jarvis() {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState('menu');
  const [msgs, setMsgs]         = useState([{ from: 'jarvis', text: WELCOME_MSG }]);
  const [report, setReport]     = useState({ tipo: '', zona: '', ubicacion: '', descripcion: '', lat: null, lng: null });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sending, setSending]   = useState(false);
  const [code, setCode]         = useState('');
  const [descInput, setDescInput] = useState('');
  const [ubInput, setUbInput]   = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs, step, open]);

  function addMsg(from, text) {
    setMsgs(prev => [...prev, { from, text }]);
  }

  function jarvisReply(text, nextStep, delay = 420) {
    setTimeout(() => {
      addMsg('jarvis', text);
      setStep(nextStep);
    }, delay);
  }

  function reset() {
    setStep('menu');
    setMsgs([{ from: 'jarvis', text: WELCOME_MSG }]);
    setReport({ tipo: '', zona: '', ubicacion: '', descripcion: '', lat: null, lng: null });
    setDescInput('');
    setUbInput('');
    setCode('');
  }

  // ── Menu principal ───────────────────────────────────────────────────────
  function onMenuReportar() {
    addMsg('user', '📋 Reportar problema');
    jarvisReply('Selecciona el tipo de incidencia:', 'tipo');
  }

  function onMenuVerReportes() {
    addMsg('user', '🗂️ Ver reportes');
    jarvisReply('Puedes ver todos los reportes activos en la sección "Reportes" del menú superior de Balboa Alerta.', 'ver_info');
  }

  function onMenuContacto() {
    addMsg('user', '💬 Hablar con persona');
    jarvisReply('Te conecto con un coordinador de Balboa Alerta vía WhatsApp.', 'contacto');
  }

  // ── Tipo ─────────────────────────────────────────────────────────────────
  function selectTipo(t) {
    addMsg('user', t.icon + ' ' + t.value);
    setReport(r => ({ ...r, tipo: t.value }));
    jarvisReply('¿En qué zona del barrio ocurrió el problema?', 'zona');
  }

  // ── Zona ─────────────────────────────────────────────────────────────────
  function selectZona(z) {
    addMsg('user', '📌 ' + z);
    setReport(r => ({ ...r, zona: z }));
    jarvisReply('¿Cuál es la ubicación exacta?\nPuedes usar GPS o escribirla manualmente.', 'ubicacion');
  }

  // ── Ubicación ─────────────────────────────────────────────────────────────
  function useGPS() {
    if (!navigator.geolocation) {
      addMsg('jarvis', 'GPS no disponible. Por favor escribe la dirección.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReport(r => ({ ...r, lat: pos.coords.latitude, lng: pos.coords.longitude, ubicacion: 'Ubicación GPS' }));
        setGpsLoading(false);
        addMsg('user', '📍 Ubicación GPS capturada');
        jarvisReply('¡Perfecto! Ahora describe brevemente el problema.', 'descripcion');
      },
      () => {
        setGpsLoading(false);
        addMsg('jarvis', 'No pude obtener la ubicación GPS. Por favor escribe la dirección.');
      }
    );
  }

  function submitUbicacion() {
    if (!ubInput.trim()) return;
    addMsg('user', '🗺️ ' + ubInput.trim());
    setReport(r => ({ ...r, ubicacion: ubInput.trim() }));
    setUbInput('');
    jarvisReply('Perfecto. Ahora describe brevemente el problema.', 'descripcion');
  }

  // ── Descripción ───────────────────────────────────────────────────────────
  function submitDescripcion() {
    if (!descInput.trim()) return;
    addMsg('user', descInput.trim());
    setReport(r => ({ ...r, descripcion: descInput.trim() }));
    setDescInput('');
    jarvisReply('Revisa el resumen y confirma el reporte:', 'confirmar');
  }

  // ── Confirmar ─────────────────────────────────────────────────────────────
  async function confirmarReporte() {
    addMsg('user', '✅ Confirmar reporte');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('type',        report.tipo);
      fd.append('description', report.descripcion);
      fd.append('location',    report.ubicacion || '');
      fd.append('zone',        report.zona);
      fd.append('priority',    'media');
      if (report.lat) fd.append('lat', report.lat);
      if (report.lng) fd.append('lng', report.lng);

      const res  = await fetch(API + '/reports', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const trackingCode = data.report ? data.report.code : 'BA-????';
      setCode(trackingCode);
      addMsg('jarvis', `¡Reporte registrado! 🎉\nCódigo de seguimiento: ${trackingCode}\n\nAbriendo WhatsApp...`);
      setStep('exito');

      const waText = encodeURIComponent(
        `Hola, acabo de enviar un reporte en Balboa Alerta.\n` +
        `Código: ${trackingCode}\nTipo: ${report.tipo}\nZona: ${report.zona}`
      );
      setTimeout(() => {
        window.open(`https://wa.me/${WA_NUMBER}?text=${waText}`, '_blank');
      }, 1600);
    } catch {
      addMsg('jarvis', 'Hubo un error al enviar el reporte. Por favor intenta de nuevo.');
      setStep('confirmar');
    } finally {
      setSending(false);
    }
  }

  function cancelarReporte() {
    addMsg('user', '❌ Cancelar');
    jarvisReply('Reporte cancelado. ¿En qué más puedo ayudarte?', 'menu');
  }

  // ── Acciones por step ─────────────────────────────────────────────────────
  function renderActions() {
    switch (step) {
      case 'menu':
        return (
          <div className="jarvis-actions">
            <button className="jarvis-quick-btn" onClick={onMenuReportar}>📋 Reportar problema</button>
            <button className="jarvis-quick-btn" onClick={onMenuVerReportes}>🗂️ Ver reportes</button>
            <button className="jarvis-quick-btn" onClick={onMenuContacto}>💬 Hablar con persona</button>
          </div>
        );

      case 'tipo':
        return (
          <div className="jarvis-actions jarvis-grid">
            {TIPOS_J.map(t => (
              <button key={t.value} className="jarvis-quick-btn jarvis-btn-sm" onClick={() => selectTipo(t)}>
                {t.icon} {t.value}
              </button>
            ))}
          </div>
        );

      case 'zona':
        return (
          <div className="jarvis-actions jarvis-grid">
            {ZONAS_J.map(z => (
              <button key={z} className="jarvis-quick-btn jarvis-btn-sm" onClick={() => selectZona(z)}>
                {z}
              </button>
            ))}
          </div>
        );

      case 'ubicacion':
        return (
          <div className="jarvis-actions">
            <button className="jarvis-quick-btn jarvis-gps-btn" onClick={useGPS} disabled={gpsLoading}>
              {gpsLoading ? '⏳ Obteniendo GPS…' : '📍 Usar mi ubicación GPS'}
            </button>
            <div className="jarvis-input-row">
              <input
                className="jarvis-input"
                placeholder="O escribe la dirección…"
                value={ubInput}
                onChange={e => setUbInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitUbicacion()}
              />
              <button className="jarvis-send-btn" onClick={submitUbicacion}>➤</button>
            </div>
          </div>
        );

      case 'descripcion':
        return (
          <div className="jarvis-input-row">
            <input
              className="jarvis-input"
              placeholder="Describe el problema…"
              value={descInput}
              onChange={e => setDescInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitDescripcion()}
              autoFocus
            />
            <button className="jarvis-send-btn" onClick={submitDescripcion}>➤</button>
          </div>
        );

      case 'confirmar':
        return (
          <div className="jarvis-actions">
            <div className="jarvis-summary">
              <p>📋 <strong>{report.tipo}</strong></p>
              <p>📌 {report.zona}</p>
              {report.ubicacion && <p>🗺️ {report.ubicacion}</p>}
              <p>💬 {report.descripcion}</p>
            </div>
            <button className="jarvis-quick-btn jarvis-confirm-btn" onClick={confirmarReporte} disabled={sending}>
              {sending ? '⏳ Enviando…' : '✅ Confirmar reporte'}
            </button>
            <button className="jarvis-quick-btn jarvis-cancel-btn" onClick={cancelarReporte}>
              ❌ Cancelar
            </button>
          </div>
        );

      case 'exito':
        return (
          <div className="jarvis-actions">
            <div className="jarvis-code-box">
              <span className="jarvis-code-label">Código de seguimiento</span>
              <strong className="jarvis-code">{code}</strong>
            </div>
            <button className="jarvis-quick-btn" onClick={() => {
              const waText = encodeURIComponent(`Hola, mi código de reporte es: ${code}`);
              window.open(`https://wa.me/${WA_NUMBER}?text=${waText}`, '_blank');
            }}>
              📱 Abrir WhatsApp
            </button>
            <button className="jarvis-quick-btn" onClick={reset}>🔄 Nuevo reporte</button>
          </div>
        );

      case 'contacto':
        return (
          <div className="jarvis-actions">
            <button className="jarvis-quick-btn jarvis-confirm-btn" onClick={() => {
              const msg = encodeURIComponent('Hola, necesito hablar con un coordinador de Balboa Alerta.');
              window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
            }}>
              📱 Contactar por WhatsApp
            </button>
            <button className="jarvis-quick-btn" onClick={reset}>⬅️ Volver al inicio</button>
          </div>
        );

      case 'ver_info':
        return (
          <div className="jarvis-actions">
            <button className="jarvis-quick-btn" onClick={reset}>⬅️ Volver al inicio</button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      {!open && (
        <button className="jarvis-fab" onClick={() => setOpen(true)} aria-label="Abrir JARVIS">
          💬
        </button>
      )}

      {open && (
        <div className="jarvis-window">
          <div className="jarvis-header">
            <span className="jarvis-header-avatar">🤖</span>
            <div className="jarvis-header-info">
              <div className="jarvis-header-name">JARVIS</div>
              <div className="jarvis-header-sub">Asistente Balboa Alerta</div>
            </div>
            <button className="jarvis-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
          </div>

          <div className="jarvis-messages">
            {msgs.map((m, i) => (
              <div key={i} className={`jarvis-msg jarvis-msg-${m.from}`}>
                {m.from === 'jarvis' && <span className="jarvis-msg-avatar">🤖</span>}
                <span className="jarvis-bubble">
                  {m.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="jarvis-footer">
            {renderActions()}
          </div>
        </div>
      )}
    </>
  );
}
