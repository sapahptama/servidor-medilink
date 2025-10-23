const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (!err) res.json(rows);
    else {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener médicos' });
    }
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE m.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (!err) res.json(rows[0]);
    else {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener médico' });
    }
  });
});

router.post(
  '/',
  upload.fields([
    { name: 'hojaVida', maxCount: 1 },
    { name: 'documentoIdentidad', maxCount: 1 },
    { name: 'diplomas', maxCount: 1 },
    { name: 'foto', maxCount: 1 },
  ]),
  (req, res) => {
    const {
      nombre,
      apellidos,
      telefono,
      correo,
      contrasena,
      cedula,
      direccion,
      fechaNacimiento,
      tipoSangre,
      especialidad,
      experiencia,
      numeroRegistro,
      rethus,
      universidad,
    } = req.body;

    // Archivos recibidos
    const hojaVida = req.files['hojaVida'] ? req.files['hojaVida'][0].filename : null;
    const documentoIdentidad = req.files['documentoIdentidad']
      ? req.files['documentoIdentidad'][0].filename
      : null;
    const diplomas = req.files['diplomas'] ? req.files['diplomas'][0].filename : null;
    const foto = req.files['foto'] ? req.files['foto'][0].filename : null;

    mysqlConnection.getConnection((err, connection) => {
      if (err) {
        console.error('❌ Error al obtener conexión del pool:', err.message);
        return res.status(500).json({ error: 'Error de conexión con la base de datos' });
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return res.status(500).json({ error: 'Error al iniciar transacción' });
        }

        const nuevoUsuario = `
          INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion, fecha_nacimiento, tipo_sangre)
          VALUES (?, ?, ?, ?, SHA1(?), 'medico', ?, ?, ?, ?)
        `;
        connection.query(
          nuevoUsuario,
          [nombre, apellidos, telefono, correo, contrasena, cedula, direccion, fechaNacimiento, tipoSangre],
          (err, results) => {
            if (err) {
              console.error('❌ Error al crear usuario:', err.message);
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: 'Error al registrar usuario' });
              });
            }

            const idUsuario = results.insertId;

            const nuevoMedico = `
              INSERT INTO medico (
                id_usuario, especialidad, anios_experiencia, numeroRegistro,
                rethus, universidad, hojaVida, documentoIdentidad, diplomas, foto
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(
              nuevoMedico,
              [
                idUsuario,
                especialidad,
                experiencia || 0,
                numeroRegistro,
                rethus,
                universidad,
                hojaVida,
                documentoIdentidad,
                diplomas,
                foto,
              ],
              (err2) => {
                if (err2) {
                  console.error('❌ Error al crear médico:', err2.message);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ error: 'Error al registrar médico' });
                  });
                }

                connection.commit((err3) => {
                  if (err3) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: 'Error al confirmar transacción' });
                    });
                  }

                  console.log(`✅ Médico y usuario creados con ID: ${idUsuario}`);
                  connection.release();

                  res.json({
                    message: '✅ Médico registrado correctamente',
                    idUsuario,
                  });
                });
              }
            );
          }
        );
      });
    });
  }
);

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { especialidad, anios_experiencia, tarifa } = req.body;

  const actualizarMedico = `
    UPDATE medico 
    SET especialidad = ?, anios_experiencia = ?, tarifa = ? 
    WHERE id = ?
  `;
  mysqlConnection.query(actualizarMedico, [especialidad, anios_experiencia, tarifa, id], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error al actualizar médico' });
    }
    res.json({ message: 'Médico actualizado correctamente' });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('DELETE FROM medico WHERE id = ?', [id], (err) => {
    if (!err) res.json({ message: 'Médico eliminado correctamente' });
    else {
      console.error(err);
      res.status(500).json({ error: 'Error al eliminar médico' });
    }
  });
});

router.get('/:id/mis-pacientes', (req, res) => {
  const query = `
    SELECT DISTINCT p.id AS paciente_id, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE c.id_medico = ?
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener pacientes del médico' });
    res.json(rows);
  });
});

router.get('/:id/mis-citas', (req, res) => {
  const query = `
    SELECT c.*, u.nombre AS paciente_nombre, u.apellido AS paciente_apellido
    FROM citas c
    JOIN pacientes p ON c.id_paciente = p.id
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE c.id_medico = ?
    ORDER BY c.fecha DESC
  `;
  mysqlConnection.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener citas del médico' });
    res.json(rows);
  });
});

module.exports = router;