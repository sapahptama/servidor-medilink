const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// Validar campos obligatorios
const validarChat = (data, campos) => {
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

// Crear chat
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_medico } = req.body;

    validarChat({ id_paciente, id_medico }, ['id_paciente', 'id_medico']);

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

    // Verificar si ya existe un chat entre estos dos
    const chatExistente = await query(
      'SELECT id FROM chats WHERE id_paciente = ? AND id_medico = ?',
      [id_paciente, id_medico]
    );

    if (chatExistente.length > 0) {
      return res.status(400).json({ error: "Ya existe un chat entre este paciente y médico" });
    }

    const resultado = await query(
      'INSERT INTO chats (id_paciente, id_medico) VALUES (?, ?)',
      [id_paciente, id_medico]
    );

    res.status(201).json({ message: "Chat creado correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear chat" });
  }
});

// Obtener chat por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const chats = await query('SELECT * FROM chats WHERE id = ?', [id]);

    if (chats.length === 0) {
      return res.status(404).json({ error: "Chat no encontrado" });
    }

    res.json(chats[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener chat" });
  }
});

// Chats como paciente
router.get('/paciente/:id/mis-chats', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const chats = await query(`
      SELECT c.*, u.nombre AS medico_nombre, u.apellido AS medico_apellido
      FROM chats c
      JOIN medico m ON c.id_medico = m.id
      JOIN usuarios u ON m.id_usuario = u.id
      WHERE c.id_paciente = ?
    `, [id]);

    res.json(chats);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener chats del paciente" });
  }
});

// Chats como médico
router.get('/medico/:id/mis-chats', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const chats = await query(`
      SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido
      FROM chats c
      JOIN pacientes p ON c.id_paciente = p.id
      JOIN usuarios u ON p.id_usuario = u.id
      WHERE c.id_medico = ?
    `, [id]);

    res.json(chats);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener chats del médico" });
  }
});

// Eliminar chat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM chats WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Chat no encontrado" });
    }

    res.json({ message: "Chat eliminado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar chat" });
  }
});

module.exports = router;