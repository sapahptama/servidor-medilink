const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Obtener todos los médicos (con datos de usuario para que aya mas informacion
router.get('/', (req, res) => {
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono 
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (!err) {
      res.json(rows);
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al obtener médicos" });
    }
  });
});

// Actualizar médico- solo actualiza la especialidad, años de experiencia y su tarifa
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { especialidad, anios_experiencia, tarifa } = req.body;

  const actualizarMedico = `
    UPDATE medico 
    SET especialidad = ?, anios_experiencia = ?, tarifa = ? 
    WHERE id = ?
  `;

  mysqlConnection.query(actualizarMedico, [especialidad, anios_experiencia, tarifa, id], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Error al actualizar médico" });
    }
    res.json({ message: "Médico actualizado correctamente" });
  });
});

// Eliminar médico
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('DELETE FROM medico WHERE id = ?', [id], (err) => {
    if (!err) {
      res.json({ message: "Médico eliminado correctamente" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar médico" });
    }
  });
});

// Obtener un médico por id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono 
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE m.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (!err) {
      res.json(rows[0]);
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al obtener médico" });
    }
  });
});

//pacientes del medico
router.get('/:id/mis-pacientes', (req, res) => {
  const query = `
    SELECT DISTINCT p.id AS paciente_id, u.nombre, u.apellido, u.correo, u.telefono
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE c.id_medico = ?
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener pacientes del médico" });
    res.json(rows);
  });
});

// todas las citas de un medico
router.get('/:id/mis-citas', (req, res) => {
  const query = `
    SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE c.id_medico = ?
    ORDER BY c.fecha DESC
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas del médico" });
    res.json(rows);
  });
});

module.exports = router;