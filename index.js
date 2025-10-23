const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Importamos el index de rutas
const routes = require('./routes');

// Middleware
app.use(cors({ origin: '*' }));
app.set('port', process.env.PORT || 4001);
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Responder a las preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Rutas centralizadas
app.use('/', routes);

// Levantar servidor
app.listen(app.get('port'), () => {
  console.log(`Server on port ${app.get('port')}`);
});
