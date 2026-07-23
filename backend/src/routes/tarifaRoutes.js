const express = require('express');
const router = express.Router();
const { crearTarifa, listarTarifas, actualizarTarifa, eliminarTarifa } = require('../controllers/tarifaController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

router.use(verificarToken);

router.get('/', listarTarifas);
router.post('/', permitirRoles('administrador'), crearTarifa);
router.put('/:id', permitirRoles('administrador'), actualizarTarifa);
router.delete('/:id', permitirRoles('administrador'), eliminarTarifa);

module.exports = router;
