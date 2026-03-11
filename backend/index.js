// backend/index.js — Balboa Alerta 2.0
const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");

const app       = express();
const PORT      = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "reports.json");

app.use(cors());
app.use(express.json());

function loadReports() {
  try {
    if (!fs.existsSync(DATA_FILE)) { fs.writeFileSync(DATA_FILE, "[]", "utf8"); return []; }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw.trim()) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error leyendo reports.json:", err);
    return [];
  }
}

function saveReports(reports) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2), "utf8");
    console.log(`reports.json actualizado. Total: ${reports.length}`);
  } catch (err) {
    console.error("Error escribiendo reports.json:", err);
  }
}

// GET /reports — todos los reportes
app.get("/reports", (req, res) => {
  res.json(loadReports());
});

// POST /reports — nuevo reporte
app.post("/reports", (req, res) => {
  try {
    const reports = loadReports();
    const body    = req.body || {};
    const nuevo   = {
      id:          Date.now().toString(),
      type:        body.type        || body.tipo        || "",
      description: body.description || body.descripcion || "",
      location:    body.location    || body.ubicacion   || "",
      zone:        body.zone        || body.zona        || "Barrio Balboa Centro",
      priority:    body.priority    || body.prioridad   || "media",
      contact:     body.contact     || body.contacto    || "",
      lat:         body.lat         || null,
      lng:         body.lng         || null,
      status:      "nuevo",
      createdAt:   new Date().toISOString(),
    };
    reports.unshift(nuevo);
    saveReports(reports);
    console.log("[POST] Nuevo reporte. Total:", reports.length);
    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error en POST /reports:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// PATCH /reports/:id — actualizar estado (para panel admin)
app.patch("/reports/:id", (req, res) => {
  try {
    const reports = loadReports();
    const idx     = reports.findIndex(r => String(r.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: "Reporte no encontrado" });
    reports[idx] = { ...reports[idx], ...req.body };
    saveReports(reports);
    res.json({ success: true, report: reports[idx] });
  } catch (err) {
    console.error("Error en PATCH /reports/:id:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// DELETE /reports/:id
app.delete("/reports/:id", (req, res) => {
  try {
    const reports = loadReports();
    const filtered = reports.filter(r => String(r.id) !== String(req.params.id));
    saveReports(filtered);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  const reports = loadReports();
  console.log("─────────────────────────────────────");
  console.log("  BALBOA ALERTA 2.0 — Backend activo");
  console.log(`  Puerto: ${PORT}`);
  console.log(`  Reportes en archivo: ${reports.length}`);
  console.log("─────────────────────────────────────");
});
