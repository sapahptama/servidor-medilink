const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

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

// ==================== WEBSOCKET - CHAT EN TIEMPO REAL ====================

// Almacenar usuarios conectados: userId -> socketId
const usuariosConectados = new Map();

io.on('connection', (socket) => {
  console.log('✅ Usuario conectado:', socket.id);

  // 1. Registrar usuario cuando se conecta
  socket.on('registrar', (userId) => {
    usuariosConectados.set(userId.toString(), socket.id);
    console.log(`👤 Usuario ${userId} registrado con socket ${socket.id}`);
  });

  // 2. Unirse a una sala de chat específica
  socket.on('unirse_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`💬 Socket ${socket.id} se unió al chat ${chatId}`);
  });

  // 3. Enviar mensaje en tiempo real
  socket.on('enviar_mensaje', (data) => {
    const { chatId, mensaje } = data;
    console.log(`📨 Mensaje en chat ${chatId}:`, mensaje.contenido);
    // Emitir a todos los usuarios en la sala del chat
    io.to(`chat_${chatId}`).emit('nuevo_mensaje', mensaje);
  });

  // 4. Marcar mensajes como leídos
  socket.on('marcar_leidos', (data) => {
    const { chatId, userId } = data;
    console.log(`✔️ Mensajes marcados como leídos en chat ${chatId} por usuario ${userId}`);
    socket.to(`chat_${chatId}`).emit('mensajes_leidos', { chatId, userId });
  });

  // 5. Notificar que el usuario está escribiendo
  socket.on('escribiendo', (data) => {
    const { chatId, nombreUsuario } = data;
    socket.to(`chat_${chatId}`).emit('usuario_escribiendo', { nombreUsuario });
  });

  // 6. Usuario deja de escribir
  socket.on('dejar_escribir', (data) => {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('usuario_dejo_escribir');
  });

  // 7. Desconexión
  socket.on('disconnect', () => {
    // Remover usuario de la lista de conectados
    for (const [userId, socketId] of usuariosConectados.entries()) {
      if (socketId === socket.id) {
        usuariosConectados.delete(userId);
        console.log(`❌ Usuario ${userId} desconectado`);
        break;
      }
    }
  });
});


server.listen(app.get('port'), () => {
  console.log(`🚀 Servidor HTTP corriendo en puerto ${app.get('port')}`);
  console.log(`🔌 WebSocket listo para conexiones`);
});

module.exports = { app, io };