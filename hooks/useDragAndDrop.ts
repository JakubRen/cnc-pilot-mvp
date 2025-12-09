import { useState, useRef, DragEvent } from 'react'

interface UseDragAndDropOptions<T> {
  items: T[]
  onReorder: (items: T[]) => void
  getId: (item: T) => string | number
}

export function useDragAndDrop<T>({
  items,
  onReorder,
  getId,
}: UseDragAndDropOptions<T>) {
  const [draggedItem, setDraggedItem] = useState<T | null>(null)
  const draggedIndexRef = useRef<number>(-1)

  const handleDragStart = (item: T, index: number) => (e: DragEvent) => {
    setDraggedItem(item)
    draggedIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault()
    if (draggedIndexRef.current === index) return

    const newItems = [...items]
    const draggedIndex = draggedIndexRef.current
    const dragItem = newItems[draggedIndex]

    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, dragItem)

    draggedIndexRef.current = index
    onReorder(newItems)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    draggedIndexRef.current = -1
  }

  const isDragging = (item: T) => {
    return draggedItem !== null && getId(draggedItem) === getId(item)
  }

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isDragging,
    draggedItem,
  }
}
