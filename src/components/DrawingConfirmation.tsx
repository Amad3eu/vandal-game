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
    <div className="drawing-confirmation-overlay">
      <div className="drawing-confirmation-container">
        <div className="confirmation-header">
          <h2>Sua Arte</h2>
          <p>Seu desenho para {artist}</p>
        </div>

        <div className="drawing-preview">
          <img src={imageData} alt="Your artwork" className="preview-image" />
        </div>

        <div className="confirmation-text">
          <p>Quer salvar esse desenho no seu blackbook?</p>
        </div>

        <div className="confirmation-buttons">
          <button className="btn-back" onClick={onGoBack}>
            VOLTAR
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            OK, SALVAR!
          </button>
        </div>
      </div>
    </div>
  )
}
