const express = require('express');
const router = express.Router();
const {
  crearCampeonato,
  listarCampeonatos,
  actualizarCampeonato,
  eliminarCampeonato,
} = require('../controllers/campeonatoController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken);

router.get('/', listarCampeonatos);
router.post('/', permitirRoles('administrador'), crearCampeonato);
router.put('/:id', permitirRoles('administrador'), actualizarCampeonato);
router.delete('/:id', permitirRoles('administrador'), eliminarCampeonato);

module.exports = router;
