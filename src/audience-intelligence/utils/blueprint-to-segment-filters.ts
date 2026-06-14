import type { SegmentFilters } from "../../validators/segment.validator";
import type { AudienceBlueprintFilter } from "../types/audience-blueprint.types";
import type { NumericBlueprintField } from "../types/audience-blueprint.types";

const numericFields = new Set<string>([
  "lifetimeSpend",
  "totalOrders",
  "daysSinceLastOrder",
]);

function toNumericFilter(
  operator: AudienceBlueprintFilter["operator"],
  value: number,
): number | Record<string, number> {
  if (operator === "equals") return value;
  return { [operator]: value };
}

export function blueprintFiltersToSegmentFilters(
  filters: AudienceBlueprintFilter[],
): SegmentFilters {
  const result: Record<string, unknown> = {};

  for (const filter of filters) {
    if (numericFields.has(filter.field)) {
      result[filter.field] = toNumericFilter(
        filter.operator,
        filter.value as number,
      );
      continue;
    }

    result[filter.field] = filter.value;
  }

  return result as SegmentFilters;
}

export function segmentFiltersToBlueprintFilters(
  filters: SegmentFilters,
): AudienceBlueprintFilter[] {
  const blueprintFilters: AudienceBlueprintFilter[] = [];

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined) continue;

    if (numericFields.has(field)) {
      if (typeof value === "number") {
        blueprintFilters.push({
          field: field as NumericBlueprintField,
          operator: "equals",
          value,
        });
        continue;
      }

      for (const [operator, num] of Object.entries(value)) {
        blueprintFilters.push({
          field: field as NumericBlueprintField,
          operator: operator as AudienceBlueprintFilter["operator"],
          value: num,
        });
      }
      continue;
    }

    blueprintFilters.push({
      field: field as AudienceBlueprintFilter["field"],
      operator: "equals",
      value: value as string,
    });
  }

  return blueprintFilters;
}
