import { randomUUID } from "node:crypto";
import type { ProductDef } from "./reference";
import {
  BASKET_PAIRS,
  COLD_DRINKS,
  MONTHLY_DEMAND,
  NOW_MS,
  MS_PER_DAY,
  type PersonaConfig,
} from "./reference";
import type { SeededCustomer } from "./customers";
import { pick, rand, randInt, weighted } from "./rng";

export type StoreRecord = {
  id: string;
  name: string;
  city: string;
  address: string;
  popularity: number;
};

export type OrderRecord = {
  id: string;
  customerId: string;
  storeId: string;
  orderedAt: Date;
  totalAmount: number;
};

export type OrderItemRecord = {
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
};

function productWeight(product: ProductDef, persona: PersonaConfig, month: number): number {
  let w = product.popularity * (persona.productBias[product.name] ?? 1);

  if (COLD_DRINKS.includes(product.name) && month >= 3 && month <= 5) w *= 2.2;
  if (product.category === "Tea" && (month === 6 || month === 7)) w *= 1.6;
  if (product.category === "Food") w *= persona.foodAffinity > 0.5 ? 1.4 : persona.foodAffinity;

  return w;
}

function pickProduct(
  products: (ProductDef & { id: string })[],
  persona: PersonaConfig,
  month: number,
): ProductDef & { id: string } {
  const entries = products.map(
    (p) => [p, productWeight(p, persona, month)] as const,
  );
  return weighted(entries);
}

function generateOrderTimestamps(
  customer: SeededCustomer,
  orderCount: number,
): Date[] {
  const persona = customer.persona;
  const [inactivityMin, inactivityMax] = persona.daysSinceLastOrder;
  const lastOrderMs =
    NOW_MS - randInt(inactivityMin, inactivityMax) * MS_PER_DAY - randInt(0, 12) * 60 * 60 * 1000;
  const startMs = customer.joinedAt.getTime();
  const windowMs = lastOrderMs - startMs;

  const timestamps: number[] = [];

  for (let i = 0; i < orderCount; i++) {
    if (orderCount === 1) {
      timestamps.push(lastOrderMs);
      continue;
    }

    // monotonic: each order is later than the previous, last order = recency pin
    const progress = i / (orderCount - 1);
    let position: number;
    if (persona.id === "lost" || persona.id === "at_risk") {
      position = Math.pow(progress, 0.7);
    } else if (persona.id === "champion" || persona.id === "loyal") {
      position = 0.2 + progress * 0.8;
    } else {
      position = Math.pow(progress, 0.85);
    }

    const ts = startMs + Math.floor(position * windowMs);
    timestamps.push(Math.min(ts, lastOrderMs - (orderCount - 1 - i) * 60 * 60 * 1000));
  }

  // enforce last order is exactly the recency anchor
  timestamps[orderCount - 1] = lastOrderMs;

  return timestamps.map((ts) => {
    const date = new Date(ts);
    const month = date.getUTCMonth();

    const day = date.getUTCDay();
    if (day === 0 || day === 6) {
      date.setUTCHours(randInt(10, 20));
    } else if (persona.id === "tea_loyalist") {
      date.setUTCHours(randInt(6, 10));
    } else {
      date.setUTCHours(randInt(8, 21));
    }

    const isLastOrder = ts === lastOrderMs;
    if (!isLastOrder && (MONTHLY_DEMAND[month] ?? 1) > 1.1 && rand() < 0.25) {
      const festivalMonth = weighted([[9, 1], [10, 1.5], [11, 1.2]] as const);
      const festivalDate = new Date(date);
      festivalDate.setUTCMonth(festivalMonth);
      festivalDate.setUTCDate(randInt(1, 28));
      if (festivalDate.getTime() < lastOrderMs) return festivalDate;
    }

    return date;
  });
}

function buildBasket(
  products: (ProductDef & { id: string })[],
  persona: PersonaConfig,
  month: number,
): { productId: string; quantity: number; unitPrice: number }[] {
  const items: { productId: string; quantity: number; unitPrice: number }[] = [];

  // realistic pair basket 40% of the time
  if (rand() < 0.4) {
    const pair = pick(BASKET_PAIRS);
    for (const name of pair) {
      const product = products.find((p) => p.name === name);
      if (product) {
        items.push({ productId: product.id, quantity: 1, unitPrice: product.price });
      }
    }
    if (items.length >= 2) return items;
    items.length = 0;
  }

  const drinkCount =
    persona.id === "big_spender" ? randInt(1, 2) : rand() < 0.55 ? randInt(1, 2) : 1;
  for (let i = 0; i < drinkCount; i++) {
    const product = pickProduct(products, persona, month);
    items.push({ productId: product.id, quantity: 1, unitPrice: product.price });
  }

  if (rand() < persona.foodAffinity + 0.15) {
    const foodProducts = products.filter((p) => p.category === "Food");
    const food = weighted(foodProducts.map((p) => [p, p.popularity] as const));
    items.push({ productId: food.id, quantity: 1, unitPrice: food.price });
  }

  // add-on item for regulars
  if ((persona.id === "champion" || persona.id === "loyal") && rand() < 0.35) {
    const addon = pickProduct(products, persona, month);
    if (!items.some((it) => it.productId === addon.id)) {
      items.push({ productId: addon.id, quantity: 1, unitPrice: addon.price });
    }
  }

  // discount hunters sometimes add extra low-cost item
  if (persona.discountSensitivity > 0.7 && rand() < 0.35) {
    const cookie = products.find((p) => p.name === "Cookie");
    if (cookie) items.push({ productId: cookie.id, quantity: 1, unitPrice: cookie.price });
  }

  return items;
}

export function generateOrdersForCustomers(
  customers: SeededCustomer[],
  stores: StoreRecord[],
  products: (ProductDef & { id: string })[],
): { orders: OrderRecord[]; orderItems: OrderItemRecord[] } {
  const storesByCity = new Map<string, StoreRecord[]>();
  for (const store of stores) {
    const list = storesByCity.get(store.city) ?? [];
    list.push(store);
    storesByCity.set(store.city, list);
  }

  const orders: OrderRecord[] = [];
  const orderItems: OrderItemRecord[] = [];

  for (const customer of customers) {
    const orderCount = randInt(customer.persona.orderRange[0], customer.persona.orderRange[1]);
    const cityStores = storesByCity.get(customer.city) ?? stores;
    const homeStores = cityStores.length > 0 ? cityStores : stores;

    const timestamps = generateOrderTimestamps(customer, orderCount);

    for (let i = 0; i < orderCount; i++) {
      const store = weighted(homeStores.map((s) => [s, s.popularity] as const));
      const orderedAt = timestamps[i]!;
      const month = orderedAt.getUTCMonth();

      const basket = buildBasket(products, customer.persona, month);
      let total = basket.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      // discount sensitivity reduces ticket when hunting deals
      if (customer.persona.discountSensitivity > 0.6 && rand() < customer.persona.discountSensitivity) {
        total = Math.round(total * (0.75 + rand() * 0.15));
      } else {
        total = Math.round(total * customer.persona.aovMultiplier);
      }

      const orderId = randomUUID();
      orders.push({
        id: orderId,
        customerId: customer.id,
        storeId: store.id,
        orderedAt,
        totalAmount: total,
      });

      for (const item of basket) {
        orderItems.push({ orderId, ...item });
      }
    }
  }

  return { orders, orderItems };
}
