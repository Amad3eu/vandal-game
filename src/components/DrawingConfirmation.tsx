import './DrawingConfirmation.css'

interface DrawingConfirmationProps {
  imageData: string
  artist: string
  onConfirm: () => void
  onGoBack: () => void
}

export default function DrawingConfirmation({
  imageData,
  artist,
  onConfirm,
  onGoBack,
}: DrawingConfirmationProps) {
  return (
    <div className="street-backdrop drawing-backdrop">
      <div className="confirmation-panel paper-panel" role="dialog" aria-labelledby="confirmation-title">
        <h2 id="confirmation-title" className="confirmation-title">Ficou brabo!</h2>
        <p className="confirmation-subtitle">Seu desenho para {artist}</p>

        <figure className="confirmation-sticker">
          <span className="tape" />
          <img src={imageData} alt="Seu desenho" />
        </figure>

        <p className="confirmation-ask">Salvar no seu blackbook?</p>

        <div className="confirmation-actions">
          <button className="sticker-btn is-ghost" onClick={onGoBack}>
            ← Refazer
          </button>
          <button className="sticker-btn is-pink" onClick={onConfirm}>
            Salvar!
          </button>
        </div>
      </div>
    </div>
  )
}
