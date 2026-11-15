import type { Availability } from "@/lib/clusters";

const LABEL: Record<Availability, string> = { available: "Available", busy: "Busy on a task", offline: "Offline" };
const DOT: Record<Availability, string> = { available: "bg-emerald-500", busy: "bg-amber-400", offline: "bg-zk-muted opacity-40" };

/** A member's availability as a coloured dot, like a chat app's presence (#agent-clusters). */
export function AvailabilityDot({ availability }: { availability: Availability }) {
  return <span role="img" aria-label={LABEL[availability]} title={LABEL[availability]} className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[availability]}`} />;
}
