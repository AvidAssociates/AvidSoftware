"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { CandidateStage, RetainedSearch, SearchCandidate, SearchStage } from "@/lib/types";
import {
  CANDIDATE_PIPELINE,
  CANDIDATE_STAGE_COLOR,
  SEARCH_PIPELINE,
  SEARCH_STAGE_COLOR,
  Theme,
  fmtDate,
  makeStyles,
  money,
  todayISO,
  uid,
} from "@/lib/ui";
import { daysSince, lastCandidateInterviewDate, SEARCH_STALE_DAYS } from "@/lib/search-stale";
import CandidateDetailPanel from "@/components/CandidateDetailPanel";

type Styles = ReturnType<typeof makeStyles>;

const DRILL_MS = 360;
type NavLayer = "list" | "detail" | "candidate";

type PipelineDef<T extends string> = { key: T; label: string };
type ColorMap<T extends string> = Record<T, string>;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function TeamAvatars({ team, t }: { team: string[]; t: Theme }) {
  if (!team.length) return <span className="avid-k-meta">Unassigned</span>;
  const shown = team.slice(0, 3);
  const extra = team.length - shown.length;
  return (
    <div className="avid-k-avatars">
      {shown.map((name) => (
        <span key={name} className="avid-k-avatar" style={{ background: t.accentSoft, color: t.accentText }} title={name}>
          {initials(name)}
        </span>
      ))}
      {extra > 0 ? <span className="avid-k-avatar avid-k-avatar--more" style={{ color: t.mutedSoft }}>+{extra}</span> : null}
    </div>
  );
}

function KanbanBoard<T extends string, Item extends { id: string; stage: T }>({
  t,
  stages,
  stageColors,
  items,
  renderCard,
  onMove,
  onCardClick,
  emptyLabel,
  columnFooter,
  newItemIds,
  tall,
}: {
  t: Theme;
  stages: PipelineDef<T>[];
  stageColors: ColorMap<T>;
  items: Item[];
  renderCard: (item: Item, stageColor: string) => ReactNode;
  onMove: (item: Item, stage: T) => void;
  onCardClick?: (item: Item) => void;
  emptyLabel?: string;
  columnFooter?: (columnItems: Item[]) => ReactNode;
  newItemIds?: Set<string>;
  tall?: boolean;
}) {
  const [drag, setDrag] = useState<{
    item: Item;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    releasing: boolean;
  } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<T | null>(null);
  const dragStateRef = useRef<{ item: Item; startX: number; startY: number; dragging: boolean } | null>(null);
  const justDraggedRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<T, Item[]>();
    for (const stage of stages) map.set(stage.key, []);
    for (const item of items) {
      const list = map.get(item.stage) ?? [];
      list.push(item);
      map.set(item.stage, list);
    }
    return map;
  }, [items, stages]);

  const stageUnderPoint = (x: number, y: number): T | null => {
    const el = document.elementFromPoint(x, y);
    const col = el?.closest<HTMLElement>("[data-kanban-stage]");
    return (col?.dataset.kanbanStage as T | undefined) ?? null;
  };

  const endDrag = (dropStage: T | null) => {
    const pending = dragStateRef.current;
    dragStateRef.current = null;
    setDragOverStage(null);
    if (!pending?.dragging) {
      setDrag(null);
      return;
    }
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
    if (dropStage && dropStage !== pending.item.stage) onMove(pending.item, dropStage);
    setDrag((d) => (d ? { ...d, releasing: true } : d));
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => setDrag(null), 160);
  };

  const startPointerTracking = (e: ReactPointerEvent<HTMLElement>, item: Item) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cardEl = e.currentTarget.closest<HTMLElement>(".avid-kanban-card");
    if (!cardEl) return;
    dragStateRef.current = { item, startX: e.clientX, startY: e.clientY, dragging: false };

    const onMove_ = (ev: PointerEvent) => {
      const pending = dragStateRef.current;
      if (!pending || pending.item.id !== item.id) return;
      const dx = ev.clientX - pending.startX;
      const dy = ev.clientY - pending.startY;
      if (!pending.dragging) {
        if (Math.hypot(dx, dy) < 6) return;
        pending.dragging = true;
        const rect = cardEl.getBoundingClientRect();
        setDrag({
          item,
          x: ev.clientX,
          y: ev.clientY,
          offsetX: pending.startX - rect.left,
          offsetY: pending.startY - rect.top,
          width: rect.width,
          height: rect.height,
          releasing: false,
        });
      } else {
        setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
      }
      setDragOverStage(stageUnderPoint(ev.clientX, ev.clientY));
    };
    const onUp_ = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove_);
      window.removeEventListener("pointerup", onUp_);
      window.removeEventListener("pointercancel", onUp_);
      endDrag(stageUnderPoint(ev.clientX, ev.clientY));
    };
    window.addEventListener("pointermove", onMove_);
    window.addEventListener("pointerup", onUp_);
    window.addEventListener("pointercancel", onUp_);
  };

  return (
    <>
      <div className={`avid-kanban-board${tall ? " avid-kanban-board--tall" : ""}`}>
        {stages.map((stage) => {
          const columnItems = byStage.get(stage.key) ?? [];
          const color = stageColors[stage.key];
          const isOver = dragOverStage === stage.key;
          return (
            <div
              key={stage.key}
              className={`avid-kanban-column${tall ? " avid-kanban-column--tall" : ""}${isOver ? " avid-kanban-column--over" : ""}`}
              data-kanban-stage={stage.key}
              style={{ "--stage-color": color, borderColor: isOver ? color : t.border, background: t.surfaceAlt } as CSSProperties}
            >
              <div className="avid-kanban-column-header" style={{ borderBottomColor: t.border }}>
                <span className="avid-kanban-column-dot" style={{ background: color }} />
                <span className="avid-k-col-title" style={{ color: t.ink }}>{stage.label}</span>
                <span className="avid-k-col-count" style={{ background: t.surface, color: t.mutedSoft, borderColor: t.border }}>
                  {columnItems.length}
                </span>
              </div>
              <div className="avid-kanban-column-body">
                {columnItems.length === 0 ? (
                  <div className="avid-kanban-drop-hint" style={{ color: t.mutedSoft, borderColor: t.border }}>
                    {emptyLabel ?? "Drop here"}
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const itemColor = stageColors[item.stage];
                    const isDragSource = drag?.item.id === item.id;
                    const isNew = newItemIds?.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`avid-kanban-card${onCardClick ? " avid-kanban-card--clickable" : ""}${isDragSource ? " avid-kanban-card--source" : ""}${isNew ? " avid-kanban-card--enter" : ""}`}
                        style={{ background: t.surface, borderColor: t.border, touchAction: "none", "--stage-color": itemColor } as CSSProperties}
                        onPointerDown={(e) => startPointerTracking(e, item)}
                      >
                        <div className="avid-kanban-card-drag" style={{ color: t.mutedSoft, borderColor: t.border }} title="Drag to move">
                          <GripVertical size={13} />
                        </div>
                        <div
                          className="avid-kanban-card-body"
                          role={onCardClick ? "button" : undefined}
                          tabIndex={onCardClick ? 0 : undefined}
                          onClick={
                            onCardClick
                              ? () => {
                                  if (justDraggedRef.current) {
                                    justDraggedRef.current = false;
                                    return;
                                  }
                                  onCardClick(item);
                                }
                              : undefined
                          }
                          onKeyDown={
                            onCardClick
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onCardClick(item);
                                  }
                                }
                              : undefined
                          }
                        >
                          {renderCard(item, itemColor)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {columnFooter ? (
                <div className="avid-kanban-column-footer" style={{ borderTopColor: t.border, background: t.surface }}>
                  {columnFooter(columnItems)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {drag &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`avid-kanban-ghost${drag.releasing ? " avid-kanban-ghost--releasing" : ""}`}
            style={{
              left: drag.x - drag.offsetX,
              top: drag.y - drag.offsetY,
              width: drag.width,
              background: t.surface,
              borderColor: t.border,
              "--stage-color": stageColors[drag.item.stage],
            } as CSSProperties}
          >
            <div className="avid-kanban-card-drag" style={{ color: t.mutedSoft, borderColor: t.border }}>
              <GripVertical size={13} />
            </div>
            <div className="avid-kanban-card-body">{renderCard(drag.item, stageColors[drag.item.stage])}</div>
          </div>,
          document.body
        )}
    </>
  );
}

function stopCardNav(e: React.PointerEvent | React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

function SearchCard({
  search,
  t,
  onUpdateFee,
}: {
  search: RetainedSearch;
  t: Theme;
  onUpdateFee: (amount: number | null) => void;
}) {
  const today = todayISO();
  const lastInterview = lastCandidateInterviewDate(search.candidates ?? [], search.date);
  const idleDays = daysSince(lastInterview, today);
  const [feeEditing, setFeeEditing] = useState(false);
  const [feeDraft, setFeeDraft] = useState(search.retainerAmount != null ? String(search.retainerAmount) : "");

  useEffect(() => {
    setFeeDraft(search.retainerAmount != null ? String(search.retainerAmount) : "");
  }, [search.retainerAmount]);

  const commitFee = () => {
    setFeeEditing(false);
    const parsed = feeDraft.trim() ? Number(feeDraft.replace(/[^\d]/g, "")) : null;
    const current = search.retainerAmount ?? null;
    if (parsed !== current) onUpdateFee(parsed);
    else setFeeDraft(current != null ? String(current) : "");
  };

  return (
    <div className="avid-k-card-inner">
      <div className="avid-k-card-headrow">
        <div className="avid-k-card-title" style={{ color: t.ink }}>{search.client}</div>
        <span className="avid-k-card-date" style={{ color: t.mutedSoft }}>{fmtDate(search.date)}</span>
      </div>
      <div className="avid-k-card-sub" style={{ color: t.muted }}>{search.role || "Role TBD"}</div>
      {search.stage === "stale" ? (
        <div className="avid-k-stale-hint" style={{ color: t.mutedSoft }}>
          No interview activity in {idleDays} days
        </div>
      ) : idleDays > SEARCH_STALE_DAYS - 7 && search.stage !== "placed" ? (
        <div className="avid-k-stale-hint" style={{ color: t.mutedSoft }}>
          Interview idle {idleDays}d — stale at {SEARCH_STALE_DAYS}d
        </div>
      ) : null}
      <div className="avid-k-card-foot">
        <TeamAvatars team={search.team} t={t} />
      </div>
      <div className="avid-k-card-fee-corner">
        {feeEditing ? (
          <input
            className="avid-k-fee-input"
            style={{ background: t.surfaceAlt, borderColor: t.border, color: t.ink }}
            inputMode="numeric"
            autoFocus
            value={feeDraft}
            placeholder="0"
            onChange={(e) => setFeeDraft(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={commitFee}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFee();
              }
              if (e.key === "Escape") {
                setFeeEditing(false);
                setFeeDraft(search.retainerAmount != null ? String(search.retainerAmount) : "");
              }
            }}
            onPointerDown={stopCardNav}
            onClick={stopCardNav}
          />
        ) : (
          <button
            type="button"
            className="avid-k-fee-btn"
            style={{ background: t.surfaceAlt, borderColor: t.border, color: search.retainerAmount != null ? t.ink : t.mutedSoft }}
            onPointerDown={stopCardNav}
            onClick={(e) => {
              stopCardNav(e);
              setFeeEditing(true);
            }}
          >
            {search.retainerAmount != null ? money(search.retainerAmount) : "Est. fee"}
          </button>
        )}
        <ChevronRight size={15} className="avid-k-card-chevron" style={{ color: t.mutedSoft }} />
      </div>
    </div>
  );
}

function pipelineColumnTotal(searches: RetainedSearch[]) {
  return searches.reduce((sum, s) => sum + (s.retainerAmount ?? 0), 0);
}

function candidateStageDate(candidate: SearchCandidate): string {
  for (let i = candidate.stageHistory.length - 1; i >= 0; i--) {
    if (candidate.stageHistory[i]?.stage === candidate.stage) return candidate.stageHistory[i].date;
  }
  return candidate.stageHistory[0]?.date ?? "";
}

function CandidatePipelineStats({
  candidates,
  t,
}: {
  candidates: SearchCandidate[];
  t: Theme;
}) {
  const counts = useMemo(() => {
    const map: Record<CandidateStage, number> = { presented: 0, interview: 0, offer: 0, placed: 0 };
    for (const c of candidates) map[c.stage] += 1;
    return map;
  }, [candidates]);

  return (
    <div className="avid-candidate-stats">
      {CANDIDATE_PIPELINE.map((stage) => {
        const color = CANDIDATE_STAGE_COLOR[stage.key];
        const count = counts[stage.key];
        return (
          <div
            key={stage.key}
            className="avid-candidate-stat"
            style={{ background: t.surfaceAlt, borderColor: t.border, "--stat-color": color } as CSSProperties}
          >
            <span className="avid-candidate-stat-value" style={{ color: count > 0 ? t.ink : t.mutedSoft }}>{count}</span>
            <span className="avid-candidate-stat-label" style={{ color: t.mutedSoft }}>{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function CandidateCard({
  candidate,
  t,
  stageColor,
  onDelete,
}: {
  candidate: SearchCandidate;
  t: Theme;
  stageColor: string;
  onDelete: () => void;
}) {
  const today = todayISO();
  const added = candidate.stageHistory[0]?.date ?? "";
  const inStageSince = candidateStageDate(candidate);
  const daysInStage = inStageSince ? daysSince(inStageSince, today) : 0;

  return (
    <div className="avid-c-card">
      <div className="avid-c-card-head">
        <div className="avid-c-card-photo-wrap" style={{ "--ring-color": stageColor } as CSSProperties}>
          {candidate.profileImageUrl ? (
            <img src={candidate.profileImageUrl} alt="" className="avid-c-card-photo" />
          ) : (
            <div className="avid-c-card-photo avid-c-card-photo--fallback" style={{ background: t.accentSoft, color: t.accentText }}>
              {initials(candidate.name)}
            </div>
          )}
        </div>
        <div className="avid-c-card-copy">
          <div className="avid-c-card-name" style={{ color: t.ink }}>{candidate.name}</div>
          <div className="avid-c-card-stage" style={{ color: stageColor }}>
            {daysInStage > 0 ? `${daysInStage}d in stage` : "New"}
          </div>
        </div>
        <span className="avid-c-card-date" style={{ color: t.mutedSoft }} title="Entered this stage">
          {fmtDate(inStageSince)}
        </span>
      </div>
      <div className="avid-c-card-foot" style={{ borderTopColor: t.border }}>
        <span className="avid-c-card-added" style={{ color: t.mutedSoft }}>
          Added {fmtDate(added)}
        </span>
        <div className="avid-c-card-actions">
          {candidate.linkedinUrl ? (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="avid-c-card-action"
              style={{ color: t.mutedSoft }}
              title="LinkedIn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} />
            </a>
          ) : null}
          <button
            type="button"
            className="avid-c-card-action avid-c-card-action--danger"
            style={{ color: t.mutedSoft }}
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchDetailHeader({
  search,
  t,
  S,
  teamNames,
  editing,
  saving,
  onBack,
  onToggleEdit,
  onDelete,
  onSave,
}: {
  search: RetainedSearch;
  t: Theme;
  S: Styles;
  teamNames: string[];
  editing: boolean;
  saving: boolean;
  onBack: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onSave: (patch: { client: string; role: string | null; team: string[] }) => void;
}) {
  const count = search.candidates?.length ?? 0;
  const stageLabel = SEARCH_PIPELINE.find((s) => s.key === search.stage)?.label ?? search.stage;
  const stageColor = SEARCH_STAGE_COLOR[search.stage];
  const [client, setClient] = useState(search.client);
  const [role, setRole] = useState(search.role ?? "");
  const [team, setTeam] = useState<string[]>(search.team);

  useEffect(() => {
    if (!editing) return;
    setClient(search.client);
    setRole(search.role ?? "");
    setTeam(search.team);
  }, [editing, search.client, search.role, search.team]);

  const toggleTeam = (name: string) => {
    setTeam((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const canSave = client.trim().length > 0 && team.length > 0;

  return (
    <header className="avid-search-detail-header" style={{ borderBottomColor: t.border, background: t.surface }}>
      <button type="button" className="avid-search-back avid-btn" style={S.segBtn} onClick={onBack}>
        <ArrowLeft size={15} />
        <span>Searches</span>
      </button>

      {editing ? (
        <div className="avid-search-detail-edit">
          <div className="avid-search-edit-grid">
            <label className="avid-search-edit-field" style={S.fieldLabel}>
              Company
              <input className="avid-search-edit-input" style={S.input} value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client company" />
            </label>
            <label className="avid-search-edit-field" style={S.fieldLabel}>
              Role
              <input className="avid-search-edit-input" style={S.input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Account Manager" />
            </label>
          </div>
          <div className="avid-search-edit-team">
            <div style={{ ...S.fieldLabel, marginBottom: 8 }}>Team</div>
            <div className="avid-search-edit-team-btns">
              {teamNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="avid-btn"
                  style={team.includes(name) ? S.segBtnActive : S.segBtn}
                  onClick={() => toggleTeam(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="avid-search-edit-actions">
            <button type="button" className="avid-btn" style={S.segBtn} onClick={onToggleEdit} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="avid-btn"
              style={S.primaryBtn}
              disabled={!canSave || saving}
              onClick={() => onSave({ client: client.trim(), role: role.trim() || null, team })}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="avid-search-detail-view">
          <div className="avid-search-detail-main">
            <h2 className="avid-search-detail-title" style={{ color: t.ink }}>{search.client}</h2>
            <p className="avid-search-detail-sub" style={{ color: t.muted }}>{search.role || "Role TBD"}</p>
          </div>
          <div className="avid-search-detail-chips">
            <span className="avid-k-detail-chip" style={{ background: `${stageColor}18`, color: stageColor, borderColor: `${stageColor}40` }}>
              {stageLabel}
            </span>
            <span className="avid-k-detail-chip" style={{ background: t.surfaceAlt, color: t.muted, borderColor: t.border }}>
              {count} candidates
            </span>
            {search.retainerAmount != null ? (
              <span className="avid-k-detail-chip" style={{ background: t.surfaceAlt, color: t.muted, borderColor: t.border }}>
                {money(search.retainerAmount)}
              </span>
            ) : null}
          </div>
          <div className="avid-search-detail-actions">
            <TeamAvatars team={search.team} t={t} />
          </div>
        </div>
      )}

      <div className="avid-search-detail-toolbar">
        <button type="button" className="avid-btn" style={S.iconGhost} title={editing ? "Close editor" : "Edit search"} onClick={onToggleEdit}>
          <Pencil size={15} />
        </button>
        <button type="button" className="avid-btn" style={S.iconGhost} title="Delete search" onClick={onDelete}>
          <Trash2 size={15} />
        </button>
      </div>
    </header>
  );
}

export default function SearchesView({
  searches,
  totalCount,
  t,
  teamNames,
  user,
  focusSearchId,
  onFocusSearchDone,
  onSaveSearch,
  onDeleteSearch,
  onMoveSearch,
  onSaveCandidate,
  onDeleteCandidate,
  onMoveCandidate,
}: {
  searches: RetainedSearch[];
  totalCount: number;
  t: Theme;
  teamNames: string[];
  user: string;
  focusSearchId: string | null;
  onFocusSearchDone: () => void;
  onSaveSearch: (search: RetainedSearch, isNew: boolean) => Promise<void>;
  onDeleteSearch: (id: string) => Promise<void>;
  onMoveSearch: (search: RetainedSearch, stage: SearchStage) => Promise<void>;
  onSaveCandidate: (searchId: string, candidate: SearchCandidate, isNew: boolean) => Promise<void>;
  onDeleteCandidate: (searchId: string, candidateId: string) => Promise<void>;
  onMoveCandidate: (searchId: string, candidate: SearchCandidate, stage: CandidateStage) => Promise<void>;
}) {
  const S = makeStyles(t);
  const isDark = t.bg === "#000000";
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [displayLayer, setDisplayLayer] = useState<NavLayer>("list");
  const [leavingLayer, setLeavingLayer] = useState<NavLayer | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateIds, setNewCandidateIds] = useState<Set<string>>(() => new Set());
  const [newSearchIds, setNewSearchIds] = useState<Set<string>>(() => new Set());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusSearchId) return;
    setNewSearchIds((prev) => new Set(prev).add(focusSearchId));
    setActiveSearchId(focusSearchId);
    setLeavingLayer(null);
    setDisplayLayer("detail");
    setDetailEditing(true);
    const tmr = window.setTimeout(() => {
      setNewSearchIds((prev) => {
        const next = new Set(prev);
        next.delete(focusSearchId);
        return next;
      });
      onFocusSearchDone();
    }, 600);
    return () => window.clearTimeout(tmr);
  }, [focusSearchId, onFocusSearchDone]);

  const activeSearch = activeSearchId ? searches.find((s) => s.id === activeSearchId) ?? null : null;
  const activeCandidate = activeCandidateId
    ? activeSearch?.candidates?.find((c) => c.id === activeCandidateId) ?? null
    : null;

  const drillTo = (next: NavLayer) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setLeavingLayer(displayLayer);
    setDisplayLayer(next);
    timerRef.current = window.setTimeout(() => setLeavingLayer(null), DRILL_MS);
  };

  const openSearch = (id: string) => {
    setActiveSearchId(id);
    setActiveCandidateId(null);
    setDetailEditing(false);
    drillTo("detail");
  };

  const closeSearch = () => {
    setDetailEditing(false);
    setActiveCandidateId(null);
    drillTo("list");
    timerRef.current = window.setTimeout(() => {
      setActiveSearchId(null);
    }, DRILL_MS);
  };

  const openCandidate = (id: string) => {
    setActiveCandidateId(id);
    drillTo("candidate");
  };

  const closeCandidate = () => {
    drillTo("detail");
    timerRef.current = window.setTimeout(() => {
      setActiveCandidateId(null);
    }, DRILL_MS);
  };

  const saveSearchDetail = async (patch: { client: string; role: string | null; team: string[] }) => {
    if (!activeSearch) return;
    setSavingDetail(true);
    await onSaveSearch({ ...activeSearch, ...patch }, false);
    setSavingDetail(false);
    setDetailEditing(false);
  };

  const updateSearchFee = async (search: RetainedSearch, retainerAmount: number | null) => {
    await onSaveSearch({ ...search, retainerAmount }, false);
  };

  const addCandidate = async () => {
    if (!activeSearch || !newCandidateName.trim()) return;
    const candidate: SearchCandidate = {
      id: uid(),
      searchId: activeSearch.id,
      name: newCandidateName.trim(),
      stage: "presented",
      stageHistory: [{ stage: "presented", date: todayISO() }],
      notes: null,
      addedBy: user,
      createdAt: new Date().toISOString(),
      profileImageUrl: null,
      linkedinUrl: null,
      email: null,
      phone: null,
    };
    await onSaveCandidate(activeSearch.id, candidate, true);
    setNewCandidateIds((prev) => new Set(prev).add(candidate.id));
    window.setTimeout(() => {
      setNewCandidateIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
    }, 600);
    setNewCandidateName("");
  };

  const updateCandidate = async (patch: Partial<SearchCandidate>) => {
    if (!activeSearch || !activeCandidate) return;
    setSavingCandidate(true);
    const next = { ...activeCandidate, ...patch };
    await onSaveCandidate(activeSearch.id, next, false);
    setSavingCandidate(false);
  };

  const candidates = activeSearch?.candidates ?? [];

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const drilling = leavingLayer !== null;

  const listLayerClass = [
    "avid-search-layer",
    drilling ? "avid-search-layer--overlay" : "",
    displayLayer === "list" && leavingLayer === "detail" ? "avid-search-layer--enter-back" : "",
    displayLayer === "list" && leavingLayer === "candidate" ? "avid-search-layer--enter-back" : "",
    displayLayer === "detail" && leavingLayer === "list" ? "avid-search-layer--leave-back" : "",
    displayLayer === "candidate" && leavingLayer === "list" ? "avid-search-layer--leave-back" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const detailLayerClass = [
    "avid-search-layer avid-search-layer--detail",
    drilling ? "avid-search-layer--overlay" : "",
    displayLayer === "detail" && leavingLayer === "list" ? "avid-search-layer--enter-forward" : "",
    displayLayer === "detail" && leavingLayer === "candidate" ? "avid-search-layer--enter-back" : "",
    displayLayer === "candidate" && leavingLayer === "detail" ? "avid-search-layer--leave-back" : "",
    displayLayer === "list" && leavingLayer === "detail" ? "avid-search-layer--leave-forward" : "",
    displayLayer === "candidate" && leavingLayer === "list" ? "avid-search-layer--leave-forward" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const candidateLayerClass = [
    "avid-search-layer avid-search-layer--candidate",
    drilling ? "avid-search-layer--overlay" : "",
    displayLayer === "candidate" && leavingLayer === "detail" ? "avid-search-layer--enter-forward" : "",
    displayLayer === "detail" && leavingLayer === "candidate" ? "avid-search-layer--leave-forward" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showList = displayLayer === "list" || leavingLayer === "list";
  const showDetail =
    (displayLayer === "detail" || leavingLayer === "detail" || displayLayer === "candidate" || leavingLayer === "candidate") &&
    activeSearch;
  const showCandidate = (displayLayer === "candidate" || leavingLayer === "candidate") && activeSearch && activeCandidate;

  return (
    <div className="avid-search-root" data-theme={isDark ? "dark" : "light"}>
      <div className="avid-search-depth">
        {showList ? (
          <div className={listLayerClass}>
            <div className="avid-search-panel">
              {searches.length === 0 && totalCount > 0 ? (
                <div className="avid-search-empty" style={{ color: t.mutedSoft }}>Nothing matches these filters.</div>
              ) : null}

              <KanbanBoard
                t={t}
                stages={SEARCH_PIPELINE}
                stageColors={SEARCH_STAGE_COLOR}
                items={searches}
                emptyLabel="Empty"
                tall
                newItemIds={newSearchIds}
                onMove={(search, stage) => onMoveSearch(search, stage)}
                onCardClick={(search) => openSearch(search.id)}
                columnFooter={(columnItems) => {
                  const total = pipelineColumnTotal(columnItems);
                  return (
                    <div className="avid-k-col-total">
                      <span className="avid-k-col-total-label" style={{ color: t.mutedSoft }}>Pipeline</span>
                      <span className="avid-k-col-total-value" style={{ color: t.ink }}>{money(total)}</span>
                    </div>
                  );
                }}
                renderCard={(search) => (
                  <SearchCard
                    search={search}
                    t={t}
                    onUpdateFee={(retainerAmount) => void updateSearchFee(search, retainerAmount)}
                  />
                )}
              />

              {totalCount === 0 ? (
                <div className="avid-search-empty" style={{ color: t.mutedSoft }}>
                  No searches yet — use <strong style={{ color: t.ink }}>New</strong> to add one to Sourcing.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showDetail && activeSearch ? (
          <div className={detailLayerClass}>
            <div className="avid-search-panel avid-search-panel--detail">
              <SearchDetailHeader
                search={activeSearch}
                t={t}
                S={S}
                teamNames={teamNames}
                editing={detailEditing}
                saving={savingDetail}
                onBack={closeSearch}
                onToggleEdit={() => setDetailEditing((v) => !v)}
                onSave={(patch) => void saveSearchDetail(patch)}
                onDelete={() => {
                  if (window.confirm(`Delete search for ${activeSearch.client}?`)) {
                    onDeleteSearch(activeSearch.id);
                    closeSearch();
                  }
                }}
              />

              <section className="avid-candidate-pipeline">
                <div className="avid-candidate-pipeline-head" style={{ borderBottomColor: t.border }}>
                  <div className="avid-candidate-pipeline-title-wrap">
                    <h3 className="avid-candidate-pipeline-title" style={{ color: t.ink }}>Candidates</h3>
                    <p className="avid-candidate-pipeline-sub" style={{ color: t.mutedSoft }}>
                      {candidates.length === 0
                        ? "Add someone below or import from LinkedIn"
                        : `${candidates.length} in pipeline · drag to advance`}
                    </p>
                  </div>
                  <CandidatePipelineStats candidates={candidates} t={t} />
                </div>

                <div className="avid-candidate-compose" style={{ borderBottomColor: t.border, background: t.surface }}>
                  <div className="avid-candidate-compose-field" style={{ background: t.surfaceAlt, borderColor: t.border }}>
                    <Plus size={16} style={{ color: t.mutedSoft, flexShrink: 0 }} />
                    <input
                      className="avid-candidate-compose-input"
                      style={{ color: t.ink }}
                      placeholder="Name…"
                      value={newCandidateName}
                      onChange={(e) => setNewCandidateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addCandidate();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="avid-btn avid-candidate-compose-btn"
                    style={S.primaryBtn}
                    disabled={!newCandidateName.trim()}
                    onClick={() => void addCandidate()}
                  >
                    Add
                  </button>
                </div>

                <KanbanBoard
                  t={t}
                  stages={CANDIDATE_PIPELINE}
                  stageColors={CANDIDATE_STAGE_COLOR}
                  items={candidates}
                  emptyLabel="Drop here"
                  tall
                  newItemIds={newCandidateIds}
                  onMove={(candidate, stage) => onMoveCandidate(activeSearch.id, candidate, stage)}
                  onCardClick={(candidate) => openCandidate(candidate.id)}
                  columnFooter={(columnItems) => (
                    <div className="avid-c-col-foot">
                      <span className="avid-c-col-foot-label" style={{ color: t.mutedSoft }}>
                        {columnItems.length === 1 ? "1 candidate" : `${columnItems.length} candidates`}
                      </span>
                    </div>
                  )}
                  renderCard={(candidate, stageColor) => (
                    <CandidateCard
                      candidate={candidate}
                      t={t}
                      stageColor={stageColor}
                      onDelete={() => onDeleteCandidate(activeSearch.id, candidate.id)}
                    />
                  )}
                />
              </section>
            </div>
          </div>
        ) : null}

        {showCandidate ? (
          <div className={candidateLayerClass}>
            <div className="avid-search-panel avid-search-panel--candidate">
              <CandidateDetailPanel
                candidate={activeCandidate}
                search={activeSearch}
                t={t}
                S={S}
                saving={savingCandidate}
                onBack={closeCandidate}
                onSave={(patch) => void updateCandidate(patch)}
                onMoveStage={(stage) => void onMoveCandidate(activeSearch.id, { ...activeCandidate, stage }, stage)}
                onDelete={() => {
                  if (window.confirm(`Remove ${activeCandidate.name} from this search?`)) {
                    onDeleteCandidate(activeSearch.id, activeCandidate.id);
                    closeCandidate();
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
