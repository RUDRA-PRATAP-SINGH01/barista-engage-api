# Data Model

Customer

* Identity
* Loyalty
* Preferences

Order

* Purchase history

OrderItem

* Product-level details

Product

* Coffee products

Store

* Physical locations

Campaign

* Marketing campaign

Communication

* Delivery lifecycle

CustomerAnalytics

* RFM
* Churn Risk
* Favorite Drink
* Lifetime Spend
* Engagement Metrics

CustomerInsight

* Persona
* Marketing Summary

Important:

Favorite Drink is derived.

Lifetime Spend is derived.

Days Since Last Order is derived.

Do not duplicate derived metrics in source tables.

All customer intelligence should come from analytics tables.
