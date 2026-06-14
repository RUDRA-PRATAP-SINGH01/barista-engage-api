import type { CommunicationStatus } from "../../../generated/prisma/client";
import type { SeededCustomer } from "./customers";
import { clamp, seededRoll } from "./rng";

export type CommunicationRecord = {
  campaignId: string;
  customerId: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  status: CommunicationStatus;
  subject: string | null;
  body: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
};

const MINUTE = 60 * 1000;

function simulateEngagement(
  campaignId: string,
  customer: SeededCustomer,
  channel: "EMAIL" | "SMS" | "WHATSAPP",
  sentAt: Date,
): Pick<
  CommunicationRecord,
  "status" | "deliveredAt" | "openedAt" | "clickedAt" | "failedAt"
> {
  const persona = customer.persona;
  const roll = seededRoll(`${campaignId}:${customer.id}`);

  const deliveryBase =
    channel === "WHATSAPP" ? 0.97 : channel === "SMS" ? 0.96 : 0.94;
  const openBase =
    (persona.openRateRange[0] + persona.openRateRange[1]) / 2;
  const clickBase =
    (persona.clickRateRange[0] + persona.clickRateRange[1]) / 2;

  // channel-persona alignment boost
  const channelBoost = customer.declaredPreferredChannel === channel ? 0.08 : 0;
  const openProb = clamp(openBase + channelBoost, 0.05, 0.95);
  const clickProb = clamp(clickBase + channelBoost * 0.5, 0.01, 0.4);

  const deliveryDelay = (1 + roll * 30) * MINUTE;

  if (roll > deliveryBase) {
    return {
      status: "FAILED",
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      failedAt: new Date(sentAt.getTime() + deliveryDelay),
    };
  }

  const deliveredAt = new Date(sentAt.getTime() + deliveryDelay);
  const openRoll = seededRoll(`${campaignId}:${customer.id}:open`);

  if (openRoll > openProb) {
    return {
      status: "DELIVERED",
      deliveredAt,
      openedAt: null,
      clickedAt: null,
      failedAt: null,
    };
  }

  const openDelayMin = 2 + Math.floor(Math.pow(openRoll, 2) * 180);
  const openedAt = new Date(deliveredAt.getTime() + openDelayMin * MINUTE);
  const clickRoll = seededRoll(`${campaignId}:${customer.id}:click`);

  if (clickRoll > clickProb) {
    return {
      status: "OPENED",
      deliveredAt,
      openedAt,
      clickedAt: null,
      failedAt: null,
    };
  }

  const clickDelayMin = 1 + clickRoll * 20;
  const clickedAt = new Date(openedAt.getTime() + clickDelayMin * MINUTE);

  return {
    status: "CLICKED",
    deliveredAt,
    openedAt,
    clickedAt,
    failedAt: null,
  };
}

export function generateCommunications(
  campaignId: string,
  channel: "EMAIL" | "SMS" | "WHATSAPP",
  subject: string | null,
  body: string,
  audience: SeededCustomer[],
  sentAt: Date,
  status: "COMPLETED" | "SENDING" | "SCHEDULED" | "DRAFT",
): CommunicationRecord[] {
  const createdAt = sentAt;

  if (status === "DRAFT") {
    return audience.map((customer) => ({
      campaignId,
      customerId: customer.id,
      channel,
      status: "PENDING",
      subject,
      body,
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      failedAt: null,
      createdAt,
    }));
  }

  if (status === "SCHEDULED") {
    return audience.map((customer) => ({
      campaignId,
      customerId: customer.id,
      channel,
      status: "PENDING",
      subject,
      body,
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      failedAt: null,
      createdAt,
    }));
  }

  return audience.map((customer) => {
    const outcome = simulateEngagement(campaignId, customer, channel, sentAt);
    return {
      campaignId,
      customerId: customer.id,
      channel,
      subject,
      body,
      sentAt,
      createdAt,
      ...outcome,
    };
  });
}
