const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarPago = (data, campos) => {
  const faltantes = campos.filter(campo => !data[campo]);
  if (faltantes.length > 0) {
    throw { status: 400, message: `Campos obligatorios: ${faltantes.join(', ')}` };
  }
};

// Validar IDs numéricos
const validarID = (id) => {
  if (!id || isNaN(id)) {
    throw { status: 400, message: "ID inválido" };
  }
};

// Validar monto
const validarMonto = (monto) => {
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw { status: 400, message: "El monto debe ser un número positivo" };
  }
};

// Obtener todos los pagos
router.get('/', async (req, res) => {
  try {
    const pagos = await query('SELECT * FROM pagos ORDER BY fecha DESC');
    res.json(pagos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

// Obtener pago por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const pagos = await query('SELECT * FROM pagos WHERE id = ?', [id]);

    if (pagos.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    res.json(pagos[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener pago" });
  }
});

// Crear pago
router.post('/', async (req, res) => {
  try {
    const { monto, fecha } = req.body;

    validarPago({ monto }, ['monto']);
    validarMonto(monto);

    const resultado = await query(
      'INSERT INTO pagos (monto, fecha) VALUES (?, ?)',
      [
        parseFloat(monto),
        fecha || new Date()
      ]
    );

    res.status(201).json({ message: "Pago registrado correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al registrar pago" });
  }
});

// Eliminar pago
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM pagos WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    res.json({ message: "Pago eliminado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar pago" });
  }
});

module.exports = router;