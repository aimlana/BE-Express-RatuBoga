const express = require('express');
const path = require('path')
const app = express();
const cors = require('cors');
require('dotenv').config();

const apiKeyMiddleware = require('./middlewares/apiKeyMiddleware')
const routes = require('./routes');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); 

// Gunakan route
for (const [path, route] of Object.entries(routes)) {
  app.use(path, route);
}

// Contoh root endpoint
app.get('/', (req, res) => {
  res.send('API berjalan, sudah siap digunakan...');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
