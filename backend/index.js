// backend/index.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, "reports.json");

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Función para leer los reportes del archivo
function loadReports() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, "[]", "utf8");
      return [];
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw.trim()) {
      return [];
    }

    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error leyendo reports.json:", err);
    return [];
  }
}

// Función para guardar los reportes en el archivo
function saveReports(reports) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2), "utf8");
    console.log(`reports.json actualizado. Total reportes: ${reports.length}`);
  } catch (err) {
    console.error("Error escribiendo reports.json:", err);
  }
}

// GET /reports → devuelve todos los reportes
app.get("/reports", (req, res) => {
  const reports = loadReports();
  res.json(reports);
});

// POST /reports → crea un nuevo reporte
app.post("/reports", (req, res) => {
  try {
    const reports = loadReports();

    // Tomamos lo que viene del frontend y nos aseguramos de tener un id y fecha
    const body = req.body || {};
    const nuevoReporte = {
      id: body.id || Date.now().toString(),
      tipo: body.tipo || "",
      descripcion: body.descripcion || "",
      ubicacion: body.ubicacion || "",
      zona: body.zona || "",
      prioridad: body.prioridad || "",
      contacto: body.contacto || "",
      fecha: body.fecha || new Date().toISOString(),
    };

    reports.unshift(nuevoReporte);
    saveReports(reports);

    console.log("[POST] Nuevo reporte recibido. Total ahora:", reports.length);

    // Devolvemos todos los reportes para que el frontend refresque la lista
    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error en POST /reports:", err);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// Arrancamos el servidor
app.listen(PORT, () => {
  const reports = loadReports();
  console.log("Usando archivo de datos:", DATA_FILE);
  console.log("Reportes cargados desde archivo:", reports.length);
  console.log(`Backend Balboa Alerta escuchando en http://localhost:${PORT}`);
});
