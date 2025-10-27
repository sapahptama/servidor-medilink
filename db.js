const mysql = require("mysql");

const pool = mysql.createPool({
  host: 'b6y6cwxy5myxhxr0kncl-mysql.services.clever-cloud.com',
  user: 'ukmfzr4gmjpysakg',
  password: 'MAh9m7dtxiDiZVaQtXsq',
  database: 'b6y6cwxy5myxhxr0kncl',
  connectionLimit: 2, // 🎯 Reducido de 3 a 2 para respetar el límite de 5 conexiones del servidor.
  acquireTimeout: 30000,
  timeout: 60000,
  multipleStatements: false,
  waitForConnections: true,
  queueLimit: 20, // ⬆️ Aumentado de 5 a 20 para que las solicitudes esperen en lugar de fallar inmediatamente.
  connectTimeout: 10000,
  charset: 'utf8mb4',
  timezone: 'local',
  idleTimeout: 60000,
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
      // El pool.query() se encarga de adquirir y liberar la conexión automáticamente
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

// FUNCIÓN TRANSACTION CORREGIDA
const transaction = async (callback) => {
  const connection = await getConnection();
  
  return new Promise(async (resolve, reject) => {
    try {
      await new Promise((resolve, reject) => {
        connection.beginTransaction((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Ejecutar el callback con la conexión
      await callback(connection);

      // Commit de la transacción
      await new Promise((resolve, reject) => {
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              reject(err);
            });
          }
          resolve();
        });
      });

      connection.release();
      resolve();
    } catch (error) {
      // Rollback en caso de error
      await new Promise((resolve) => {
        connection.rollback(() => {
          resolve();
        });
      });
      connection.release();
      reject(error);
    }
  });
};

// Función para verificar la conexión inicial
const verificarConexion = async () => {
  try {
    const connection = await getConnection();
    console.log("✅ Conectado al pool de MySQL correctamente");
    connection.release();
    return true;
  } catch (err) {
    console.error("❌ Error al conectar a la base de datos:", err.message);
    return false;
  }
};

verificarConexion();

module.exports = { pool, query, getConnection, transaction };