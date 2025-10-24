const { Router } = require('express');
const router = Router();
const { query } = require('../db');

// ==================== VALIDADORES ====================

const validarHorario = (data, campos) => {
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

const validarFechas = (fecha_inicio, fecha_fin) => {
  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    throw { status: 400, message: "Las fechas deben ser válidas" };
  }

  if (fin <= inicio) {
    throw { status: 400, message: "La fecha de fin debe ser posterior a la fecha de inicio" };
  }
};

const validarTipoConfiguracion = (tipo) => {
  const tiposValidos = ['especifico', 'recurrente'];
  if (!tiposValidos.includes(tipo)) {
    throw { status: 400, message: `Tipo debe ser: ${tiposValidos.join(', ')}` };
  }
};

const validarDiasSemana = (dias_semana) => {
  if (typeof dias_semana !== 'object') {
    throw { status: 400, message: "dias_semana debe ser un objeto JSON" };
  }
  const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const diasEnviados = Object.keys(dias_semana);
  const noValidos = diasEnviados.filter(d => !diasValidos.includes(d));
  if (noValidos.length > 0) {
    throw { status: 400, message: `Días no válidos: ${noValidos.join(', ')}` };
  }
};

// ==================== CONVERSIONES DE FECHAS ====================

// Convertir ISO a MySQL DATETIME
const convertirAMySQLDatetime = (isoString) => {
  const fecha = new Date(isoString);
  if (isNaN(fecha.getTime())) {
    throw { status: 400, message: "Fecha inválida" };
  }
  
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const hours = String(fecha.getHours()).padStart(2, '0');
  const minutes = String(fecha.getMinutes()).padStart(2, '0');
  const seconds = String(fecha.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Convertir MySQL DATETIME a ISO 8601
const convertirAISO = (mysqlDatetime) => {
  if (!mysqlDatetime) return null;
  const fecha = new Date(mysqlDatetime);
  if (isNaN(fecha.getTime())) return null;
  return fecha.toISOString();
};

// Parsear horario de BD y convertir fechas
const parsearHorario = (horario) => {
  const horarioParseado = { ...horario };
  if (horario.dias_semana && typeof horario.dias_semana === 'string') {
    horarioParseado.dias_semana = JSON.parse(horario.dias_semana);
  }
  // Convertir fechas MySQL a ISO
  if (horario.fecha_inicio) {
    horarioParseado.fecha_inicio = convertirAISO(horario.fecha_inicio);
  }
  if (horario.fecha_fin) {
    horarioParseado.fecha_fin = convertirAISO(horario.fecha_fin);
  }
  return horarioParseado;
};

// ==================== CREAR HORARIO ====================

router.post('/', async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      id_medico,
      tipo_configuracion = 'especifico',
      dias_semana = null,
      fecha_recurrencia_inicio = null,
      fecha_recurrencia_fin = null
    } = req.body;

    // Validaciones básicas
    validarHorario(
      { fecha_inicio, fecha_fin, id_medico },
      ['fecha_inicio', 'fecha_fin', 'id_medico']
    );

    validarFechas(fecha_inicio, fecha_fin);
    validarTipoConfiguracion(tipo_configuracion);

    // Validaciones según tipo
    if (tipo_configuracion === 'recurrente') {
      if (!dias_semana || !fecha_recurrencia_inicio || !fecha_recurrencia_fin) {
        return res.status(400).json({ 
          error: "Para tipo recurrente se requieren: dias_semana, fecha_recurrencia_inicio, fecha_recurrencia_fin" 
        });
      }
      validarDiasSemana(dias_semana);
    }

    // Verificar que el médico existe
    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id_medico]);
    if (medicos.length === 0) {
      return res.status(400).json({ error: "Médico no válido" });
    }

    // Convertir fechas ISO a formato MySQL
    const fecha_inicio_mysql = convertirAMySQLDatetime(fecha_inicio);
    const fecha_fin_mysql = convertirAMySQLDatetime(fecha_fin);

    // Insertar horario
    const dias_semana_json = dias_semana ? JSON.stringify(dias_semana) : null;
    
    const resultado = await query(
      `INSERT INTO horarios 
       (fecha_inicio, fecha_fin, id_medico, tipo_configuracion, dias_semana, fecha_recurrencia_inicio, fecha_recurrencia_fin, activo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        fecha_inicio_mysql, 
        fecha_fin_mysql, 
        id_medico,
        tipo_configuracion,
        dias_semana_json,
        fecha_recurrencia_inicio,
        fecha_recurrencia_fin
      ]
    );

    res.status(201).json({ 
      message: "Horario creado correctamente", 
      id: resultado.insertId,
      tipo: tipo_configuracion
    });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al crear horario" });
  }
});

// ==================== LISTAR HORARIOS ====================

router.get('/', async (req, res) => {
  try {
    const horarios = await query(
      'SELECT * FROM horarios WHERE activo = TRUE ORDER BY fecha_inicio DESC'
    );
    // Convertir fechas a ISO
    const horariosConvertidos = horarios.map(parsearHorario);
    res.json(horariosConvertidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener horarios" });
  }
});

// ==================== OBTENER HORARIO POR ID ====================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const horarios = await query(
      'SELECT * FROM horarios WHERE id = ? AND activo = TRUE',
      [id]
    );

    if (horarios.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    // Parsear y convertir fechas
    const horario = parsearHorario(horarios[0]);
    res.json(horario);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horario" });
  }
});

// ==================== OBTENER HORARIOS DE UN MÉDICO ====================

router.get('/medico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id]);
    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    const horarios = await query(
      'SELECT * FROM horarios WHERE id_medico = ? AND activo = TRUE ORDER BY fecha_inicio ASC',
      [id]
    );

    // Parsear y convertir todas las fechas
    const horariosConvertidos = horarios.map(parsearHorario);
    res.json(horariosConvertidos);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios del médico" });
  }
});

// ==================== OBTENER HORARIOS ACTIVOS DE UN MÉDICO ====================

router.get('/medico/:id/activos', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const medicos = await query('SELECT id FROM medico WHERE id = ?', [id]);
    if (medicos.length === 0) {
      return res.status(404).json({ error: "Médico no encontrado" });
    }

    const horarios = await query(
      `SELECT * FROM horarios 
       WHERE id_medico = ? AND activo = TRUE AND fecha_fin > NOW() 
       ORDER BY fecha_inicio ASC`,
      [id]
    );

    // Parsear y convertir todas las fechas
    const horariosConvertidos = horarios.map(parsearHorario);
    res.json(horariosConvertidos);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios activos del médico" });
  }
});

// ==================== OBTENER HORARIOS ACTIVOS DE MÉDICOS DE UN PACIENTE ====================

router.get('/paciente/:id/activos', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const pacientes = await query('SELECT id FROM pacientes WHERE id = ?', [id]);
    if (pacientes.length === 0) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    const horarios = await query(`
      SELECT DISTINCT h.* FROM horarios h 
      JOIN citas c ON h.id_medico = c.id_medico
      WHERE c.id_paciente = ? AND h.activo = TRUE AND h.fecha_fin > NOW() 
      ORDER BY h.fecha_inicio ASC
    `, [id]);

    // Parsear y convertir todas las fechas
    const horariosConvertidos = horarios.map(parsearHorario);
    res.json(horariosConvertidos);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios activos del paciente" });
  }
});

// ==================== OBTENER HORARIOS POR TIPO ====================

router.get('/tipo/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;
    validarTipoConfiguracion(tipo);

    const horarios = await query(
      'SELECT * FROM horarios WHERE tipo_configuracion = ? AND activo = TRUE ORDER BY fecha_inicio DESC',
      [tipo]
    );

    // Parsear y convertir todas las fechas
    const horariosConvertidos = horarios.map(parsearHorario);
    res.json(horariosConvertidos);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al obtener horarios por tipo" });
  }
});

// ==================== ACTUALIZAR HORARIO ====================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fecha_inicio, 
      fecha_fin,
      tipo_configuracion,
      dias_semana,
      fecha_recurrencia_inicio,
      fecha_recurrencia_fin
    } = req.body;

    validarID(id);

    if (fecha_inicio && fecha_fin) {
      validarFechas(fecha_inicio, fecha_fin);
    }

    if (tipo_configuracion) {
      validarTipoConfiguracion(tipo_configuracion);
    }

    if (dias_semana) {
      validarDiasSemana(dias_semana);
    }

    // Verificar que el horario existe
    const horarios = await query('SELECT id FROM horarios WHERE id = ?', [id]);
    if (horarios.length === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    // Preparar query dinámica
    const campos = [];
    const valores = [];

    if (fecha_inicio && fecha_fin) {
      const fecha_inicio_mysql = convertirAMySQLDatetime(fecha_inicio);
      const fecha_fin_mysql = convertirAMySQLDatetime(fecha_fin);
      campos.push('fecha_inicio = ?');
      campos.push('fecha_fin = ?');
      valores.push(fecha_inicio_mysql);
      valores.push(fecha_fin_mysql);
    }
    if (tipo_configuracion) {
      campos.push('tipo_configuracion = ?');
      valores.push(tipo_configuracion);
    }
    if (dias_semana) {
      campos.push('dias_semana = ?');
      valores.push(JSON.stringify(dias_semana));
    }
    if (fecha_recurrencia_inicio) {
      campos.push('fecha_recurrencia_inicio = ?');
      valores.push(fecha_recurrencia_inicio);
    }
    if (fecha_recurrencia_fin) {
      campos.push('fecha_recurrencia_fin = ?');
      valores.push(fecha_recurrencia_fin);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    campos.push('actualizado_en = NOW()');
    valores.push(id);

    await query(
      `UPDATE horarios SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    res.json({ message: "Horario actualizado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al actualizar horario" });
  }
});

// ==================== ELIMINAR HORARIO (Soft Delete) ====================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query(
      'UPDATE horarios SET activo = FALSE, actualizado_en = NOW() WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    res.json({ message: "Horario eliminado correctamente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar horario" });
  }
});

// ==================== ELIMINAR HORARIO (Hard Delete - Solo admin) ====================

router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    validarID(id);

    const resultado = await query('DELETE FROM horarios WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Horario no encontrado" });
    }

    res.json({ message: "Horario eliminado permanentemente" });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Error al eliminar horario" });
  }
});

module.exports = router;