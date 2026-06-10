import { useState } from 'react';
import type { RegionNode } from '../../api/regions';

interface RegionTreePickerProps {
  nodes: RegionNode[];
  selectedId: string | null;
  onSelect: (node: RegionNode | null) => void;
}

export function RegionTreePicker({ nodes, selectedId, onSelect }: RegionTreePickerProps) {
  if (nodes.length === 0) {
    return <p className="text-xs text-base-content/30">Keine Regionen vorhanden</p>;
  }
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <RegionTreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </ul>
  );
}

interface NodeProps {
  node: RegionNode;
  selectedId: string | null;
  onSelect: (node: RegionNode | null) => void;
  depth: number;
}

function RegionTreeNode({ node, selectedId, onSelect, depth }: NodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-sm transition-colors
          ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-base-300 text-base-content/70'}
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-4 h-4 flex items-center justify-center text-base-content/40 hover:text-base-content shrink-0"
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 h-4 shrink-0 flex items-center justify-center text-base-content/20">○</span>
        )}
        <span
          className="flex-1 flex items-center justify-between min-w-0 pr-1"
          onClick={() => onSelect(isSelected ? null : node)}
        >
          <span className="truncate">{node.name}</span>
          {node.code && (
            <span
              className="ml-2 shrink-0 font-mono text-[10px] px-1.5 py-px rounded opacity-0 group-hover:opacity-100 translate-x-1.5 group-hover:translate-x-0 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(255,173,59,0.1))',
                border: '1px solid rgba(255,142,83,0.3)',
                color: 'rgba(255,210,170,0.65)',
              }}
            >
              {node.code}
            </span>
          )}
        </span>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <RegionTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
