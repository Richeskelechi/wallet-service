# Wallet Service API

A NestJS-based API for wallet creation, deposits, withdrawals, and transfers.  
Uses MySQL (TypeORM) for persistence and Redis for caching.

---

## 📦 Prerequisites

Before starting, make sure you have:

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://dev.mysql.com/downloads/mysql/) v8+
- [Redis](https://redis.io/download)

---

## ⚙️ Environment Setup

Create a `.env` file in the project root with:

```env
PORT=3030

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=secret
DB_NAME=wallet_db

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## 🚀 Installation

Install dependencies:

```bash
npm install
```

---

## 🛠 Database Setup (Migrations)

We use TypeORM migrations to manage the database schema.

1. **Build the project before generating/running migrations**

```bash
npm run build
```

2. **Generate a migration**

```bash
npx typeorm -d dist/db/data-source.js migration:generate src/db/migrations/<MigrationName>
```

3. **Compile migrations to JavaScript**

```bash
npm run build
```

4. **Run migrations**

```bash
npx typeorm -d dist/db/data-source.js migration:run
```

5. **Revert the last migration**

```bash
npx typeorm -d dist/db/data-source.js migration:revert
```

**Note:** If you get `No migrations are pending`, ensure that:
- You generated the migration in `src/db/migrations`
- You ran `npm run build` before running migrations
- The `.js` migration files exist in `dist/db/migrations`

---

## ▶️ Running the Application

**Development mode (watch mode)**

```bash
npm run start:dev
```

**Production mode**

```bash
npm run build
npm run start:prod
```

---

## 📖 API Documentation (Swagger)

Once the app is running, access Swagger UI at:
```
http://localhost:3000/api
```
