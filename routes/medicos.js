const { Router } = require("express");
const router = Router();
const { query, transaction } = require("../db");

const validarMedico = (data, campos) => {
  const faltantes = campos.filter((campo) => !data[campo]);
  if (faltantes.length > 0) {
    throw { status: 400, message: `Campos obligatorios: ${faltantes.join(", ")}` };
  }
};

const convertirAISO = (mysqlDatetime) => {
  if (!mysqlDatetime) return null;
  const fecha = new Date(mysqlDatetime);
  if (isNaN(fecha.getTime())) return null;
  return fecha.toISOString();
};

const parsearHorario = (horario) => {
  const h = { ...horario };
  if (h.dias_semana && typeof h.dias_semana === "string") {
    try {
      h.dias_semana = JSON.parse(h.dias_semana);
    } catch {
      h.dias_semana = {};
    }
  }
  if (h.fecha_inicio) h.fecha_inicio = convertirAISO(h.fecha_inicio);
  if (h.fecha_fin) h.fecha_fin = convertirAISO(h.fecha_fin);
  if (h.fecha_recurrencia_inicio)
    h.fecha_recurrencia_inicio = convertirAISO(h.fecha_recurrencia_inicio);
  if (h.fecha_recurrencia_fin)
    h.fecha_recurrencia_fin = convertirAISO(h.fecha_recurrencia_fin);
  return h;
};

const validarID = (id) => {
  if (!id || isNaN(id)) throw { status: 400, message: "ID inválido" };
};

const convertirBufferAImagen = (buffer) => {
  if (!buffer || !buffer.length) return null;
  const inicio = buffer[0];
  let mime = "image/png";
  if (inicio === 0xff) mime = "image/jpeg";
  else if (inicio === 0x89) mime = "image/png";
  else if (inicio === 0x47) mime = "image/gif";
  else if (inicio === 0x42) mime = "image/bmp";
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mime};base64,${base64}`;
};

// Obtener todos los médicos
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

    const medicosConFotos = medicos.map((m) => ({
      ...m,
      foto_perfil: convertirBufferAImagen(m.foto_perfil),
    }));

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
    validarID(id);

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

    const medico = medicos[0];
    medico.foto_perfil = convertirBufferAImagen(medico.foto_perfil);
    res.json(medico);
  } catch (err) {
    console.error("❌ Error al obtener médico:", err);
    res.status(err.status || 500).json({ error: err.message || "Error al obtener médico" });
  }
});

// Obtener disponibilidad completa del médico
router.get("/:id/disponibilidad-completa", async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const existe = await query("SELECT id FROM medico WHERE id = ?", [id]);
    if (existe.length === 0) return res.status(404).json({ error: "Médico no encontrado" });

    const [medicoData, horarios, citas] = await Promise.all([
      query(`
        SELECT m.*, u.nombre, u.apellido, u.correo, u.foto_perfil 
        FROM medico m 
        JOIN usuarios u ON m.id_usuario = u.id 
        WHERE m.id = ?
      `, [id]),
      query(`
        SELECT * FROM horarios 
        WHERE id_medico = ? AND activo = TRUE AND fecha_fin > NOW() 
        ORDER BY fecha_inicio ASC
        LIMIT 100
      `, [id]),
      query(`
        SELECT c.* 
        FROM citas c
        WHERE c.id_medico = ? AND c.fecha > NOW()
        ORDER BY c.fecha DESC
      `, [id]),
    ]);

    const medico = medicoData[0];
    medico.foto_perfil = convertirBufferAImagen(medico.foto_perfil);

    res.json({
      medico,
      horarios: horarios.map(parsearHorario),
      citas,
    });
  } catch (err) {
    console.error("❌ Error en disponibilidad-completa:", err);
    res.status(500).json({ error: "Error al obtener datos del médico" });
  }
});

// Registrar médico
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

    const usuarioExistente = await query(
      "SELECT id FROM usuarios WHERE correo = ? OR numero_documento = ?",
      [correo, cedula]
    );
    if (usuarioExistente.length > 0) {
      return res.status(400).json({ error: "El correo o la cédula ya está registrado" });
    }

    let fotoBuffer = null;
    if (foto_perfil) {
      try {
        const base64Data = foto_perfil.split(";base64,").pop();
        fotoBuffer = Buffer.from(base64Data, "base64");
      } catch (e) {
        console.warn("⚠️ Error procesando imagen:", e.message);
      }
    }

    let idUsuario;
    await transaction(async (connection) => {
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

    validarID(id);
    const medico = await query("SELECT id FROM medico WHERE id = ?", [id]);
    if (medico.length === 0) return res.status(404).json({ error: "Médico no encontrado" });

    await query(
      "UPDATE medico SET especialidad = ?, anios_experiencia = ?, tarifa = ? WHERE id = ?",
      [especialidad, anios_experiencia, tarifa, id]
    );

    res.json({ message: "Médico actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar médico:", err);
    res.status(500).json({ error: "Error al actualizar médico" });
  }
});

module.exports = router;
