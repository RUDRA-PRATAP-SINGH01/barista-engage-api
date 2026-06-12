// campaign engine - creates campaigns and materializes one communication per matched customer
// delivery simulation comes later, here everything stays PENDING / DRAFT
import { prisma } from "../lib/prisma";
import { buildWhereClause } from "./segment.service";
import { segmentFiltersSchema, type SegmentFilters } from "../validators/segment.validator";
import type { CreateCampaignInput } from "../validators/campaign.validator";

// createMany chunk size, keeps single statements sane at 50k customers
const CHUNK_SIZE = 5000;

export type CreateCampaignResult =
  | { ok: true; campaign: { campaignId: string; name: string; targetAudienceSize: number; communicationsCreated: number; status: string } }
  | { ok: false; error: "SEGMENT_NOT_FOUND" }
  | { ok: false; error: "INVALID_SEGMENT_RULES" };

export async function createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
  const segment = await prisma.segment.findUnique({ where: { id: input.segmentId } });
  if (!segment) return { ok: false, error: "SEGMENT_NOT_FOUND" };

  // stored rules were validated at creation, but re-check so a bad row can't break a launch
  const rules = segmentFiltersSchema.safeParse(segment.rules);
  if (!rules.success) return { ok: false, error: "INVALID_SEGMENT_RULES" };

  // resolve the audience once, this is the snapshot moment
  const customers = await prisma.customer.findMany({
    where: buildWhereClause(rules.data as SegmentFilters),
    select: { id: true },
  });

  // campaign + all communications succeed or fail together
  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        segmentId: segment.id,
        channel: input.channel,
        subject: input.subject ?? null,
        body: input.body,
        imageUrl: input.imageUrl ?? null,
        targetAudienceSize: customers.length,
        // status defaults to DRAFT in the schema
      },
    });

    // one communication per customer, content is copied for now -
    // when AI personalization lands, this is where per-customer rendering happens
    for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
      await tx.communication.createMany({
        data: customers.slice(i, i + CHUNK_SIZE).map((c) => ({
          campaignId: created.id,
          customerId: c.id,
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          imageUrl: input.imageUrl ?? null,
          // status defaults to PENDING in the schema
        })),
      });
    }

    return created;
  });

  return {
    ok: true,
    campaign: {
      campaignId: campaign.id,
      name: campaign.name,
      targetAudienceSize: customers.length,
      communicationsCreated: customers.length,
      status: campaign.status,
    },
  };
}

export async function listCampaigns() {
  return prisma.campaign.findMany({
    select: {
      id: true,
      name: true,
      channel: true,
      status: true,
      targetAudienceSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(id: string) {
  return prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      channel: true,
      status: true,
      targetAudienceSize: true,
      subject: true,
      body: true,
      imageUrl: true,
      segment: { select: { id: true, name: true } },
      scheduledAt: true,
      sentAt: true,
      createdAt: true,
    },
  });
}

export async function getCampaignCommunications(
  campaignId: string,
  pagination: { limit: number; offset: number },
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });
  if (!campaign) return null;

  const [total, records] = await Promise.all([
    prisma.communication.count({ where: { campaignId } }),
    prisma.communication.findMany({
      where: { campaignId },
      take: pagination.limit,
      skip: pagination.offset,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        customerId: true,
        status: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    total,
    limit: pagination.limit,
    offset: pagination.offset,
    communications: records.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
