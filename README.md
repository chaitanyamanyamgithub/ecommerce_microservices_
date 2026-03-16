# 🛒 eCommerce Microservices Backend

A **production-style microservices-based eCommerce backend** built with Node.js, Express, and MongoDB. Designed with clean architecture principles and ready for Docker, Kubernetes, and observability tools.

---

## 📐 Architecture Overview

```
┌─────────────┐  ┌─────────────────┐  ┌──────────────┐
│ User Service │  │ Product Service  │  │ Cart Service │
│   :3001      │  │    :3002         │  │   :3003      │
└──────┬───────┘  └────────┬────────┘  └──────┬───────┘
       │                   │                   │
       └───────────┬───────┴───────┬───────────┘
                   │               │
             ┌─────┴─────┐  ┌─────┴──────┐
             │   Order   │  │  Payment   │
             │  Service  │  │  Service   │
             │   :3004   │  │   :3005    │
             └─────┬─────┘  └─────┬──────┘
                   │               │
                   └───────┬───────┘
                           │
                    ┌──────┴──────┐
                    │   MongoDB   │
                    │   :27017    │
                    └─────────────┘
```

---

## 🗂 Project Structure

```
ecommerce-microservices/
│
├── services/
│   ├── user-service/          # Authentication & user management
│   │   ├── src/
│   │   │   ├── controllers/   # HTTP request handlers
│   │   │   ├── routes/        # Express route definitions
│   │   │   ├── models/        # Mongoose schemas
│   │   │   ├── services/      # Business logic layer
│   │   │   ├── middleware/    # Auth, validation middleware
│   │   │   ├── config/       # DB connection & env config
│   │   │   └── app.js        # Express app entry point
│   │   ├── package.json
│   │   ├── .env
│   │   └── Dockerfile
│   │
│   ├── product-service/       # Product catalog CRUD
│   ├── cart-service/          # Shopping cart management
│   ├── order-service/         # Order processing
│   └── payment-service/       # Payment processing
│
├── shared/
│   ├── logger/               # Winston logger factory
│   ├── utils/                # Response helpers, error classes
│   └── middleware/           # Error handler, request logger
│
├── docker-compose.yml        # Container orchestration
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **MongoDB** 6+ (local or Docker)
- **npm** 9+

### 1. Install Dependencies

Each microservice has its own `node_modules`. Install them individually:

```bash
# Install all services at once
cd services/user-service && npm install && cd ../..
cd services/product-service && npm install && cd ../..
cd services/cart-service && npm install && cd ../..
cd services/order-service && npm install && cd ../..
cd services/payment-service && npm install && cd ../..
```

### 2. Configure Environment

Each service has a `.env` file with sensible defaults. Update as needed:

| Service         | Port | Database                 |
|-----------------|------|--------------------------|
| user-service    | 3001 | ecommerce_users          |
| product-service | 3002 | ecommerce_products       |
| cart-service    | 3003 | ecommerce_carts          |
| order-service   | 3004 | ecommerce_orders         |
| payment-service | 3005 | ecommerce_payments       |

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name ecommerce-mongo mongo:7.0

# Or use your local MongoDB installation
mongod --dbpath /data/db
```

### 4. Run Services

```bash
# Development mode (with auto-reload)
cd services/user-service && npm run dev

# Production mode
cd services/user-service && npm start
```

### 5. Docker Compose (All Services)

```bash
# Start everything (MongoDB + all 5 services)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

### 6. Frontend Demo UI

The repo now includes a minimal React + Vite storefront in `ecommerce-ui/` for the live observability demo.

```bash
cd ecommerce-ui
npm install
npm run dev
```

URLs:

- `http://localhost:5173` - React storefront
- `http://localhost:8080` - API gateway

### 7. Observability URLs

After `docker-compose up -d`, open:

- `http://localhost:3000` - Grafana (`admin` / `admin`)
- `http://localhost:16686` - Jaeger
- `http://localhost:9090` - Prometheus

Grafana auto-provisions:

- Prometheus datasource
- Loki datasource
- `eCommerce Observability` as the default dashboard

### 8. Recommended Demo Flow

1. Open `http://localhost:5173`
2. Browse products with `GET /api/products`
3. Add an item to the cart with `POST /api/cart/add`
4. Place an order with `POST /api/orders`
5. Open Grafana for metrics and logs
6. Open Jaeger for the checkout trace

What this demonstrates:

- metrics -> Prometheus -> Grafana
- traces -> Jaeger
- logs -> Loki -> Grafana Explore

### 9. Demo-Friendly Defaults

- The product-service auto-seeds sample products when its database is empty
- The frontend uses a fixed demo user so the cart and order flow works immediately
- The normal checkout path is deterministic and succeeds consistently for live demos
- To trigger a failure on purpose, use the `crypto` payment method or an amount above `200000`

---

## 📡 API Reference

### User Service (`:3001`)

| Method | Endpoint        | Description              | Auth |
|--------|-----------------|--------------------------|------|
| POST   | `/api/signup`   | Register a new user      | ❌   |
| POST   | `/api/login`    | Login & get JWT token    | ❌   |
| GET    | `/api/users/:id`| Get user profile by ID   | ✅   |

<details>
<summary><b>📋 Request/Response Examples</b></summary>

**POST /api/signup**
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  }
}

// Response (201)
{
  "success": true,
  "message": "User registered successfully",
  "timestamp": "2024-07-15T10:30:00.000Z",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789012abcd",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "createdAt": "2024-07-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**POST /api/login**
```json
// Request
{
  "email": "john@example.com",
  "password": "securePassword123"
}

// Response (200)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```
</details>

---

### Product Service (`:3002`)

| Method | Endpoint            | Description                      | Auth |
|--------|---------------------|----------------------------------|------|
| GET    | `/api/products`     | List products (with filters)     | ❌   |
| GET    | `/api/products/:id` | Get single product               | ❌   |
| POST   | `/api/products`     | Create a product                 | ❌   |
| DELETE | `/api/products/:id` | Soft-delete a product            | ❌   |

**Query Parameters** for `GET /api/products`:
- `category` — Filter by category (electronics, clothing, books, etc.)
- `search` — Full-text search in name and description
- `minPrice` / `maxPrice` — Price range filter
- `page` / `limit` — Pagination (defaults: page=1, limit=10)
- `sort` — Sort field (e.g., `-price`, `createdAt`)

<details>
<summary><b>📋 Request/Response Examples</b></summary>

**POST /api/products**
```json
// Request
{
  "name": "Wireless Bluetooth Headphones",
  "description": "Premium noise-cancelling headphones with 30hr battery life",
  "price": 79.99,
  "category": "electronics",
  "brand": "AudioMax",
  "stock": 150,
  "images": [{ "url": "https://example.com/headphones.jpg", "alt": "Headphones" }],
  "tags": ["wireless", "bluetooth", "noise-cancelling"]
}

// Response (201)
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "64b2c3d4e5f6789012abce",
    "name": "Wireless Bluetooth Headphones",
    "price": 79.99,
    "category": "electronics",
    "stock": 150,
    "ratings": { "average": 0, "count": 0 },
    "isActive": true
  }
}
```
</details>

---

### Cart Service (`:3003`)

| Method | Endpoint            | Description                | Auth |
|--------|---------------------|----------------------------|------|
| POST   | `/api/cart/add`     | Add item to cart           | ❌   |
| GET    | `/api/cart/:userId` | Get user's cart            | ❌   |
| DELETE | `/api/cart/remove`  | Remove item from cart      | ❌   |

<details>
<summary><b>📋 Request/Response Examples</b></summary>

**POST /api/cart/add**
```json
// Request
{
  "userId": "64a1b2c3d4e5f6789012abcd",
  "productId": "64b2c3d4e5f6789012abce",
  "productName": "Wireless Headphones",
  "price": 79.99,
  "quantity": 2
}

// Response (200)
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "userId": "64a1b2c3d4e5f6789012abcd",
    "items": [
      { "productId": "...", "productName": "Wireless Headphones", "price": 79.99, "quantity": 2 }
    ],
    "totalAmount": 159.98
  }
}
```

**DELETE /api/cart/remove**
```json
// Request
{
  "userId": "64a1b2c3d4e5f6789012abcd",
  "productId": "64b2c3d4e5f6789012abce"
}
```
</details>

---

### Order Service (`:3004`)

| Method | Endpoint              | Description               | Auth |
|--------|-----------------------|---------------------------|------|
| POST   | `/api/orders`         | Place a new order         | ❌   |
| GET    | `/api/orders/:userId` | Get user's order history  | ❌   |

<details>
<summary><b>📋 Request/Response Examples</b></summary>

**POST /api/orders**
```json
// Request
{
  "userId": "64a1b2c3d4e5f6789012abcd",
  "items": [
    {
      "productId": "64b2c3d4e5f6789012abce",
      "productName": "Wireless Headphones",
      "price": 79.99,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "notes": "Please leave at the front door"
}

// Response (201)
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "...",
    "orderNumber": "ORD-20240715-A3B2C",
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 159.98,
    "items": [...]
  }
}
```
</details>

---

### Payment Service (`:3005`)

| Method | Endpoint                        | Description                    | Auth |
|--------|---------------------------------|--------------------------------|------|
| POST   | `/api/payment`                  | Process a payment              | ❌   |
| GET    | `/api/payment/status/:orderId`  | Get payment status for order   | ❌   |

<details>
<summary><b>📋 Request/Response Examples</b></summary>

**POST /api/payment**
```json
// Request
{
  "orderId": "64d4e5f6789012abcde01234",
  "userId": "64a1b2c3d4e5f6789012abcd",
  "amount": 159.98,
  "method": "credit_card"
}

// Response (200)
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "_id": "...",
    "orderId": "...",
    "amount": 159.98,
    "currency": "USD",
    "method": "credit_card",
    "status": "completed",
    "transactionId": "txn_a1b2c3d4-e5f6-7890-abcd-ef0123456789"
  }
}
```
</details>

---

### Health Check (All Services)

Every service exposes a `GET /health` endpoint:

```json
{
  "service": "user-service",
  "status": "healthy",
  "timestamp": "2024-07-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

---

## 🏗 Architecture Principles

### Clean Architecture Layers

Each microservice follows a 4-layer architecture:

```
Routes → Controllers → Services → Models
  │           │            │          │
  │     HTTP concerns  Business    Database
  │     (validation,    logic      schemas
  │      responses)   (pure logic)
  │
  API endpoint
  definitions
```

- **Routes**: Define API endpoints and map them to controllers
- **Controllers**: Handle HTTP request/response, validate input, delegate to services
- **Services**: Contain pure business logic, framework-agnostic, testable
- **Models**: Mongoose schemas with validation, hooks, and instance methods

### Shared Modules

The `shared/` directory contains code used across all services:

| Module       | Purpose                                          |
|-------------|--------------------------------------------------|
| `logger/`   | Winston logger factory with console + file output |
| `utils/`    | `asyncHandler`, `sendSuccess`, `sendError`, `AppError` |
| `middleware/`| Error handler, 404 handler, Morgan request logger |

---

## 🐳 Docker Support

### Build & Run

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs for specific service
docker-compose logs -f user-service

# Stop and remove containers
docker-compose down

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Container Ports

| Container               | Internal Port | External Port |
|------------------------|---------------|---------------|
| ecommerce-mongodb      | 27017         | 27017         |
| ecommerce-user-service | 3001          | 3001          |
| ecommerce-product-service | 3002       | 3002          |
| ecommerce-cart-service | 3003          | 3003          |
| ecommerce-order-service| 3004          | 3004          |
| ecommerce-payment-service | 3005       | 3005          |

---

## 🔮 Production Roadmap

This project is structured to support the following production enhancements:

- [ ] **API Gateway** — Kong or Express Gateway for routing, rate limiting
- [ ] **Service Discovery** — Consul or etcd for dynamic service registration
- [ ] **Message Queue** — RabbitMQ or Kafka for async inter-service communication
- [ ] **Kubernetes** — Helm charts and K8s manifests for container orchestration
- [ ] **OpenTelemetry** — Distributed tracing, metrics, and instrumentation
- [ ] **CI/CD** — GitHub Actions or GitLab CI for automated testing and deployment
- [ ] **Authentication** — Centralized auth service with OAuth2/OIDC
- [ ] **Caching** — Redis for session storage and response caching
- [ ] **Rate Limiting** — Express-rate-limit or API gateway-level throttling
- [ ] **Testing** — Jest + Supertest for unit and integration tests

---

## 📝 License

MIT
