// const mysql = require("mysql2");

// // Configuración de la base de datos
// const dbConfig = {
//     host: "localhost",
//     port: 3306,
//     user: "root",
//     database: "medilink",
// };

// const pool = mysql.createPool(dbConfig);

// // Verificar conexión
// pool.getConnection((err, connection) => {
//     if (err) {
//         console.error("❌ Error al conectar a la base de datos:", err.message);
//     } else {
//         console.log("conectado a la base de datos mysql");
//         connection.release();
//     }
// });

// module.exports = pool;


const mysql = require('mysql');
const mysqlConnection = mysql.createConnection({
    host: 'b6y6cwxy5myxhxr0kncl-mysql.services.clever-cloud.com',
    user: 'ukmfzr4gmjpysakg',
    password: 'MAh9m7dtxiDiZVaQtXsq',
    database: 'b6y6cwxy5myxhxr0kncl',
    multipleStatements: true
});

mysqlConnection.connect( function(err){
    if(err){
        console.error(err);
        return;
    } else {
        console.log('Base de datos conectada!');
    }
})

module.exports = mysqlConnection;