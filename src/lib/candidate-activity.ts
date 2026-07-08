import type { MeetingLogEntry, SearchCandidate } from "./types";

const MEETING_TYPE_CODE: Record<string, string> = { Phone: "T", "Face-to-Face": "F", Video: "V" };

export function candidateActivityLabel(type: string, round: number) {
  if (type === "Offer" || type === "Placed") return type;
  return `${MEETING_TYPE_CODE[type] ?? type[0]}(${round})`;
}

export function nextCandidateRoundForType(candidate: SearchCandidate, type: string) {
  const last = [...(candidate.activityLog ?? [])].reverse().find((m) => m.type === type);
  return last ? last.round + 1 : 1;
}

export function isMeetingActivity(entry: MeetingLogEntry) {
  return entry.type !== "Offer" && entry.type !== "Placed";
}
