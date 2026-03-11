import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TIPOS = [
  { value: "Basura acumulada", icon: "🗑️", color: "#e67e22" },
  { value: "Alumbrado defectuoso", icon: "💡", color: "#f1c40f" },
  { value: "Daño en vía pública", icon: "🚧", color: "#e74c3c" },
  { value: "Riesgo para peatones", icon: "⚠️", color: "#c0392b" },
  { value: "Problema de agua", icon: "💧", color: "#2980b9" },
  { value: "Alcantarillado", icon: "🔧", color: "#7f8c8d" },
  { value: "Seguridad ciudadana", icon: "🔵", color: "#8e44ad" },
  { value: "Áreas verdes", icon: "🌿", color: "#27ae60" },
  { value: "Otro", icon: "📋", color: "#95a5a6" },
];

const ZONAS = [
  "La Tuliheuca",
  "Naos",
  "Santa Elena",
  "San Nicolás",
  "Marañonal",
  "Barrio Balboa Centro",
  "Av. Las Américas",
  "Calle P. P. Sánchez",
  "El Hatillo",
  "Otra zona",
];

const PRIORIDADES = {
  critica: { label: "Crítica", color: "#c0392b", bg: "#fdf0f0" },
  alta: { label: "Alta", color: "#e67e22", bg: "#fef6ec" },
  media: { label: "Media", color: "#f39c12", bg: "#fff8e8" },
  baja: { label: "Baja", color: "#27ae60", bg: "#eefbf3" },
};

const ESTADOS = {
  nuevo: { label: "Nuevo", color: "#e74c3c" },
  "en revision": { label: "En revisión", color: "#f39c12" },
  "en proceso": { label: "En proceso", color: "#3498db" },
  resuelto: { label: "Resuelto", color: "#27ae60" },
};

const API = "https://balboa-alerta-production.up.railway.app";

function createColorIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function App() {
  const [section, setSection] = useState("home");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [filterZona, setFilterZona] = useState("todas");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    type: "Basura acumulada",
    description: "",
    location: "",
    zone: "",
    contact: "",
    priority: "media",
    lat: null,
    lng: null,
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/reports`);
      if (!res.ok) throw new Error("Error al cargar reportes");
      const data = await res.json();

      const normalized = data.map((r, index) => ({
        id: r.id || index + 1,
        type: r.type || r.tipo || "Otro",
        description: r.description || r.descripcion || "",
        location: r.location || r.ubicacion || "",
        zone: r.zone || r.zona || "",
        contact: r.contact || r.contacto || "",
        priority: r.priority || r.prioridad || "media",
        status: r.status || "nuevo",
        source: r.source || "vecino",
        createdAt: r.createdAt || new Date().toISOString(),
        lat: r.lat || null,
        lng: r.lng || null,
      }));

      setReports(normalized);
    } catch (err) {
      showToast("No se pudo conectar al servidor", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function usarUbicacion() {
    if (!navigator.geolocation) {
      showToast("GPS no disponible en este dispositivo", "error");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        setForm(function (prev) {
          return {
            ...prev,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        });
        setGpsLoading(false);
        showToast("Ubicación GPS capturada");
      },
      function () {
        setGpsLoading(false);
        showToast("No se pudo obtener la ubicación", "error");
      }
    );
  }

  async function submitReport(e) {
    e.preventDefault();

    if (!form.description.trim()) {
      showToast("Describe la incidencia", "error");
      return;
    }

    if (!form.zone) {
      showToast("Selecciona una zona", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: "nuevo",
          createdAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Error al enviar");

      await loadReports();
      setForm({
        type: "Basura acumulada",
        description: "",
        location: "",
        zone: "",
        contact: "",
        priority: "media",
        lat: null,
        lng: null,
      });
      setSection("home");
      showToast("Reporte enviado exitosamente");
    } catch (err) {
      showToast("Error al enviar el reporte", "error");
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const res = await fetch(`${API}/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Error al actualizar");

      await loadReports();
      showToast("Estado actualizado");
    } catch (err) {
      showToast("Error actualizando estado", "error");
    }
  }

  async function deleteReport(id) {
    if (!window.confirm("¿Eliminar este reporte?")) return;

    try {
      const res = await fetch(`${API}/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");

      await loadReports();
      showToast("Reporte eliminado");
    } catch (err) {
      showToast("Error eliminando reporte", "error");
    }
  }

  function getTipoData(type) {
    return TIPOS.find((t) => t.value === type) || TIPOS[TIPOS.length - 1];
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString("es-PA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filtered = reports.filter((r) => {
    if (filterZona !== "todas" && r.zone !== filterZona) return false;
    if (filterTipo !== "todos" && r.type !== filterTipo) return false;
    if (filterEstado !== "todos" && r.status !== filterEstado) return false;
    return true;
  });

  const stats = {
    total: reports.length,
    nuevo: reports.filter((r) => r.status === "nuevo").length,
    proceso: reports.filter((r) => r.status === "en proceso").length,
    resuelto: reports.filter((r) => r.status === "resuelto").length,
  };

  const sortedFiltered = [...filtered].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const mapReports = filtered.filter((r) => r.lat && r.lng);

  return (
    <div className="app">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <header className="header">
        <div className="header-top">
          <span className="header-icon">⚡</span>
          <span className="header-brand">BALBOA ALERTA</span>
        </div>

        <nav className="nav">
          <button
            className={`nav-btn ${section === "home" ? "active" : ""}`}
            onClick={() => {
              setSection("home");
              loadReports();
            }}
          >
            Reportes
          </button>

          <button
            className={`nav-btn ${section === "mapa" ? "active" : ""}`}
            onClick={() => setSection("mapa")}
          >
            Mapa
          </button>

          <button
            className={`nav-btn ${section === "admin" ? "active" : ""}`}
            onClick={() => setSection("admin")}
          >
            Admin
          </button>
        </nav>

        <p className="header-sub">Barrio Balboa · La Chorrera</p>
      </header>

      {section === "home" && (
        <main className="main">
          <section className="hero">
            <h1 className="hero-title">
              BALBOA
              <br />
              ALERTA
            </h1>
            <p className="hero-sub">Vecinos organizados. Comunidad activa.</p>
            <p className="hero-sub">
              Un barrio más limpio, más seguro, más nuestro.
            </p>
            <button className="btn-primary" onClick={() => setSection("form")}>
              Reportar incidencia
            </button>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label">Total reportes</span>
            </div>
            <div className="stat-card stat-red">
              <span className="stat-num">{stats.nuevo}</span>
              <span className="stat-label">Sin atender</span>
            </div>
            <div className="stat-card stat-blue">
              <span className="stat-num">{stats.proceso}</span>
              <span className="stat-label">En proceso</span>
            </div>
            <div className="stat-card stat-green">
              <span className="stat-num">{stats.resuelto}</span>
              <span className="stat-label">Resueltos</span>
            </div>
          </section>

          <section className="filters">
            <select value={filterZona} onChange={(e) => setFilterZona(e.target.value)}>
              <option value="todas">Todas las zonas</option>
              {ZONAS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>

            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.value}
                </option>
              ))}
            </select>

            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
              <option value="todos">Todos los estados</option>
              {Object.keys(ESTADOS).map((k) => (
                <option key={k} value={k}>
                  {ESTADOS[k].label}
                </option>
              ))}
            </select>
          </section>

          <section className="reports-section">
            <h2 className="section-title">Reportes recientes</h2>
            <p className="loading-text">{filtered.length} reporte(s)</p>

            {loading ? (
              <p className="loading-text">Cargando reportes...</p>
            ) : filtered.length === 0 ? (
              <p className="empty-text">No hay reportes con estos filtros.</p>
            ) : (
              <div className="reports-list">
                {sortedFiltered.map((r) => {
                  const tipo = getTipoData(r.type);
                  const estado = ESTADOS[r.status] || ESTADOS.nuevo;
                  const prior = PRIORIDADES[r.priority] || PRIORIDADES.media;

                  return (
                    <article
                      key={r.id}
                      className="report-card"
                      style={{ borderLeftColor: tipo.color }}
                    >
                      <div className="report-header">
                        <span className="report-tipo">
                          {tipo.icon} {r.type}
                        </span>
                        <span className="report-date">{formatDate(r.createdAt)}</span>
                      </div>

                      <div className="report-badges">
                        <span
                          className="badge"
                          style={{ background: prior.bg, color: prior.color }}
                        >
                          {prior.label}
                        </span>

                        <span
                          className="badge"
                          style={{ background: "#f8fafc", color: estado.color }}
                        >
                          <span
                            className="badge-dot"
                            style={{ background: estado.color }}
                          ></span>
                          {estado.label}
                        </span>

                        {r.zone && <span className="badge badge-zone">{r.zone}</span>}
                      </div>

                      {r.description && <p className="report-desc">{r.description}</p>}

                      <div className="report-footer">
                        {r.location && (
                          <span className="report-contact">📍 {r.location}</span>
                        )}
                        {r.contact && (
                          <span className="report-contact">👤 {r.contact}</span>
                        )}
                        {r.lat && r.lng && (
                          <span className="report-gps">
                            GPS: {Number(r.lat).toFixed(5)}, {Number(r.lng).toFixed(5)}
                          </span>
                        )}
                        {r.lat && r.lng && (
                          <a
                            className="report-map-link"
                            href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver en mapa
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {section === "form" && (
        <main className="main">
          <div className="form-container">
            <h2 className="form-title">Reportar incidencia</h2>

            <form onSubmit={submitReport} className="report-form">
              <div>
                <label>Tipo de incidencia</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Zona</label>
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                >
                  <option value="">Selecciona una zona...</option>
                  {ZONAS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe el problema con detalle..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <label>Ubicación exacta</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Calle, referencia, número..."
                />
              </div>

              <div>
                <label>Prioridad</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {Object.keys(PRIORIDADES).map((k) => (
                    <option key={k} value={k}>
                      {PRIORIDADES[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Contacto (opcional)</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="Nombre o teléfono..."
                />
              </div>

              <button
                type="button"
                className={`btn-gps ${form.lat ? "btn-gps-ok" : ""}`}
                onClick={usarUbicacion}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? "Obteniendo ubicación..."
                  : form.lat
                  ? `GPS: ${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`
                  : "Usar mi ubicación GPS"}
              </button>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSection("home")}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {section === "mapa" && (
        <main className="main">
          <h2 className="section-title">Mapa de incidencias</h2>
          <p className="map-sub">{mapReports.length} reporte(s) con ubicación GPS</p>

          <div className="map-wrapper">
            <MapContainer
              center={[8.8694, -79.7831]}
              zoom={14}
              style={{ height: "460px", width: "100%" }}
            >
              <TileLayer
                attribution="OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapReports.map((r) => {
                const tipo = getTipoData(r.type);
                return (
                  <Marker
                    key={r.id}
                    position={[r.lat, r.lng]}
                    icon={createColorIcon(tipo.color)}
                  >
                    <Popup>
                      <strong>
                        {tipo.icon} {r.type}
                      </strong>
                      <br />
                      {r.zone && (
                        <>
                          {r.zone}
                          <br />
                        </>
                      )}
                      {r.description && (
                        <>
                          {r.description}
                          <br />
                        </>
                      )}
                      <span style={{ color: (ESTADOS[r.status] || ESTADOS.nuevo).color }}>
                        {(ESTADOS[r.status] || ESTADOS.nuevo).label}
                      </span>
                    </Popup>
                  </Marker>
                );
              })}
              <Circle
                center={[8.8694, -79.7831]}
                radius={800}
                pathOptions={{
                  color: "#BF0A30",
                  fillColor: "#BF0A30",
                  fillOpacity: 0.05,
                }}
              />
            </MapContainer>
          </div>
        </main>
      )}

      {section === "admin" && (
        <main className="main">
          {!adminAuth ? (
            <div className="admin-login">
              <h2>Panel de administración</h2>
              <input
                type="password"
                placeholder="Contraseña..."
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={() => {
                  if (adminInput === "balboa2029") {
                    setAdminAuth(true);
                    setAdminError("");
                  } else {
                    setAdminError("Contraseña incorrecta");
                  }
                }}
              >
                Ingresar
              </button>
              {adminError && <p className="error-text">{adminError}</p>}
            </div>
          ) : (
            <div className="admin-panel">
              <div className="admin-header">
                <h2>Panel de administración</h2>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setAdminAuth(false)}
                >
                  Cerrar sesión
                </button>
              </div>

              <p className="admin-sub">{reports.length} reporte(s) totales</p>

              {reports.length === 0 ? (
                <p className="empty-text">No hay reportes aún.</p>
              ) : (
                <div className="admin-list">
                  {[...reports]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((r) => {
                      const tipo = getTipoData(r.type);

                      return (
                        <div
                          key={r.id}
                          className="admin-card"
                          style={{ borderLeftColor: tipo.color }}
                        >
                          <div className="admin-card-top">
                            <span>
                              {tipo.icon} <strong>{r.type}</strong>
                            </span>
                            <span className="report-date">{formatDate(r.createdAt)}</span>
                          </div>

                          {r.zone && <p className="admin-zone">{r.zone}</p>}
                          {r.description && <p className="admin-desc">{r.description}</p>}
                          {r.location && <p className="admin-zone">📍 {r.location}</p>}
                          {r.contact && <p className="admin-zone">👤 {r.contact}</p>}
                          {r.lat && r.lng && (
                            <p className="report-gps">
                              GPS: {Number(r.lat).toFixed(5)}, {Number(r.lng).toFixed(5)}
                            </p>
                          )}

                          <div className="admin-actions">
                            <select
                              value={r.status}
                              onChange={(e) => updateStatus(r.id, e.target.value)}
                              className="status-select"
                            >
                              {Object.keys(ESTADOS).map((k) => (
                                <option key={k} value={k}>
                                  {ESTADOS[k].label}
                                </option>
                              ))}
                            </select>

                            <button
                              className="btn-delete"
                              onClick={() => deleteReport(r.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <footer className="footer">
        <p>Balboa Alerta · Barrio Balboa, La Chorrera, Panamá</p>
      </footer>
    </div>
  );
}