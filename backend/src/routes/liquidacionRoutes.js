const express = require('express');
const router = express.Router();
const {
  generarLiquidacion,
  generarParaTodos,
  listarPorArbitro,
  listarTodas,
  obtenerLiquidacion,
  marcarComoPagada,
  responderLiquidacion,
  responderComoAdmin,
} = require('../controllers/liquidacionController');
const { listarMensajes, crearMensaje } = require('../controllers/liquidacionMensajeController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(verificarToken);

router.post('/generar', permitirRoles('administrador'), generarLiquidacion);
router.post('/generar-todos', permitirRoles('administrador'), generarParaTodos);
router.get('/', permitirRoles('administrador'), listarTodas);
router.get('/arbitro/:arbitroId', listarPorArbitro);
router.get('/:id', obtenerLiquidacion);
router.put('/:id/pagar', permitirRoles('administrador'), marcarComoPagada);
router.put('/:id/responder', permitirRoles('arbitro'), responderLiquidacion);
router.put('/:id/responder-admin', permitirRoles('administrador'), responderComoAdmin);
router.get('/:id/mensajes', listarMensajes);
router.post('/:id/mensajes', upload.single('imagen'), crearMensaje);

module.exports = router;
