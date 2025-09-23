const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Obtener todos los pacientes (con datos de usuario para mas informacio )
router.get('/', (req, res) => {
  const query = `
    SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono
    FROM pacientes p
    JOIN usuarios u ON p.id_usuario = u.id
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener pacientes" });
    res.json(rows);
  });
});

// Crear paciente (normalmente se crea al registrar usuario con rol paciente)
router.post('/', (req, res) => {
  const { id_usuario } = req.body;
  mysqlConnection.query(
    'INSERT INTO pacientes (id_usuario) VALUES (?)',
    [id_usuario],
    (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: "Este usuario ya está registrado como paciente" });
        }
        return res.status(500).json({ error: "Error al registrar paciente" });
      }
      res.json({ message: "Paciente registrado correctamente", id: results.insertId });
    }
  );
});

// Obtener paciente por id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono
    FROM pacientes p
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE p.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener paciente" });
    res.json(rows[0]);
  });
});

module.exports = router;