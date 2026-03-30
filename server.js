
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUsers = [];

io.on("connection", socket => {

  socket.on("buscar", data => {

    let idioma = data.idioma.split("-")[0];

    let match = waitingUsers.find(u =>
      u.idioma === idioma && u.tipo === data.tipo
    );

    if (match) {

      socket.emit("match", match.id);
      io.to(match.id).emit("match", socket.id);

      waitingUsers = waitingUsers.filter(u => u.id !== match.id);

    } else {

      waitingUsers.push({
        id: socket.id,
        idioma: idioma,
        tipo: data.tipo
      });

    }

  });

  socket.on("mensaje", data => {
    socket.to(data.id).emit("mensaje", data.texto);
  });

  socket.on("next", id => {
    socket.to(id).emit("next");
  });

  socket.on("disconnect", () => {
    waitingUsers = waitingUsers.filter(u => u.id !== socket.id);
  });

});

server.listen(3000, () => console.log("PopChat funcionando"));
