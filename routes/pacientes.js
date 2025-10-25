const { Router } = require('express');
const router = Router();
const { query, transaction } = require('../db');

// Validar campos obligatorios
const validarPaciente = (data, campos) => {
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

// Obtener todos los pacientes
router.get('/', async (req, res) => {
  try {
    const pacientes = await query(`
      SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
      FROM pacientes p
      JOIN usuarios u ON p.id_usuario = u.id
    `);
    res.json(pacientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
});

// Obtener paciente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const pacientes = await query(`
      SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
      FROM pacientes p
      JOIN usuarios u ON p.id_usuario = u.id
      WHERE p.id = ?
    `, [id]);

    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(pacientes[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener paciente" });
  }
});

router.get('/usuario/:idUsuario', async (req, res) => {
  try {
    const { idUsuario } = req.params;
    validarID(idUsuario);

    const pacientes = await query(`
      SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
      FROM pacientes p
      JOIN usuarios u ON p.id_usuario = u.id
      WHERE p.id_usuario = ?
    `, [idUsuario]);

    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado para este usuario" });
    }

    res.json(pacientes[0]);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener paciente por usuario" });
  }
});

// Crear paciente con usuario asociado
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      telefono,
      direccion,
      contrasena,
      tipoDocumento,
      numeroDocumento,
      fechaNacimiento,
      tipoSangre,
      eps,
      enfermedades
    } = req.body;

    validarPaciente(
      { nombre, correo, contrasena, fechaNacimiento, tipoSangre },
      ['nombre', 'correo', 'contrasena', 'fechaNacimiento', 'tipoSangre']
    );

    // Verificar si el correo o documento ya existen
    const usuarioExistente = await query(
      'SELECT id FROM usuarios WHERE correo = ? OR numero_documento = ?',
      [correo, numeroDocumento]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({ error: "El correo o documento ya está registrado" });
    }

    let idUsuario, idPaciente;

    await transaction(async (connection) => {
      const resultUsuario = await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion, fecha_nacimiento, tipo_sangre)
           VALUES (?, ?, ?, ?, SHA1(?), 'paciente', ?, ?, ?, ?)`,
          [nombre, apellido, telefono, correo, contrasena, numeroDocumento, direccion, fechaNacimiento, tipoSangre],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      idUsuario = resultUsuario.insertId;

      const resultPaciente = await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO pacientes (id_usuario, tipo_documento, eps, enfermedades)
           VALUES (?, ?, ?, ?)`,
          [idUsuario, tipoDocumento || null, eps || null, enfermedades || null],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      idPaciente = resultPaciente.insertId;
    });

    res.status(201).json({
      message: "✅ Paciente registrado correctamente",
      id_usuario: idUsuario,
      id_paciente: idPaciente
    });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: "Error al registrar paciente" });
  }
});

// Actualizar paciente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { eps, enfermedades, tipo_documento } = req.body;
    validarID(id);

    // Verificar que el paciente existe
    const pacientes = await query('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    await query(
      'UPDATE pacientes SET eps = ?, enfermedades = ?, tipo_documento = ? WHERE id = ?',
      [eps || null, enfermedades || null, tipo_documento || null, id]
    );

    res.json({ message: "Paciente actualizado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar paciente" });
  }
});

module.exports = router;