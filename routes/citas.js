const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarCita = (data, campos) => {
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

// Obtener todas las citas
router.get('/', async (req, res) => {
  try {
    const citas = await query(`
      SELECT c.*, 
             pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido,
             mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id
      JOIN usuarios pm ON p.id_usuario = pm.id
      JOIN medico m ON c.id_medico = m.id
      JOIN usuarios mm ON m.id_usuario = mm.id
      ORDER BY c.fecha DESC
    `);
    res.json(citas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// Obtener cita por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const citas = await query(`
      SELECT c.*, 
             pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido,
             mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id
      JOIN usuarios pm ON p.id_usuario = pm.id
      JOIN medico m ON c.id_medico = m.id
      JOIN usuarios mm ON m.id_usuario = mm.id
      WHERE c.id = ?
    `, [id]);

    if (citas.length === 0) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json(citas[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener cita" });
  }
});

// Consultar cita activa (futura o en curso)
router.get('/paciente/:id/activa', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const citas = await query(`
      SELECT * FROM citas 
      WHERE id_paciente = ? AND fecha > NOW()
      ORDER BY fecha ASC
      LIMIT 1
    `, [id]);

    if (citas.length > 0) {
      res.json({ activa: true, cita: citas[0] });
    } else {
      res.json({ activa: false });
    }
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al consultar cita activa" });
  }
});

// Citas de un paciente
router.get('/paciente/:id/mis-citas', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const citas = await query(`
      SELECT c.*, mm.nombre AS medico_nombre, mm.apellido AS medico_apellido
      FROM citas c
      JOIN medico m ON c.id_medico = m.id
      JOIN usuarios mm ON m.id_usuario = mm.id
      WHERE c.id_paciente = ?
      ORDER BY c.fecha DESC
    `, [id]);

    res.json(citas);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener citas del paciente" });
  }
});

// Citas de un médico
router.get('/medico/:id/mis-citas', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const citas = await query(`
      SELECT c.*, pm.nombre AS paciente_nombre, pm.apellido AS paciente_apellido
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id
      JOIN usuarios pm ON p.id_usuario = pm.id
      WHERE c.id_medico = ?
      ORDER BY c.fecha DESC
    `, [id]);

    res.json(citas);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener citas del médico" });
  }
});

// Crear cita
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, fecha, id_pago, link_llamada } = req.body;

    validarCita({ id_paciente, id_medico, fecha }, ['id_paciente', 'id_medico', 'fecha']);

    // Verificar que paciente y médico existen
    const [pacientes, medicos] = await Promise.all([
      query('SELECT id FROM pacientes WHERE id = ?', [id_paciente]),
      query('SELECT id FROM medico WHERE id = ?', [id_medico])
    ]);

    if (pacientes.length === 0) {
      return res.status(400).json({ error: "Paciente no válido" });
    }

    if (medicos.length === 0) {
      return res.status(400).json({ error: "Médico no válido" });
    }

    // Verificar pago si se proporciona
    if (id_pago) {
      const pagos = await query('SELECT id FROM pagos WHERE id = ?', [id_pago]);
      if (pagos.length === 0) {
        return res.status(400).json({ error: "Pago no válido" });
      }
    }

    const resultado = await query(
      'INSERT INTO citas (id_paciente, id_medico, fecha, id_pago, link_llamada) VALUES (?, ?, ?, ?, ?)',
      [id_paciente, id_medico, fecha, id_pago || null, link_llamada || null]
    );

    res.status(201).json({ message: "Cita creada correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear cita" });
  }
});

// Actualizar cita
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, id_pago, link_llamada } = req.body;
    validarID(id);

    // Verificar que la cita existe
    const citas = await query('SELECT id FROM citas WHERE id = ?', [id]);
    if (citas.length === 0) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    // Verificar pago si se proporciona
    if (id_pago) {
      const pagos = await query('SELECT id FROM pagos WHERE id = ?', [id_pago]);
      if (pagos.length === 0) {
        return res.status(400).json({ error: "Pago no válido" });
      }
    }

    await query(
      'UPDATE citas SET fecha = ?, id_pago = ?, link_llamada = ? WHERE id = ?',
      [fecha, id_pago || null, link_llamada || null, id]
    );

    res.json({ message: "Cita actualizada correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar cita" });
  }
});

// Eliminar cita
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM citas WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json({ message: "Cita eliminada correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar cita" });
  }
});

router.get('/medico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const citas = await query(`
      SELECT c.*, 
             pm.nombre AS paciente_nombre, 
             pm.apellido AS paciente_apellido,
             p.id as id_paciente
      FROM citas c
      JOIN pacientes p ON c.id_paciente = p.id
      JOIN usuarios pm ON p.id_usuario = pm.id
      WHERE c.id_medico = ?
      ORDER BY c.fecha DESC
    `, [id]);

    res.json(citas);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener citas del médico" });
  }
});

module.exports = router;