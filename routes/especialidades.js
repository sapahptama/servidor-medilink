const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

// listar las especialidades
router.get('/', (req, res) => {
  mysqlConnection.query('SELECT * FROM especialidades', (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener especialidades" });
    res.json(rows);
  });
});

//crear una nueva(no creo que lo usen pero se las dejo)
router.post('/', (req, res) => {
  const { nombre } = req.body;
  mysqlConnection.query('INSERT INTO especialidades (nombre) VALUES (?)', [nombre], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "Esta especialidad ya existe" });
      }
      return res.status(500).json({ error: "Error al crear especialidad" });
    }
    res.json({ message: "Especialidad creada correctamente", id: results.insertId });
  });
});

router.post('/asignar', (req, res) => {
  const { id_medico, id_especialidad } = req.body;
  mysqlConnection.query(
    'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
    [id_medico, id_especialidad],
    (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: "Esta especialidad ya está asignada al médico" });
        }
        return res.status(500).json({ error: "Error al asignar especialidad" });
      }
      res.json({ message: "Especialidad asignada correctamente", id: results.insertId });
    }
  );
});

module.exports = router;