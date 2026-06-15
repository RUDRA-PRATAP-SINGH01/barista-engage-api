import { prisma } from "../../lib/prisma";
import { buildWhereClause } from "../../services/segment.service";
import type { SegmentFilters } from "../../validators/segment.validator";
import { DAY_NAMES, formatHour } from "./constants/offer-catalog";
import type { DayScores, TimingIntelligenceResult } from "./types/campaign-intelligence.types";

const DAY_SCORE_KEYS: (keyof DayScores)[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const DEFAULT_DAY_SCORES: DayScores = {
  Mon: 62,
  Tue: 91,
  Wed: 73,
  Thu: 68,
  Fri: 70,
  Sat: 55,
  Sun: 48,
};

const DEFAULT_TIMING: TimingIntelligenceResult = {
  bestDay: "Tuesday",
  bestHour: "10:00",
  reasoning:
    "Insufficient order and engagement timestamps in this segment; using benchmark Tuesday 10 AM send window.",
  dayScores: DEFAULT_DAY_SCORES,
  dataPoints: 0,
};

function increment(map: Map<number, number>, key: number, weight = 1) {
  map.set(key, (map.get(key) ?? 0) + weight);
}

function normalizeDayScores(raw: Map<number, number>): DayScores {
  const max = Math.max(...DAY_SCORE_KEYS.map((_, index) => raw.get(index) ?? 0), 1);

  return {
    Sun: Math.round(((raw.get(0) ?? 0) / max) * 100),
    Mon: Math.round(((raw.get(1) ?? 0) / max) * 100),
    Tue: Math.round(((raw.get(2) ?? 0) / max) * 100),
    Wed: Math.round(((raw.get(3) ?? 0) / max) * 100),
    Thu: Math.round(((raw.get(4) ?? 0) / max) * 100),
    Fri: Math.round(((raw.get(5) ?? 0) / max) * 100),
    Sat: Math.round(((raw.get(6) ?? 0) / max) * 100),
  };
}

export class TimingIntelligenceService {
  async recommend(rules: SegmentFilters): Promise<TimingIntelligenceResult> {
    const where = buildWhereClause(rules);

    const [orders, communications] = await Promise.all([
      prisma.order.findMany({
        where: { customer: where },
        select: { orderedAt: true },
      }),
      prisma.communication.findMany({
        where: {
          customer: where,
          OR: [{ openedAt: { not: null } }, { clickedAt: { not: null } }],
        },
        select: { openedAt: true, clickedAt: true },
      }),
    ]);

    const dayScoresRaw = new Map<number, number>();
    const hourScores = new Map<number, number>();

    for (const order of orders) {
      const date = order.orderedAt;
      increment(dayScoresRaw, date.getUTCDay(), 1);
      increment(hourScores, date.getUTCHours(), 1);
    }

    for (const comm of communications) {
      const timestamps = [comm.openedAt, comm.clickedAt].filter(
        (value): value is Date => value !== null,
      );
      for (const date of timestamps) {
        increment(dayScoresRaw, date.getUTCDay(), comm.clickedAt ? 2 : 1);
        increment(hourScores, date.getUTCHours(), comm.clickedAt ? 2 : 1);
      }
    }

    const dataPoints = orders.length + communications.length;
    if (dataPoints < 10) {
      return { ...DEFAULT_TIMING, dataPoints };
    }

    const bestDayIndex = [...dayScoresRaw.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;
    const bestHour = [...hourScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
    const bestDay = DAY_NAMES[bestDayIndex] ?? "Tuesday";
    const bestHourLabel = formatHour(bestHour);
    const dayScores = normalizeDayScores(dayScoresRaw);
    const orderShare = orders.length / dataPoints;

    const reasoning = [
      `Analysed ${orders.length.toLocaleString("en-IN")} orders (${Math.round(orderShare * 100)}% of signals) and ${communications.length.toLocaleString("en-IN")} engagement events.`,
      `${bestDay} scores highest (${dayScores[DAY_SCORE_KEYS[bestDayIndex]!]}%) for combined purchase and engagement activity.`,
      `${bestHourLabel} is the peak hour based on order timestamps and campaign interactions.`,
    ].join(" ");

    return {
      bestDay,
      bestHour: bestHourLabel,
      reasoning,
      dayScores,
      dataPoints,
    };
  }
}
