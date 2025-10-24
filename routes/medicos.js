const { Router } = require("express");
const router = Router();
const { query, transaction } = require("../db");

// Validar campos obligatorios
const validarMedico = (data, campos) => {
  const faltantes = campos.filter((campo) => !data[campo]);
  if (faltantes.length > 0) {
    throw { status: 400, message: `Campos obligatorios: ${faltantes.join(", ")}` };
  }
};

router.get("/", async (req, res) => {
  try {
    const medicos = await query(`
      SELECT 
        m.id AS id_medico,
        u.id AS id_usuario,
        u.nombre,
        u.apellido,
        u.correo,
        u.telefono,
        u.fecha_nacimiento,
        u.tipo_sangre,
        u.foto_perfil,
        m.especialidad,
        m.anios_experiencia,
        m.tarifa,
        m.numeroRegistro,
        m.rethus,
        m.universidad,
        m.direccion_consultorio
      FROM medico m
      JOIN usuarios u ON m.id_usuario = u.id
    `);

    // 🔹 Convertir las fotos (BLOB) a base64 URL
    const medicosConFotos = medicos.map((m) => {
      if (m.foto_perfil) {
        const base64 = Buffer.from(m.foto_perfil).toString("base64");
        m.foto_perfil = `data:image/png;base64,${base64}`;
      } else {
        // Si no tiene foto, puede venir nulo
        m.foto_perfil = null;
      }
      return m;
    });

    res.json(medicosConFotos);
  } catch (err) {
    console.error("❌ Error al obtener médicos:", err);
    res.status(500).json({ error: "Error al obtener médicos" });
  }
});

// Obtener médico por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const medicos = await query(
      `
      SELECT 
        m.id AS id_medico,
        u.id AS id_usuario,
        u.nombre,
        u.apellido,
        u.correo,
        u.telefono,
        u.fecha_nacimiento,
        u.tipo_sangre,
        u.foto_perfil,
        m.especialidad,
        m.anios_experiencia,
        m.tarifa,
        m.numeroRegistro,
        m.rethus,
        m.universidad,
        m.direccion_consultorio
      FROM medico m
      JOIN usuarios u ON m.id_usuario = u.id
      WHERE m.id = ?
      `,
      [id]
    );

    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    res.json(medicos[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener médico" });
  }
});

// Registrar nuevo médico
router.post("/", async (req, res) => {
  try {
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
      foto_perfil,
    } = req.body;

    validarMedico(
      { nombre, apellidos, correo, contrasena, cedula, fechaNacimiento, tipoSangre, numeroRegistro },
      ["nombre", "apellidos", "correo", "contrasena", "cedula", "fechaNacimiento", "tipoSangre", "numeroRegistro"]
    );

    // Verificar duplicados
    const usuarioExistente = await query(
      "SELECT id FROM usuarios WHERE correo = ? OR numero_documento = ?",
      [correo, cedula]
    );
    if (usuarioExistente.length > 0) {
      return res.status(400).json({ error: "El correo o la cédula ya está registrado" });
    }

    // Procesar imagen base64
    let fotoBuffer = null;
    if (foto_perfil) {
      try {
        const base64Data = foto_perfil.split(";base64,").pop();
        fotoBuffer = Buffer.from(base64Data, "base64");
      } catch (error) {
        console.warn("⚠️ Error procesando imagen:", error.message);
      }
    }

    let idUsuario;

    await transaction(async (connection) => {
      // Crear usuario
      const resultUsuario = await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO usuarios 
          (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion, fecha_nacimiento, tipo_sangre, foto_perfil)
          VALUES (?, ?, ?, ?, SHA1(?), 'medico', ?, ?, ?, ?, ?)`,
          [
            nombre,
            apellidos,
            telefono,
            correo,
            contrasena,
            cedula,
            direccion,
            fechaNacimiento,
            tipoSangre,
            fotoBuffer,
          ],
          (err, results) => (err ? reject(err) : resolve(results))
        );
      });

      idUsuario = resultUsuario.insertId;

      // Crear médico asociado
      await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO medico (id_usuario, especialidad, anios_experiencia, numeroRegistro, rethus, universidad, direccion_consultorio)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [idUsuario, especialidad || null, experiencia || 0, numeroRegistro, rethus || null, universidad || null, null],
          (err) => (err ? reject(err) : resolve())
        );
      });
    });

    res.status(201).json({
      message: "✅ Médico registrado correctamente",
      id_usuario: idUsuario,
    });
  } catch (err) {
    console.error("❌ Error en registro médico:", err);
    res.status(err.status || 500).json({ error: err.message || "Error al registrar médico" });
  }
});

// Actualizar médico
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { especialidad, anios_experiencia, tarifa } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const medicoExistente = await query("SELECT id FROM medico WHERE id = ?", [id]);
    if (medicoExistente.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    await query(
      "UPDATE medico SET especialidad = ?, anios_experiencia = ?, tarifa = ? WHERE id = ?",
      [especialidad, anios_experiencia, tarifa, id]
    );

    res.json({ message: "Médico actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar médico" });
  }
});

module.exports = router;
