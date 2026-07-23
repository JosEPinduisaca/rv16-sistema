const express = require('express');
const router = express.Router();
const {
  listarArbitros,
  obtenerArbitro,
  registrarDisponibilidad,
  obtenerPerfilPropio,
  listarDisponibilidad,
  cambiarEstadoArbitro,
  actualizarNivel,
  listarCandidatos,
  actualizarArbitro,
  eliminarArbitro,
} = require('../controllers/arbitroController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken); // todas las rutas de este archivo requieren estar logueado

// IMPORTANTE: /me y /candidatos van ANTES de /:id, si no Express las interpretaría como un id
router.get('/me', permitirRoles('arbitro'), obtenerPerfilPropio);
router.get('/candidatos', permitirRoles('administrador', 'directivo'), listarCandidatos);

router.get('/', permitirRoles('administrador', 'directivo'), listarArbitros);
router.get('/:id', permitirRoles('administrador', 'directivo', 'arbitro'), obtenerArbitro);
router.get('/:id/disponibilidad', permitirRoles('administrador', 'directivo', 'arbitro'), listarDisponibilidad);
router.put('/:id/disponibilidad', permitirRoles('arbitro', 'administrador'), registrarDisponibilidad);
router.put('/:id/estado', permitirRoles('administrador'), cambiarEstadoArbitro);
router.put('/:id/nivel', permitirRoles('administrador', 'directivo'), actualizarNivel);
router.put('/:id', permitirRoles('administrador'), actualizarArbitro);
router.delete('/:id', permitirRoles('administrador'), eliminarArbitro);

module.exports = router;
