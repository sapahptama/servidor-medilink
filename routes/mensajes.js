const { Router } = require('express');
const router = Router();
const pool = require('../db');

// Obtener mensajes de un chat
router.get('/chat/:chatId', async (req, res) => {
  const { chatId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        m.*,
        u.nombre,
        u.apellido
      FROM mensajes m
      JOIN usuarios u ON m.id_emisor = u.id
      WHERE m.id_chat = ?
      ORDER BY m.created_at ASC`,
      [chatId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener mensajes:', err);
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
});

// Enviar mensaje
router.post('/', async (req, res) => {
  const { id_chat, id_emisor, tipo_emisor, contenido } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insertar mensaje
    const mensajeResult = await client.query(
      `INSERT INTO mensajes (id_chat, id_emisor, tipo_emisor, contenido)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
      [id_chat, id_emisor, tipo_emisor, contenido]
    );
    
    const mensaje = mensajeResult.rows[0];
    
    // Obtener info del emisor
    const usuarioResult = await client.query(
      'SELECT nombre, apellido FROM usuarios WHERE id = ?',
      [id_emisor]
    );
    
    const usuario = usuarioResult.rows[0];
    mensaje.nombre = usuario.nombre;
    mensaje.apellido = usuario.apellido;
    
    // Actualizar chat
    const campoNoLeidos = tipo_emisor === 'paciente' 
      ? 'no_leidos_medico' 
      : 'no_leidos_paciente';
    
    await client.query(
      `UPDATE chats 
       SET ultimo_mensaje = ?,
           fecha_ultimo_mensaje = CURRENT_TIMESTAMP,
           ${campoNoLeidos} = ${campoNoLeidos} + 1
       WHERE id = ?`,
      [contenido, id_chat]
    );
    
    await client.query('COMMIT');
    res.json(mensaje);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al enviar mensaje:', err);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  } finally {
    client.release();
  }
});

module.exports = router;