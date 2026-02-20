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

/** Determine node level: act (has children) = 1, scene (leaf) = 2 */
function getNodeLevel(node: TreeNode): 'act' | 'scene' {
  return node.children && node.children.length > 0 ? 'act' : 'scene';
}

const LEVEL_STYLES = {
  act: {
    active: 'bg-primary/10 border border-primary/25 text-foreground font-semibold',
    inactive: 'text-foreground/80 hover:text-foreground hover:bg-primary/5',
    indicator: 'w-1 h-4 rounded-full bg-primary/60',
  },
  scene: {
    active: 'bg-parchment-warm border border-scarlet-glow/20 text-foreground',
    inactive: 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
    indicator: 'w-1 h-3 rounded-full bg-muted-foreground/20',
  },
};

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
  const level = getNodeLevel(node);
  const hasChildren = node.children && node.children.length > 0;
  const styles = LEVEL_STYLES[level];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`animate-fade-in ${isDragging ? 'z-50 relative' : ''}`}
      role="treeitem"
      aria-selected={isActive}
      aria-expanded={hasChildren ? !collapsed : undefined}
      aria-label={node.label}
    >
      <div
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-all duration-300 ${
          isDragging ? 'shadow-elevated ring-1 ring-primary/20 bg-card scale-[1.02]' : ''
        } ${isActive ? styles.active : styles.inactive}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Level indicator bar */}
        <div className={styles.indicator} aria-hidden="true" />

        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors touch-none p-0.5"
          aria-label={`拖拽排序 ${node.label}`}
        >
          <GripVertical size={12} strokeWidth={1.5} />
        </button>

        {hasChildren && (
          <button
            onClick={onToggle}
            className="p-0.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            aria-label={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? <ChevronRight size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
          </button>
        )}

        <button
          onClick={() => { playClick(); onSelect(node.id); }}
          className="flex-1 text-left font-serif-cn truncate"
        >
          {node.label}
        </button>

        {/* Level badge */}
        {level === 'act' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0" aria-hidden="true">
            幕
          </span>
        )}
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
              <div role="group" aria-label={`${parent.label} 的子项`}>
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
    <div role="tree" aria-label="脚本结构导航">
      <p className="text-xs text-muted-foreground/50 mb-4 uppercase tracking-widest">脚本结构</p>
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground/40">
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 rounded-full bg-primary/60" aria-hidden="true" />
          幕
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 rounded-full bg-muted-foreground/20" aria-hidden="true" />
          场景
        </span>
      </div>
      {renderGroup(tree, 0)}
    </div>
  );
}
