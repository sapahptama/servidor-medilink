const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Crear chat
router.post('/', (req, res) => {
  const { id_paciente, id_medico } = req.body;
  const query = `INSERT INTO chats (id_paciente, id_medico) VALUES (?, ?)`;
  
  mysqlConnection.query(query, [id_paciente, id_medico], (err, results) => {
    if (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Paciente o médico no válido" });
      }
      return res.status(500).json({ error: "Error al crear chat" });
    }
    res.json({ message: "Chat creado correctamente", id: results.insertId });
  });
});

// mis chats como paciente 
router.get('/paciente/:id/mis-chats', (req, res) => {
  const query = `
    SELECT c.*, u.nombre AS medico_nombre, u.apellido AS medico_apellido
    FROM chats c
    JOIN medico m ON c.id_medico = m.id
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE c.id_paciente = ?
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener chats del paciente" });
    res.json(rows);
  });
});

// mis chats como medico
router.get('/medico/:id/mis-chats', (req, res) => {
  const query = `
    SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido
    FROM chats c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE c.id_medico = ?
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener chats del médico" });
    res.json(rows);
  });
});

module.exports = router;