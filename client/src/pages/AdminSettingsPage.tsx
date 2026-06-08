import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateSetting, type AppSetting } from '../api/settings';
import { fetchRegionTree, type RegionNode } from '../api/regions';
import { RegionTreePicker } from '../components/common/RegionTreePicker';
import { useAuth } from '../hooks/useAuth';

function findRegionById(nodes: RegionNode[], id: string): RegionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findRegionById(n.children, id);
    if (found) return found;
  }
  return null;
}

function buildBreadcrumb(nodes: RegionNode[], id: string): string[] {
  function search(list: RegionNode[], path: string[]): string[] | null {
    for (const n of list) {
      const curr = [...path, n.name];
      if (n.id === id) return curr;
      const found = search(n.children, curr);
      if (found) return found;
    }
    return null;
  }
  return search(nodes, []) ?? [];
}

interface SettingRowProps {
  setting: AppSetting;
  regionTree: RegionNode[];
  canEdit: boolean;
}

function SettingRow({ setting, regionTree, canEdit }: SettingRowProps) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(setting.value);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (value: unknown) => updateSetting(setting.key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const isDirty = JSON.stringify(localValue) !== JSON.stringify(setting.value);

  return (
    <div className="p-5 bg-base-200 border border-base-content/8 rounded-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-base-content">{setting.label}</h3>
          {setting.description && (
            <p className="text-xs text-base-content/40 mt-0.5">{setting.description}</p>
          )}
        </div>

        {/* Value widget */}
        <div className="shrink-0">
          {setting.type === 'boolean' && (
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={Boolean(localValue)}
              onChange={(e) => {
                setLocalValue(e.target.checked);
                if (canEdit) mutation.mutate(e.target.checked);
              }}
              disabled={!canEdit || mutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Region picker — shown below the header row */}
      {setting.type === 'region' && (
        <div className="mt-3">
          {localValue && localValue !== null && typeof localValue === 'string' && (
            <p className="text-xs text-primary mb-2">
              Aktiv: {buildBreadcrumb(regionTree, localValue as string).join(' › ')}
            </p>
          )}
          {canEdit && (
            <div className="max-h-48 overflow-y-auto border border-base-content/8 rounded-xl p-2 bg-base-300">
              <button
                onClick={() => setLocalValue(null)}
                className="w-full text-left text-xs text-error/60 hover:text-error px-2 py-1 mb-1"
              >
                ✕ Keine Standard-Region
              </button>
              <RegionTreePicker
                nodes={regionTree}
                selectedId={typeof localValue === 'string' ? localValue : null}
                onSelect={(node) => setLocalValue(node?.id ?? null)}
              />
            </div>
          )}
          {!canEdit && (
            <p className="text-xs text-base-content/40">
              {localValue
                ? buildBreadcrumb(regionTree, localValue as string).join(' › ') || String(localValue)
                : 'Keine Standard-Region'}
            </p>
          )}
        </div>
      )}

      {/* Save button for non-boolean/non-toggle types */}
      {setting.type !== 'boolean' && canEdit && isDirty && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => mutation.mutate(localValue)}
            disabled={mutation.isPending}
            className="btn btn-primary btn-xs"
          >
            {mutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Speichern'}
          </button>
          <button
            onClick={() => setLocalValue(setting.value)}
            className="btn btn-ghost btn-xs"
          >
            Abbrechen
          </button>
        </div>
      )}

      {saved && (
        <p className="text-xs text-success mt-2">✓ Gespeichert</p>
      )}
      {mutation.isError && (
        <p className="text-xs text-error mt-2">Fehler beim Speichern</p>
      )}
    </div>
  );
}

export function AdminSettingsPage() {
  const { isSuperAdmin } = useAuth();
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 30000,
  });
  const { data: regionTree = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
    staleTime: 300000,
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold signal-text">Einstellungen</h1>
        <p className="text-base-content/40 text-sm mt-1">
          {isSuperAdmin ? 'Globale App-Einstellungen verwalten.' : 'Globale App-Einstellungen (nur Ansicht).'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : settings.length === 0 ? (
        <p className="text-base-content/30 text-sm text-center py-8">Keine Einstellungen verfügbar</p>
      ) : (
        <div className="space-y-4">
          {settings.map((s) => (
            <SettingRow
              key={s.key}
              setting={s}
              regionTree={regionTree}
              canEdit={isSuperAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
