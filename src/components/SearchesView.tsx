"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, ExternalLink, GripVertical, Plus, Trash2, X } from "lucide-react";
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

type Styles = ReturnType<typeof makeStyles>;

const DRILL_MS = 360;

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
}: {
  t: Theme;
  stages: PipelineDef<T>[];
  stageColors: ColorMap<T>;
  items: Item[];
  renderCard: (item: Item, stageColor: string) => ReactNode;
  onMove: (item: Item, stage: T) => void;
  onCardClick?: (item: Item) => void;
  emptyLabel?: string;
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
      <div className="avid-kanban-board">
        {stages.map((stage) => {
          const columnItems = byStage.get(stage.key) ?? [];
          const color = stageColors[stage.key];
          const isOver = dragOverStage === stage.key;
          return (
            <div
              key={stage.key}
              className={`avid-kanban-column${isOver ? " avid-kanban-column--over" : ""}`}
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
                    return (
                      <div
                        key={item.id}
                        className={`avid-kanban-card${onCardClick ? " avid-kanban-card--clickable" : ""}${isDragSource ? " avid-kanban-card--source" : ""}`}
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

function SearchCard({ search, t, stageColor }: { search: RetainedSearch; t: Theme; stageColor: string }) {
  const count = search.candidates?.length ?? 0;
  const today = todayISO();
  const lastInterview = lastCandidateInterviewDate(search.candidates ?? [], search.date);
  const idleDays = daysSince(lastInterview, today);
  const meta = [
    fmtDate(search.date),
    search.retainerAmount != null ? money(search.retainerAmount) : null,
    `${count} ${count === 1 ? "candidate" : "candidates"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="avid-k-card-inner">
      <div className="avid-k-card-top">
        <div className="avid-k-card-copy">
          <div className="avid-k-card-title" style={{ color: t.ink }}>{search.client}</div>
          <div className="avid-k-card-sub" style={{ color: t.muted }}>{search.role || "Role TBD"}</div>
        </div>
        <ChevronRight size={15} className="avid-k-card-chevron" style={{ color: t.mutedSoft }} />
      </div>
      <div className="avid-k-card-meta" style={{ color: t.mutedSoft }}>{meta}</div>
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
        <span className="avid-k-stage-pill" style={{ background: `${stageColor}22`, color: stageColor }}>
          {SEARCH_PIPELINE.find((s) => s.key === search.stage)?.label}
        </span>
      </div>
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
  const stageLabel = CANDIDATE_PIPELINE.find((s) => s.key === candidate.stage)?.label ?? candidate.stage;
  return (
    <div className="avid-k-card-inner avid-k-card-inner--person">
      <div className="avid-k-person-row">
        {candidate.profileImageUrl ? (
          <img src={candidate.profileImageUrl} alt="" className="avid-k-person-photo" />
        ) : (
          <div className="avid-k-person-photo avid-k-person-photo--fallback" style={{ background: t.accentSoft, color: t.accentText }}>
            {candidate.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="avid-k-person-copy">
          <div className="avid-k-card-title" style={{ color: t.ink }}>{candidate.name}</div>
          <div className="avid-k-card-meta avid-k-card-meta--tight" style={{ color: t.mutedSoft }}>
            <span className="avid-k-stage-pill avid-k-stage-pill--sm" style={{ background: `${stageColor}22`, color: stageColor }}>
              {stageLabel}
            </span>
            <span>Added {fmtDate(candidate.stageHistory[0]?.date ?? "")}</span>
          </div>
        </div>
        <div className="avid-k-person-actions">
          {candidate.linkedinUrl ? (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="avid-k-icon-btn"
              style={{ color: t.mutedSoft }}
              title="Open LinkedIn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          ) : null}
          <button
            type="button"
            className="avid-k-icon-btn avid-k-icon-btn--danger"
            style={{ color: t.mutedSoft }}
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchFormModal({
  S,
  t,
  teamNames,
  user,
  initial,
  onSave,
  onClose,
}: {
  S: Styles;
  t: Theme;
  teamNames: string[];
  user: string;
  initial?: RetainedSearch;
  onSave: (search: RetainedSearch) => Promise<void>;
  onClose: () => void;
}) {
  const [client, setClient] = useState(initial?.client ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [team, setTeam] = useState<string[]>(initial?.team?.length ? initial.team : [user]);
  const [retainerAmount, setRetainerAmount] = useState(
    initial?.retainerAmount != null ? String(initial.retainerAmount) : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const toggleTeam = (name: string) => {
    setTeam((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const submit = async () => {
    if (!client.trim()) return;
    setSaving(true);
    const search: RetainedSearch = {
      id: initial?.id ?? uid(),
      date,
      client: client.trim(),
      role: role.trim() || null,
      team,
      stage: initial?.stage ?? "sourcing",
      stageHistory: initial?.stageHistory ?? [{ stage: "sourcing", date }],
      retainerAmount: retainerAmount ? Number(retainerAmount) : null,
      notes: notes.trim() || null,
      addedBy: initial?.addedBy ?? user,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      candidates: initial?.candidates ?? [],
    };
    await onSave(search);
    setSaving(false);
    onClose();
  };

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} className="avid-glass-pop" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{initial ? "Edit Search" : "New Search"}</h3>
          <button className="avid-btn" style={S.iconGhost} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={S.fieldLabel}>
            Client
            <input style={S.input} value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <label style={S.fieldLabel}>
            Role
            <input style={S.input} value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label style={S.fieldLabel}>
            Signed date
            <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label style={S.fieldLabel}>
            Retainer
            <input
              style={S.input}
              inputMode="numeric"
              value={retainerAmount}
              onChange={(e) => setRetainerAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Optional"
            />
          </label>
          <div>
            <div style={{ ...S.fieldLabel, marginBottom: 8 }}>Team</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
          <label style={S.fieldLabel}>
            Notes
            <textarea style={{ ...S.input, minHeight: 72, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button className="avid-btn" style={S.segBtn} onClick={onClose}>
            Cancel
          </button>
          <button className="avid-btn" style={S.primaryBtn} disabled={saving || !client.trim()} onClick={submit}>
            {saving ? "Saving…" : initial ? "Save" : "Create"}
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
  onBack,
  onEdit,
  onDelete,
}: {
  search: RetainedSearch;
  t: Theme;
  S: Styles;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const count = search.candidates?.length ?? 0;
  const stageLabel = SEARCH_PIPELINE.find((s) => s.key === search.stage)?.label ?? search.stage;
  const stageColor = SEARCH_STAGE_COLOR[search.stage];

  return (
    <header className="avid-search-detail-header" style={{ borderBottomColor: t.border, background: t.surface }}>
      <button type="button" className="avid-search-back avid-btn" style={S.segBtn} onClick={onBack}>
        <ArrowLeft size={15} />
        <span>Searches</span>
      </button>
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
        <button type="button" className="avid-btn" style={S.segBtn} onClick={onEdit}>
          Edit
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
  showNewForm,
  onCloseNewForm,
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
  showNewForm: boolean;
  onCloseNewForm: () => void;
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
  const [displayLayer, setDisplayLayer] = useState<"list" | "detail">("list");
  const [leavingLayer, setLeavingLayer] = useState<"list" | "detail" | null>(null);
  const [editingSearch, setEditingSearch] = useState<RetainedSearch | null>(null);
  const [newCandidateName, setNewCandidateName] = useState("");
  const timerRef = useRef<number | null>(null);

  const activeSearch = activeSearchId ? searches.find((s) => s.id === activeSearchId) ?? null : null;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const openSearch = (id: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setActiveSearchId(id);
    setLeavingLayer(displayLayer);
    setDisplayLayer("detail");
    timerRef.current = window.setTimeout(() => setLeavingLayer(null), DRILL_MS);
  };

  const closeSearch = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setLeavingLayer(displayLayer);
    setDisplayLayer("list");
    timerRef.current = window.setTimeout(() => {
      setActiveSearchId(null);
      setLeavingLayer(null);
    }, DRILL_MS);
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
    };
    await onSaveCandidate(activeSearch.id, candidate, true);
    setNewCandidateName("");
  };

  const drilling = leavingLayer !== null;

  const listLayerClass = [
    "avid-search-layer",
    drilling ? "avid-search-layer--overlay" : "",
    displayLayer === "list" && leavingLayer === "detail" ? "avid-search-layer--enter-back" : "",
    displayLayer === "detail" && leavingLayer === "list" ? "avid-search-layer--leave-back" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const detailLayerClass = [
    "avid-search-layer avid-search-layer--detail",
    drilling ? "avid-search-layer--overlay" : "",
    displayLayer === "detail" && leavingLayer === "list" ? "avid-search-layer--enter-forward" : "",
    displayLayer === "list" && leavingLayer === "detail" ? "avid-search-layer--leave-forward" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showList = displayLayer === "list" || leavingLayer === "list";
  const showDetail = (displayLayer === "detail" || leavingLayer === "detail") && activeSearch;

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
                onMove={(search, stage) => onMoveSearch(search, stage)}
                onCardClick={(search) => openSearch(search.id)}
                renderCard={(search, stageColor) => <SearchCard search={search} t={t} stageColor={stageColor} />}
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
                onBack={closeSearch}
                onEdit={() => setEditingSearch(activeSearch)}
                onDelete={() => {
                  if (window.confirm(`Delete search for ${activeSearch.client}?`)) {
                    onDeleteSearch(activeSearch.id);
                    closeSearch();
                  }
                }}
              />

              <div className="avid-search-add-bar" style={{ borderBottomColor: t.border }}>
                <input
                  className="avid-search-add-input"
                  style={{ background: t.surfaceAlt, borderColor: t.border, color: t.ink }}
                  placeholder="Add candidate…"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addCandidate();
                  }}
                />
                <button type="button" className="avid-btn" style={S.primaryBtn} disabled={!newCandidateName.trim()} onClick={() => void addCandidate()}>
                  <Plus size={15} />
                  <span>Add</span>
                </button>
              </div>

              <KanbanBoard
                t={t}
                stages={CANDIDATE_PIPELINE}
                stageColors={CANDIDATE_STAGE_COLOR}
                items={activeSearch.candidates ?? []}
                emptyLabel="Empty"
                onMove={(candidate, stage) => onMoveCandidate(activeSearch.id, candidate, stage)}
                renderCard={(candidate, stageColor) => (
                  <CandidateCard
                    candidate={candidate}
                    t={t}
                    stageColor={stageColor}
                    onDelete={() => onDeleteCandidate(activeSearch.id, candidate.id)}
                  />
                )}
              />

              {(activeSearch.candidates ?? []).length === 0 ? (
                <div className="avid-search-empty avid-search-empty--inline" style={{ color: t.mutedSoft }}>
                  No candidates yet — add one above or import from LinkedIn.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {(showNewForm || editingSearch) && (
        <SearchFormModal
          S={S}
          t={t}
          teamNames={teamNames}
          user={user}
          initial={editingSearch ?? undefined}
          onClose={() => {
            setEditingSearch(null);
            onCloseNewForm();
          }}
          onSave={async (search) => {
            await onSaveSearch(search, !editingSearch);
            setEditingSearch(null);
            onCloseNewForm();
          }}
        />
      )}
    </div>
  );
}
