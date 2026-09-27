import { useState } from 'react'
import type { CSSProperties } from 'react'
import { GraffitiArtist } from '../types/game'
import { ARTIST_INFO } from '../data/graffitiArtists'
import './GraffitiDialog.css'

interface GraffitiDialogProps {
  artist: GraffitiArtist
  onAccept: () => void
  onReject: () => void
  artistSignatureImage: string
}

/** The artist as a sticker: cap, hoodie in their color and a spray can. */
export function ArtistPortrait({ artist }: { artist: GraffitiArtist }) {
  return (
    <div className="artist-portrait" aria-hidden="true">
      <span className="portrait-body" />
      <span className="portrait-head" />
      <span className="portrait-cap" />
      <span className="portrait-can" />
      <span className="portrait-mist" />
      <span className="sr-only">{ARTIST_INFO[artist].name}</span>
    </div>
  )
}

/** CSS variables with the artist's color, used by the dialog styles. */
export const artistStyle = (artist: GraffitiArtist) => ({ '--artist': ARTIST_INFO[artist].color }) as CSSProperties

export default function GraffitiDialog({
  artist,
  onAccept,
  onReject,
  artistSignatureImage,
}: GraffitiDialogProps) {
  const info = ARTIST_INFO[artist]
  const [showSignature, setShowSignature] = useState(false)

  return (
    <div className="street-backdrop">
      <div className="street-dialog paper-panel" style={artistStyle(artist)} role="dialog" aria-labelledby="artist-name">
        <div className="street-dialog-artist">
          <ArtistPortrait artist={artist} />
          <h2 id="artist-name" className="artist-tag-name">{info.name}</h2>
          <span className="artist-role">artista de rua</span>
        </div>

        <div className="street-dialog-body">
          <p className="speech-bubble">{info.description}</p>

          {!showSignature ? (
            <>
              <p className="dialog-ask">
                Quer trocar uma assinatura comigo e desenhar um graffiti no meu blackbook?
              </p>
              <div className="street-dialog-actions">
                <button className="sticker-btn is-pink" onClick={onAccept}>
                  Sim, bora!
                </button>
                <button className="sticker-btn is-yellow" onClick={() => setShowSignature(true)}>
                  Ver assinatura
                </button>
                <button className="sticker-btn is-ghost" onClick={onReject}>
                  Agora não
                </button>
              </div>
            </>
          ) : (
            <>
              <figure className="signature-sticker">
                <span className="tape" />
                <img src={artistSignatureImage} alt={`Assinatura de ${info.name}`} />
                <figcaption>Assinatura de {info.name}</figcaption>
              </figure>
              <div className="street-dialog-actions">
                <button className="sticker-btn is-pink" onClick={onAccept}>
                  Sim, quero!
                </button>
                <button className="sticker-btn is-ghost" onClick={() => setShowSignature(false)}>
                  ← Voltar
                </button>
                <button className="sticker-btn is-ghost" onClick={onReject}>
                  Agora não
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
