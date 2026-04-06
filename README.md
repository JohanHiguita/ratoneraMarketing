# ratonera-api

REST API for contacts management + WhatsApp webhook receiver.

## Architecture - Two Separate Projects

```
┌────────────────────────┐          ┌─────────────────────────┐
│   ratonera-api         │          │  ratonera-marketing     │
│   (this project)       │          │  (sibling project)      │
│                        │          │                         │
│  - REST API            │ ◄─────── │  - Campaign scripts     │
│  - WhatsApp webhook    │   HTTP   │  - Twilio sender        │
│  - PostgreSQL          │          │                         │
│  - Prisma ORM          │          │  Calls API to get       │
│  - 3-layer arch        │          │  contact data           │
└────────────────────────┘          └─────────────────────────┘
```

## Project Structure

```
src/
├── presentation/
│   ├── routes/              # Express routers
│   ├── controllers/         # Handle req/res, call services
│   └── middleware/          # Auth, error handling
├── business/
│   └── services/            # Business logic (no HTTP, no DB)
├── data/
│   └── repositories/        # Prisma queries (abstracts ORM)
├── shared/
│   ├── errors/              # Custom error classes
│   ├── validators/          # Input validation helpers
│   └── utils/               # Shared utilities
└── config/
    └── prisma.js            # Prisma client singleton

prisma/
    └── schema.prisma        # Database schema

scripts/
├── seeds/                   # Data import scripts
└── migrations/              # Custom migrations

app.js                       # Express app setup
```

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- Each layer has one responsibility
- Controllers: HTTP only
- Services: Business logic only
- Repositories: Data access only

### Open/Closed Principle (OCP)
- Services are open for extension (new methods)
- Closed for modification (existing logic stable)

### Liskov Substitution Principle (LSP)
- Repository interface can be swapped (e.g., Prisma → TypeORM)
- Services don't depend on concrete repository implementation

### Interface Segregation Principle (ISP)
- Thin interfaces: each layer only exposes what's needed
- No "fat" controllers with mixed concerns

### Dependency Inversion Principle (DIP)
- High-level modules (services) don't depend on low-level modules (repositories)
- Both depend on abstractions (repository pattern)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
API_KEY=your-secret-api-key
VERIFY_TOKEN=meta-webhook-verify-token
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Run migrations (if needed)
```bash
npm run migrate:001
```

### 5. Start server
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## API Usage

### Authentication
All `/api/*` endpoints require Bearer token:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/contacts
```

### Endpoints

#### GET /api/contacts
List contacts with pagination
```bash
curl -H "Authorization: Bearer dev-secret-change-in-production" \
  "http://localhost:3001/api/contacts?limit=10&offset=0&attended=true"
```

#### GET /api/contacts/:id
Get single contact
```bash
curl -H "Authorization: Bearer dev-secret-change-in-production" \
  http://localhost:3001/api/contacts/UUID-HERE
```

#### POST /api/contacts
Create contact
```bash
curl -X POST \
  -H "Authorization: Bearer dev-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"phone_e164":"+573001234567","name":"Test","source":"manual"}' \
  http://localhost:3001/api/contacts
```

#### PATCH /api/contacts/:id
Update contact
```bash
curl -X PATCH \
  -H "Authorization: Bearer dev-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","attended":true}' \
  http://localhost:3001/api/contacts/UUID-HERE
```

#### DELETE /api/contacts/:id
Delete contact
```bash
curl -X DELETE \
  -H "Authorization: Bearer dev-secret-change-in-production" \
  http://localhost:3001/api/contacts/UUID-HERE
```

## Database

### Prisma Studio (GUI)
```bash
npm run prisma:studio
```

### Models
- `Contact` - Main contact entity
- `Show` - Comedy shows/events
- `ContactShow` - Many-to-many relation

## Development

### Code Organization Rules
1. **Controllers** must NEVER import from repositories
2. **Services** must NEVER import express types (Request, Response)
3. **Repositories** must NEVER contain business logic
4. Each layer only imports from the layer immediately below

### Error Handling
- Use `AppError` classes (ValidationError, NotFoundError, etc.)
- All errors caught by global error middleware
- HTTP status codes set at controller/middleware level

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:studio` - Open Prisma Studio GUI

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `API_KEY` | Bearer token for API auth | Yes |
| `VERIFY_TOKEN` | Meta webhook verification | Yes |
| `META_APP_SECRET` | Meta app secret | Yes |
| `PORT` | Server port | No (default: 3000) |

## Related Projects

- **ratonera-marketing**: Campaign sender (sibling directory) - uses this API to fetch contacts

## License

ISC
