import { useRef, useEffect, useState } from 'react'
import type { PointerEvent } from 'react'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  artist: string
  onDone: (imageData: string) => void
  onCancel: () => void
  title?: string
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

/** Spray cans to pick from, plus the free color picker. */
const SPRAY_COLORS = ['#140f1f', '#ff4d9d', '#ffd23f', '#4ecdc4', '#ff6b6b', '#34d399', '#7c3aed', '#ffffff']

export default function DrawingCanvas({ artist, onDone, onCancel, title }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingPointer = useRef<number | null>(null)
  const [color, setColor] = useState('#140f1f')
  const [brushSize, setBrushSize] = useState(8)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    clear(canvas)
  }, [])

  // The canvas is shown smaller than its 800x600 pixels: convert screen points to canvas pixels.
  const toCanvas = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    // client* sizes leave the border out, so the stroke lands right under the pointer.
    return {
      x: ((e.clientX - rect.left - canvas.clientLeft) * canvas.width) / canvas.clientWidth,
      y: ((e.clientY - rect.top - canvas.clientTop) * canvas.height) / canvas.clientHeight,
    }
  }

  // Pointer events cover mouse, finger and pen alike.
  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx || drawingPointer.current !== null) return
    drawingPointer.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = toCanvas(e)
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.01, y) // a tap leaves a dot
    ctx.stroke()
  }

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointer.current !== e.pointerId) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const { x, y } = toCanvas(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointer.current === e.pointerId) drawingPointer.current = null
  }

  const handleDone = () => {
    const canvas = canvasRef.current
    if (canvas) onDone(canvas.toDataURL('image/png'))
  }

  const heading = artist === 'Livre' ? title ?? 'Rascunho' : `${title ?? 'Graffiti'} para ${artist}`

  return (
    <div className="street-backdrop drawing-backdrop">
      <div className="drawing-panel paper-panel" role="dialog" aria-labelledby="drawing-title">
        <div className="drawing-header">
          <h2 id="drawing-title">{heading}</h2>
          <p>
            {title === 'Sua Assinatura'
              ? 'Mande sua assinatura com estilo!'
              : 'Escolha a lata, o bico e mande ver.'}
          </p>
        </div>

        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        <div className="drawing-tools">
          <div className="spray-swatches" role="radiogroup" aria-label="Cor da lata">
            {SPRAY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={`Cor ${swatch}`}
                className={`spray-swatch ${color === swatch ? 'active' : ''}`}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
            <label className="spray-swatch custom-swatch" title="Outra cor">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Outra cor" />
            </label>
          </div>

          <label className="brush-size">
            <span>Bico: {brushSize}px</span>
            <input
              type="range"
              min="2"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>

          <button type="button" className="sticker-btn is-small" onClick={() => canvasRef.current && clear(canvasRef.current)}>
            Limpar
          </button>
        </div>

        <div className="drawing-actions">
          <button type="button" className="sticker-btn is-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="sticker-btn is-pink" onClick={handleDone}>
            Pronto!
          </button>
        </div>
      </div>
    </div>
  )
}

function clear(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
