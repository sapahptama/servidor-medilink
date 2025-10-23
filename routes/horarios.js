const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarHorario = (data, campos) => {
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

// Validar fechas
const validarFechas = (fecha_inicio, fecha_fin) => {
  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    throw { status: 400, message: "Las fechas deben ser válidas" };
  }

  if (fin <= inicio) {
    throw { status: 400, message: "La fecha de fin debe ser posterior a la fecha de inicio" };
  }
};

// Crear horario
router.post('/', async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, id_medico } = req.body;

    validarHorario(
      { fecha_inicio, fecha_fin, id_medico },
      ['fecha_inicio', 'fecha_fin', 'id_medico']
    );

    validarFechas(fecha_inicio, fecha_fin);

    // Verificar que el médico existe
    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id_medico]);
    if (medicos.length === 0) {
      return res.status(400).json({ error: "Médico no válido" });
    }

    const resultado = await query(
      'INSERT INTO horarios (fecha_inicio, fecha_fin, id_medico) VALUES (?, ?, ?)',
      [fecha_inicio, fecha_fin, id_medico]
    );

    res.status(201).json({ message: "Horario creado correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear horario" });
  }
});

// Listar todos los horarios
router.get('/', async (req, res) => {
  try {
    const horarios = await query('SELECT * FROM horarios ORDER BY fecha_inicio DESC');
    res.json(horarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener horarios" });
  }
});

// Obtener horario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const horarios = await query('SELECT * FROM horarios WHERE id = ?', [id]);

    if (horarios.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    res.json(horarios[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horario" });
  }
});

// Obtener horarios de un médico
router.get('/medico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    // Verificar que el médico existe
    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id]);
    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    const horarios = await query(
      'SELECT * FROM horarios WHERE id_medico = ? ORDER BY fecha_inicio ASC',
      [id]
    );

    res.json(horarios);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios del médico" });
  }
});

// Obtener horarios activos de un médico
router.get('/medico/:id/activos', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    // Verificar que el médico existe
    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id]);
    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    const horarios = await query(
      'SELECT * FROM horarios WHERE id_medico = ? AND fecha_fin > NOW() ORDER BY fecha_inicio ASC',
      [id]
    );

    res.json(horarios);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios activos del médico" });
  }
});

// Obtener horarios activos de los médicos de un paciente
router.get('/paciente/:id/activos', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    // Verificar que el paciente existe
    const pacientes = await query('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const horarios = await query(`
      SELECT DISTINCT h.* FROM horarios h 
      JOIN citas c ON h.id_medico = c.id_medico
      WHERE c.id_paciente = ? AND h.fecha_fin > NOW() 
      ORDER BY h.fecha_inicio ASC
    `, [id]);

    res.json(horarios);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios activos del paciente" });
  }
});

// Actualizar horario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.body;
    validarID(id);

    validarHorario(
      { fecha_inicio, fecha_fin },
      ['fecha_inicio', 'fecha_fin']
    );

    validarFechas(fecha_inicio, fecha_fin);

    // Verificar que el horario existe
    const horarios = await query('SELECT id FROM horarios WHERE id = ?', [id]);
    if (horarios.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    await query(
      'UPDATE horarios SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
      [fecha_inicio, fecha_fin, id]
    );

    res.json({ message: "Horario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar horario" });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM horarios WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    res.json({ message: "Horario eliminado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar horario" });
  }
});

module.exports = router;