import { useRef, useEffect, useState } from 'react'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  artist: string
  onDone: (imageData: string) => void
  onCancel: () => void
  title?: string
}

export default function DrawingCanvas({ artist, onDone, onCancel, title }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Fill with white background
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  const handleDone = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imageData = canvas.toDataURL('image/png')
    onDone(imageData)
  }

  return (
    <div className="drawing-canvas-overlay">
      <div className="drawing-canvas-container">
        <div className="canvas-header">
          <h2>{title ? `${title} para ${artist}` : `Desenhando para ${artist}`}</h2>
          <p>{title === 'Sua Assinatura' ? 'Desenhe sua assinatura com estilo!' : 'Crie seu graffiti! Use o pincel e escolha as cores'}</p>
        </div>

        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        <div className="canvas-controls">
          <div className="control-group">
            <label htmlFor="color-picker">Cor:</label>
            <input
              id="color-picker"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
          </div>

          <div className="control-group">
            <label htmlFor="brush-size">Tamanho do Pincel: {brushSize}px</label>
            <input
              id="brush-size"
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="brush-slider"
            />
          </div>

          <button className="btn-clear" onClick={handleClear}>
            LIMPAR
          </button>
        </div>

        <div className="canvas-buttons">
          <button className="btn-cancel" onClick={onCancel}>
            CANCELAR
          </button>
          <button className="btn-done" onClick={handleDone}>
            PRONTO
          </button>
        </div>
      </div>
    </div>
  )
}
