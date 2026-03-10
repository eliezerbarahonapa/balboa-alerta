import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TIPOS = [
  { value: "Basura acumulada",       icon: "🗑️", color: "#e67e22" },
  { value: "Alumbrado defectuoso",   icon: "💡", color: "#f1c40f" },
  { value: "Daño en vía pública",    icon: "🚧", color: "#e74c3c" },
  { value: "Riesgo para peatones",   icon: "⚠️", color: "#c0392b" },
  { value: "Problema de agua",       icon: "💧", color: "#2980b9" },
  { value: "Alcantarillado",         icon: "🔩", color: "#7f8c8d" },
  { value: "Seguridad ciudadana",    icon: "🛡️", color: "#8e44ad" },
  { value: "Áreas verdes",           icon: "🌿", color: "#27ae60" },
  { value: "Otro",                   icon: "📋", color: "#95a5a6" },
];

const ZONAS = [
  "La Tuliheuca", "Naos", "Santa Elena", "San Nicolás",
  "Marañonal", "Barrio Balboa Centro", "Av. Las Américas",
  "Calle P. P. Sánchez", "El Hatillo", "Otra zona"
];

const PRIORIDADES = {
  critica: { label: "Crítica", color: "#c0392b", bg: "#fdf0f0" },
  alta:    { label: "Alta",    color: "#e67e22", bg: "#fef9f0" },
  media:   { label: "Media",   color: "#f39c12", bg: "#fffbf0" },
  baja:    { label: "Baja",    color: "#27ae60", bg: "#f0fdf4" },
};

const ESTADOS = {
  nuevo:      { label: "Nuevo",       color: "#2980b9" },
  revision:   { label: "En revisión", color: "#f39c12" },
  proceso:    { label: "En proceso",  color: "#8e44ad" },
  resuelto:   { label: "Resuelto",    color: "#27ae60" },
};

// Coordenadas de Barrio Balboa, La Chorrera
const CENTER = [8.8815, -79.7811];

const ADMIN_PASS = "balboa2029";

// Coordenadas aproximadas por zona
const ZONA_COORDS = {
  "La Tuliheuca":        [8.8820, -79.7790],
  "Naos":                [8.8830, -79.7840],
  "Santa Elena":         [8.8800, -79.7760],
  "San Nicolás":         [8.8810, -79.7830],
  "Marañonal":           [8.8795, -79.7850],
  "Barrio Balboa Centro":[8.8815, -79.7811],
  "Av. Las Américas":    [8.8825, -79.7800],
  "Calle P. P. Sánchez": [8.8808, -79.7820],
  "El Hatillo":          [8.8850, -79.7770],
  "Otra zona":           [8.8815, -79.7811],
};

function getTipoInfo(tipo) {
  return TIPOS.find(t => t.value === tipo) || TIPOS[TIPOS.length - 1];
}

function createColorMarker(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// ══════════════════════════════════════════════════════════════
export default function App() {
  const [section, setSection]       = useState("home");
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [adminAuth, setAdminAuth]   = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [filterZona, setFilterZona] = useState("todas");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [toast, setToast]           = useState(null);
  const [form, setForm]             = useState({
    type: "Basura acumulada", description: "", location: "",

    zone: "", contact: "", priority: "media",
  });

  });
  const [gpsLoading, setGpsLoading] = useState(false);
 6cc9fe72d6ec06a1b2f960d41e63743cf148a648

  // ── Cargar reportes ─────────────────────────────────────
  const loadReports = useCallback(async () => {
    try {


      const res = await fetch("https://balboa-alerta-production.up.railway.app/reports");
 6cc9fe72d6ec06a1b2f960d41e63743cf148a648
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Normalizar campos (unificar tipo/type, etc.)
      const normalized = data.map(r => ({
        id:          r.id || Date.now(),
        type:        r.type  || r.tipo        || "Otro",
        description: r.description || r.descripcion || "",
        location:    r.location    || r.ubicacion   || "",
        zone:        r.zone        || r.zona        || "Barrio Balboa Centro",
        contact:     r.contact     || r.contacto    || "",
        priority:    r.priority    || r.prioridad   || "media",
        status:      r.status      || "nuevo",
        createdAt:   r.createdAt   || r.fecha       || new Date().toISOString(),
      }));
      setReports(normalized);
    } catch {
      const local = localStorage.getItem("balboa_reports_v2");
      if (local) setReports(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Toast ────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };


  // ── Enviar reporte ───────────────────────────────────────
  const submitReport = async (e) => {
    e.preventDefault();
    const newReport = { ...form, status: "nuevo", createdAt: new Date().toISOString() };

  // ── GPS: Usar ubicación actual ───────────────────────────
  const usarUbicacion = () => {
    if (!navigator.geolocation) {
      showToast("⚠️ Tu navegador no soporta geolocalización", "warn");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm(f => ({ ...f, lat, lng, location: `GPS: ${lat}, ${lng}` }));
        setGpsLoading(false);
        showToast("📍 Ubicación GPS capturada correctamente");
      },
      (err) => {
        setGpsLoading(false);
        const msgs = {
          1: "Permiso denegado. Activa la ubicación en tu navegador.",
          2: "No se pudo determinar la ubicación.",
          3: "Tiempo de espera agotado. Intenta de nuevo.",
        };
        showToast(`⚠️ ${msgs[err.code] || "Error de geolocalización"}`, "warn");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Enviar reporte ───────────────────────────────────────
  const submitReport = async (e) => {
    e.preventDefault();
    const newReport = {
      ...form,
      lat:    form.lat  || null,
      lng:    form.lng  || null,
      status: "nuevo",
      createdAt: new Date().toISOString(),
    };
6cc9fe72d6ec06a1b2f960d41e63743cf148a648
    try {
      const res = await fetch("https://balboa-alerta-production.up.railway.app/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      });
      const saved = await res.json();
      if (saved.reports) setReports(saved.reports.map(r => ({
        id: r.id, type: r.type || r.tipo || "Otro",
        description: r.description || r.descripcion || "",
        location: r.location || r.ubicacion || "",
        zone: r.zone || r.zona || "Barrio Balboa Centro",
        contact: r.contact || r.contacto || "",
        priority: r.priority || r.prioridad || "media",
        status: r.status || "nuevo",
        createdAt: r.createdAt || r.fecha || new Date().toISOString(),
      })));
      showToast("✅ Reporte enviado. ¡Gracias por participar!");
    } catch {
      const updated = [newReport, ...reports];
      localStorage.setItem("balboa_reports_v2", JSON.stringify(updated));
      setReports(updated);
      showToast("📡 Guardado localmente (servidor no disponible)", "warn");
    }

    setForm({ type: "Basura acumulada", description: "", location: "", zone: "", contact: "", priority: "media" });

    setForm({ type: "Basura acumulada", description: "", location: "", zone: "", contact: "", priority: "media", lat: null, lng: null });
 6cc9fe72d6ec06a1b2f960d41e63743cf148a648
    setSection("home");
  };

  // ── Admin: cambiar estado ────────────────────────────────
  const updateStatus = async (id, newStatus) => {
    const updated = reports.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setReports(updated);
    try {

      await fetch(`http://localhost:5000/reports/${id}`, {

      await fetch(`https://balboa-alerta-production.up.railway.app/reports/${id}`, {
 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      localStorage.setItem("balboa_reports_v2", JSON.stringify(updated));
    }
    showToast("Estado actualizado");
  };

  // ── Filtros ──────────────────────────────────────────────
  const filtered = reports.filter(r => {
    if (filterZona !== "todas" && r.zone !== filterZona) return false;
    if (filterTipo !== "todos" && r.type !== filterTipo) return false;
    if (filterEstado !== "todos" && r.status !== filterEstado) return false;
    return true;
  });

  // ── Stats ────────────────────────────────────────────────
  const stats = {
    total:    reports.length,
    nuevos:   reports.filter(r => r.status === "nuevo").length,
    proceso:  reports.filter(r => r.status === "proceso" || r.status === "revision").length,
    resueltos:reports.filter(r => r.status === "resuelto").length,
  };

  // ── Mapa: agrupar por zona ───────────────────────────────
  const byZona = ZONAS.reduce((acc, z) => {
    acc[z] = reports.filter(r => r.zone === z);
    return acc;
  }, {});

  // ══════════════════════════════════════════════════════════
  // RENDERS
  // ══════════════════════════════════════════════════════════

  const renderHome = () => (
    <div className="page-home">
      {/* HERO */}
      <div className="hero">
        <div className="hero-badge">Barrio Balboa · La Chorrera</div>
        <h1 className="hero-title">BALBOA<br/>ALERTA</h1>
        <p className="hero-sub">Vecinos organizados. Comunidad activa.<br/>Un barrio más limpio, más seguro, más nuestro.</p>
        <button className="btn-report" onClick={() => setSection("form")}>
          <span className="btn-icon">📢</span> Reportar incidencia
        </button>
      </div>

      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total reportes</div>
        </div>
        <div className="stat-card stat-warn">
          <div className="stat-num">{stats.nuevos}</div>
          <div className="stat-label">Sin atender</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-num">{stats.proceso}</div>
          <div className="stat-label">En proceso</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-num">{stats.resueltos}</div>
          <div className="stat-label">Resueltos</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filters-bar">
        <select value={filterZona} onChange={e => setFilterZona(e.target.value)}>
          <option value="todas">📍 Todas las zonas</option>
          {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="todos">📋 Todos los tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.value}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
          <option value="todos">🔵 Todos los estados</option>
          {Object.entries(ESTADOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* REPORTES */}
      <div className="reports-header">
        <h2 className="section-title">Reportes recientes</h2>
        <span className="reports-count">{filtered.length} reporte(s)</span>
      </div>

      {loading ? (
        <div className="loading-state">Cargando reportes...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏘️</div>
          <p>No hay reportes con estos filtros.<br/>¡Sé el primero en reportar!</p>
        </div>
      ) : (
        <div className="reports-list">
          {filtered.map(r => {
            const tipo = getTipoInfo(r.type);
            const prio = PRIORIDADES[r.priority] || PRIORIDADES.media;
            const est  = ESTADOS[r.status] || ESTADOS.nuevo;
            return (
              <article className="report-card" key={r.id} style={{ borderLeftColor: tipo.color }}>
                <div className="rc-header">
                  <span className="rc-tipo" style={{ color: tipo.color }}>
                    {tipo.icon} {r.type}
                  </span>
                  <span className="rc-date">
                    {new Date(r.createdAt).toLocaleDateString("es-PA", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                </div>
                <div className="rc-badges">
                  <span className="badge" style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.color}` }}>
                    ● {prio.label}
                  </span>
                  <span className="badge" style={{ background: "#f0f8ff", color: est.color, border: `1px solid ${est.color}` }}>
                    {est.label}
                  </span>
                  {r.zone && <span className="badge badge-zone">📍 {r.zone}</span>}
                </div>
                {r.description && <p className="rc-desc">{r.description}</p>}
                <div className="rc-footer">
                  <span className="rc-loc">📍 {r.location}</span>
                  {r.contact && <span className="rc-contact">👤 {r.contact}</span>}
                  <a className="rc-maplink"

                    href={`https://www.google.com/maps?q=${encodeURIComponent((r.location || r.zone || "Barrio Balboa, La Chorrera") + ", La Chorrera, Panamá")}`}

                    href={r.lat && r.lng
                      ? `https://www.google.com/maps?q=${r.lat},${r.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((r.location || r.zone || "Barrio Balboa") + ", La Chorrera, Panamá")}`}

                    target="_blank" rel="noopener noreferrer">
                    Ver en mapa ↗
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── FORMULARIO ────────────────────────────────────────────
  const renderForm = () => (
    <div className="page-form">
      <div className="form-header">
        <button className="btn-back" onClick={() => setSection("home")}>← Volver</button>
        <h2>Nuevo reporte ciudadano</h2>
        <p>Tu reporte ayuda a mantener Barrio Balboa en mejores condiciones.</p>
      </div>

      <form onSubmit={submitReport} className="report-form">
        <div className="form-group">
          <label>Tipo de incidencia *</label>
          <div className="tipo-grid">
            {TIPOS.map(t => (
              <button type="button" key={t.value}
                className={`tipo-btn ${form.type === t.value ? "tipo-active" : ""}`}
                style={form.type === t.value ? { borderColor: t.color, background: t.color + "15" } : {}}
                onClick={() => setForm({ ...form, type: t.value })}>
                <span>{t.icon}</span>
                <span>{t.value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Descripción del problema *</label>
          <textarea value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe brevemente qué está pasando..." required />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>Ubicación aproximada *</label>
            <input value={form.location}

              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Ej: Calle 3, frente al parque..." required />

              onChange={e => setForm({ ...form, location: e.target.value, lat: null, lng: null })}
              placeholder="Ej: Calle 3, frente al parque..." required />
            <button type="button" className="btn-gps" onClick={usarUbicacion} disabled={gpsLoading}>
              {gpsLoading ? "⏳ Obteniendo ubicación..." : form.lat ? `✅ GPS: ${form.lat}, ${form.lng}` : "📍 Usar mi ubicación actual"}
            </button>

          </div>
          <div className="form-group">
            <label>Zona / Sector</label>
            <select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })}>
              <option value="">Seleccionar zona...</option>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>Prioridad</label>
            <div className="prio-row">
              {Object.entries(PRIORIDADES).map(([k, v]) => (
                <button type="button" key={k}
                  className={`prio-btn ${form.priority === k ? "prio-active" : ""}`}
                  style={form.priority === k ? { background: v.color, color: "white", borderColor: v.color } : { color: v.color, borderColor: v.color }}
                  onClick={() => setForm({ ...form, priority: k })}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Contacto (opcional)</label>
            <input value={form.contact}
              onChange={e => setForm({ ...form, contact: e.target.value })}
              placeholder="Nombre y/o teléfono" />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => setSection("home")}>Cancelar</button>
          <button type="submit" className="btn-submit">Enviar reporte 📢</button>
        </div>
      </form>
    </div>
  );

  // ── MAPA ──────────────────────────────────────────────────
  const renderMapa = () => (
    <div className="page-mapa">
      <div className="page-header">
        <h2>Mapa de incidencias</h2>
        <p>Distribución de reportes por sector en Barrio Balboa</p>
      </div>

      <div className="map-wrapper">
        <MapContainer center={CENTER} zoom={15} style={{ height: "450px", borderRadius: "16px" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© OpenStreetMap contributors'
          />
          {Object.entries(byZona).map(([zona, reps]) => {
            if (reps.length === 0 || !ZONA_COORDS[zona]) return null;
            const coords = ZONA_COORDS[zona];
            const criticos = reps.filter(r => r.priority === "critica" || r.priority === "alta").length;
            const color = criticos > 0 ? "#e74c3c" : "#2980b9";
            return (
              <React.Fragment key={zona}>
                <Circle center={coords} radius={80} pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }} />
                {reps.map(r => {
                  const ti = getTipoInfo(r.type);

                  const jitter = [(Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002];
                  return (
                    <Marker key={r.id}
                      position={[coords[0] + jitter[0], coords[1] + jitter[1]]}

                  // Prioridad: coordenadas GPS reales > coordenadas de zona aproximadas
                  const hasGps = r.lat && r.lng;
                  const markerCoords = hasGps
                    ? [r.lat, r.lng]
                    : [coords[0] + (Math.random() - 0.5) * 0.002, coords[1] + (Math.random() - 0.5) * 0.002];
                  return (
                    <Marker key={r.id}
                      position={markerCoords}

                      icon={createColorMarker(ti.color)}>
                      <Popup>
                        <strong>{ti.icon} {r.type}</strong><br />
                        📍 {r.location || zona}<br />
                        {r.description && <><em>{r.description}</em><br /></>}


                        {r.lat && <><small style={{color:"#27ae60"}}>📡 Coordenadas GPS reales</small><br /></>}

                        <span style={{ color: PRIORIDADES[r.priority]?.color }}>● {PRIORIDADES[r.priority]?.label || "Media"}</span>
                      </Popup>
                    </Marker>
                  );
                })}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* Leyenda por zona */}
      <div className="zona-legend">
        {ZONAS.map(z => {
          const count = byZona[z]?.length || 0;
          if (count === 0) return null;
          return (
            <div key={z} className="zona-chip">
              <span className="zona-name">📍 {z}</span>
              <span className="zona-count">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Leyenda de tipos */}
      <div className="tipo-legend">
        <h3>Tipos de incidencia</h3>
        <div className="tipo-legend-grid">
          {TIPOS.map(t => {
            const count = reports.filter(r => r.type === t.value).length;
            if (count === 0) return null;
            return (
              <div key={t.value} className="tipo-legend-item">
                <span className="tl-dot" style={{ background: t.color }}></span>
                <span className="tl-icon">{t.icon}</span>
                <span className="tl-name">{t.value}</span>
                <span className="tl-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── ADMIN LOGIN ───────────────────────────────────────────
  const renderAdminLogin = () => (
    <div className="page-admin-login">
      <div className="admin-login-card">
        <div className="admin-logo">🛡️</div>
        <h2>Panel de Administración</h2>
        <p>Acceso restringido a coordinadores de Balboa Alerta</p>
        <div className="admin-form">
          <input type="password" placeholder="Contraseña de acceso"
            value={adminInput} onChange={e => setAdminInput(e.target.value)}
            onKeyDown={e => { if(e.key === "Enter") {
              if (adminInput === ADMIN_PASS) { setAdminAuth(true); setAdminError(""); }
              else setAdminError("Contraseña incorrecta");
            }}} />
          {adminError && <p className="admin-error">{adminError}</p>}
          <button className="btn-submit" onClick={() => {
            if (adminInput === ADMIN_PASS) { setAdminAuth(true); setAdminError(""); }
            else setAdminError("Contraseña incorrecta");
          }}>Ingresar</button>
        </div>
        <p className="admin-hint">Contraseña de prueba: <code>balboa2029</code></p>
      </div>
    </div>
  );

  // ── ADMIN PANEL ───────────────────────────────────────────
  const renderAdmin = () => (
    <div className="page-admin">
      <div className="admin-header">
        <div>
          <h2>Panel de Administración</h2>
          <p>{reports.length} reportes totales · {stats.nuevos} sin atender · {stats.resueltos} resueltos</p>
        </div>
        <button className="btn-logout" onClick={() => { setAdminAuth(false); setAdminInput(""); }}>
          Cerrar sesión
        </button>
      </div>

      {/* Stats admin */}
      <div className="admin-stats">
        {Object.entries(ESTADOS).map(([k, v]) => (
          <div key={k} className="admin-stat" style={{ borderTop: `4px solid ${v.color}` }}>
            <div className="as-num" style={{ color: v.color }}>
              {reports.filter(r => r.status === k).length}
            </div>
            <div className="as-label">{v.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de reportes */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Zona</th>
              <th>Prioridad</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => {
              const tipo = getTipoInfo(r.type);
              const prio = PRIORIDADES[r.priority] || PRIORIDADES.media;
              return (
                <tr key={r.id}>
                  <td><span style={{ color: tipo.color }}>{tipo.icon} {r.type}</span></td>
                  <td className="td-desc">{r.description || <em style={{color:"#aaa"}}>Sin descripción</em>}</td>
                  <td>📍 {r.zone || "—"}</td>
                  <td><span className="admin-badge" style={{ color: prio.color, borderColor: prio.color }}>
                    {prio.label}
                  </span></td>
                  <td className="td-date">{new Date(r.createdAt).toLocaleDateString("es-PA", { day:"2-digit", month:"short", year:"2-digit" })}</td>
                  <td>
                    <select className="status-select"
                      value={r.status || "nuevo"}
                      onChange={e => updateStatus(r.id, e.target.value)}
                      style={{ color: ESTADOS[r.status]?.color || ESTADOS.nuevo.color }}>
                      {Object.entries(ESTADOS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // LAYOUT PRINCIPAL
  // ══════════════════════════════════════════════════════════
  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setSection("home")}>
          <span className="nav-logo">⚡</span>
          <span className="nav-name">BALBOA ALERTA</span>
        </div>
        <div className="nav-links">
          <button className={`nav-btn ${section === "home" ? "active" : ""}`} onClick={() => setSection("home")}>
            Reportes
          </button>
          <button className={`nav-btn ${section === "mapa" ? "active" : ""}`} onClick={() => setSection("mapa")}>
            Mapa
          </button>
          <button className={`nav-btn nav-admin ${section === "admin" ? "active" : ""}`} onClick={() => setSection("admin")}>
            Admin
          </button>
        </div>
      </nav>

      {/* CONTENIDO */}
      <main className="main-content">
        {section === "home"  && renderHome()}
        {section === "form"  && renderForm()}
        {section === "mapa"  && renderMapa()}
        {section === "admin" && (!adminAuth ? renderAdminLogin() : renderAdmin())}
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <p>Balboa Alerta · Barrio Balboa, La Chorrera, Panamá · <em>Pequeñas acciones. Grandes cambios.</em></p>
      </footer>

      {/* TOAST */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
