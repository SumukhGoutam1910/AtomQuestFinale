import { FeedbackModel } from "@/models/Feedback";
import type { AgentKpi } from "@supportvision/types";

function round(n: number | null | undefined): number {
  return Math.round((n ?? 0) * 10) / 10;
}

/**
 * Aggregate KPI (average ratings + feedback count) per agent from stored
 * customer feedback. Pass agentIds to scope, or omit for everyone.
 */
export async function getKpisByAgent(agentIds?: string[]): Promise<Map<string, AgentKpi>> {
  const match = agentIds ? { agentId: { $in: agentIds } } : {};
  const rows = await FeedbackModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$agentId",
        agentName: { $last: "$agentName" },
        feedbackCount: { $sum: 1 },
        overall: { $avg: "$overall" },
        handling: { $avg: "$ratings.handling" },
        courteousness: { $avg: "$ratings.courteousness" },
        promptness: { $avg: "$ratings.promptness" },
      },
    },
  ]);

  const map = new Map<string, AgentKpi>();
  for (const r of rows as any[]) {
    map.set(r._id, {
      agentId: r._id,
      agentName: r.agentName,
      feedbackCount: r.feedbackCount,
      overall: round(r.overall),
      averages: {
        handling: round(r.handling),
        courteousness: round(r.courteousness),
        promptness: round(r.promptness),
      },
    });
  }
  return map;
}

export function emptyKpi(agentId: string, agentName: string): AgentKpi {
  return {
    agentId,
    agentName,
    feedbackCount: 0,
    overall: 0,
    averages: { handling: 0, courteousness: 0, promptness: 0 },
  };
}
