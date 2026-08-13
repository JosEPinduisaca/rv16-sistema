const express = require('express');
const router = express.Router();
const {
  crearDesignacion,
  publicarDesignacion,
  publicarTodas,
  despublicarTodas,
  listarPorArbitro,
  eliminarDesignacion,
} = require('../controllers/designacionController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken);

router.post('/', permitirRoles('administrador', 'directivo'), crearDesignacion);
router.put('/:id/publicar', permitirRoles('administrador', 'directivo'), publicarDesignacion);
router.put('/publicar-todas', permitirRoles('administrador', 'directivo'), publicarTodas);
router.put('/despublicar-todas', permitirRoles('administrador', 'directivo'), despublicarTodas);
router.delete('/:id', permitirRoles('administrador', 'directivo'), eliminarDesignacion);
router.get('/arbitro/:arbitroId', listarPorArbitro);

module.exports = router;
