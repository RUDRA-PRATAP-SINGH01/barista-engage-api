import { randomUUID } from "node:crypto";
import type { Channel, LoyaltyTier } from "../../../generated/prisma/client";
import type { PersonaConfig, PersonaId } from "./reference";
import { FIRST_NAMES, LAST_NAMES, NOW_MS, STORE_CITIES } from "./reference";
import { pick, rand, randInt, weighted } from "./rng";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SeededCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  birthday: Date;
  joinedAt: Date;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  declaredPreferredChannel: Channel;
  marketingOptIn: boolean;
  persona: PersonaConfig;
  personaId: PersonaId;
  homeStoreCity: string;
};

export function generateCustomers(count: number, personas: PersonaConfig[]): SeededCustomer[] {
  const personaPool = personas.flatMap((p) =>
    Array.from({ length: Math.round((p.weight / 100) * count) }, () => p),
  );

  while (personaPool.length < count) {
    personaPool.push(pick(personas));
  }
  while (personaPool.length > count) {
    personaPool.pop();
  }

  return Array.from({ length: count }, (_, i) => {
    const persona = personaPool[i]!;
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const city = pick(STORE_CITIES);
    const joinedMonthsAgo =
      persona.id === "new" ? randInt(1, 4) : persona.id === "lost" ? randInt(12, 30) : randInt(4, 30);
    const joinedAt = new Date(NOW_MS - joinedMonthsAgo * 30 * 24 * 60 * 60 * 1000 - randInt(0, 20) * MS_PER_DAY);

    return {
      id: randomUUID(),
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@barista.in`,
      phone: `+91${randInt(70000, 99999)}${randInt(10000, 99999)}`,
      city,
      birthday: new Date(Date.UTC(randInt(1970, 2002), randInt(0, 11), randInt(1, 28))),
      joinedAt,
      loyaltyTier: weighted(persona.loyaltyWeights),
      loyaltyPoints: randInt(50, persona.id === "champion" ? 8000 : 3000),
      declaredPreferredChannel: persona.preferredChannel,
      marketingOptIn: rand() < 0.92,
      persona,
      personaId: persona.id,
      homeStoreCity: city,
    };
  });
}
