import { useState } from 'react'
import { GraffitiArtist, GraffitiArtistInfo } from '../types/game'
import './GraffitiDialog.css'

interface GraffitiDialogProps {
  artist: GraffitiArtist
  onAccept: () => void
  onReject: () => void
  artistSignatureImage: string
}

const ARTIST_INFO: Record<GraffitiArtist, GraffitiArtistInfo> = {
  remo: {
    name: 'Remo',
    color: '#FF6B6B',
    description: 'Yo! Eu sou o Remo, mestre das cores quentes. Meu estilo é agressivo e vibrante!',
  },
  pixo: {
    name: 'Pixo',
    color: '#4ECDC4',
    description: 'Opa! Sou o Pixo, artista das formas clean. Meu traço é preciso e geométrico.',
  },
  nina: {
    name: 'Nina',
    color: '#FFE66D',
    description: 'E aí? Eu sou a Nina, rainha dos detalhes. Minha arte é pura criatividade!',
  },
}

export default function GraffitiDialog({
  artist,
  onAccept,
  onReject,
  artistSignatureImage,
}: GraffitiDialogProps) {
  const info = ARTIST_INFO[artist]
  const [showSignature, setShowSignature] = useState(false)

  return (
    <div className="graffiti-dialog-overlay">
      <div className="graffiti-dialog-container">
        <div className="artist-character-display">
          <div className="artist-avatar" style={{ backgroundColor: info.color }} />
        </div>

        <div className="dialog-content">
          <h2 className="artist-name">{info.name}</h2>
          <p className="artist-quote">{info.description}</p>

          {!showSignature ? (
            <>
              <div className="dialog-question">
                <p>Quer trocar uma assinatura comigo e desenhar um graffiti no meu blackbook?</p>
              </div>

              <button
                className="btn-view-signature"
                onClick={() => setShowSignature(true)}
              >
                👀 Ver Minha Assinatura
              </button>

              <div className="dialog-buttons">
                <button className="btn-yes" onClick={onAccept}>
                  SIM
                </button>
                <button className="btn-no" onClick={onReject}>
                  NÃO
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="signature-preview">
                <p className="signature-label">Minha Assinatura</p>
                <img src={artistSignatureImage} alt={`${info.name} signature`} />
              </div>

              <div className="dialog-buttons">
                <button className="btn-back" onClick={() => setShowSignature(false)}>
                  ← VOLTAR
                </button>
                <button className="btn-yes" onClick={onAccept}>
                  SIM, QUERO!
                </button>
                <button className="btn-no" onClick={onReject}>
                  NÃO
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
