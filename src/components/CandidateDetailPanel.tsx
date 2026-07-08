"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Mail, Phone, Trash2 } from "lucide-react";
import CandidateActivityPanel from "@/components/CandidateActivityPanel";
import OfferLogSheet from "@/components/OfferLogSheet";
import { candidateActivityLabel } from "@/lib/candidate-activity";
import type { CandidateStage, RetainedSearch, SearchCandidate } from "@/lib/types";
import {
  CANDIDATE_PIPELINE,
  CANDIDATE_STAGE_COLOR,
  Theme,
  fmtDate,
  makeStyles,
} from "@/lib/ui";

type Styles = ReturnType<typeof makeStyles>;

type ActivityItem = {
  id: string;
  date: string;
  label: string;
  detail?: string;
  color: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.062 2.062 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function buildActivity(candidate: SearchCandidate, search: RetainedSearch): ActivityItem[] {
  const items: ActivityItem[] = [];
  const added = candidate.stageHistory[0]?.date ?? candidate.createdAt.slice(0, 10);
  items.push({
    id: "added",
    date: added,
    label: "Added to search",
    detail: `${search.client}${search.role ? ` · ${search.role}` : ""}`,
    color: "#8C92F0",
  });
  for (let i = 0; i < candidate.stageHistory.length; i++) {
    const ev = candidate.stageHistory[i];
    const stageDef = CANDIDATE_PIPELINE.find((s) => s.key === ev.stage);
    items.push({
      id: `${ev.stage}-${ev.date}-${i}`,
      date: ev.date,
      label: `Moved to ${stageDef?.label ?? ev.stage}`,
      color: CANDIDATE_STAGE_COLOR[ev.stage],
    });
  }
  for (const entry of candidate.activityLog ?? []) {
    if (entry.type === "Offer" || entry.type === "Placed") continue;
    items.push({
      id: `log-${entry.id}`,
      date: entry.date,
      label: `Logged ${candidateActivityLabel(entry.type, entry.round)}`,
      color: CANDIDATE_STAGE_COLOR.interview,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.label.localeCompare(b.label));
}

function TabBar({
  tabs,
  active,
  onChange,
  t,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  t: Theme;
}) {
  return (
    <div className="avid-cd-tabs" style={{ borderBottomColor: t.border }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`avid-cd-tab${active === tab.key ? " avid-cd-tab--active" : ""}`}
          style={{
            color: active === tab.key ? t.ink : t.mutedSoft,
            borderBottomColor: active === tab.key ? t.accent : "transparent",
          }}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function CandidateDetailPanel({
  candidate,
  search,
  t,
  S,
  saving,
  pendingOffer,
  offerLogExiting,
  onBack,
  onSave,
  onMoveStage,
  onDelete,
  onLogActivity,
  onDeleteActivity,
  onUpdateActivityDate,
  onConfirmOffer,
  onCancelOffer,
}: {
  candidate: SearchCandidate;
  search: RetainedSearch;
  t: Theme;
  S: Styles;
  saving: boolean;
  pendingOffer: boolean;
  offerLogExiting: boolean;
  onBack: () => void;
  onSave: (patch: Partial<SearchCandidate>) => void;
  onMoveStage: (stage: CandidateStage) => void;
  onDelete: () => void;
  onLogActivity: (type: string, round: number, date: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onUpdateActivityDate: (activityId: string, date: string) => void;
  onConfirmOffer: (date: string) => void;
  onCancelOffer: () => void;
}) {
  const stageColor = CANDIDATE_STAGE_COLOR[candidate.stage];
  const stageLabel = CANDIDATE_PIPELINE.find((s) => s.key === candidate.stage)?.label ?? candidate.stage;
  const activity = useMemo(() => buildActivity(candidate, search), [candidate, search]);

  const [leftTab, setLeftTab] = useState("contact");
  const [rightTab, setRightTab] = useState("notes");

  const [name, setName] = useState(candidate.name);
  const [email, setEmail] = useState(candidate.email ?? "");
  const [phone, setPhone] = useState(candidate.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedinUrl ?? "");
  const [notes, setNotes] = useState(candidate.notes ?? "");

  useEffect(() => {
    setName(candidate.name);
    setEmail(candidate.email ?? "");
    setPhone(candidate.phone ?? "");
    setLinkedinUrl(candidate.linkedinUrl ?? "");
    setNotes(candidate.notes ?? "");
  }, [candidate]);

  const saveContact = () => {
    onSave({
      name: name.trim() || candidate.name,
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedinUrl: linkedinUrl.trim() || null,
    });
  };

  const saveNotes = () => {
    onSave({ notes: notes.trim() || null });
  };

  const showActivityLog = candidate.stage === "interview" || (candidate.activityLog?.length ?? 0) > 0 || pendingOffer;

  return (
    <div className="avid-candidate-detail">
      <header className="avid-cd-header" style={{ borderBottomColor: t.border, background: t.surface }}>
        <button type="button" className="avid-search-back avid-btn" style={S.segBtn} onClick={onBack}>
          <ArrowLeft size={15} />
          <span>Pipeline</span>
        </button>

        <div className="avid-cd-hero">
          <div className="avid-cd-hero-photo-wrap" style={{ "--ring-color": stageColor } as CSSProperties}>
            {candidate.profileImageUrl ? (
              <img src={candidate.profileImageUrl} alt="" className="avid-cd-hero-photo" />
            ) : (
              <div className="avid-cd-hero-photo avid-cd-hero-photo--fallback" style={{ background: t.accentSoft, color: t.accentText }}>
                {initials(candidate.name)}
              </div>
            )}
          </div>
          <div className="avid-cd-hero-copy">
            <div className="avid-cd-name-row">
              <h2 className="avid-cd-name" style={{ color: t.ink }}>{candidate.name}</h2>
              {candidate.linkedinUrl ? (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="avid-cd-linkedin"
                  style={{ background: t.surfaceAlt, borderColor: t.border, color: "#0A66C2" }}
                  title="Open LinkedIn profile"
                >
                  <LinkedInIcon size={14} />
                </a>
              ) : null}
            </div>
            <div className="avid-cd-hero-meta">
              {candidate.email ? (
                <span className="avid-cd-hero-chip" style={{ color: t.muted }}>
                  <Mail size={12} />
                  {candidate.email}
                </span>
              ) : null}
              {candidate.phone ? (
                <span className="avid-cd-hero-chip" style={{ color: t.muted }}>
                  <Phone size={12} />
                  {candidate.phone}
                </span>
              ) : null}
            </div>
          </div>
          <span className="avid-cd-stage-pill" style={{ background: `${stageColor}18`, color: stageColor, borderColor: `${stageColor}44` }}>
            {stageLabel}
          </span>
        </div>

        <button type="button" className="avid-btn" style={S.iconGhost} title="Remove candidate" onClick={onDelete}>
          <Trash2 size={15} />
        </button>
      </header>

      <div className="avid-cd-layout">
        <aside className="avid-cd-col avid-cd-col--left" style={{ background: t.surfaceAlt, borderColor: t.border }}>
          <TabBar
            tabs={[
              { key: "contact", label: "Contact" },
              { key: "search", label: "Search" },
            ]}
            active={leftTab}
            onChange={setLeftTab}
            t={t}
          />
          <div className="avid-cd-col-body">
            {leftTab === "contact" ? (
              <div className="avid-cd-form">
                <label className="avid-cd-field" style={S.fieldLabel}>
                  Name
                  <input className="avid-cd-input" style={S.input} value={name} onChange={(e) => setName(e.target.value)} onBlur={saveContact} />
                </label>
                <label className="avid-cd-field" style={S.fieldLabel}>
                  Email
                  <input
                    className="avid-cd-input"
                    style={S.input}
                    type="email"
                    value={email}
                    placeholder="name@company.com"
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={saveContact}
                  />
                </label>
                <label className="avid-cd-field" style={S.fieldLabel}>
                  Phone
                  <input
                    className="avid-cd-input"
                    style={S.input}
                    type="tel"
                    value={phone}
                    placeholder="(555) 555-5555"
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={saveContact}
                  />
                </label>
                <label className="avid-cd-field" style={S.fieldLabel}>
                  LinkedIn URL
                  <input
                    className="avid-cd-input"
                    style={S.input}
                    value={linkedinUrl}
                    placeholder="https://linkedin.com/in/…"
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    onBlur={saveContact}
                  />
                </label>
                <p className="avid-cd-hint" style={{ color: t.mutedSoft }}>Changes save when you leave a field.</p>
              </div>
            ) : (
              <div className="avid-cd-search-context">
                <div className="avid-cd-context-block">
                  <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Company</span>
                  <span className="avid-cd-context-value" style={{ color: t.ink }}>{search.client}</span>
                </div>
                <div className="avid-cd-context-block">
                  <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Role</span>
                  <span className="avid-cd-context-value" style={{ color: t.ink }}>{search.role || "—"}</span>
                </div>
                <div className="avid-cd-context-block">
                  <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Search stage</span>
                  <span className="avid-cd-context-value" style={{ color: t.ink }}>
                    {search.stage.charAt(0).toUpperCase() + search.stage.slice(1)}
                  </span>
                </div>
                <div className="avid-cd-context-block">
                  <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Team</span>
                  <span className="avid-cd-context-value" style={{ color: t.ink }}>{search.team.join(", ") || "—"}</span>
                </div>
                <div className="avid-cd-context-block">
                  <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Signed</span>
                  <span className="avid-cd-context-value" style={{ color: t.ink }}>{fmtDate(search.date)}</span>
                </div>
                {search.retainerAmount != null ? (
                  <div className="avid-cd-context-block">
                    <span className="avid-cd-context-label" style={{ color: t.mutedSoft }}>Est. fee</span>
                    <span className="avid-cd-context-value" style={{ color: t.ink }}>
                      ${search.retainerAmount.toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <main className="avid-cd-col avid-cd-col--center" style={{ borderColor: t.border }}>
          <div className="avid-cd-center-head" style={{ borderBottomColor: t.border }}>
            <h3 className="avid-cd-center-title" style={{ color: t.ink }}>Activity</h3>
            <span className="avid-cd-center-sub" style={{ color: t.mutedSoft }}>{activity.length} events</span>
          </div>
          <div className={`avid-cd-center-body${pendingOffer ? " avid-cd-center-body--offer" : ""}`}>
            {showActivityLog ? (
              <CandidateActivityPanel
                candidate={candidate}
                t={t}
                S={S}
                onLog={onLogActivity}
                onDelete={onDeleteActivity}
                onUpdateDate={onUpdateActivityDate}
              />
            ) : null}
            <div className="avid-cd-activity">
              {activity.length === 0 ? (
                <div className="avid-cd-empty" style={{ color: t.mutedSoft }}>No activity yet.</div>
              ) : (
                activity.map((item, i) => (
                  <div key={item.id} className="avid-cd-activity-item" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="avid-cd-activity-rail">
                      <span className="avid-cd-activity-dot" style={{ background: item.color, boxShadow: `0 0 0 3px ${item.color}22` }} />
                      {i < activity.length - 1 ? <span className="avid-cd-activity-line" style={{ background: t.border }} /> : null}
                    </div>
                    <div className="avid-cd-activity-body">
                      <div className="avid-cd-activity-top">
                        <span className="avid-cd-activity-label" style={{ color: t.ink }}>{item.label}</span>
                        <span className="avid-cd-activity-date" style={{ color: t.mutedSoft }}>{fmtDate(item.date)}</span>
                      </div>
                      {item.detail ? <p className="avid-cd-activity-detail" style={{ color: t.muted }}>{item.detail}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
            {pendingOffer ? (
              <OfferLogSheet
                candidateName={candidate.name}
                t={t}
                S={S}
                exiting={offerLogExiting}
                onConfirm={onConfirmOffer}
                onCancel={onCancelOffer}
              />
            ) : null}
          </div>
        </main>

        <aside className="avid-cd-col avid-cd-col--right" style={{ background: t.surfaceAlt, borderColor: t.border }}>
          <TabBar
            tabs={[
              { key: "notes", label: "Notes" },
              { key: "stage", label: "Stage" },
            ]}
            active={rightTab}
            onChange={setRightTab}
            t={t}
          />
          <div className="avid-cd-col-body">
            {rightTab === "notes" ? (
              <div className="avid-cd-notes">
                <textarea
                  className="avid-cd-notes-input"
                  style={{ background: t.surface, borderColor: t.border, color: t.ink }}
                  placeholder="Call notes, feedback, next steps…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="avid-btn"
                  style={S.primaryBtn}
                  disabled={saving || notes === (candidate.notes ?? "")}
                  onClick={saveNotes}
                >
                  {saving ? "Saving…" : "Save notes"}
                </button>
              </div>
            ) : (
              <div className="avid-cd-stages">
                <p className="avid-cd-stages-hint" style={{ color: t.mutedSoft }}>Move candidate to a new stage</p>
                {CANDIDATE_PIPELINE.map((stage) => {
                  const color = CANDIDATE_STAGE_COLOR[stage.key];
                  const active = candidate.stage === stage.key;
                  return (
                    <button
                      key={stage.key}
                      type="button"
                      className={`avid-cd-stage-btn${active ? " avid-cd-stage-btn--active" : ""}`}
                      style={{
                        background: active ? `${color}14` : t.surface,
                        borderColor: active ? `${color}55` : t.border,
                        color: active ? color : t.ink,
                      }}
                      disabled={active || saving}
                      onClick={() => onMoveStage(stage.key)}
                    >
                      <span className="avid-cd-stage-dot" style={{ background: color }} />
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
