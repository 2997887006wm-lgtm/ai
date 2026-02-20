import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { playClick, playDrop } from '@/utils/audio';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

interface DraggableScriptTreeProps {
  tree: TreeNode;
  activeId: string | null;
  onSelect: (id: string) => void;
  onReorder: (parentId: string, activeId: string, overId: string) => void;
}

function SortableTreeItem({ node, depth, activeId, onSelect, collapsed, onToggle }: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const isActive = activeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="animate-fade-in" >
      <div
        className={`flex items-center gap-1 px-2 py-2 rounded-lg text-sm transition-all duration-300 ${
          isActive
            ? 'bg-parchment-warm border border-scarlet-glow/20 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors touch-none p-0.5"
          aria-label="拖拽排序"
        >
          <GripVertical size={12} strokeWidth={1.5} />
        </button>

        {hasChildren && (
          <button onClick={onToggle} className="p-0.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
            {collapsed ? <ChevronRight size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
          </button>
        )}

        <button
          onClick={() => { playClick(); onSelect(node.id); }}
          className="flex-1 text-left font-serif-cn truncate"
        >
          {node.label}
        </button>
      </div>
    </div>
  );
}

export function DraggableScriptTree({ tree, activeId, onSelect, onReorder }: DraggableScriptTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Flatten visible nodes for sortable context (grouped by parent)
  const renderGroup = (parent: TreeNode, depth: number) => {
    const children = parent.children || [];
    const isCollapsed = collapsed[parent.id];

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        playDrop();
        onReorder(parent.id, active.id as string, over.id as string);
      }
    };

    return (
      <div key={parent.id}>
        {depth > 0 && (
          <SortableTreeItem
            node={parent}
            depth={depth - 1}
            activeId={activeId}
            onSelect={onSelect}
            collapsed={isCollapsed}
            onToggle={() => toggleCollapse(parent.id)}
          />
        )}
        {!isCollapsed && children.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div>
                {children.map(child =>
                  child.children && child.children.length > 0
                    ? renderGroup(child, depth + 1)
                    : (
                      <SortableTreeItem
                        key={child.id}
                        node={child}
                        depth={depth}
                        activeId={activeId}
                        onSelect={onSelect}
                        collapsed={false}
                        onToggle={() => {}}
                      />
                    )
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground/50 mb-4 uppercase tracking-widest">脚本结构</p>
      {renderGroup(tree, 0)}
    </div>
  );
}
