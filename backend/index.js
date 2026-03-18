// backend/index.js — Balboa Alerta 3.0
const express = require("express");
const cors    = require("cors");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { Pool } = require("pg");

const app  = express();
const PORT = process.env.PORT || 10000;

// ── Base de datos ──────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id          SERIAL PRIMARY KEY,
      code        TEXT,
      type        TEXT,
      description TEXT,
      location    TEXT,
      zone        TEXT,
      priority    TEXT DEFAULT 'media',
      contact     TEXT,
      lat         NUMERIC,
      lng         NUMERIC,
      photo_url   TEXT,
      status      TEXT DEFAULT 'nuevo',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS code TEXT`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_url TEXT`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media'`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact TEXT`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS lat NUMERIC`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS lng NUMERIC`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nuevo'`);
  await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  console.log("Tabla reports lista");
}

// ── Multer — fotos en /uploads ──────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(file.mimetype));
  }
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET","POST","PATCH","DELETE","OPTIONS"] }));
app.options("*", cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// ── Generar código de seguimiento ──────────────────────────
function generarCodigo() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BA-${num}`;
}

// ── Generar link de WhatsApp ────────────────────────────────
function linkWhatsApp(code, type, zone) {
  const numero = process.env.WHATSAPP_NUMBER || "50700000000";
  const msg = encodeURIComponent(
    `Hola, acabo de registrar un reporte en Balboa Alerta.\n\n` +
    `Código: ${code}\nTipo: ${type}\nZona: ${zone}\n\n` +
    `Por favor confirmar recibo.`
  );
  return `https://wa.me/${numero}?text=${msg}`;
}

// ── RUTAS ───────────────────────────────────────────────────

// GET /reports
app.get("/reports", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM reports ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /reports error:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// POST /reports — con foto opcional
app.post("/reports", upload.single("photo"), async (req, res) => {
  try {
    const body     = req.body || {};
    const code     = generarCodigo();
    const photoUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    const type  = body.type  || body.tipo  || "";
    const zone  = body.zone  || body.zona  || "Barrio Balboa Centro";

    const { rows } = await pool.query(
      `INSERT INTO reports
        (code, type, description, location, zone, priority, contact, lat, lng, photo_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'nuevo')
       RETURNING *`,
      [
        code,
        type,
        body.description || body.descripcion || "",
        body.location    || body.ubicacion   || "",
        zone,
        body.priority    || body.prioridad   || "media",
        body.contact     || body.contacto    || "",
        body.lat  || null,
        body.lng  || null,
        photoUrl
      ]
    );

    const reporte = rows[0];
    reporte.whatsapp_url = linkWhatsApp(code, type, zone);

    res.json({ success: true, report: reporte });
  } catch (err) {
    console.error("POST /reports error:", err);
    res.status(500).json({ success: false, message: "Error interno" });
  }
});

// PATCH /reports/:id — actualizar estado
app.patch("/reports/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE reports SET status=$1 WHERE id=$2 RETURNING *",
      [req.body.status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false });
    res.json({ success: true, report: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// DELETE /reports/:id
app.delete("/reports/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM reports WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// GET / — health check
app.get("/", (req, res) => {
  res.send("<h1 style='color:#dc2626;text-align:center;margin-top:100px'>BALBOA ALERTA 3.0 — VIVO</h1>");
});

// ── Arranque ────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log("─────────────────────────────────────");
    console.log("  BALBOA ALERTA 3.0 — Backend activo");
    console.log(`  Puerto: ${PORT}`);
    console.log("─────────────────────────────────────");
  });
}).catch(err => {
  console.error("Error iniciando DB:", err);
  process.exit(1);
});