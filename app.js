require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { requireApiKey } = require('./src/presentation/middleware/auth');
const { errorHandler } = require('./src/presentation/middleware/errorHandler');
const contactRoutes = require('./src/presentation/routes/contactRoutes');
const swaggerDocument = require('./src/presentation/docs/swagger');

const app = express();

// Middleware
app.use(express.json());

const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

/**
 * Health check endpoint - no auth required.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * OpenAPI docs - public Swagger UI and raw JSON spec.
 */
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
}));

app.get('/docs.json', (_req, res) => {
  res.json(swaggerDocument);
});

/**
 * REST API - protected with Bearer token authentication.
 * 
 * Architecture: 3-layer pattern
 * - Presentation: routes + controllers (HTTP concerns)
 * - Business: services (business logic)
 * - Data: repositories (database access via Prisma)
 */
app.use('/api/contacts', requireApiKey, contactRoutes);

/**
 * Meta WhatsApp webhook verification endpoint.
 * Handles subscription verification via challenge/response.
 */
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const token = req.query['hub.verify_token'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).end();
});

/**
 * Meta WhatsApp webhook event receiver.
 * Receives and logs incoming webhook payloads.
 */
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`Webhook received at ${timestamp}`);
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).end();
});

/**
 * Global error handler - must be last middleware.
 * Catches all errors thrown in routes/controllers and formats response.
 */
app.use(errorHandler);

/**
 * Start HTTP server.
 */
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
