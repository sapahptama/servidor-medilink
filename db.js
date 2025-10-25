const mysql = require("mysql");

const pool = mysql.createPool({
  host: 'b6y6cwxy5myxhxr0kncl-mysql.services.clever-cloud.com',
  user: 'ukmfzr4gmjpysakg',
  password: 'MAh9m7dtxiDiZVaQtXsq',
  database: 'b6y6cwxy5myxhxr0kncl',
  connectionLimit: 3,
  acquireTimeout: 30000,
  timeout: 60000,
  multipleStatements: false,
  waitForConnections: true,
  queueLimit: 5,
  connectTimeout: 10000,
  charset: 'utf8mb4',
  timezone: 'local',
  idleTimeout: 40000,
});

pool.on('error', (err) => {
  console.error("❌ Error en el pool de conexiones:", err.message);
});

pool.on('acquire', (connection) => {
  console.log('🔗 Conexión adquirida del pool');
});

pool.on('release', (connection) => {
  console.log('🔄 Conexión liberada al pool');
});

pool.on('enqueue', () => {
  console.log('⏳ Esperando por conexión disponible...');
});

const query = (sql, args = []) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, args, (err, results) => {
      if (err) {
        console.error('❌ Error en query:', err.message);
        console.error('Query:', sql);
        console.error('Params:', args);
        return reject(err);
      }
      resolve(results);
    });
  });
};

const getConnection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('❌ Error al obtener conexión:', err.message);
        return reject(err);
      }
      resolve(connection);
    });
  });
};

module.exports = { pool, query, getConnection, transaction };