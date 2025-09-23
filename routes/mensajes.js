const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Enviar mensaje
router.post('/', (req, res) => {
  const { id_chat, id_usuario, mensaje } = req.body;
  const query = `
    INSERT INTO mensajes (id_chat, id_usuario, mensaje)
    VALUES (?, ?, ?)
  `;
  mysqlConnection.query(query, [id_chat, id_usuario, mensaje], (err, results) => {
    if (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Chat o usuario no válido" });
      }
      return res.status(500).json({ error: "Error al enviar mensaje" });
    }
    res.json({ message: "Mensaje enviado correctamente", id: results.insertId });
  });
});

// Obtener mensajes de un chat
router.get('/:id_chat', (req, res) => {
  const { id_chat } = req.params;
  const query = `
    SELECT m.*, u.nombre, u.apellido 
    FROM mensajes m
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE m.id_chat = ?
    ORDER BY m.fecha_envio ASC
  `;
  mysqlConnection.query(query, [id_chat], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener mensajes" });
    res.json(rows);
  });
});

module.exports = router;