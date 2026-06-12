# Architecture

## Repositories

Frontend:

* barista-os-web

Backend:

* barista-os-api

## Services

CRM Service
Channel Simulation Service

## Core Entities

Customer
Order
OrderItem
Product
Store
Segment
Campaign
Communication
CustomerAnalytics
CustomerInsight

## Campaign Flow

Audience
→ Campaign
→ Channel Service
→ Callback
→ Communication Update
→ Analytics

## AI Features

1. Audience Builder
2. Opportunity Discovery
3. Campaign Strategy Generator
4. Message Generator
5. Creative Generator
6. Campaign Analyst

## Technology

Frontend:

* Next.js
* TypeScript
* Tailwind
* shadcn/ui

Backend:

* Hono
* Prisma
* PostgreSQL

AI:

* Gemini 2.5 Flash
* Image Generation API

## Scale Target

50,000 customers
250,000+ orders

Design for correctness and clarity.

Do not optimize for millions of users.
