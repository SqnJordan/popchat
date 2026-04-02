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

    for(let j=i+1;j<usuarios.length;j++){
      let v = usuarios[j];
      if(v.pareja) continue;

      // Emparejar si idioma igual, sino aceptar cualquiera
      if(u.genero && v.genero){
        u.pareja = v;
        v.pareja = u;

        u.ws.send(JSON.stringify({type:"message", data:{texto:"¡Conectado con alguien!", usuario:"Sistema"}}));
        v.ws.send(JSON.stringify({type:"message", data:{texto:"¡Conectado con alguien!", usuario:"Sistema"}}));
        break;
      }
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
