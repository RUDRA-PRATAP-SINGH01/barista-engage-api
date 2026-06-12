// delivery + engagement simulator
// not a random number generator - outcomes depend on customer analytics, channel and persona.
// fully deterministic: rng is seeded from campaignId + customerId, so re-running a
// simulation for the same campaign always produces identical results.
import { prisma } from "../lib/prisma";
import type { Channel, ChurnRisk } from "../../generated/prisma/client";

// ---------- seeded rng (fnv-1a hash -> mulberry32 stream) ----------

function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ---------- the engagement model ----------

const DELIVERY_BASE: Record<Channel, number> = { WHATSAPP: 0.98, EMAIL: 0.95, SMS: 0.97 };
const OPEN_BASE: Record<Channel, number> = { WHATSAPP: 0.75, EMAIL: 0.35, SMS: 0.55 };
const CLICK_BASE = 0.05;
const HIGH_SPEND_THRESHOLD = 5000;

interface CustomerSignals {
  rfmSegment: string | null;
  churnRisk: ChurnRisk | null;
  actualPreferredChannel: Channel | null;
  lifetimeSpend: number;
  persona: string | null;
}

function deliveryProbability(channel: Channel, s: CustomerSignals): number {
  let p = DELIVERY_BASE[channel];
  if (s.churnRisk === "HIGH") p -= 0.05;
  if (s.rfmSegment === "Lost Customer") p -= 0.05;
  if (s.rfmSegment === "Champion") p += 0.02;
  return clamp(p, 0.85, 0.995);
}

function openProbability(channel: Channel, s: CustomerSignals): number {
  let p = OPEN_BASE[channel];
  if (s.rfmSegment === "Champion") p += 0.15;
  if (s.rfmSegment === "Big Spender") p += 0.1;
  if (s.rfmSegment === "Loyal Customer") p += 0.05;
  if (s.rfmSegment === "At Risk") p -= 0.1;
  if (s.rfmSegment === "Lost Customer") p -= 0.25;
  if (s.actualPreferredChannel === channel) p += 0.1;
  if (s.lifetimeSpend >= HIGH_SPEND_THRESHOLD) p += 0.05;
  return clamp(p, 0.05, 0.95);
}

function clickProbability(channel: Channel, s: CustomerSignals): number {
  let p = CLICK_BASE;
  if (s.rfmSegment === "Champion") p += 0.1;
  if (s.rfmSegment === "Big Spender") p += 0.08;
  if (s.persona === "Deal Hunter") p += 0.2;
  if (s.persona === "Coffee Enthusiast") p += 0.1;
  if (s.rfmSegment === "Lost Customer") p -= 0.05;
  if (s.actualPreferredChannel === channel) p += 0.05;
  return clamp(p, 0.01, 0.6);
}

// ---------- timing ----------
// delivery lands in seconds, opens are heavily skewed towards the first hours
// but can stretch to 2 days, clicks happen within ~30 min of the open

const SECOND = 1000;
const MINUTE = 60 * SECOND;

interface SimOutcome {
  status: "FAILED" | "DELIVERED" | "OPENED" | "CLICKED";
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  failedAt: Date | null;
}

function simulateOne(
  seedKey: string,
  channel: Channel,
  sentAt: Date,
  signals: CustomerSignals,
): SimOutcome {
  const rng = mulberry32(fnv1a(seedKey));

  const deliveryDelayMs = Math.floor((1 + rng() * 29) * SECOND);
  if (rng() > deliveryProbability(channel, signals)) {
    return {
      status: "FAILED",
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      failedAt: new Date(sentAt.getTime() + deliveryDelayMs),
    };
  }
  const deliveredAt = new Date(sentAt.getTime() + deliveryDelayMs);

  if (rng() > openProbability(channel, signals)) {
    return { status: "DELIVERED", deliveredAt, openedAt: null, clickedAt: null, failedAt: null };
  }
  // cubing the roll skews opens towards "soon after delivery", tail reaches ~48h
  const openDelayMin = 1 + Math.floor(Math.pow(rng(), 3) * 2880);
  const openedAt = new Date(deliveredAt.getTime() + openDelayMin * MINUTE);

  if (rng() > clickProbability(channel, signals)) {
    return { status: "OPENED", deliveredAt, openedAt, clickedAt: null, failedAt: null };
  }
  const clickDelayMin = 1 + rng() * 29;
  const clickedAt = new Date(openedAt.getTime() + Math.floor(clickDelayMin * MINUTE));

  return { status: "CLICKED", deliveredAt, openedAt, clickedAt, failedAt: null };
}

// ---------- send ----------

export type SendResult =
  | { ok: true; campaignId: string; communicationsSent: number }
  | { ok: false; error: "NOT_FOUND" }
  | { ok: false; error: "NOT_DRAFT"; status: string };

export async function sendCampaign(campaignId: string): Promise<SendResult> {
  const now = new Date();

  // atomic claim - the update only matches if the campaign is still DRAFT,
  // so two concurrent sends can't both win (no check-then-act race)
  const sentCount = await prisma.$transaction(async (tx) => {
    const claimed = await tx.campaign.updateMany({
      where: { id: campaignId, status: "DRAFT" },
      data: { status: "SENDING", sentAt: now },
    });
    if (claimed.count === 0) return null;

    const updated = await tx.communication.updateMany({
      where: { campaignId, status: "PENDING" },
      data: { status: "SENT", sentAt: now },
    });
    return updated.count;
  });

  if (sentCount === null) {
    // claim failed - figure out whether it doesn't exist or was already sent
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (!campaign) return { ok: false, error: "NOT_FOUND" };
    return { ok: false, error: "NOT_DRAFT", status: campaign.status };
  }

  return { ok: true, campaignId, communicationsSent: sentCount };
}

// ---------- simulate ----------

export type SimulateResult =
  | {
      ok: true;
      campaignId: string;
      simulated: number;
      outcomes: { delivered: number; opened: number; clicked: number; failed: number };
    }
  | { ok: false; error: "NOT_FOUND" }
  | { ok: false; error: "NOT_SENDING"; status: string };

export async function simulateCampaign(campaignId: string): Promise<SimulateResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "NOT_FOUND" };
  if (campaign.status !== "SENDING") {
    return { ok: false, error: "NOT_SENDING", status: campaign.status };
  }

  const comms = await prisma.communication.findMany({
    where: { campaignId, status: "SENT" },
    select: {
      id: true,
      customerId: true,
      channel: true,
      sentAt: true,
      customer: {
        select: {
          analytics: {
            select: {
              rfmSegment: true,
              churnRisk: true,
              actualPreferredChannel: true,
              lifetimeSpend: true,
            },
          },
          insight: { select: { persona: true } },
        },
      },
    },
  });

  const counts = { delivered: 0, opened: 0, clicked: 0, failed: 0 };
  const results = comms.map((comm) => {
    const a = comm.customer.analytics;
    const outcome = simulateOne(
      // campaign id + customer id is the entropy, nothing else - this is what makes reruns reproducible
      `${campaignId}:${comm.customerId}`,
      comm.channel,
      comm.sentAt ?? new Date(),
      {
        rfmSegment: a?.rfmSegment ?? null,
        churnRisk: a?.churnRisk ?? null,
        actualPreferredChannel: a?.actualPreferredChannel ?? null,
        lifetimeSpend: a ? Number(a.lifetimeSpend) : 0,
        persona: comm.customer.insight?.persona ?? null,
      },
    );

    if (outcome.status === "FAILED") counts.failed++;
    else {
      counts.delivered++;
      if (outcome.openedAt) counts.opened++;
      if (outcome.clickedAt) counts.clicked++;
    }

    return { id: comm.id, ...outcome };
  });

  // one bulk update for all rows instead of N round trips - per-row prisma updates
  // blew the transaction timeout against neon, this is a single statement and
  // stays fast even at 50k communications
  const ids = results.map((r) => r.id);
  const statuses = results.map((r) => r.status);
  const deliveredAts = results.map((r) => r.deliveredAt);
  const openedAts = results.map((r) => r.openedAt);
  const clickedAts = results.map((r) => r.clickedAt);
  const failedAts = results.map((r) => r.failedAt);

  // bulk row update + campaign flip commit together, no partial simulations
  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Communication" AS c SET
        "status" = v."status"::"CommunicationStatus",
        "deliveredAt" = v."deliveredAt",
        "openedAt" = v."openedAt",
        "clickedAt" = v."clickedAt",
        "failedAt" = v."failedAt"
      FROM unnest(
        ${ids}::text[],
        ${statuses}::text[],
        ${deliveredAts}::timestamptz[],
        ${openedAts}::timestamptz[],
        ${clickedAts}::timestamptz[],
        ${failedAts}::timestamptz[]
      ) AS v("id", "status", "deliveredAt", "openedAt", "clickedAt", "failedAt")
      WHERE c."id" = v."id"
    `,
    prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED" } }),
  ]);

  return { ok: true, campaignId, simulated: comms.length, outcomes: counts };
}

// ---------- analytics ----------

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

export async function getCampaignAnalytics(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      channel: true,
      status: true,
      targetAudienceSize: true,
      segment: { select: { id: true, name: true } },
      sentAt: true,
    },
  });
  if (!campaign) return null;

  const comms = await prisma.communication.findMany({
    where: { campaignId },
    select: {
      status: true,
      customer: { select: { analytics: { select: { rfmSegment: true } } } },
    },
  });

  let sent = 0;
  let delivered = 0;
  let opened = 0;
  let clicked = 0;
  let failed = 0;
  const segmentBreakdown: Record<string, number> = {};

  for (const comm of comms) {
    if (comm.status !== "PENDING") sent++;
    if (comm.status === "FAILED") failed++;
    if (comm.status === "DELIVERED" || comm.status === "OPENED" || comm.status === "CLICKED")
      delivered++;
    if (comm.status === "OPENED" || comm.status === "CLICKED") opened++;
    if (comm.status === "CLICKED") clicked++;

    const segment = comm.customer.analytics?.rfmSegment ?? "Unknown";
    segmentBreakdown[segment] = (segmentBreakdown[segment] ?? 0) + 1;
  }

  return {
    campaignId: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    segment: campaign.segment,
    sentAt: campaign.sentAt,

    audienceSize: campaign.targetAudienceSize ?? comms.length,
    sent,
    delivered,
    failed,
    opened,
    clicked,

    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, delivered),
    clickRate: pct(clicked, delivered),
    clickToOpenRate: pct(clicked, opened),

    segmentBreakdown,
  };
}
