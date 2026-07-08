"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SearchCandidate } from "@/lib/types";
import { candidateActivityLabel, isMeetingActivity, nextCandidateRoundForType } from "@/lib/candidate-activity";
import { INTERVIEW_TYPES, Theme, makeStyles, todayISO } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

export default function CandidateActivityPanel({
  candidate,
  t,
  S,
  onLog,
  onDelete,
  onUpdateDate,
}: {
  candidate: SearchCandidate;
  t: Theme;
  S: Styles;
  onLog: (type: string, round: number, date: string) => void;
  onDelete: (activityId: string) => void;
  onUpdateDate: (activityId: string, date: string) => void;
}) {
  const lastMeeting = [...(candidate.activityLog ?? [])].reverse().find((m) => isMeetingActivity(m));
  const [draftType, setDraftType] = useState(lastMeeting?.type || "Phone");
  const [draftRound, setDraftRound] = useState(() => nextCandidateRoundForType(candidate, draftType));
  const [draftDate, setDraftDate] = useState(todayISO());
  const canAdd = candidate.stage === "interview";
  const entries = candidate.activityLog ?? [];

  return (
    <div className="avid-cd-activity-log">
      <div className="avid-cd-activity-log-head">
        <h4 className="avid-cd-activity-log-title" style={{ color: t.mutedSoft }}>
          Activity log
        </h4>
      </div>
      {entries.length === 0 ? (
        <p className="avid-cd-activity-log-empty" style={{ color: t.mutedSoft }}>
          Nothing logged yet.
        </p>
      ) : (
        <ul className="avid-cd-activity-log-list">
          {entries.map((m) => (
            <li key={m.id} className="avid-cd-activity-log-row">
              <span className="avid-cd-activity-log-label" style={{ color: t.ink }}>
                {candidateActivityLabel(m.type, m.round)}
              </span>
              <div className="avid-cd-activity-log-row-actions">
                <input
                  type="date"
                  className="avid-cd-activity-log-date"
                  style={{ background: t.surfaceAlt, borderColor: t.border, color: t.muted }}
                  value={m.date}
                  onChange={(e) => onUpdateDate(m.id, e.target.value)}
                />
                {isMeetingActivity(m) ? (
                  <button
                    type="button"
                    className="avid-cd-activity-log-remove"
                    style={{ color: t.mutedSoft }}
                    title="Remove this entry"
                    onClick={() => onDelete(m.id)}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canAdd ? (
        <div className="avid-cd-activity-log-compose" style={{ borderTopColor: t.border }}>
          <div className="avid-cd-activity-log-compose-row">
            <select
              className="avid-cd-activity-log-select"
              style={S.input}
              value={draftType}
              onChange={(e) => {
                const type = e.target.value;
                setDraftType(type);
                setDraftRound(nextCandidateRoundForType(candidate, type));
              }}
            >
              {INTERVIEW_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="avid-cd-activity-log-round"
              style={S.input}
              value={draftRound}
              onChange={(e) => setDraftRound(Number(e.target.value))}
            />
            <input
              type="date"
              className="avid-cd-activity-log-date"
              style={{ ...S.input, flex: 1, minWidth: 0 }}
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="avid-btn avid-cd-activity-log-add"
            style={S.ghostBtn}
            onClick={() => onLog(draftType, draftRound, draftDate)}
          >
            + Log meeting
          </button>
        </div>
      ) : null}
    </div>
  );
}
