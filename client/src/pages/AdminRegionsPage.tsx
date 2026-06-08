import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRegionTree, createRegion, deleteRegion, type RegionNode } from '../api/regions';

export function AdminRegionsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: tree = [], isLoading } = useQuery({ queryKey: ['regions'], queryFn: fetchRegionTree });

  const createMutation = useMutation({
    mutationFn: () => createRegion(newName.trim(), parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setNewName('');
      setParentId(null);
      setError('');
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(msg ?? 'Fehler beim Anlegen');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRegion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regions'] }),
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(msg ?? 'Löschen nicht möglich');
    },
  });

  // Flatten tree for parent dropdown
  function flatNodes(nodes: RegionNode[], depth = 0): { id: string; name: string; depth: number }[] {
    return nodes.flatMap((n) => [{ id: n.id, name: n.name, depth }, ...flatNodes(n.children, depth + 1)]);
  }
  const flat = flatNodes(tree);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold signal-text">Regionen verwalten</h1>
        <p className="text-base-content/40 text-sm mt-1">Geografische Hierarchie für Bildkategorisierung.</p>
      </div>

      {/* Add region form */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-base-content mb-3">Neue Region</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (z.B. Klosterneuburg)"
            className="input input-sm input-bordered flex-1 bg-base-300"
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(); }}
          />
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="select select-sm select-bordered bg-base-300 w-48"
          >
            <option value="">— Wurzel (kein Elternteil)</option>
            {flat.map((n) => (
              <option key={n.id} value={n.id}>
                {'  '.repeat(n.depth)}{n.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="btn btn-primary btn-sm"
          >
            {createMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Anlegen'}
          </button>
        </div>
        {error && <p className="text-xs text-error mt-2">{error}</p>}
      </div>

      {/* Region tree */}
      {isLoading ? (
        <div className="flex justify-center py-8"><span className="loading loading-spinner text-primary" /></div>
      ) : tree.length === 0 ? (
        <p className="text-base-content/30 text-sm text-center py-8">Noch keine Regionen angelegt</p>
      ) : (
        <div className="bg-base-200 border border-base-content/8 rounded-2xl overflow-hidden">
          <RegionList
            nodes={tree}
            depth={0}
            onDelete={(id) => { setError(''); deleteMutation.mutate(id); }}
          />
        </div>
      )}
    </div>
  );
}

function RegionList({ nodes, depth, onDelete }: { nodes: RegionNode[]; depth: number; onDelete: (id: string) => void }) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b border-base-content/5 hover:bg-base-300/30"
            style={{ paddingLeft: `${16 + depth * 20}px` }}
          >
            <span className="text-sm text-base-content">
              {depth > 0 && <span className="text-base-content/30 mr-1">{'└ '.repeat(1)}</span>}
              {node.name}
            </span>
            {node.children.length === 0 && (
              <button
                onClick={() => onDelete(node.id)}
                className="btn btn-ghost btn-xs text-error/50 hover:text-error"
              >
                Löschen
              </button>
            )}
          </div>
          {node.children.length > 0 && (
            <RegionList nodes={node.children} depth={depth + 1} onDelete={onDelete} />
          )}
        </div>
      ))}
    </>
  );
}
