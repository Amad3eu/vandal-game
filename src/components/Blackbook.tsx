
import { useState } from 'react'
import { GraffitiArt, GraffitiArtist } from '../types/game'
import DrawingCanvas from './DrawingCanvas'
import './Blackbook.css'

interface BlackbookProps {
  arts: GraffitiArt[]
  onClose: () => void
}

const ARTIST_COLORS: Record<GraffitiArtist, string> = {
  remo: '#FF6B6B',
  pixo: '#4ECDC4',
  nina: '#FFE66D',
}

const ARTIST_NAMES: Record<GraffitiArtist, string> = {
  remo: 'Remo',
  pixo: 'Pixo',
  nina: 'Nina',
}


// Rascunhos livres ficam no localStorage separados
const LOCAL_STORAGE_KEY = 'dinoGameSketchbook'

function getInitialSketches() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

export default function Blackbook({ arts, onClose }: BlackbookProps) {
  const [tab, setTab] = useState<'sketchbook' | 'signatures'>('sketchbook')
  const [sketches, setSketches] = useState<any[]>(getInitialSketches)
  const [showDrawing, setShowDrawing] = useState(false)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const artistSignatures = arts.filter((art) => art.type === 'artist-signature')
  const mySignatures = arts.filter((art) => art.type === 'my-signature')

  // Salvar novo rascunho
  const handleSaveSketch = (imageData: string) => {
    const newSketch = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      imageData,
      timestamp: Date.now(),
    }
    const updated = [newSketch, ...sketches]
    setSketches(updated)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    setShowDrawing(false)
  }

  // Baixar imagem
  const handleDownload = (imageData: string, name = 'blackbook-art.png') => {
    const a = document.createElement('a')
    a.href = imageData
    a.download = name
    a.click()
  }

  return (
    <div className="blackbook-overlay">
      <div className="blackbook-container blackbook-paper">
        <div className="blackbook-header">
          <h2>🖊️ Blackbook</h2>
          <div className="blackbook-tabs">
            <button className={tab === 'sketchbook' ? 'active' : ''} onClick={() => setTab('sketchbook')}>Rascunhos Livres</button>
            <button className={tab === 'signatures' ? 'active' : ''} onClick={() => setTab('signatures')}>Assinaturas Coletadas</button>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {tab === 'sketchbook' && (
          <div className="blackbook-section">
            <div className="sketchbook-header">
              <h3>Rascunhe, crie e baixe suas artes!</h3>
              <button className="btn-new-sketch" onClick={() => setShowDrawing(true)}>Novo Rascunho</button>
            </div>
            {showDrawing && (
              <DrawingCanvas
                artist="Livre"
                onDone={handleSaveSketch}
                onCancel={() => setShowDrawing(false)}
                title="Rascunho"
              />
            )}
            {sketches.length === 0 && !showDrawing && (
              <div className="blackbook-empty">
                <p>Seu caderno de rascunhos está vazio...</p>
                <p className="empty-hint">Clique em "Novo Rascunho" para começar a desenhar!</p>
              </div>
            )}
            <div className="blackbook-gallery">
              {sketches.map((sketch) => (
                <div key={sketch.id} className="art-item">
                  <div className="art-card">
                    <img src={sketch.imageData} alt="Rascunho" />
                  </div>
                  <div className="art-info">
                    <div className="artist-badge my-signature-badge">Rascunho</div>
                    <p className="art-date">{formatDate(sketch.timestamp)}</p>
                    <button className="btn-download" onClick={() => handleDownload(sketch.imageData, `rascunho-${sketch.id}.png`)}>Baixar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'signatures' && (
          <>
            {arts.length === 0 ? (
              <div className="blackbook-empty">
                <p>Seu blackbook está vazio...</p>
                <p className="empty-hint">
                  Complete desafios com os grafiteiros para preencher seu caderno!
                </p>
              </div>
            ) : (
              <>
                {artistSignatures.length > 0 && (
                  <div className="blackbook-section">
                    <h3 className="section-title">📝 Assinaturas Coletadas</h3>
                    <div className="blackbook-gallery">
                      {artistSignatures.map((art) => (
                        <div key={art.id} className="art-item">
                          <div className="art-card">
                            <img src={art.imageData} alt={`Assinatura de ${ARTIST_NAMES[art.artist]}`} />
                          </div>
                          <div className="art-info">
                            <div
                              className="artist-badge"
                              style={{ backgroundColor: ARTIST_COLORS[art.artist] }}
                            >
                              {ARTIST_NAMES[art.artist]}
                            </div>
                            <p className="art-date">{formatDate(art.timestamp)}</p>
                            <button className="btn-download" onClick={() => handleDownload(art.imageData, `assinatura-${art.artist}.png`)}>Baixar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mySignatures.length > 0 && (
                  <div className="blackbook-section">
                    <h3 className="section-title">🎭 Minhas Assinaturas</h3>
                    <div className="blackbook-gallery">
                      {mySignatures.map((art) => (
                        <div key={art.id} className="art-item">
                          <div className="art-card">
                            <img src={art.imageData} alt={`Meu desenho para ${ARTIST_NAMES[art.artist]}`} />
                          </div>
                          <div className="art-info">
                            <div
                              className="artist-badge my-signature-badge"
                              style={{ backgroundColor: ARTIST_COLORS[art.artist] }}
                            >
                              Para {ARTIST_NAMES[art.artist]}
                            </div>
                            <p className="art-date">{formatDate(art.timestamp)}</p>
                            <button className="btn-download" onClick={() => handleDownload(art.imageData, `minha-assinatura-${art.artist}.png`)}>Baixar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="blackbook-footer">
          <button className="btn-close-footer" onClick={onClose}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  )
}
