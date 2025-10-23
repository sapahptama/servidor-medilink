const { Router } = require('express');
const router = Router();
const { query } = require('../db');

const validarMensaje = (data, campos) => {
  const faltantes = campos.filter(campo => !data[campo]);
  if (faltantes.length > 0) {
    throw { status: 400, message: `Campos obligatorios: ${faltantes.join(', ')}` };
  }
};

const validarID = (id) => {
  if (!id || isNaN(id)) {
    throw { status: 400, message: "ID inválido" };
  }
};

router.post('/', async (req, res) => {
  try {
    const { id_chat, id_usuario, mensaje } = req.body;

    validarMensaje(
      { id_chat, id_usuario, mensaje },
      ['id_chat', 'id_usuario', 'mensaje']
    );

    // Validar que el mensaje no esté vacío
    if (typeof mensaje !== 'string' || mensaje.trim().length === 0) {
      return res.status(400).json({ error: "El mensaje no puede estar vacío" });
    }

    // Verificar que chat y usuario existen
    const [chats, usuarios] = await Promise.all([
      query('SELECT id FROM chats WHERE id = ?', [id_chat]),
      query('SELECT id FROM usuarios WHERE id = ?', [id_usuario])
    ]);

    if (chats.length === 0) {
      return res.status(400).json({ error: "Chat no válido" });
    }

    if (usuarios.length === 0) {
      return res.status(400).json({ error: "Usuario no válido" });
    }

    // Verificar que el usuario pertenece al chat
    const chatMiembros = await query(`
      SELECT c.id FROM chats c
      WHERE c.id = ? AND (
        c.id_paciente = (SELECT id FROM pacientes WHERE id_usuario = ?) OR
        c.id_medico = (SELECT id FROM medico WHERE id_usuario = ?)
      )
    `, [id_chat, id_usuario, id_usuario]);

    if (chatMiembros.length === 0) {
      return res.status(403).json({ error: "El usuario no pertenece a este chat" });
    }

    const resultado = await query(
      'INSERT INTO mensajes (id_chat, id_usuario, mensaje) VALUES (?, ?, ?)',
      [id_chat, id_usuario, mensaje.trim()]
    );

    res.status(201).json({ message: "Mensaje enviado correctamente", id: resultado.insertId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

// Obtener mensajes de un chat
router.get('/:id_chat', async (req, res) => {
  try {
    const { id_chat } = req.params;
    validarID(id_chat);

    // Verificar que el chat existe
    const chats = await query('SELECT id FROM chats WHERE id = ?', [id_chat]);
    if (chats.length === 0) {
      return res.status(404).json({ error: "Chat no encontrado" });
    }

    const mensajes = await query(`
      SELECT m.*, u.nombre, u.apellido 
      FROM mensajes m
      JOIN usuarios u ON m.id_usuario = u.id
      WHERE m.id_chat = ?
      ORDER BY m.fecha_envio ASC
    `, [id_chat]);

    res.json(mensajes);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

module.exports = router;