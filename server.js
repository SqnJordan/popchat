const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Usuarios esperando
let waitingUsers = [];

io.on('connection', socket => {
  console.log('Usuario conectado:', socket.id);

  socket.on('joinQueue', data => {
    socket.userData = data;
    // Buscamos alguien compatible
    let match = waitingUsers.find(u => {
      if(u.language !== data.language) return false; // idioma
      let score = 0;
      if(u.pelicula === data.pelicula && data.pelicula !== "No tengo") score++;
      if(u.deporte === data.deporte && data.deporte !== "Ninguno") score++;
      if(u.clima === data.clima && data.clima !== "Ninguno") score++;
      return score > 0;
    });

    if(match){
      // Creamos sala
      const room = `room-${socket.id}-${match.id}`;
      socket.join(room);
      io.to(match.id).socketsJoin(room);

      // Avisamos a ambos
      io.to(room).emit('matched', {room: room, users: [socket.userData, match.data]});

      // Quitamos de la cola
      waitingUsers = waitingUsers.filter(u => u.id !== match.id);
    } else {
      waitingUsers.push({id: socket.id, data, language: data.language});
    }
  });

  socket.on('sendMessage', msg => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(room => io.to(room).emit('receiveMessage', msg));
  });

  socket.on('skip', () => {
    // Salir de todas las salas
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(room => socket.leave(room));
    socket.emit('skipped');
    // Volver a la cola
    waitingUsers.push({id: socket.id, data: socket.userData, language: socket.userData.language});
  });

  socket.on('disconnect', () => {
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
    console.log('Usuario desconectado:', socket.id);
  });
});
