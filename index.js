const express = require('express');
const cors = require('cors');

const app = express();

// Importamos el index de rutas
const routes = require('./routes');

// Middleware
app.use(cors({ origin: '*' }));
app.set('port', process.env.PORT || 4001);
app.use(express.json());

// Rutas centralizadas
app.use('/', routes);

// Levantar servidor
app.listen(app.get('port'), () => {
  console.log(`Server on port ${app.get('port')}`);
});
