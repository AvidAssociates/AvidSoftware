"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CANDIDATE_STAGE_COLOR, Theme, fmtDate, makeStyles, todayISO } from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

export default function OfferLogSheet({
  candidateName,
  t,
  S,
  exiting,
  onConfirm,
  onCancel,
}: {
  candidateName: string;
  t: Theme;
  S: Styles;
  exiting: boolean;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const offerColor = CANDIDATE_STAGE_COLOR.offer;

  useEffect(() => {
    if (!exiting) setDate(todayISO());
  }, [exiting, candidateName]);

  return (
    <div
      className={`avid-offer-sheet${exiting ? " avid-offer-sheet--exit" : ""}`}
      style={{ background: t.surface, borderColor: t.border, boxShadow: `0 -12px 40px rgba(0,0,0,0.18), 0 0 0 1px ${t.border}` }}
      role="dialog"
      aria-label="Log offer"
    >
      <div className="avid-offer-sheet-accent" style={{ background: offerColor }} />
      <div className="avid-offer-sheet-inner">
        <div className="avid-offer-sheet-copy">
          <span className="avid-offer-sheet-eyebrow" style={{ color: offerColor }}>
            Moving to Offer
          </span>
          <h4 className="avid-offer-sheet-title" style={{ color: t.ink }}>
            Log offer for {candidateName}
          </h4>
          <p className="avid-offer-sheet-sub" style={{ color: t.muted }}>
            Activity log stays above — confirm the offer date to advance.
          </p>
        </div>
        <div className="avid-offer-sheet-controls">
          <label className="avid-offer-sheet-date-wrap" style={S.fieldLabel}>
            Offer date
            <input
              type="date"
              className="avid-offer-sheet-date"
              style={S.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="avid-offer-sheet-actions">
            <button type="button" className="avid-btn" style={S.ghostBtn} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="avid-btn avid-offer-sheet-confirm"
              style={{
                ...S.primaryBtn,
                background: offerColor,
                borderColor: offerColor,
              }}
              disabled={!date}
              onClick={() => onConfirm(date)}
            >
              Log offer · {fmtDate(date)}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="avid-offer-sheet-dismiss"
          style={{ color: t.mutedSoft }}
          title="Cancel"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
