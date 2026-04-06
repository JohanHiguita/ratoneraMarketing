const port = process.env.PORT || 3000;

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Ratonera Marketing API',
    version: '1.0.0',
    description: 'REST API and Meta WhatsApp webhook endpoints for Ratonera Marketing.',
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Application health endpoints' },
    { name: 'Contacts', description: 'Protected contact management API' },
    { name: 'Webhook', description: 'Meta WhatsApp webhook endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
        },
        required: ['status'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid or missing API key' },
        },
        required: ['error'],
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', nullable: true, example: 'Johan Higuita' },
          phoneE164: { type: 'string', example: '+573207718655' },
          source: { type: 'string', nullable: true, example: 'test' },
          attended: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          optedIn: { type: 'boolean', example: false },
          optInSource: { type: 'string', nullable: true, example: 'manual' },
          optInDate: { type: 'string', format: 'date-time', nullable: true },
          optOutReason: { type: 'string', nullable: true, example: 'user_no' },
          optOutDate: { type: 'string', format: 'date-time', nullable: true },
          lastMessageAt: { type: 'string', format: 'date-time', nullable: true },
          lastReplyAt: { type: 'string', format: 'date-time', nullable: true },
          lastDeliveryStatus: { type: 'string', nullable: true, example: 'delivered' },
          lastTemplateName: { type: 'string', nullable: true, example: 'welcome_template' },
          engagementScore: { type: 'integer', nullable: true, example: 80 },
          doNotContact: { type: 'boolean', example: false },
        },
        required: ['id', 'phoneE164', 'attended', 'createdAt', 'optedIn', 'doNotContact'],
      },
      ContactWithShows: {
        allOf: [
          { $ref: '#/components/schemas/Contact' },
          {
            type: 'object',
            properties: {
              contactShows: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    contactId: { type: 'string', format: 'uuid' },
                    showId: { type: 'integer', example: 2 },
                    show: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 2 },
                        slug: { type: 'string', example: '18sep25' },
                        showDate: { type: 'string', format: 'date-time' },
                        venue: { type: 'string', example: 'Mistico' },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      ContactListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Contact' },
          },
          pagination: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 6 },
              limit: { type: 'integer', example: 50 },
              offset: { type: 'integer', example: 0 },
              hasMore: { type: 'boolean', example: false },
            },
            required: ['total', 'limit', 'offset', 'hasMore'],
          },
        },
        required: ['data', 'pagination'],
      },
      CreateContactRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', nullable: true, example: 'Lina Esquivel' },
          phone_e164: { type: 'string', example: '+573145063312' },
          source: { type: 'string', nullable: true, example: 'test' },
          attended: { type: 'boolean', example: false },
        },
        required: ['phone_e164'],
      },
      UpdateContactRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', nullable: true, example: 'Lina Esquivel' },
          source: { type: 'string', nullable: true, example: 'manual' },
          attended: { type: 'boolean', example: true },
        },
      },
      WebhookPayload: {
        type: 'object',
        additionalProperties: true,
        example: {
          object: 'whatsapp_business_account',
          entry: [
            {
              changes: [
                {
                  field: 'messages',
                  value: {
                    messaging_product: 'whatsapp',
                  },
                },
              ],
            },
          ],
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Application is running',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/': {
      get: {
        tags: ['Webhook'],
        summary: 'Verify Meta webhook subscription',
        parameters: [
          {
            name: 'hub.mode',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'subscribe' },
          },
          {
            name: 'hub.challenge',
            in: 'query',
            required: true,
            schema: { type: 'string', example: '123456789' },
          },
          {
            name: 'hub.verify_token',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'your_verify_token' },
          },
        ],
        responses: {
          200: {
            description: 'Webhook verified',
            content: {
              'text/plain': {
                schema: { type: 'string', example: '123456789' },
              },
            },
          },
          403: {
            description: 'Invalid verification token',
          },
        },
      },
      post: {
        tags: ['Webhook'],
        summary: 'Receive Meta WhatsApp webhook events',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookPayload' },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook received successfully',
          },
        },
      },
    },
    '/api/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'List contacts',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'source',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'attended',
            in: 'query',
            schema: { type: 'boolean' },
          },
          {
            name: 'phone_e164',
            in: 'query',
            schema: { type: 'string', example: '+573207718655' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 200, example: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0, example: 0 },
          },
        ],
        responses: {
          200: {
            description: 'Paginated contact list',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactListResponse' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Contacts'],
        summary: 'Create contact',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateContactRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Created contact',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Contact' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Phone already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/contacts/{id}': {
      get: {
        tags: ['Contacts'],
        summary: 'Get contact by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Contact details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactWithShows' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contact not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Contacts'],
        summary: 'Update contact',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateContactRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated contact',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Contact' },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contact not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Contacts'],
        summary: 'Delete contact',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          204: {
            description: 'Contact deleted',
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Contact not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};
