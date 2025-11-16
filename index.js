// index.js - Perbaiki WebSocket setup
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');

// CORS configuration untuk WebSocket
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Sesuaikan dengan port frontend
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/qr-table', express.static(path.join(__dirname, 'public/qr-table')));

// Gunakan route
for (const [path, route] of Object.entries(routes)) {
  app.use(path, route);
}

app.get('/', (req, res) => {
  res.send('API berjalan, sudah siap digunakan...');
});

const PORT = process.env.PORT || 5001;

// Buat HTTP server
const server = http.createServer(app);

// WebSocket configuration dengan options yang lebih lengkap
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  },
  transports: ['websocket', 'polling'], // Tambah polling sebagai fallback
  pingTimeout: 60000,
  pingInterval: 25000,
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Debug connection info
  console.log('🔧 Transport:', socket.conn.transport.name);

  // Admin join room
  socket.on('admin-join', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin joined room:', socket.id);

    // Konfirmasi ke client
    socket.emit('admin-joined', { message: 'Berhasil join admin room' });
  });

  // Customer join order room
  socket.on('customer-join-order', (orderId) => {
    const roomName = `order-${orderId}`;
    socket.join(roomName);
    console.log(`👤 Customer joined order room: ${roomName}`);

    // Konfirmasi ke client
    socket.emit('customer-joined', {
      message: `Berhasil join order room ${orderId}`,
      orderId: orderId,
    });
  });

  // Handle transport upgrade
  socket.conn.on('upgrade', (transport) => {
    console.log(`🔄 Transport upgraded to: ${transport.name}`);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// Export io untuk digunakan di controller lain
global.io = io;

// Health check untuk WebSocket
app.get('/websocket-health', (req, res) => {
  res.json({
    status: 'healthy',
    connectedClients: io.engine.clientsCount,
    websocketEnabled: true,
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket enabled for real-time updates`);
  console.log(
    `🌐 CORS enabled for: ${
      process.env.FRONTEND_URL || 'http://localhost:5173'
    }`
  );
});
