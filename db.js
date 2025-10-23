const mysql = require("mysql");

const pool = mysql.createPool({
  host: 'b6y6cwxy5myxhxr0kncl-mysql.services.clever-cloud.com',
  user: 'ukmfzr4gmjpysakg',
  password: 'MAh9m7dtxiDiZVaQtXsq',
  database: 'b6y6cwxy5myxhxr0kncl',
  connectionLimit: 10,
  multipleStatements: false,
  waitForConnections: true,
  queueLimit: 0,
});

pool.on('error', (err) => {
  console.error("❌ Error en el pool de conexiones:", err.message);
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
  } else {
    console.log("✅ Conectado al pool de MySQL correctamente");
    connection.release();
  }
});

const query = (sql, args = []) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, args, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        callback(connection)
          .then(() => {
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                });
              }
              connection.release();
              resolve();
            });
          })
          .catch((error) => {
            connection.rollback(() => {
              connection.release();
              reject(error);
            });
          });
      });
    });
  });
};

module.exports = { pool, query, transaction };