import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { segmentBySlug } from "@/content/segments";
import { getPlanBySlug } from "@/lib/subscriptions";

const segment = segmentBySlug("communes")!;

export const metadata: Metadata = {
  title: "Blonay PDF pour les communes",
  description: segment.lede,
};

export default async function Page() {
  if (!segment) notFound();
  const plan = (await getPlanBySlug(segment.recommendedPlan)) ?? null;
  return <SegmentPage segment={segment} plan={plan} />;
}
