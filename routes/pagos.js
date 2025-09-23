const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Crear pago
router.post('/', (req, res) => {
  const { monto, fecha } = req.body;
  const query = `INSERT INTO pagos (monto, fecha) VALUES (?, ?)`;
  mysqlConnection.query(query, [monto, fecha], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al registrar pago" });
    res.json({ message: "Pago registrado correctamente", id: results.insertId });
  });
});

// Obtener pago por id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('SELECT * FROM pagos WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener pago" });
    res.json(rows[0]);
  });
});

module.exports = router;
