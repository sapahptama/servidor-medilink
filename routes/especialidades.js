const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarEspecialidad = (data, campos) => {
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

// Listar todas las especialidades
router.get('/', async (req, res) => {
  try {
    const especialidades = await query('SELECT * FROM especialidades ORDER BY nombre ASC');
    res.json(especialidades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener especialidades" });
  }
});

// Obtener especialidad por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const especialidades = await query('SELECT * FROM especialidades WHERE id = ?', [id]);

    if (especialidades.length === 0) {
      return res.status(404).json({ error: "Especialidad no encontrada" });
    }

    res.json(especialidades[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener especialidad" });
  }
});

// Crear nueva especialidad
router.post('/', async (req, res) => {
  try {
    const { nombre } = req.body;

    validarEspecialidad({ nombre }, ['nombre']);

    // Verificar si la especialidad ya existe
    const especialidadExistente = await query(
      'SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER(?)',
      [nombre.trim()]
    );

    if (especialidadExistente.length > 0) {
      return res.status(400).json({ error: "Esta especialidad ya existe" });
    }

    const resultado = await query(
      'INSERT INTO especialidades (nombre) VALUES (?)',
      [nombre.trim()]
    );

    res.status(201).json({ message: "Especialidad creada correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear especialidad" });
  }
});

// Actualizar especialidad
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    validarID(id);

    validarEspecialidad({ nombre }, ['nombre']);

    // Verificar que la especialidad existe
    const especialidades = await query('SELECT id FROM especialidades WHERE id = ?', [id]);
    if (especialidades.length === 0) {
      return res.status(404).json({ error: "Especialidad no encontrada" });
    }

    // Verificar si otro registro tiene el mismo nombre
    const nombreExistente = await query(
      'SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER(?) AND id != ?',
      [nombre.trim(), id]
    );

    if (nombreExistente.length > 0) {
      return res.status(400).json({ error: "Ya existe otra especialidad con ese nombre" });
    }

    await query(
      'UPDATE especialidades SET nombre = ? WHERE id = ?',
      [nombre.trim(), id]
    );

    res.json({ message: "Especialidad actualizada correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar especialidad" });
  }
});

// Eliminar especialidad
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM especialidades WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Especialidad no encontrada" });
    }

    res.json({ message: "Especialidad eliminada correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar especialidad" });
  }
});

// Asignar especialidad a un médico
router.post('/asignar', async (req, res) => {
  try {
    const { id_medico, id_especialidad } = req.body;

    validarEspecialidad({ id_medico, id_especialidad }, ['id_medico', 'id_especialidad']);

    // Verificar que el médico y especialidad existen
    const [medicos, especialidades] = await Promise.all([
      query('SELECT id FROM medico WHERE id = ?', [id_medico]),
      query('SELECT id FROM especialidades WHERE id = ?', [id_especialidad])
    ]);

    if (medicos.length === 0) {
      return res.status(400).json({ error: "Médico no válido" });
    }

    if (especialidades.length === 0) {
      return res.status(400).json({ error: "Especialidad no válida" });
    }

    // Verificar si ya está asignada
    const asignacionExistente = await query(
      'SELECT id FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?',
      [id_medico, id_especialidad]
    );

    if (asignacionExistente.length > 0) {
      return res.status(400).json({ error: "Esta especialidad ya está asignada al médico" });
    }

    const resultado = await query(
      'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)',
      [id_medico, id_especialidad]
    );

    res.status(201).json({ message: "Especialidad asignada correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al asignar especialidad" });
  }
});

// Eliminar asignación de especialidad
router.delete('/asignar/:id_medico/:id_especialidad', async (req, res) => {
  try {
    const { id_medico, id_especialidad } = req.params;

    validarID(id_medico);
    validarID(id_especialidad);

    const resultado = await query(
      'DELETE FROM medico_especialidad WHERE id_medico = ? AND id_especialidad = ?',
      [id_medico, id_especialidad]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    res.json({ message: "Asignación de especialidad eliminada correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar asignación" });
  }
});

// Obtener especialidades de un médico
router.get('/medico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    // Verificar que el médico existe
    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id]);
    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    const especialidades = await query(`
      SELECT e.* FROM especialidades e
      JOIN medico_especialidad me ON e.id = me.id_especialidad
      WHERE me.id_medico = ?
      ORDER BY e.nombre ASC
    `, [id]);

    res.json(especialidades);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener especialidades del médico" });
  }
});

module.exports = router;