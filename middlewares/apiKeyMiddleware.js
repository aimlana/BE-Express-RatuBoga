require('dotenv').config();

function apiKeyMiddleware(req, res, next) {
  const userKey = req.headers['x-api-key'];

  if (!userKey || userKey !== process.env.API_KEY) {
    return res.status(403).json({ message: 'Forbidden: Invalid API key' });
  }

  next();
}

module.exports = apiKeyMiddleware;
