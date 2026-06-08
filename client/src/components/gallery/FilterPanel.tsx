import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGalleryStore } from '../../stores/galleryStore';
import { fetchTags } from '../../api/tags';
import { fetchRegionTree, type RegionNode } from '../../api/regions';
import { TagBadge } from '../common/TagBadge';
import { RegionTreePicker } from '../common/RegionTreePicker';

export function FilterPanel() {
  const {
    filterTags, filterAddress, filterRegionId, filterRegionPath,
    setFilterTags, setFilterAddress, setFilterRegion, clearSelection,
  } = useGalleryStore();
  const [addressInput, setAddressInput] = useState(filterAddress);

  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });
  const { data: regionTree = [] } = useQuery({ queryKey: ['regions'], queryFn: fetchRegionTree, staleTime: 300000 });

  const allTags = tagData ?? [];
  const hasFilters = filterTags.length > 0 || filterAddress || filterRegionId;

  function toggleTag(tag: string) {
    clearSelection();
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter((t) => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  }

  function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearSelection();
    setFilterAddress(addressInput.trim());
  }

  function handleRegionSelect(node: RegionNode | null) {
    clearSelection();
    if (!node) {
      setFilterRegion(null, []);
    } else {
      // Build breadcrumb path — the node name plus its ancestors from the tree
      setFilterRegion(node.id, [...filterRegionPath.slice(0, -1), node.name]);
    }
  }

  function clearFilters() {
    setFilterTags([]);
    setFilterAddress('');
    setAddressInput('');
    setFilterRegion(null, []);
    clearSelection();
  }

  return (
    <aside className="w-64 shrink-0 space-y-5">
      {/* Region filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Region</h3>
          {filterRegionId && (
            <button
              onClick={() => { setFilterRegion(null, []); clearSelection(); }}
              className="text-xs text-error/60 hover:text-error"
            >
              ×
            </button>
          )}
        </div>
        {filterRegionId && filterRegionPath.length > 0 && (
          <p className="text-xs text-primary mb-2 truncate">
            {filterRegionPath.join(' › ')}
          </p>
        )}
        <div className="max-h-48 overflow-y-auto">
          <RegionTreePicker
            nodes={regionTree}
            selectedId={filterRegionId}
            onSelect={(node) => {
              clearSelection();
              setFilterRegion(node?.id ?? null, node ? [node.name] : []);
            }}
          />
        </div>
      </div>

      {/* Address search */}
      <div>
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
          Adresse
        </h3>
        <form onSubmit={handleAddressSubmit}>
          <div className="relative">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Straße, Ort…"
              className="input input-sm input-bordered w-full bg-base-200 pr-8"
            />
            {addressInput && (
              <button
                type="button"
                onClick={() => { setAddressInput(''); setFilterAddress(''); clearSelection(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content"
              >
                ×
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-sm btn-outline w-full mt-2">Suchen</button>
        </form>
        {filterAddress && (
          <p className="text-xs text-primary mt-1 truncate">Aktiv: „{filterAddress}"</p>
        )}
      </div>

      {/* Tag filter */}
      <div>
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
          Tags
          {filterTags.length > 0 && <span className="ml-1 text-primary">(AND)</span>}
        </h3>
        {allTags.length === 0 ? (
          <p className="text-xs text-base-content/30">Keine Tags vorhanden</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
            {allTags.map(({ tag, count }) => (
              <button key={tag} onClick={() => toggleTag(tag)} className="flex items-center gap-1">
                <TagBadge tag={`${tag} (${count})`} active={filterTags.includes(tag)} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <button onClick={clearFilters} className="btn btn-ghost btn-xs w-full text-error/70">
          Filter zurücksetzen
        </button>
      )}
    </aside>
  );
}
