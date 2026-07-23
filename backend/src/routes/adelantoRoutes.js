const express = require('express');
const router = express.Router();
const {
  solicitarAdelanto,
  cambiarEstadoAdelanto,
  listarPorArbitro,
  listarTodos,
} = require('../controllers/adelantoController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken);

router.post('/', permitirRoles('arbitro', 'administrador'), solicitarAdelanto);
router.put('/:id/estado', permitirRoles('administrador'), cambiarEstadoAdelanto);
router.get('/', permitirRoles('administrador'), listarTodos);
router.get('/arbitro/:arbitroId', listarPorArbitro);

module.exports = router;
