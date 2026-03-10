import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  /* ------------------------------------------------------- */
  /*  ESTADOS DEL FORMULARIO                                 */
  /* ------------------------------------------------------- */
  const [type, setType] = useState("Basura acumulada");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [zone, setZone] = useState("");
  const [contact, setContact] = useState("");
  const [priority, setPriority] = useState("media");

  /* ------------------------------------------------------- */
  /*  ESTADOS DEL SISTEMA                                    */
  /* ------------------------------------------------------- */
  const [reports, setReports] = useState([]);
  const [section, setSection] = useState("home");
  const [mapPreviewUrl, setMapPreviewUrl] = useState("");

  /* ------------------------------------------------------- */
  /*  FUNCIONES DE MAPA                                      */
  /* ------------------------------------------------------- */
  const buildMapUrl = (loc, zn) => {
    const base = "Barrio Balboa, La Chorrera, Panamá";
    const query = (loc || zn || base).trim();
    return `https://www.google.com/maps?q=${encodeURIComponent(
      query
    )}&output=embed`;
  };

  useEffect(() => {
    setMapPreviewUrl(buildMapUrl(location, zone));
  }, [location, zone]);

  /* ------------------------------------------------------- */
  /*  CARGAR REPORTES DEL SERVIDOR / ARCHIVO LOCAL           */
  /* ------------------------------------------------------- */
  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("http://localhost:5000/reports");
        if (!res.ok) throw new Error("Servidor no disponible");

        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);

      } catch (err) {
        console.warn("Error cargando desde servidor, usando localStorage…");

        const local = localStorage.getItem("balboa_reports");
        if (local) {
          setReports(JSON.parse(local));
        }
      }
    }

    loadReports();
  }, []);

  /* ------------------------------------------------------- */
  /*  ENVIAR NUEVO REPORTE                                   */
  /* ------------------------------------------------------- */
  const submitReport = async (e) => {
    e.preventDefault();

    const newReport = {
      type,
      description,
      location,
      zone,
      contact,
      priority,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("http://localhost:5000/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      });

      const saved = await res.json();
      setReports((prev) => [saved, ...prev]);
      alert("Reporte registrado en el servidor.");

    } catch (err) {
      const local = [newReport, ...reports];
      localStorage.setItem("balboa_reports", JSON.stringify(local));
      setReports(local);

      alert("Reporte registrado en la lista local (sin backend todavía).");
    }

    // limpiar campos
    setDescription("");
    setLocation("");
    setZone("");
    setContact("");
    setPriority("media");

    setSection("home");
  };

  /* ------------------------------------------------------- */
  /*  INTERFAZ: FORMULARIO DE REPORTE                        */
  /* ------------------------------------------------------- */
  const renderReportForm = () => (
    <div className="container">
      <h2>Nuevo reporte ciudadano</h2>

      <form onSubmit={submitReport} className="report-form">
        <label>
          Tipo de incidencia *
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Basura acumulada</option>
            <option>Daño en vía pública</option>
            <option>Alumbrado defectuoso</option>
            <option>Riesgo para peatones</option>
          </select>
        </label>

        <label>
          Descripción del problema *
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <label>
          Ubicación aproximada *
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </label>

        <div className="form-row">
          <label>
            Prioridad
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>

          <label>
            Zona / sector
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ej: Urb. Las Lomas, Balboa..."
            />
          </label>
        </div>

        <label>
          Contacto (opcional)
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Nombre y/o teléfono"
          />
        </label>

        {/* ----------------------- */}
        {/* VISTA PREVIA EN MAPA */}
        {/* ----------------------- */}
        <div className="map-preview-box">
          <h3>Vista rápida en mapa</h3>
          <p className="map-preview-text">
            Este mapa usa la ubicación / zona que escribas. Es solo una
            referencia visual.
          </p>

          <div className="map-frame-wrapper">
            <iframe
              src={mapPreviewUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa de referencia"
            ></iframe>
          </div>
        </div>

        <div className="buttons-row">
          <button type="button" onClick={() => setSection("home")}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            Enviar reporte
          </button>
        </div>
      </form>
    </div>
  );

  /* ------------------------------------------------------- */
  /*  INTERFAZ: LISTA PRINCIPAL                              */
  /* ------------------------------------------------------- */
  const renderHome = () => (
    <div className="container">
      <h1 className="hero-title">¡BALBOA ALERTA ESTÁ VIVO!</h1>
      <p className="hero-subtitle">
        Vecinos organizados reportando basura, daños, riesgos y problemas en
        tiempo real. Un distrito más limpio, más seguro, más nuestro.
      </p>

      <button className="btn-primary" onClick={() => setSection("form")}>
        Reportar incidencia
      </button>

      <hr />

      <h2>Reportes recientes</h2>

      {reports.map((r, i) => (
        <article className="report-card" key={i}>
          <h3>{r.type}</h3>

          <p className="report-info">
            <strong>Prioridad:</strong> {r.priority}{" "}
            <strong>Estado:</strong> nuevo
          </p>

          {r.description && (
            <p className="report-info">{r.description}</p>
          )}

          <p className="report-info">
            <strong>Ubicación:</strong> {r.location}
          </p>

          {r.zone && (
            <p className="report-info">
              <strong>Zona:</strong> {r.zone}
            </p>
          )}

          {r.contact && (
            <p className="report-info">
              <strong>Contacto:</strong> {r.contact}
            </p>
          )}

          <div className="report-footer-row">
            <span className="report-footer-date">
              {new Date(r.createdAt).toLocaleString()}
            </span>

            <a
              className="map-link"
              href={buildMapUrl(r.location, r.zone)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver en mapa
            </a>
          </div>
        </article>
      ))}
    </div>
  );

  /* ------------------------------------------------------- */
  /*  RENDER PRINCIPAL                                       */
  /* ------------------------------------------------------- */
  return <>{section === "form" ? renderReportForm() : renderHome()}</>;
}

export default App;
