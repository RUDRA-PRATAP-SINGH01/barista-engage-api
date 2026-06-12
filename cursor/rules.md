# Barista OS Development Rules

## Project Goal

Build an AI-native customer engagement platform for Barista Coffee.

The platform helps marketers:

* Discover customer segments
* Create personalized campaigns
* Send communications
* Analyze campaign performance

## Core Principle

This is NOT a generic CRM.

This is NOT a sales CRM.

This is a customer engagement and marketing platform.

Every feature must support:

1. Audience discovery
2. Campaign creation
3. Campaign delivery
4. Campaign analytics

## AI-Native Requirement

AI must help marketers make decisions.

AI is not a chatbot bolted onto the dashboard.

Every AI feature should answer:

* Who should we target?
* What should we say?
* What offer should we give?
* How did the campaign perform?
* What should we do next?

## Development Rules

* Prefer simplicity over abstraction.
* Avoid premature optimization.
* Avoid microservices.
* Avoid unnecessary design patterns.
* Avoid generic CRUD dashboards.

## Data Rules

Never hardcode analytics.

All analytics should be derived from customer, order, campaign, and communication data.

Derived metrics should live in analytics tables, not source tables.

## UI Rules

The UI should feel like a modern SaaS product.

Think:

* HubSpot
* Customer.io
* Mailchimp
* Linear

Not:

* Crypto exchanges
* Trading platforms
* Consumer websites

Coffee branding should be subtle.

## Code Quality

* Strict TypeScript
* Zod validation on all external inputs
* Clear service layer
* Repository pattern only where useful
* Small focused files

## Assignment Constraints

Build only what is required.

Do not introduce:

* Multi-tenancy
* RBAC
* A/B testing
* Journey builders
* Real messaging providers
* Complex event infrastructure

Focus on delivering a polished working product.
