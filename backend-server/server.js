// server.js
const { WebSocketServer } = require('ws');

// Creamos el servidor en el puerto 8080
const wss = new WebSocketServer({ port: 8080 });
console.log("🚀 Servidor GPS Local corriendo en el puerto 8080");

// Guardamos la última ubicación conocida en la memoria de la laptop
let ultimaUbicacion = null;

wss.on('connection', (ws) => {
  console.log("📱 Dispositivo conectado al servidor local");

  // Si ya hay una ubicación guardada, se la enviamos de inmediato al nuevo monitor
  if (ultimaUbicacion) {
    ws.send(JSON.stringify(ultimaUbicacion));
  }

  ws.on('message', (message) => {
    try {
      const datos = JSON.parse(message);
      
      if (datos.tipo === 'EMITIR_GPS') {
        ultimaUbicacion = datos.coordenadas;
        console.log(`🛰️ Ubicación recibida del carro -> Lat: ${ultimaUbicacion.latitude}, Lng: ${ultimaUbicacion.longitude}`);

        // Reenviar la ubicación a todos los demás dispositivos conectados (Monitores)
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(ultimaUbicacion));
          }
        });
      }
    } catch (e) {
      console.error("Error al procesar mensaje:", e);
    }
  });

  ws.on('close', () => console.log("❌ Dispositivo desconectado"));
});
