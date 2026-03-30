
const socket = io();
let otraPersona = null;

socket.emit("buscar", {
  tipo: localStorage.getItem("tipo"),
  idioma: navigator.language
});

socket.on("match", id => {
  otraPersona = id;
  const estado = document.getElementById("estado");
  if(estado) estado.innerText = "Conectado";
});

function enviar(){
  let msg = document.getElementById("msg").value;

  socket.emit("mensaje", {
    id: otraPersona,
    texto: msg
  });

  document.getElementById("mensajes").innerHTML += "<p><b>Tú:</b> "+msg+"</p>";
  document.getElementById("msg").value = "";
}

socket.on("mensaje", texto => {
  document.getElementById("mensajes").innerHTML += "<p><b>Persona:</b> "+texto+"</p>";
});

function siguiente(){
  socket.emit("next", otraPersona);
  location.reload();
}
