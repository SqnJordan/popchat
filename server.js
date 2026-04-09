const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let usuarios = [];

wss.on('connection', ws => {
  let usuarioActual = null;

  ws.on('message', msg => {
    const data = JSON.parse(msg);
    
    if(data.type==="join"){
      usuarioActual = {...data.data, ws: ws};
      usuarios.push(usuarioActual);
      console.log("Usuarios conectados:", usuarios.length);
      emparejarUsuarios();
    }

    if(data.type==="message" && usuarioActual){
      // Enviar solo al otro emparejado
      if(usuarioActual.pareja) usuarioActual.pareja.ws.send(JSON.stringify({type:"message", data:{texto:data.data.texto, usuario:usuarioActual.nombre}}));
    }

    if(data.type==="skip" && usuarioActual){
      if(usuarioActual.pareja){
        usuarioActual.pareja.ws.send(JSON.stringify({type:"skip"}));
        usuarioActual.pareja.pareja = null;
      }
      usuarioActual.pareja = null;
      emparejarUsuarios();
    }

    if(data.type==="signal" && usuarioActual && usuarioActual.pareja){
      usuarioActual.pareja.ws.send(JSON.stringify({type:"signal", data:data.data}));
    }
  });

  ws.on('close', () => {
    usuarios = usuarios.filter(u => u!==usuarioActual);
    if(usuarioActual && usuarioActual.pareja) usuarioActual.pareja.pareja = null;
  });
});

// Función simple de emparejamiento por idioma y gustos
function emparejarUsuarios(){

  for(let i=0;i<usuarios.length;i++){
    let u = usuarios[i];
    if(u.pareja) continue;

    let mejorMatch = null;
    let mejorScore = -1;

    for(let j=i+1;j<usuarios.length;j++){
      let v = usuarios[j];
      if(v.pareja) continue;

      // 👇 mantener verificación básica
      if(!u.genero || !v.genero) continue;

      // 🎯 calcular coincidencias
      let score = 0;

      if(u.pelicula === v.pelicula) score++;
      if(u.deporte === v.deporte) score++;
      if(u.color === v.color) score++;
      if(u.comida === v.comida) score++;
      if(u.club === v.club) score++;
      if(u.clima === v.clima) score++;

      // 👇 guardar el mejor match
      if(score > mejorScore){
        mejorScore = score;
        mejorMatch = v;
      }
    }

    // ✅ PRIORIDAD: gustos similares
    if(mejorMatch && mejorScore >= 2){
      conectarUsuarios(u, mejorMatch);
    }

    // ⚠️ SI NO HAY MATCH → conectar con cualquiera
    else{
      for(let j=i+1;j<usuarios.length;j++){
        let v = usuarios[j];
        if(!v.pareja && v !== u){
          conectarUsuarios(u, v);
          break;
        }
      }
    }
  }
}

function conectarUsuarios(u, v){
  u.pareja = v;
  v.pareja = u;

  u.ws.send(JSON.stringify({
    type:"message",
    data:{texto:"¡Conectado con alguien!", usuario:"Sistema"}
  }));

  v.ws.send(JSON.stringify({
    type:"message",
    data:{texto:"¡Conectado con alguien!", usuario:"Sistema"}
  }));

  u.ws.send(JSON.stringify({
    type:"infoPareja",
    data: v
  }));

  v.ws.send(JSON.stringify({
    type:"infoPareja",
    data: u
  }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
