import { ChevronRight } from 'lucide-react';
import { playClick } from '@/utils/audio';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

interface ScriptTreeNodeProps {
  node: TreeNode;
  depth?: number;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ScriptTreeNode({ node, depth = 0, activeId, onSelect }: ScriptTreeNodeProps) {
  const isActive = activeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="animate-fade-in" style={{ animationDelay: `${depth * 80}ms`, animationFillMode: 'both' }}>
      <button
        onClick={() => { playClick(); onSelect(node.id); }}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
          isActive
            ? 'bg-parchment-warm border border-scarlet-glow/20 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren && (
          <ChevronRight size={12} strokeWidth={1.5} className="text-muted-foreground/30" />
        )}
        <span className="font-serif-cn">{node.label}</span>
      </button>
      {hasChildren && node.children!.map((child) => (
        <ScriptTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
