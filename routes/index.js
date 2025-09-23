const { Router } = require('express');
const router = Router();

router.use('/usuarios', require('./usuarios'));
router.use('/medicos', require('./medicos'));
router.use('/pacientes', require('./pacientes'));
router.use('/citas', require('./citas'));
router.use('/pagos', require('./pagos'));
router.use('/chats', require('./chats'));
router.use('/mensajes', require('./mensajes'));
router.use('/especialidades', require('./especialidades'));
router.use('/registros', require('./registros'));
router.use('/horarios', require('./horarios'));

module.exports = router;
