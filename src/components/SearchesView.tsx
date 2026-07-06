"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
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
}) {
  const [dragOver, setDragOver] = useState<T | null>(null);
  const dragItemRef = useRef<Item | null>(null);
  const draggedRef = useRef(false);

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

  return (
    <div className="avid-kanban-board">
      {stages.map((stage) => {
        const columnItems = byStage.get(stage.key) ?? [];
        const color = stageColors[stage.key];
        const isOver = dragOver === stage.key;
        return (
          <div
            key={stage.key}
            className="avid-kanban-column"
            style={{
              background: t.surfaceAlt,
              borderColor: isOver ? color : t.border,
              boxShadow: isOver ? `0 0 0 1px ${color}` : undefined,
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage.key);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === stage.key ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const item = dragItemRef.current;
              if (!item || item.stage === stage.key) return;
              onMove(item, stage.key);
              dragItemRef.current = null;
            }}
          >
            <div className="avid-kanban-column-header">
              <span className="avid-kanban-column-dot" style={{ background: color }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: t.ink }}>{stage.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: t.mutedSoft }}>
                {columnItems.length}
              </span>
            </div>
            <div className="avid-kanban-column-body">
              {columnItems.length === 0 ? (
                <div style={{ fontSize: 12, color: t.mutedSoft, padding: "8px 4px", textAlign: "center" }}>
                  {emptyLabel ?? "Drop here"}
                </div>
              ) : (
                columnItems.map((item) => (
                  <div
                    key={item.id}
                    className="avid-kanban-card"
                    style={{ background: t.surface, borderColor: t.border }}
                    draggable
                    onDragStart={() => {
                      draggedRef.current = true;
                      dragItemRef.current = item;
                    }}
                    onDragEnd={() => {
                      dragItemRef.current = null;
                      window.setTimeout(() => {
                        draggedRef.current = false;
                      }, 0);
                    }}
                    onClick={() => {
                      if (draggedRef.current) return;
                      onCardClick?.(item);
                    }}
                  >
                    {renderCard(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
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
              };
              await onSaveCandidate(activeSearch.id, candidate, true);
              setNewCandidateName("");
            }}
          >
            <Plus size={15} /> Add candidate
          </button>
        </div>

        {candidates.length === 0 ? (
          <div style={S.empty}>No candidates yet — add the first one above.</div>
        ) : (
          <KanbanBoard
            t={t}
            S={S}
            stages={CANDIDATE_PIPELINE}
            stageColors={CANDIDATE_STAGE_COLOR}
            items={candidates}
            emptyLabel="No candidates"
            onMove={(candidate, stage) => onMoveCandidate(activeSearch.id, candidate, stage)}
            renderCard={(candidate) => (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{candidate.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: t.mutedSoft }}>Added {fmtDate(candidate.stageHistory[0]?.date ?? "")}</span>
                  <button
                    className="avid-btn"
                    style={{ ...S.iconGhost, padding: 4 }}
                    title="Remove candidate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCandidate(activeSearch.id, candidate.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          />
        )}

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
      {searches.length === 0 ? (
        <div style={S.empty}>
          {totalCount === 0 ? "No searches yet — add the first retained search." : "Nothing matches these filters."}
        </div>
      ) : (
        <KanbanBoard
          t={t}
          S={S}
          stages={SEARCH_PIPELINE}
          stageColors={SEARCH_STAGE_COLOR}
          items={searches}
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
                {(search.candidates ?? []).length} candidate{(search.candidates ?? []).length === 1 ? "" : "s"}
              </div>
            </div>
          )}
        />
      )}

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
