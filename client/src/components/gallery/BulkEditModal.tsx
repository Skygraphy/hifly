import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TagInput } from '../common/TagInput';
import { RegionTreePicker } from '../common/RegionTreePicker';
import { fetchRegionTree, findRegion, type RegionNode } from '../../api/regions';
import { fetchTags } from '../../api/tags';
import { bulkUpdateRegion, bulkUpdateTags } from '../../api/images';

type RegionAction = 'keep' | 'set' | 'remove';
type TagAction = 'keep' | 'replace' | 'merge';

interface BulkEditModalProps {
  ids: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function BulkEditModal({ ids, onClose, onSaved }: BulkEditModalProps) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [regionAction, setRegionAction] = useState<RegionAction>('keep');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const [tagAction, setTagAction] = useState<TagAction>('keep');
  const [tags, setTags] = useState<string[]>([]);

  const { data: regionTree = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegionTree,
    staleTime: 300000,
  });

  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });
  const tagSuggestions = tagData?.map((t) => t.tag) ?? [];

  const selectedRegion: RegionNode | null = selectedRegionId ? findRegion(regionTree, selectedRegionId) : null;

  const hasChanges = regionAction !== 'keep' || tagAction !== 'keep';

  async function handleSave() {
    setSaving(true);
    try {
      const ops: Promise<void>[] = [];

      if (regionAction === 'set' && selectedRegionId) {
        ops.push(bulkUpdateRegion(ids, selectedRegionId));
      } else if (regionAction === 'remove') {
        ops.push(bulkUpdateRegion(ids, null));
      }

      if (tagAction === 'replace') {
        ops.push(bulkUpdateTags(ids, tags, 'replace'));
      } else if (tagAction === 'merge') {
        ops.push(bulkUpdateTags(ids, tags, 'merge'));
      }

      await Promise.all(ops);
      queryClient.invalidateQueries({ queryKey: ['images'] });
      if (tagAction !== 'keep') queryClient.invalidateQueries({ queryKey: ['tags'] });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-content/8">
          <h2 className="font-semibold text-base-content">
            Bulk bearbeiten —{' '}
            <span className="signal-text">{ids.length}</span>{' '}
            {ids.length === 1 ? 'Bild' : 'Bilder'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/50">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Region section */}
          <div>
            <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Region</h3>
            <div className="space-y-2">
              {(['keep', 'set', 'remove'] as RegionAction[]).map((action) => (
                <label key={action} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="regionAction"
                    className="radio radio-sm radio-primary"
                    checked={regionAction === action}
                    onChange={() => setRegionAction(action)}
                  />
                  <span className="text-sm text-base-content/80">
                    {action === 'keep' && 'Nicht ändern'}
                    {action === 'set' && 'Region zuweisen'}
                    {action === 'remove' && 'Region entfernen'}
                  </span>
                </label>
              ))}
            </div>

            {regionAction === 'set' && (
              <div className="mt-3">
                {selectedRegion && (
                  <p className="text-xs text-primary mb-1.5 px-1">
                    Ausgewählt: {selectedRegion.name}
                  </p>
                )}
                <div className="max-h-48 overflow-y-auto border border-base-content/8 rounded-lg p-2 bg-base-300">
                  <RegionTreePicker
                    nodes={regionTree}
                    selectedId={selectedRegionId}
                    onSelect={(node) => setSelectedRegionId(node?.id ?? null)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="divider my-0 opacity-30" />

          {/* Tags section */}
          <div>
            <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Tags</h3>
            <div className="space-y-2">
              {(['keep', 'replace', 'merge'] as TagAction[]).map((action) => (
                <label key={action} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tagAction"
                    className="radio radio-sm radio-primary"
                    checked={tagAction === action}
                    onChange={() => setTagAction(action)}
                  />
                  <span className="text-sm text-base-content/80">
                    {action === 'keep' && 'Nicht ändern'}
                    {action === 'replace' && 'Ersetzen (alle vorhandenen Tags überschreiben)'}
                    {action === 'merge' && 'Hinzufügen (zu vorhandenen Tags ergänzen)'}
                  </span>
                </label>
              ))}
            </div>

            {(tagAction === 'replace' || tagAction === 'merge') && (
              <div className="mt-3">
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  suggestions={tagSuggestions}
                  placeholder="Tag eingeben…"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-content/8">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Abbruch
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || (regionAction === 'set' && !selectedRegionId)}
            className="btn btn-primary btn-sm"
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : null}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
