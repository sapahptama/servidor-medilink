const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// Crear horario
router.post('/', (req, res) => {
  const { fecha_inicio, fecha_fin, id_medico } = req.body;
  const query = `
    INSERT INTO horarios (fecha_inicio, fecha_fin, id_medico)
    VALUES (?, ?, ?)
  `;
  mysqlConnection.query(query, [fecha_inicio, fecha_fin, id_medico], (err, results) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Error al crear horario" });
    }
    res.json({ message: "Horario creado correctamente", id: results.insertId });
  });
});

router.get("/horarios-activos/medico/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM horarios WHERE id_medico = ? AND fecha_fin > NOW() ORDER BY fecha_inicio ASC`;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener horarios activos del médico" });
    }
    res.json(rows);
  })
})
// obtener los horarios activos de los medicos de un paciente donde tenga citas
router.get("/horarios-activos/paciente/:id", (req, res) => {
  const { id } = req.params;
  const query = `SELECT DISTINCT h.* FROM horarios h JOIN citas c ON h.id_medico = c.id_medico
    WHERE c.id_paciente = ? AND h.fecha_fin > NOW() ORDER BY h.fecha_inicio ASC`;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener horarios activos del paciente" });
    }
    res.json(rows);
  })
})

// Listar todos los horarios
router.get('/', (req, res) => {
  mysqlConnection.query('SELECT * FROM horarios', (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener horarios" });
    res.json(rows);
  });
});

// Obtener horarios de un médico
router.get('/medico/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM horarios WHERE id_medico = ? ORDER BY fecha_inicio ASC`;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener horarios del médico" });
    res.json(rows);
  });
});

// Actualizar horario
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin } = req.body;
  const query = `
    UPDATE horarios SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?
  `;
  mysqlConnection.query(query, [fecha_inicio, fecha_fin, id], (err) => {
    if (err) return res.status(500).json({ error: "Error al actualizar horario" });
    res.json({ message: "Horario actualizado correctamente" });
  });
});

// Eliminar horario
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('DELETE FROM horarios WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar horario" });
    res.json({ message: "Horario eliminado correctamente" });
  });
});

module.exports = router;
