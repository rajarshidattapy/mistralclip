import { listAssets, getTimeline } from "@/lib/api";

export async function bootstrapProject(projectId: string) {
  const [assets, timeline] = await Promise.all([listAssets(), getTimeline(projectId)]);
  return { assets, timeline };
}

