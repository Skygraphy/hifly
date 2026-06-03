import { useState, KeyboardEvent } from 'react';
import { TagBadge } from './TagBadge';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Tag hinzufügen…', suggestions = [], className }: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  ).slice(0, 8);

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="flex flex-wrap gap-1.5 p-2 bg-base-300 border border-base-content/10 rounded-lg min-h-[42px] focus-within:border-primary/50 transition-colors">
        {tags.map((tag) => (
          <TagBadge key={tag} tag={tag} onRemove={() => removeTag(tag)} active />
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Auto-confirm any typed tag when focus leaves (e.g. user clicks Upload)
            if (input.trim()) addTag(input);
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-base-content placeholder-base-content/30"
        />
      </div>
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-200 border border-base-content/10 rounded-lg shadow-xl overflow-hidden">
          {filtered.map((s) => (
            <li
              key={s}
              onMouseDown={() => addTag(s)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
