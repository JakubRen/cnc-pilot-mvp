'use client'

interface DrawingButtonProps {
  drawingFile: {
    url: string
    name: string
  } | null
}

export default function DrawingButton({ drawingFile }: DrawingButtonProps) {
  if (!drawingFile) {
    return null
  }

  return (
    <a
      href={drawingFile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 text-sm rounded-lg border border-violet-500 text-violet-400 hover:bg-violet-600 hover:text-white transition flex items-center gap-2 font-semibold"
      title={drawingFile.name}
    >
      <span>📐</span> Rysunek techniczny
    </a>
  )
}
