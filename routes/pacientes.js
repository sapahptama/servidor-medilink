const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

router.get('/', (req, res) => {
  const query = `
    SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM pacientes p
    JOIN usuarios u ON p.id_usuario = u.id
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener pacientes" });
    res.json(rows);
  });
});

// Crear paciente con usuario asociado
router.post('/', (req, res) => {
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

  if (!nombre || !correo || !contrasena || !fechaNacimiento || !tipoSangre) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  mysqlConnection.getConnection((err, connection) => {
    if (err) {
      console.error("Error al obtener conexión:", err);
      return res.status(500).json({ error: "Error en la base de datos" });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Error al iniciar transacción" });
      }

      const queryUsuario = `
        INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion, fecha_nacimiento, tipo_sangre)
        VALUES (?, ?, ?, ?, SHA1(?), 'paciente', ?, ?, ?, ?)
      `;
      connection.query(
        queryUsuario,
        [nombre, apellido, telefono, correo, contrasena, numeroDocumento, direccion, fechaNacimiento, tipoSangre],
        (err, resultUsuario) => {
          if (err) {
            console.error("Error al insertar usuario:", err);
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: "Error al crear usuario" });
            });
          }

          const idUsuario = resultUsuario.insertId;

          const queryPaciente = `
            INSERT INTO pacientes (id_usuario, tipo_documento, eps, enfermedades)
            VALUES (?, ?, ?, ?)
          `;
          connection.query(
            queryPaciente,
            [idUsuario, tipoDocumento, eps, enfermedades],
            (err2, resultPaciente) => {
              if (err2) {
                console.error("Error al insertar paciente:", err2);
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: "Error al registrar paciente" });
                });
              }

              connection.commit((err3) => {
                if (err3) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ error: "Error al confirmar transacción" });
                  });
                }

                connection.release();
                res.json({
                  message: "✅ Paciente registrado correctamente",
                  id_usuario: idUsuario,
                  id_paciente: resultPaciente.insertId
                });
              });
            }
          );
        }
      );
    });
  });
});

// Obtener paciente por id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT p.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM pacientes p
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE p.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener paciente" });
    res.json(rows[0]);
  });
});

module.exports = router;