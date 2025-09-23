const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Crear registro médico
router.post('/', (req, res) => {
  const { id_paciente, id_medico, notas } = req.body;
  const query = `
    INSERT INTO registros (id_paciente, id_medico, notas)
    VALUES (?, ?, ?)
  `;
  mysqlConnection.query(query, [id_paciente, id_medico, notas], (err, results) => {
    if (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Paciente o médico no válido" });
      }
      return res.status(500).json({ error: "Error al crear registro" });
    }
    res.json({ message: "Registro creado correctamente", id: results.insertId });
  });
});

// Obtener registros de un paciente
router.get('/paciente/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT r.*, u.nombre AS medico_nombre, u.apellido AS medico_apellido
    FROM registros r
    JOIN medico m ON r.id_medico = m.id
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE r.id_paciente = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener registros" });
    res.json(rows);
  });
});

module.exports = router;