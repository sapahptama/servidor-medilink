const { Router } = require('express');
const router = Router();
const { query, transaction } = require('../db');

// Validar campos obligatorios
const validarUsuario = (data, campos) => {
  const faltantes = campos.filter(campo => !data[campo]);
  if (faltantes.length > 0) {
    throw { status: 400, message: `Campos obligatorios: ${faltantes.join(', ')}` };
  }
};

// Obtener todos los usuarios (sin contraseña)
router.get('/', async (req, res) => {
  try {
    const usuarios = await query(
      'SELECT id, nombre, apellido, telefono, correo, rol, numero_documento, direccion FROM usuarios'
    );
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const usuarios = await query(
      'SELECT id, nombre, apellido, telefono, correo, rol, numero_documento, direccion FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuarios[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// Crear usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion } = req.body;

    validarUsuario({ nombre, correo, contrasena, rol }, ['nombre', 'correo', 'contrasena', 'rol']);

    const rolValido = ['medico', 'paciente', 'admin'].includes(rol.toLowerCase());
    if (!rolValido) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    // Verificar si el correo ya existe
    const usuarioExistente = await query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Crear usuario y su rol asociado en transacción
    await transaction(async (connection) => {
      const resultUsuario = await new Promise((resolve, reject) => {
        connection.query(
          'INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion) VALUES (?, ?, ?, ?, SHA1(?), ?, ?, ?)',
          [nombre, apellido, telefono, correo, contrasena, rol.toLowerCase(), numero_documento, direccion],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      const usuarioId = resultUsuario.insertId;

      if (rol.toLowerCase() === 'medico') {
        await new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO medico (id_usuario, especialidad, anios_experiencia, tarifa) VALUES (?, NULL, 0, 0.00)',
            [usuarioId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else if (rol.toLowerCase() === 'paciente') {
        await new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO pacientes (id_usuario) VALUES (?)',
            [usuarioId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    });

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, correo, rol, numero_documento, direccion } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verificar que el usuario existe
    const usuarioExistente = await query('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (usuarioExistente.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await query(
      'UPDATE usuarios SET nombre = ?, apellido = ?, telefono = ?, correo = ?, rol = ?, numero_documento = ?, direccion = ? WHERE id = ?',
      [nombre, apellido, telefono, correo, rol, numero_documento, direccion, id]
    );

    res.json({ message: "Usuario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "El correo o documento ya está en uso" });
    }
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const resultado = await query('DELETE FROM usuarios WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });
    }

    const usuarios = await query(
      'SELECT id, nombre, apellido, telefono, correo, rol FROM usuarios WHERE correo = ? AND contrasena = SHA1(?) LIMIT 1',
      [correo, contrasena]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const usuario = usuarios[0];

    if (usuario.rol === 'medico') {
      const medicos = await query(
        'SELECT id, especialidad, anios_experiencia, tarifa FROM medico WHERE id_usuario = ? LIMIT 1',
        [usuario.id]
      );
      if (medicos.length > 0) {
        return res.json({ usuario: { ...usuario, ...medicos[0], rol: 'medico' } });
      }
    } else if (usuario.rol === 'paciente') {
      const pacientes = await query(
        'SELECT pacientes.id FROM pacientes WHERE id_usuario = ? LIMIT 1',
        [usuario.id]
      );
      if (pacientes.length > 0) {
        return res.json({ usuario: { ...usuario, id_paciente: pacientes[0].id, rol: 'paciente' } });
      }
    }

    res.json({ usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
