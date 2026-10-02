require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./src/routes/auth');
const projectRoutes = require('./src/routes/project');
const { registerSocketHandlers } = require('./src/sockets/registerSocketHandlers');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'conflictradar-backend',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
  });
});

app.use('/auth', authRoutes);
app.use('/project', projectRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
  },
});

registerSocketHandlers(io);

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[mongo] connected');
  } catch (err) {
    console.warn('[mongo] not connected');
    console.warn(`[mongo] reason: ${err.message}`);
  }
}

connectMongo();

server.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});