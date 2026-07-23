const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const arbitroRoutes = require('./routes/arbitroRoutes');
const campeonatoRoutes = require('./routes/campeonatoRoutes');
const tarifaRoutes = require('./routes/tarifaRoutes');
const encuentroRoutes = require('./routes/encuentroRoutes');
const designacionRoutes = require('./routes/designacionRoutes');
const adelantoRoutes = require('./routes/adelantoRoutes');
const liquidacionRoutes = require('./routes/liquidacionRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', mensaje: 'API RV16 funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api/arbitros', arbitroRoutes);
app.use('/api/campeonatos', campeonatoRoutes);
app.use('/api/tarifas', tarifaRoutes);
app.use('/api/encuentros', encuentroRoutes);
app.use('/api/designaciones', designacionRoutes);
app.use('/api/adelantos', adelantoRoutes);
app.use('/api/liquidaciones', liquidacionRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app;
