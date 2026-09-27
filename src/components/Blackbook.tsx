import { useState } from 'react'
import type { CSSProperties } from 'react'
import { GraffitiArt } from '../types/game'
import { ARTIST_INFO } from '../data/graffitiArtists'
import DrawingCanvas from './DrawingCanvas'
import './Blackbook.css'

interface BlackbookProps {
  arts: GraffitiArt[]
  onClose: () => void
}

interface Sketch {
  id: string
  imageData: string
  timestamp: number
}

// Free sketches are kept apart from the artists' pieces.
const LOCAL_STORAGE_KEY = 'dinoGameSketchbook'

function getInitialSketches(): Sketch[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function download(imageData: string, name: string) {
  const a = document.createElement('a')
  a.href = imageData
  a.download = name
  a.click()
}

interface ArtStickerProps {
  image: string
  alt: string
  label: string
  color: string
  timestamp: number
  fileName: string
  index: number
}

/** A piece taped into the book: the whole image (never cropped), a label and a download button. */
function ArtSticker({ image, alt, label, color, timestamp, fileName, index }: ArtStickerProps) {
  const tilt = index % 3 === 0 ? -1.6 : index % 3 === 1 ? 1.2 : -0.6
  return (
    <figure className="art-sticker" style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <span className="tape" />
      <div className="art-frame">
        <img src={image} alt={alt} loading="lazy" />
      </div>
      <figcaption>
        <span className="art-label" style={{ backgroundColor: color }}>
          {label}
        </span>
        <span className="art-date">{formatDate(timestamp)}</span>
        <button type="button" className="art-download" onClick={() => download(image, fileName)} aria-label={`Baixar ${alt}`}>
          ⬇
        </button>
      </figcaption>
    </figure>
  )
}

export default function Blackbook({ arts, onClose }: BlackbookProps) {
  const [tab, setTab] = useState<'sketchbook' | 'signatures'>(() => (arts.length > 0 ? 'signatures' : 'sketchbook'))
  const [sketches, setSketches] = useState<Sketch[]>(getInitialSketches)
  const [showDrawing, setShowDrawing] = useState(false)

  const artistSignatures = arts.filter((art) => art.type === 'artist-signature')
  const mySignatures = arts.filter((art) => art.type === 'my-signature')
  const total = arts.length + sketches.length

  const handleSaveSketch = (imageData: string) => {
    const newSketch = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      imageData,
      timestamp: Date.now(),
    }
    const updated = [newSketch, ...sketches]
    setSketches(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Storage full or blocked: the sketch still shows until the book is closed.
    }
    setShowDrawing(false)
  }

  return (
    <div className="street-backdrop blackbook-backdrop">
      <div className="blackbook" role="dialog" aria-labelledby="blackbook-title">
        <header className="blackbook-top">
          <div className="blackbook-heading">
            <h2 id="blackbook-title" className="blackbook-title">Blackbook</h2>
            <span className="blackbook-count">
              {total} {total === 1 ? 'obra' : 'obras'}
            </span>
          </div>
          <button type="button" className="sticker-btn is-small blackbook-close" onClick={onClose} aria-label="Fechar blackbook">
            ✕
          </button>
        </header>

        <div className="blackbook-tabs" role="tablist" aria-label="Seções do blackbook">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sketchbook'}
            className={tab === 'sketchbook' ? 'active' : ''}
            onClick={() => setTab('sketchbook')}
          >
            ✏️ Rascunhos <span className="tab-count">{sketches.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'signatures'}
            className={tab === 'signatures' ? 'active' : ''}
            onClick={() => setTab('signatures')}
          >
            🖊️ Assinaturas <span className="tab-count">{arts.length}</span>
          </button>
        </div>

        <div className="blackbook-pages" role="tabpanel">
          {tab === 'sketchbook' && (
            <section className="blackbook-section">
              <div className="section-toolbar">
                <p>Rascunhe, crie e baixe suas artes.</p>
                <button type="button" className="sticker-btn is-pink is-small" onClick={() => setShowDrawing(true)}>
                  + Novo rascunho
                </button>
              </div>
              {sketches.length === 0 ? (
                <div className="blackbook-empty">
                  <p>Página em branco…</p>
                  <p className="empty-hint">Toque em “Novo rascunho” para começar a desenhar.</p>
                </div>
              ) : (
                <div className="art-grid">
                  {sketches.map((sketch, index) => (
                    <ArtSticker
                      key={sketch.id}
                      index={index}
                      image={sketch.imageData}
                      alt="Rascunho"
                      label="Rascunho"
                      color="var(--spray-cyan)"
                      timestamp={sketch.timestamp}
                      fileName={`rascunho-${sketch.id}.png`}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'signatures' &&
            (arts.length === 0 ? (
              <div className="blackbook-empty">
                <p>Nenhuma assinatura ainda…</p>
                <p className="empty-hint">Encontre grafiteiros durante a corrida para trocar assinaturas.</p>
              </div>
            ) : (
              <>
                {artistSignatures.length > 0 && (
                  <section className="blackbook-section">
                    <h3 className="section-title">Coletadas na rua</h3>
                    <div className="art-grid">
                      {artistSignatures.map((art, index) => (
                        <ArtSticker
                          key={art.id}
                          index={index}
                          image={art.imageData}
                          alt={`Assinatura de ${ARTIST_INFO[art.artist].name}`}
                          label={ARTIST_INFO[art.artist].name}
                          color={ARTIST_INFO[art.artist].color}
                          timestamp={art.timestamp}
                          fileName={`assinatura-${art.artist}.png`}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {mySignatures.length > 0 && (
                  <section className="blackbook-section">
                    <h3 className="section-title">Minhas assinaturas</h3>
                    <div className="art-grid">
                      {mySignatures.map((art, index) => (
                        <ArtSticker
                          key={art.id}
                          index={index + 1}
                          image={art.imageData}
                          alt={`Meu desenho para ${ARTIST_INFO[art.artist].name}`}
                          label={`Para ${ARTIST_INFO[art.artist].name}`}
                          color={ARTIST_INFO[art.artist].color}
                          timestamp={art.timestamp}
                          fileName={`minha-assinatura-${art.artist}.png`}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ))}
        </div>

        <footer className="blackbook-bottom">
          <button type="button" className="sticker-btn is-yellow" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>

      {/* Outside the book so its fixed overlay covers the whole screen. */}
      {showDrawing && (
        <DrawingCanvas artist="Livre" title="Rascunho" onDone={handleSaveSketch} onCancel={() => setShowDrawing(false)} />
      )}
    </div>
  )
}
