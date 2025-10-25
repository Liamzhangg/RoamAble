// Entry point for the Node.js backend.
// Set up Express/Fastify here and register routes/controllers.

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// TODO: register routes, e.g. app.use('/api/places', placesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

module.exports = app;
