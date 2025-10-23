const { Router } = require("express");
const router = Router();
const mysqlConnection = require("../db");

// Obtener todos los médicos
router.get("/", (req, res) => {
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
  `;
  mysqlConnection.query(query, (err, rows) => {
    if (!err) res.json(rows);
    else res.status(500).json({ error: "Error al obtener médicos" });
  });
});

// Obtener médico por ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT m.*, u.nombre, u.apellido, u.correo, u.telefono, u.fecha_nacimiento, u.tipo_sangre
    FROM medico m
    JOIN usuarios u ON m.id_usuario = u.id
    WHERE m.id = ?
  `;
  mysqlConnection.query(query, [id], (err, rows) => {
    if (!err) res.json(rows[0]);
    else res.status(500).json({ error: "Error al obtener médico" });
  });
});

router.post("/", (req, res) => {
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

  const nuevoUsuario = `
    INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion, fecha_nacimiento, tipo_sangre)
    VALUES (?, ?, ?, ?, SHA1(?), 'medico', ?, ?, ?, ?)
  `;

  mysqlConnection.query(
    nuevoUsuario,
    [nombre, apellidos, telefono, correo, contrasena, cedula, direccion, fechaNacimiento, tipoSangre],
    (err, resultUsuario) => {
      if (err) {
        console.error("❌ Error al registrar usuario:", err.message);
        return res.status(500).json({ error: "Error al registrar usuario" });
      }

      const idUsuario = resultUsuario.insertId;

      const nuevoMedico = `
        INSERT INTO medico (id_usuario, especialidad, anios_experiencia, numeroRegistro, rethus, universidad)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      mysqlConnection.query(
        nuevoMedico,
        [idUsuario, especialidad, experiencia || 0, numeroRegistro, rethus, universidad],
        (err2) => {
          if (err2) {
            console.error("❌ Error al registrar médico:", err2.message);
            return res.status(500).json({ error: "Error al registrar médico" });
          }

          res.json({
            message: "✅ Médico registrado correctamente",
            idUsuario,
          });
        }
      );
    }
  );
});


router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { especialidad, anios_experiencia, tarifa } = req.body;
  const query = `UPDATE medico SET especialidad=?, anios_experiencia=?, tarifa=? WHERE id=?`;
  mysqlConnection.query(query, [especialidad, anios_experiencia, tarifa, id], (err) => {
    if (err) return res.status(500).json({ error: "Error al actualizar médico" });
    res.json({ message: "Médico actualizado correctamente" });
  });
});

router.delete("/:id", (req, res) => {
  mysqlConnection.query("DELETE FROM medico WHERE id=?", [req.params.id], (err) => {
    if (err) res.status(500).json({ error: "Error al eliminar médico" });
    else res.json({ message: "Médico eliminado correctamente" });
  });
});

module.exports = router;
