import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRegionTree, createRegion, updateRegion, deleteRegion,
  REGION_LEVEL_LABELS,
  type RegionNode, type RegionLevel,
} from '../api/regions';

// ─── helpers ────────────────────────────────────────────────────────────────

function countDescendants(node: RegionNode): number {
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}

function flatNodes(
  nodes: RegionNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((n) => [
    { id: n.id, name: n.name, depth },
    ...flatNodes(n.children, depth + 1),
  ]);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminRegionsPage() {
  const queryClient = useQueryClient();

  // create-form state
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<RegionLevel>('municipality');
  const [formError, setFormError] = useState('');

  // delete-dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ node: RegionNode; descCount: number } | null>(null);

  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
  });

  const flat = flatNodes(tree);

  const createMutation = useMutation({
    mutationFn: () =>
      createRegion(
        newName.trim(),
        parentId,
        selectedLevel,
        newCode.trim() || null,
        newShortName.trim() || null,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setNewName('');
      setNewShortName('');
      setNewCode('');
      setParentId(null);
      setFormError('');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setFormError(msg ?? 'Fehler beim Anlegen');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) => deleteRegion(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setFormError(msg ?? 'Löschen nicht möglich');
      setDeleteTarget(null);
    },
  });

  function handleDeleteClick(node: RegionNode) {
    setFormError('');
    const descCount = countDescendants(node);
    if (descCount > 0) {
      setDeleteTarget({ node, descCount });
    } else {
      deleteMutation.mutate({ id: node.id, force: false });
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold signal-text">Regionen verwalten</h1>
        <p className="text-base-content/40 text-sm mt-1">
          Geografische Hierarchie für Bildkategorisierung.
        </p>
      </div>

      {/* ── Create form ── */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-base-content mb-4">Neue Region</h2>
        <div className="flex gap-2 items-center">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as RegionLevel)}
            className="select select-sm select-bordered bg-base-300 w-44 shrink-0 !py-0"
          >
            {(Object.keys(REGION_LEVEL_LABELS) as RegionLevel[]).map((lvl) => (
              <option key={lvl} value={lvl}>{REGION_LEVEL_LABELS[lvl]}</option>
            ))}
          </select>
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.slice(0, 20))}
            placeholder="Code"
            className="input input-sm input-bordered bg-base-300 w-24 font-mono shrink-0"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="input input-sm input-bordered bg-base-300 flex-1 min-w-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) createMutation.mutate();
            }}
          />
          <input
            type="text"
            value={newShortName}
            onChange={(e) => setNewShortName(e.target.value.slice(0, 50))}
            placeholder="Kurzbezeichnung"
            className="input input-sm input-bordered bg-base-300 w-36 shrink-0"
          />
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="select select-sm select-bordered bg-base-300 w-48 shrink-0 !py-0"
          >
            <option value="">— Kein Elternteil</option>
            {flat.map((n) => (
              <option key={n.id} value={n.id}>
                {'  '.repeat(n.depth)}{n.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="btn btn-primary btn-sm shrink-0"
          >
            {createMutation.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              'Anlegen'
            )}
          </button>
        </div>
        {formError && <p className="text-xs text-error mt-2">{formError}</p>}
      </div>

      {/* ── Region tree ── */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner text-primary" />
        </div>
      ) : tree.length === 0 ? (
        <p className="text-base-content/30 text-sm text-center py-8">
          Noch keine Regionen angelegt
        </p>
      ) : (
        <div className="bg-base-200 border border-base-content/8 rounded-2xl overflow-hidden">
          <RegionList
            nodes={tree}
            depth={0}
            onDelete={handleDeleteClick}
            queryClient={queryClient}
          />
        </div>
      )}

      {/* ── Cascade-delete confirmation dialog ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base-content mb-2">
              „{deleteTarget.node.name}" löschen?
            </h3>
            <p className="text-sm text-base-content/60 mb-5">
              Diese Region hat{' '}
              <span className="text-warning font-medium">
                {deleteTarget.descCount}{' '}
                {deleteTarget.descCount === 1 ? 'Unterregion' : 'Unterregionen'}
              </span>
              , die ebenfalls gelöscht werden. Alle zugeordneten Bilder verlieren ihre
              Regionszuordnung.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn btn-ghost btn-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={() =>
                  deleteMutation.mutate({ id: deleteTarget.node.id, force: true })
                }
                disabled={deleteMutation.isPending}
                className="btn btn-error btn-sm"
              >
                {deleteMutation.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  'Endgültig löschen'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Region tree list ────────────────────────────────────────────────────────

interface RegionListProps {
  nodes: RegionNode[];
  depth: number;
  onDelete: (node: RegionNode) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

function RegionList({ nodes, depth, onDelete, queryClient }: RegionListProps) {
  return (
    <>
      {nodes.map((node) => (
        <RegionRow
          key={node.id}
          node={node}
          depth={depth}
          onDelete={onDelete}
          queryClient={queryClient}
        />
      ))}
    </>
  );
}

// ─── Single region row with inline edit ──────────────────────────────────────

interface RegionRowProps {
  node: RegionNode;
  depth: number;
  onDelete: (node: RegionNode) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

function RegionRow({ node, depth, onDelete, queryClient }: RegionRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editShortName, setEditShortName] = useState(node.short_name ?? '');
  const [editCode, setEditCode] = useState(node.code ?? '');
  const [editLevel, setEditLevel] = useState<RegionLevel>(node.level);
  const [editError, setEditError] = useState('');

  const updateMutation = useMutation({
    mutationFn: () =>
      updateRegion(node.id, {
        name: editName.trim() || undefined,
        shortName: editShortName.trim() || null,
        code: editCode.trim() || null,
        level: editLevel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setEditing(false);
      setEditError('');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      setEditError(msg ?? 'Fehler beim Speichern');
    },
  });

  function openEdit() {
    setEditName(node.name);
    setEditShortName(node.short_name ?? '');
    setEditCode(node.code ?? '');
    setEditLevel(node.level);
    setEditError('');
    setEditing(true);
  }

  return (
    <div>
      {/* ── Display row ── */}
      <div
        className="group flex items-center justify-between px-4 py-2.5 border-b border-base-content/5 hover:bg-base-300/30"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <span className="text-sm text-base-content flex items-center gap-2 min-w-0">
          {depth > 0 && <span className="text-base-content/30 shrink-0">└</span>}
          <span className="truncate">{node.name}</span>
          {node.short_name && (
            <span className="text-base-content/40 text-xs truncate">({node.short_name})</span>
          )}
          <span className="text-[10px] text-base-content/20 uppercase tracking-wide shrink-0">
            {REGION_LEVEL_LABELS[node.level]}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {node.code && (
            <span
              className="font-mono text-[10px] px-1.5 py-px rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(255,173,59,0.1))',
                border: '1px solid rgba(255,142,83,0.3)',
                color: 'rgba(255,210,170,0.65)',
              }}
            >
              {node.code}
            </span>
          )}
          <button
            onClick={openEdit}
            className="btn btn-ghost btn-xs text-base-content/30 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            title="Bearbeiten"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(node)}
            className="btn btn-ghost btn-xs text-error/50 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
            title="Löschen"
          >
            Löschen
          </button>
        </span>
      </div>

      {/* ── Inline edit form ── */}
      {editing && (
        <div
          className="border-b border-base-content/5 bg-base-300/20 px-4 py-3 space-y-2"
          style={{ paddingLeft: `${16 + depth * 20 + 16}px` }}
        >
          <div className="flex gap-2 items-center">
            <select
              value={editLevel}
              onChange={(e) => setEditLevel(e.target.value as RegionLevel)}
              className="select select-sm select-bordered bg-base-300 w-44 shrink-0 !py-0"
            >
              {(Object.keys(REGION_LEVEL_LABELS) as RegionLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>{REGION_LEVEL_LABELS[lvl]}</option>
              ))}
            </select>
            <input
              type="text"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value.slice(0, 20))}
              placeholder="Code"
              className="input input-sm input-bordered bg-base-300 w-24 font-mono shrink-0"
            />
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Name"
              className="input input-sm input-bordered bg-base-300 flex-1 min-w-0"
            />
            <input
              type="text"
              value={editShortName}
              onChange={(e) => setEditShortName(e.target.value.slice(0, 50))}
              placeholder="Kurzbezeichnung"
              className="input input-sm input-bordered bg-base-300 w-36 shrink-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!editName.trim() || updateMutation.isPending}
              className="btn btn-primary btn-sm"
            >
              {updateMutation.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Speichern'
              )}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn btn-ghost btn-sm"
            >
              Abbrechen
            </button>
            {editError && <span className="text-xs text-error">{editError}</span>}
          </div>
        </div>
      )}

      {/* ── Children ── */}
      {node.children.length > 0 && (
        <RegionList
          nodes={node.children}
          depth={depth + 1}
          onDelete={onDelete}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}
