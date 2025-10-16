const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Consultar si un paciente tiene una cita activa (futura o en curso)
router.get('/paciente/:id/activa', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT * FROM citas 
    WHERE id_paciente = ? AND fecha > NOW()
    ORDER BY fecha ASC
    LIMIT 1
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al consultar cita activa" });
    if (rows.length > 0) {
      res.json({ activa: true, cita: rows[0] });
    } else {
      res.json({ activa: false });
    }
  });
});

// crear cita
router.post('/', (req, res) => {
  const { id_paciente, id_medico, fecha, id_pago, link_llamada } = req.body;
  const query = `
    INSERT INTO citas (id_paciente, id_medico, fecha, id_pago, link_llamada)
    VALUES (?, ?, ?, ?, ?)
  `;
  mysqlConnection.query(query, [id_paciente, id_medico, fecha, id_pago, link_llamada], (err, results) => {
    if (err) {
      console.error(err.message);
      // Verificar si es error de foreign key
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Paciente, médico o pago no válido" });
      }
      return res.status(500).json({ error: "Error al crear cita" });
    }
    res.json({ message: "Cita creada correctamente", id: results.insertId });
  });
});

// Obtener todas las citas
router.get('/', (req, res) => {
  const query = `
    SELECT c.*, 
           pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido,
           mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios pm ON p.id_usuario = pm.id
    JOIN medico m ON c.id_medico = m.id
    JOIN usuarios mm ON m.id_usuario = mm.id
    ORDER BY c.fecha DESC
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas" });
    res.json(rows);
  });
});

// Obtener una cita por id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT c.*, 
           pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido,
           mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios pm ON p.id_usuario = pm.id
    JOIN medico m ON c.id_medico = m.id
    JOIN usuarios mm ON m.id_usuario = mm.id
    WHERE c.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener cita" });
    res.json(rows[0]);
  });
});

// Actualizar cita
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { fecha, id_pago, link_llamada } = req.body;
  const query = `
    UPDATE citas SET fecha = ?, id_pago = ?, link_llamada = ? WHERE id = ?
  `;
  mysqlConnection.query(query, [fecha, id_pago, link_llamada, id], (err) => {
    if (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: "Pago no válido" });
      }
      return res.status(500).json({ error: "Error al actualizar cita" });
    }
    res.json({ message: "Cita actualizada correctamente" });
  });
});

// Eliminar cita
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('DELETE FROM citas WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar cita" });
    res.json({ message: "Cita eliminada correctamente" });
  });
});

// Citas de un paciente
router.get('/paciente/:id/mis-citas', (req, res) => {
  const query = `
    SELECT c.*, mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
    FROM citas c
    JOIN medico m ON c.id_medico = m.id
    JOIN usuarios mm ON m.id_usuario = mm.id
    WHERE c.id_paciente = ?
    ORDER BY c.fecha DESC
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas del paciente" });
    res.json(rows);
  });
});

// Citas de un médico
router.get('/medico/:id/mis-citas', (req, res) => {
  const query = `
    SELECT c.*, pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios pm ON p.id_usuario = pm.id
    WHERE c.id_medico = ?
    ORDER BY c.fecha DESC
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas del médico" });
    res.json(rows);
  });
});

module.exports = router;