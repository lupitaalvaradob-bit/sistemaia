// Punto de entrada serverless para Vercel.
// Vercel invoca este handler con (req, res) estilo Node http.
const app = require('../apps/api/src/app');

module.exports = app;
