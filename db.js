const mysql = require("mysql")
const dbConfig = {
    host: "localhost",
    port: 3306,
    user: "root",
    database: "medilink",
}
const pool = mysql.createConnection(dbConfig)
pool.connect(function(err) {
    if (err) throw err;
    console.log("Conectado a la base de datos MySQL!");
});

module.exports = pool

// const mysql = require('mysql');
// const mysqlConnection = mysql.createConnection({
//     host: 'bwb3gksdtvxkplrjk55f-mysql.services.clever-cloud.com',
//     user: 'uxnhacz8o3wcmihd',
//     password: 'thJji0BGAfek2ARRXbTO',
//     database: 'bwb3gksdtvxkplrjk55f',
//     multipleStatements: true
// });

// mysqlConnection.connect( function(err){
//     if(err){
//         console.error(err);
//         return;
//     } else {
//         console.log('Base de datos conectada!');
//     }
// })

// module.exports = mysqlConnection;