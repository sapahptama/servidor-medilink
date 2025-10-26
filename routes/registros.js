const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarRegistro = (data, campos) => {
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

// Crear registro médico vinculado a una cita
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, id_cita, notas } = req.body;

    validarRegistro(
      { id_paciente, id_medico, id_cita },
      ['id_paciente', 'id_medico', 'id_cita']
    );

    // Verificar existencia de entidades
    const [pacientes, medicos, citas] = await Promise.all([
      query('SELECT id FROM pacientes WHERE id = ?', [id_paciente]),
      query('SELECT id FROM medico WHERE id = ?', [id_medico]),
      query('SELECT id FROM citas WHERE id = ?', [id_cita]),
    ]);

    if (pacientes.length === 0) return res.status(400).json({ error: "Paciente no válido" });
    if (medicos.length === 0) return res.status(400).json({ error: "Médico no válido" });
    if (citas.length === 0) return res.status(400).json({ error: "Cita no válida" });

    const resultado = await query(
      'INSERT INTO registros (id_paciente, id_medico, id_cita, notas) VALUES (?, ?, ?, ?)',
      [id_paciente, id_medico, id_cita, notas || null]
    );

    res.status(201).json({ message: "Registro creado correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear registro" });
  }
});

// Obtener registro por cita
router.get('/cita/:id_cita', async (req, res) => {
  try {
    const { id_cita } = req.params;
    validarID(id_cita);

    const registros = await query(`
      SELECT r.*, 
             u.nombre AS medico_nombre, 
             u.apellido AS medico_apellido
      FROM registros r
      JOIN medico m ON r.id_medico = m.id
      JOIN usuarios u ON m.id_usuario = u.id
      WHERE r.id_cita = ?
      ORDER BY r.id DESC
    `, [id_cita]);

    if (registros.length === 0) {
      return res.json([]); // no error, simplemente sin nota aún
    }

    res.json(registros[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener nota médica de la cita" });
  }
});


// Obtener registros de un paciente
router.get('/paciente/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    // Verificar que el paciente existe
    const pacientes = await query('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const registros = await query(`
      SELECT r.*, u.nombre AS medico_nombre, u.apellido AS medico_apellido
      FROM registros r
      JOIN medico m ON r.id_medico = m.id
      JOIN usuarios u ON m.id_usuario = u.id
      WHERE r.id_paciente = ?
      ORDER BY r.id DESC
    `, [id]);

    res.json(registros);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener registros" });
  }
});

// Obtener registro por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const registros = await query(`
      SELECT r.*, u.nombre AS medico_nombre, u.apellido AS medico_apellido,
             p.id AS paciente_id
      FROM registros r
      JOIN medico m ON r.id_medico = m.id
      JOIN usuarios u ON m.id_usuario = u.id
      JOIN pacientes p ON r.id_paciente = p.id
      WHERE r.id = ?
    `, [id]);

    if (registros.length === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json(registros[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener registro" });
  }
});

// Actualizar registro
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notas } = req.body;
    validarID(id);

    // Verificar que el registro existe
    const registros = await query('SELECT id FROM registros WHERE id = ?', [id]);
    if (registros.length === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    await query(
      'UPDATE registros SET notas = ? WHERE id = ?',
      [notas || null, id]
    );

    res.json({ message: "Registro actualizado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar registro" });
  }
});

// Eliminar registro
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM registros WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    res.json({ message: "Registro eliminado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar registro" });
  }
});

module.exports = router;