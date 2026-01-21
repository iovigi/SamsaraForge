import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableHabitWrapperProps {
    id: string;
    children: (listeners: any) => React.ReactNode;
}

export function SortableHabitWrapper({ id, children }: SortableHabitWrapperProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'manipulation', // Allow scrolling/zooming but optimize for touch
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children(listeners)}
        </div>
    );
}
