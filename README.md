# barista-engage-api

Backend for Barista OS - an AI-native customer engagement platform for Barista Coffee. This repo handles the data model, seed data and customer analytics. The API layer (Hono) comes on top of this.

## Stack

- Hono (API framework)
- Prisma 7 + PostgreSQL (Neon)
- TypeScript + Zod
- tsx for running scripts

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and add your Postgres connection string.

Then generate the prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

## Seeding

```bash
npm run db:seed
```

This creates the full dev dataset:

- 40 stores across 7 Indian cities
- 28 products (hot coffee, cold coffee, tea, food, desserts)
- 5000 customers
- 30000 orders with ~54k order items

The seed uses a seeded RNG so every run produces the exact same data.

## Analytics

```bash
npm run db:analytics
```

Builds the `CustomerAnalytics` table (one row per customer) from order history:

- spending metrics - lifetime spend, avg order value, total orders
- recency - last order date, days since last order
- favorite drink + favorite store
- RFM segments - Champion / Loyal Customer / Big Spender / At Risk / Lost Customer
- churn risk - LOW (ordered within 30 days), MEDIUM (31-60), HIGH (60+)

Safe to re-run anytime, it rebuilds the whole table.

To eyeball the numbers:

```bash
npm run db:sanity
```

## Project structure

```
prisma/
  schema.prisma       # the data model
  seed.ts             # dev seed script
  migrations/         # migration history
scripts/
  compute-analytics.ts  # builds CustomerAnalytics
  sanity-checks.ts      # quick queries to verify the data looks right
  verify-counts.ts      # row counts
  list-tables.ts        # lists db tables
cursor/               # project rules and architecture notes
```

## Data model rule

Source tables (Customer, Order, etc.) only store raw facts. Anything derived - favorite drink, lifetime spend, churn risk, RFM - lives in `CustomerAnalytics` / `CustomerInsight` and gets computed from order history. Derived metrics are never duplicated back into source tables.
