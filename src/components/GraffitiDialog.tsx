import { useState } from 'react'
import type { CSSProperties } from 'react'
import { KIND_ICON, KIND_LABEL, nameSignature, type ArtistKind, type EncounterArtist } from '../data/encounters'
import './GraffitiDialog.css'

interface GraffitiDialogProps {
  artist: EncounterArtist
  onAccept: () => void
  onReject: () => void
}

/**
 * The artist as a sticker: cap and hoodie in their color, with a spray can for graffiti
 * artists or their thing (headphones, mic, spin) for DJs, MCs and b-boys/b-girls.
 */
export function ArtistPortrait({ name, kind = 'graffiti' }: { name: string; kind?: ArtistKind }) {
  return (
    <div className="artist-portrait" aria-hidden="true">
      <span className="portrait-body" />
      <span className="portrait-head" />
      <span className="portrait-cap" />
      {kind === 'graffiti' ? (
        <>
          <span className="portrait-can" />
          <span className="portrait-mist" />
        </>
      ) : (
        <span className="portrait-icon">{KIND_ICON[kind]}</span>
      )}
      <span className="sr-only">{name}</span>
    </div>
  )
}

/** CSS variables with the artist's color, used by the dialog styles. */
export const artistStyle = (color: string) => ({ '--artist': color }) as CSSProperties

export default function GraffitiDialog({ artist, onAccept, onReject }: GraffitiDialogProps) {
  const [showSignature, setShowSignature] = useState(false)
  const role = [KIND_LABEL[artist.kind], artist.city].filter(Boolean).join(' · ')
  const signature = artist.signature ?? nameSignature(artist.name, artist.color)

  return (
    <div className="street-backdrop">
      <div className="street-dialog paper-panel" style={artistStyle(artist.color)} role="dialog" aria-labelledby="artist-name">
        <div className="street-dialog-artist">
          <ArtistPortrait name={artist.name} kind={artist.kind} />
          <h2 id="artist-name" className="artist-tag-name">{artist.name}</h2>
          <span className="artist-role">{role}</span>
          {artist.instagram && (
            <a className="artist-instagram" href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noreferrer">
              @{artist.instagram}
            </a>
          )}
        </div>

        <div className="street-dialog-body">
          <p className="speech-bubble">{artist.bio}</p>

          {!showSignature ? (
            <>
              <p className="dialog-ask">
                {artist.kind === 'graffiti'
                  ? 'Quer trocar uma assinatura comigo e desenhar um graffiti no meu blackbook?'
                  : 'Quer trocar uma assinatura comigo? A minha vai pro seu blackbook.'}
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
                <img src={signature} alt={`Assinatura de ${artist.name}`} />
                <figcaption>Assinatura de {artist.name}</figcaption>
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
