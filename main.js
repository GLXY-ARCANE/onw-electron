const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile('control.html');
}

app.on('ready', () => {
  createWindow();

  // --- Express + WebSocket server ---
  const serverApp = express();
  const server = http.createServer(serverApp);
  const wss = new WebSocket.Server({ server });

  serverApp.use('/static', express.static(path.join(__dirname, 'static')));
  serverApp.get('/display', (req,res) => res.sendFile(path.join(__dirname,'display.html')));

  let currentCards = [];

  wss.on('connection', ws => {
    console.log('Client connected');
    ws.send(JSON.stringify({ type:'displayCards', data: currentCards }));

    ws.on('message', msg => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'updateCards') {
          currentCards = data.data;
          wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type:'displayCards', data: currentCards }));
            }
          });
        }
      } catch(e) {
        console.error('Invalid message', e);
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

  server.listen(3000, () => console.log('Server running on port 3000'));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
