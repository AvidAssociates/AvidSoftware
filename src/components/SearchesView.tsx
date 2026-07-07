"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2, X } from "lucide-react";
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

type Styles = ReturnType<typeof makeStyles>;

type PipelineDef<T extends string> = { key: T; label: string };
type ColorMap<T extends string> = Record<T, string>;

function KanbanBoard<T extends string, Item extends { id: string; stage: T }>({
  t,
  S,
  stages,
  stageColors,
  items,
  renderCard,
  onMove,
  onCardClick,
  emptyLabel,
  boardLabel,
}: {
  t: Theme;
  S: Styles;
  stages: PipelineDef<T>[];
  stageColors: ColorMap<T>;
  items: Item[];
  renderCard: (item: Item) => ReactNode;
  onMove: (item: Item, stage: T) => void;
  onCardClick?: (item: Item) => void;
  emptyLabel?: string;
  boardLabel?: string;
}) {
  // Pointer-based dragging (not native HTML5 DnD) so the card can follow the
  // cursor 1:1 with a real "lift" animation -- native DnD's browser-drawn
  // ghost can't be smoothly scaled/shadowed like this. A move only "commits"
  // once the pointer has traveled past a small threshold, so a plain click
  // (to open a search, or hit the delete icon on a candidate card) still
  // works without accidentally starting a drag.
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
    // Only suppress a click that lands in the same synchronous burst as this
    // pointerup (the "ghost click" some browsers fire on the release
    // target) -- clearing it on a timeout, rather than waiting for whatever
    // card gets clicked next, so an unrelated later click on a different
    // card never gets eaten by a drag that already ended.
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);
    if (dropStage && dropStage !== pending.item.stage) onMove(pending.item, dropStage);
    // Let the ghost fade/shrink back before unmounting, instead of just
    // vanishing the instant the pointer lifts.
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
    <div>
      {boardLabel ? (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, fontWeight: 600, color: t.mutedSoft, letterSpacing: 0.2 }}>
          {boardLabel}
        </p>
      ) : null}
      <div className="avid-kanban-board">
        {stages.map((stage) => {
          const columnItems = byStage.get(stage.key) ?? [];
          const color = stageColors[stage.key];
          const isOver = dragOverStage === stage.key;
          return (
            <div
              key={stage.key}
              className="avid-kanban-column"
              data-kanban-stage={stage.key}
              style={{
                background: t.surfaceAlt,
                borderColor: isOver ? color : t.border,
                boxShadow: isOver ? `0 0 0 1px ${color}` : undefined,
              }}
            >
              <div className="avid-kanban-column-header" style={{ borderBottomColor: t.border }}>
                <span className="avid-kanban-column-dot" style={{ background: color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: t.ink }}>{stage.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: t.mutedSoft }}>
                  {columnItems.length}
                </span>
              </div>
              <div className="avid-kanban-column-body">
                {columnItems.length === 0 ? (
                  <div className="avid-kanban-drop-hint" style={{ color: t.mutedSoft }}>
                    {emptyLabel ?? "Drop here"}
                  </div>
                ) : (
                  columnItems.map((item) => {
                    const isDragSource = drag?.item.id === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`avid-kanban-card${onCardClick ? " avid-kanban-card--clickable" : ""}${
                          isDragSource ? " avid-kanban-card--source" : ""
                        }`}
                        style={{ background: t.surface, borderColor: t.border, touchAction: "none" }}
                        onPointerDown={(e) => startPointerTracking(e, item)}
                      >
                        <div className="avid-kanban-card-drag" style={{ color: t.mutedSoft }} title="Drag to move">
                          <GripVertical size={14} />
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
                          {renderCard(item)}
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
            }}
          >
            <div className="avid-kanban-card-drag" style={{ color: t.mutedSoft }}>
              <GripVertical size={14} />
            </div>
            <div className="avid-kanban-card-body">{renderCard(drag.item)}</div>
          </div>,
          document.body
        )}
    </div>
  );
}

function TeamPills({ team, t }: { team: string[]; t: Theme }) {
  if (!team.length) return <span style={{ fontSize: 11.5, color: t.mutedSoft }}>Unassigned</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {team.map((name) => (
        <span
          key={name}
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 999,
            background: t.accentSoft,
            color: t.accentText,
          }}
        >
          {name}
        </span>
      ))}
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
      stage: initial?.stage ?? "signed",
      stageHistory: initial?.stageHistory ?? [{ stage: "signed", date }],
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
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [editingSearch, setEditingSearch] = useState<RetainedSearch | null>(null);
  const [newCandidateName, setNewCandidateName] = useState("");

  const activeSearch = activeSearchId ? searches.find((s) => s.id === activeSearchId) ?? null : null;

  if (activeSearch) {
    const candidates = activeSearch.candidates ?? [];
    return (
      <div style={{ padding: "20px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button className="avid-btn" style={S.segBtn} onClick={() => setActiveSearchId(null)}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{activeSearch.client}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: t.muted }}>
              {activeSearch.role || "Role TBD"} · Signed {fmtDate(activeSearch.date)}
              {activeSearch.retainerAmount != null ? ` · ${money(activeSearch.retainerAmount)} retainer` : ""}
            </p>
          </div>
          <TeamPills team={activeSearch.team} t={t} />
          <button
            className="avid-btn"
            style={S.segBtn}
            onClick={() => {
              setEditingSearch(activeSearch);
            }}
          >
            Edit search
          </button>
          <button
            className="avid-btn"
            style={S.iconGhost}
            title="Delete search"
            onClick={() => {
              if (window.confirm(`Delete search for ${activeSearch.client}?`)) {
                onDeleteSearch(activeSearch.id);
                setActiveSearchId(null);
              }
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            style={{ ...S.input, flex: 1, minWidth: 180 }}
            placeholder="Add candidate name…"
            value={newCandidateName}
            onChange={(e) => setNewCandidateName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter" || !newCandidateName.trim()) return;
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
            }}
          />
          <button
            className="avid-btn"
            style={S.primaryBtn}
            disabled={!newCandidateName.trim()}
            onClick={async () => {
              if (!newCandidateName.trim()) return;
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
            }}
          >
            <Plus size={15} /> Add candidate
          </button>
        </div>

        <KanbanBoard
          t={t}
          S={S}
          stages={CANDIDATE_PIPELINE}
          stageColors={CANDIDATE_STAGE_COLOR}
          items={candidates}
          boardLabel="Candidate pipeline — drag cards between stages for this search only"
          emptyLabel="No candidates"
          onMove={(candidate, stage) => onMoveCandidate(activeSearch.id, candidate, stage)}
          renderCard={(candidate) => (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {candidate.profileImageUrl ? (
                <img
                  src={candidate.profileImageUrl}
                  alt=""
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: t.accentSoft,
                    color: t.accentText,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {candidate.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{candidate.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: t.mutedSoft }}>Added {fmtDate(candidate.stageHistory[0]?.date ?? "")}</span>
                  <button
                    type="button"
                    className="avid-btn"
                    style={{ ...S.iconGhost, padding: 4 }}
                    title="Remove candidate"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCandidate(activeSearch.id, candidate.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        />

        {candidates.length === 0 ? (
          <div style={{ ...S.empty, paddingTop: 20, paddingBottom: 0 }}>
            No candidates yet — add one above, then drag the card across the pipeline.
          </div>
        ) : null}

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

  return (
    <div style={{ padding: "20px 24px 32px" }}>
      {searches.length === 0 && totalCount > 0 ? (
        <div style={{ ...S.empty, paddingBottom: 16 }}>Nothing matches these filters.</div>
      ) : null}

      <KanbanBoard
        t={t}
        S={S}
        stages={SEARCH_PIPELINE}
        stageColors={SEARCH_STAGE_COLOR}
        items={searches}
        boardLabel="Search pipeline — click a search to open its candidates"
        emptyLabel="Drop search here"
        onMove={(search, stage) => onMoveSearch(search, stage)}
        onCardClick={(search) => setActiveSearchId(search.id)}
        renderCard={(search) => (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4, letterSpacing: -0.2 }}>{search.client}</div>
            <div style={{ fontSize: 13, color: t.muted, marginBottom: 8 }}>{search.role || "Role TBD"}</div>
            <TeamPills team={search.team} t={t} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11.5, color: t.mutedSoft }}>
              <span>Signed {fmtDate(search.date)}</span>
              {search.retainerAmount != null ? <span>{money(search.retainerAmount)}</span> : null}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: t.accentText, fontWeight: 600 }}>
              {(search.candidates ?? []).length} candidate{(search.candidates ?? []).length === 1 ? "" : "s"} · Open →
            </div>
          </div>
        )}
      />

      {totalCount === 0 ? (
        <div style={{ ...S.empty, paddingTop: 20, paddingBottom: 0 }}>
          No searches yet — click <strong>New</strong> to add a retained search to the Signed column.
        </div>
      ) : null}

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
