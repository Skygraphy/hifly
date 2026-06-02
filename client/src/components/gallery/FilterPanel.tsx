import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGalleryStore } from '../../stores/galleryStore';
import { fetchTags } from '../../api/tags';
import { TagBadge } from '../common/TagBadge';

export function FilterPanel() {
  const { filterTags, filterAddress, setFilterTags, setFilterAddress, clearSelection } = useGalleryStore();
  const [addressInput, setAddressInput] = useState(filterAddress);
  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });

  const allTags = tagData ?? [];
  const hasFilters = filterTags.length > 0 || filterAddress;

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

  function clearFilters() {
    setFilterTags([]);
    setFilterAddress('');
    setAddressInput('');
    clearSelection();
  }

  return (
    <aside className="w-64 shrink-0 space-y-5">
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
          {filterTags.length > 0 && (
            <span className="ml-1 text-primary">(AND-Filter)</span>
          )}
        </h3>
        {allTags.length === 0 ? (
          <p className="text-xs text-base-content/30">Keine Tags vorhanden</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
            {allTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="flex items-center gap-1"
              >
                <TagBadge
                  tag={`${tag} (${count})`}
                  active={filterTags.includes(tag)}
                />
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
