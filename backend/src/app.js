const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Carpeta para fotos
if (!require('fs').existsSync('./src/uploads')) require('fs').mkdirSync('./src/uploads');
const storage = multer.diskStorage({
  destination: './src/uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Base de datos en memoria (para pruebas)
let reportes = [];

// RUTAS QUE USA EL FRONTEND
app.get('/api/reportes', (req, res) => res.json(reportes));

app.post('/api/reportes', upload.single('imagen'), (req, res) => {
  const nuevo = {
    id: reportes.length + 1,
    descripcion: req.body.descripcion,
    ubicacion: req.body.ubicacion,
    categoria_ia: 'SEGURIDAD',
    imagen_url: req.file ? `/uploads/${req.file.filename}` : null,
    creado_en: new Date().toISOString()
  };
  reportes.push(nuevo);
  res.status(201).json(nuevo);
});

// Ruta raíz (para que siga diciendo que está vivo)
app.get('/', (req, res) => {
  res.send('<h1 style="color:#dc2626;text-align:center;margin-top:200px;font-size:60px">¡BALBOA ALERTA ESTÁ VIVO!</h1>');
});

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));