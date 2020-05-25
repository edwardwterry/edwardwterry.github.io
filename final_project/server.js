const express = require('express');
const osc = require('osc');
const WebSocket = require('ws');
const WEB_SERVER_PORT = process.env.PORT || 3000;

// Create an express web server
const app = express();
const server = app.listen(WEB_SERVER_PORT, () => {
  console.log('Web server listening on port', WEB_SERVER_PORT);
});

// expose the local public folder for inluding files js, css etc..
app.use(express.static('public'));

// Create a WebSocket server
const wss = new WebSocket.Server({ server: server });

// Wait for a WebSocket connection
wss.on('connection', (socket, request) => {
  // Create an OSC port over the WebSocket
  const webSocketPort = new osc.WebSocketPort({ socket: socket });

  // When messages arrive, print them to the console and send them over the network
  webSocketPort.on('message', (msg) => {
    console.log('Web to network:', msg);
  });

  // Handle errors
  webSocketPort.on('error', (error) => {
    console.error(error);
  });

  webSocketPort.on('close', () => {
    console.log(request.socket.remoteAddress, 'disconnected');
  });

  // Store the OSC port in the socket object so we can retrieve it later
  socket.oscPort = webSocketPort;

  // Open the OSC port
  webSocketPort.open();
  console.log(request.socket.remoteAddress, 'connected');
})