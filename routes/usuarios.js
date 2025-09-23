const { Router } = require('express');
const router = Router();
const mysqlConnection = require('../db');

//obtener todos los usuarios- no creo que les sirva mucho por ahi se las dejo
router.get('/', (req, res) => {
  mysqlConnection.query('SELECT * FROM usuarios', (err, rows) => {
    if (!err) {
      res.json(rows);
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });
});

// crear un nuevo usuario
router.post('/', (req, res) => {
  const { nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion } = req.body;

  const nuevoUsuario = `
    INSERT INTO usuarios (nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion) 
    VALUES (?, ?, ?, ?, SHA1(?), ?, ?, ?)
  `;

  const usuario = [nombre, apellido, telefono, correo, contrasena, rol, numero_documento, direccion];

  mysqlConnection.query(nuevoUsuario, usuario, (err, results) => {
    if (err) {
      console.error(err.message);
      // Manejar error de constraint único
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "El número de documento ya está registrado" });
      }
      return res.status(500).json({ error: "Error al registrar usuario" });
    }

    const usuarioId = results.insertId;

    // Si es médico lo insertamos en la tabla medico
    if (rol && rol.toLowerCase() === 'medico') {
      const nuevoMedico = `
        INSERT INTO medico (id_usuario, especialidad, anios_experiencia, tarifa) 
        VALUES (?, NULL, 0, 0.00)
      `;
      mysqlConnection.query(nuevoMedico, [usuarioId], (err2) => {
        if (err2) {
          console.error(err2.message);
          // Si falla la creación del médico, eliminar el usuario creado
          mysqlConnection.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
          if (err2.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Este usuario ya está registrado como médico" });
          }
          return res.status(500).json({ error: "Error al registrar médico" });
        }
        return res.json({ message: "Usuario y médico registrados correctamente", id: usuarioId });
      });
    }

    // Si es paciente lo insertamos en la tabla pacientes
    else if (rol && rol.toLowerCase() === 'paciente') {
      const nuevoPaciente = `
        INSERT INTO pacientes (id_usuario) VALUES (?)
      `;
      mysqlConnection.query(nuevoPaciente, [usuarioId], (err3) => {
        if (err3) {
          console.error(err3.message);
          // Si falla la creación del paciente, eliminar el usuario creado
          mysqlConnection.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
          if (err3.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Este usuario ya está registrado como paciente" });
          }
          return res.status(500).json({ error: "Error al registrar paciente" });
        }
        return res.json({ message: "Usuario y paciente registrados correctamente", id: usuarioId });
      });
    }

    else {
      res.json({ message: "Usuario registrado correctamente", id: usuarioId });
    }
  });
});

// Actualizar usuario por id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, telefono, correo, rol, numero_documento, direccion } = req.body;

  const actualizarUsuario = `
    UPDATE usuarios 
    SET nombre = ?, apellido = ?, telefono = ?, correo = ?, rol = ?, numero_documento = ?, direccion = ? 
    WHERE id = ?
  `;

  const usuario = [nombre, apellido, telefono, correo, rol, numero_documento, direccion, id];

  mysqlConnection.query(actualizarUsuario, usuario, (err) => {
    if (err) {
      console.error(err.message);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: "El número de documento ya está en uso" });
      }
      return res.status(500).json({ error: "Error al actualizar usuario" });
    }
    res.json({ message: "Usuario actualizado correctamente" });
  });
});

//eliminar usuario por id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
    if (!err) {
      res.json({ message: "Usuario eliminado correctamente" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al eliminar usuario" });
    }
  });
});

//obtener un usuario por id 
router.get('/:id', (req, res) => {
  const { id } = req.params;
  mysqlConnection.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, rows) => {
    if (!err) {
      res.json(rows[0]);
    } else {
      console.error(err);
      res.status(500).json({ error: "Error al obtener usuario" });
    }
  });
});

module.exports = router;