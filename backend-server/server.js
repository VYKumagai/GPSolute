const WebSocket = require('ws');
const dgram = require('dgram');

const wss = new WebSocket.Server({ port: 8080 });
console.log('🚀 Servidor GPS Local corriendo en el puerto 8080');

// Servidor de autodescubrimiento DHCP en red local (puerto UDP 41234)
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
  if (msg.toString() === 'DISCOVER_GPSOLUTE') {
    const reply = Buffer.from('GPSOLUTE_HERE');
    udpServer.send(reply, rinfo.port, rinfo.address);
  }
});
udpServer.bind(41234);

wss.on('connection', (ws) => {
  console.log('Nuevo dispositivo conectado');

  ws.on('message', (message) => {
    const data = message.toString();
    console.log('Coordenadas recibidas:', data);

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on('close', () => {
    console.log('Dispositivo desconectado');
  });
});