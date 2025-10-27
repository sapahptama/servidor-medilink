const { Router } = require('express');
const router = Router();
const pool = require('../db');

// Obtener chats de un usuario (paciente o médico)
router.get('/usuario/:userId/tipo/:tipo', async (req, res) => {
  const { userId, tipo } = req.params;
  
  try {
    let query;
    if (tipo === 'paciente') {
      query = `
        SELECT 
          c.id, c.id_paciente, c.id_medico,
          c.ultimo_mensaje, c.fecha_ultimo_mensaje,
          c.no_leidos_paciente as no_leidos,
          m.nombre as medico_nombre,
          m.apellido as medico_apellido,
          e.nombre as especialidad
        FROM chats c
        JOIN medicos m ON c.id_medico = m.id
        LEFT JOIN especialidades e ON m.id_especialidad = e.id
        WHERE c.id_paciente = ?
        ORDER BY c.fecha_ultimo_mensaje DESC
      `;
    } else {
      query = `
        SELECT 
          c.id, c.id_paciente, c.id_medico,
          c.ultimo_mensaje, c.fecha_ultimo_mensaje,
          c.no_leidos_medico as no_leidos,
          u.nombre as paciente_nombre,
          u.apellido as paciente_apellido
        FROM chats c
        JOIN pacientes p ON c.id_paciente = p.id_paciente
        JOIN usuarios u ON p.id_usuario = u.id
        WHERE c.id_medico = ?
        ORDER BY c.fecha_ultimo_mensaje DESC
      `;
    }
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener chats:', err);
    res.status(500).json({ error: 'Error al cargar chats' });
  }
});

// Obtener o crear chat entre paciente y médico
router.post('/obtener-o-crear', async (req, res) => {
  const { id_paciente, id_medico } = req.body;
  
  try {
    // Verificar si existe el chat
    let result = await pool.query(
      'SELECT * FROM chats WHERE id_paciente = ? AND id_medico = $2',
      [id_paciente, id_medico]
    );
    
    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }
    
    // Crear nuevo chat
    result = await pool.query(
      `INSERT INTO chats (id_paciente, id_medico) 
       VALUES (?, $2) 
       RETURNING *`,
      [id_paciente, id_medico]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener/crear chat:', err);
    res.status(500).json({ error: 'Error al crear chat' });
  }
});

// Marcar mensajes como leídos
router.put('/:chatId/marcar-leidos/:tipoUsuario', async (req, res) => {
  const { chatId, tipoUsuario } = req.params;
  
  try {
    // Actualizar contador de no leídos
    const campo = tipoUsuario === 'paciente' 
      ? 'no_leidos_paciente' 
      : 'no_leidos_medico';
    
    await pool.query(
      `UPDATE chats SET ${campo} = 0 WHERE id = ?`,
      [chatId]
    );
    
    // Marcar mensajes como leídos
    await pool.query(
      `UPDATE mensajes 
       SET leido = true 
       WHERE id_chat = ? AND tipo_emisor != $2`,
      [chatId, tipoUsuario]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error al marcar leídos:', err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

module.exports = router;