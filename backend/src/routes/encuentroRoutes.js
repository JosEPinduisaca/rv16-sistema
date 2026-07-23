const express = require('express');
const router = express.Router();
const {
  crearEncuentro,
  listarEncuentros,
  obtenerEncuentro,
  listarConDesignaciones,
  actualizarEncuentro,
  eliminarEncuentro,
} = require('../controllers/encuentroController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken);

// IMPORTANTE: /general va ANTES de /:id, si no Express interpretaría "general" como un id
router.get('/general', permitirRoles('administrador', 'directivo', 'arbitro'), listarConDesignaciones);

router.get('/', listarEncuentros);
router.get('/:id', obtenerEncuentro);
router.post('/', permitirRoles('administrador', 'directivo'), crearEncuentro);
router.put('/:id', permitirRoles('administrador', 'directivo'), actualizarEncuentro);
router.delete('/:id', permitirRoles('administrador'), eliminarEncuentro);

module.exports = router;
