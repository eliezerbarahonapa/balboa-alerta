// backend/index.js — Balboa Alerta 2.0
require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const { Pool } = require("pg");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── PostgreSQL ────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id          TEXT PRIMARY KEY,
      type        TEXT,
      description TEXT,
      location    TEXT,
      zone        TEXT,
      priority    TEXT,
      contact     TEXT,
      lat         DOUBLE PRECISION,
      lng         DOUBLE PRECISION,
      status      TEXT DEFAULT 'nuevo',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  Tabla reports lista.");
}

// ── Express ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());

// GET /reports — todos los reportes (más recientes primero)
app.get("/reports", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
    // Mapear columnas snake_case → camelCase para el frontend
    res.json(rows.map(dbToReport));
  } catch (err) {
    console.error("Error en GET /reports:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// POST /reports — nuevo reporte
app.post("/reports", async (req, res) => {
  try {
    const body = req.body || {};
    const nuevo = {
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
    };

    await pool.query(
      `INSERT INTO reports (id, type, description, location, zone, priority, contact, lat, lng, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [nuevo.id, nuevo.type, nuevo.description, nuevo.location,
       nuevo.zone, nuevo.priority, nuevo.contact, nuevo.lat, nuevo.lng, nuevo.status]
    );

    const { rows } = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
    console.log("[POST] Nuevo reporte. Total:", rows.length);
    res.json({ success: true, reports: rows.map(dbToReport) });
  } catch (err) {
    console.error("Error en POST /reports:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// PATCH /reports/:id — actualizar campos (para panel admin)
app.patch("/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const campos = req.body || {};

    // Construir SET dinámico solo con los campos enviados
    const permitidos = ["type","description","location","zone","priority","contact","lat","lng","status"];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const key of permitidos) {
      if (key in campos) {
        sets.push(`${key} = $${i}`);
        vals.push(campos[key]);
        i++;
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, message: "Sin campos para actualizar" });

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE reports SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Reporte no encontrado" });
    res.json({ success: true, report: dbToReport(rows[0]) });
  } catch (err) {
    console.error("Error en PATCH /reports/:id:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// DELETE /reports/:id
app.delete("/reports/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM reports WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error en DELETE /reports/:id:", err);
    res.status(500).json({ success: false });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function dbToReport(row) {
  return {
    id:          row.id,
    type:        row.type,
    description: row.description,
    location:    row.location,
    zone:        row.zone,
    priority:    row.priority,
    contact:     row.contact,
    lat:         row.lat,
    lng:         row.lng,
    status:      row.status,
    createdAt:   row.created_at,
  };
}

// ── Arranque ──────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, async () => {
      const { rows } = await pool.query("SELECT COUNT(*) FROM reports");
      console.log("─────────────────────────────────────");
      console.log("  BALBOA ALERTA 2.0 — Backend activo");
      console.log(`  Puerto: ${PORT}`);
      console.log(`  Reportes en DB: ${rows[0].count}`);
      console.log("─────────────────────────────────────");
    });
  })
  .catch(err => {
    console.error("Error conectando a PostgreSQL:", err);
    process.exit(1);
  });
