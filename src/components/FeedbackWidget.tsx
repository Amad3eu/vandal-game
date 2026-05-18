import { useMemo, useState } from 'react'
import './FeedbackWidget.css'

type FeedbackType = 'problem' | 'idea' | 'other'

interface FeedbackOption {
  id: FeedbackType
  emoji: string
  label: string
}

const feedbackOptions: FeedbackOption[] = [
  { id: 'problem', emoji: '🐛', label: 'Problem' },
  { id: 'idea', emoji: '💡', label: 'Idea' },
  { id: 'other', emoji: '💬', label: 'Other' },
]

const MAX_SCREENSHOT_SIZE_BYTES = 4 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function FeedbackWidget() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null)

  const selectedOption = useMemo(
    () => feedbackOptions.find((option) => option.id === selectedType) ?? null,
    [selectedType]
  )

  const resetForm = () => {
    setSelectedType(null)
    setMessage('')
    setScreenshot(null)
    setScreenshotName(null)
    setStatusMessage(null)
    setStatusKind(null)
  }

  const closeWidget = () => {
    setIsExpanded(false)
    resetForm()
  }

  const handleScreenshotChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setStatusMessage(null)
    setStatusKind(null)

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setStatusKind('error')
      setStatusMessage('Please choose an image file.')
      return
    }

    if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
      setStatusKind('error')
      setStatusMessage('Image is too large. Max size is 4MB.')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setScreenshot(base64)
      setScreenshotName(file.name)
    } catch {
      setStatusKind('error')
      setStatusMessage('Could not read selected image.')
    }
  }

  const handleSubmit = async () => {
    if (!selectedType || !message.trim() || isSubmitting) return

    setIsSubmitting(true)
    setStatusMessage(null)
    setStatusKind(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim(),
          screenshot,
          screenshotName,
          metadata: {
            href: window.location.href,
            userAgent: window.navigator.userAgent,
            language: window.navigator.language,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send feedback')
      }

      setStatusKind('success')
      setStatusMessage('Feedback sent. Thank you!')
      setMessage('')
      setScreenshot(null)
      setScreenshotName(null)
    } catch {
      setStatusKind('error')
      setStatusMessage('Could not send feedback right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="feedback-widget">
      {isExpanded && (
        <div className="feedback-panel" role="dialog" aria-label="Leave your feedback">
          {!selectedOption ? (
            <>
              <div className="feedback-panel-header">
                <h3>Leave your Feedback</h3>
                <button className="feedback-icon-btn" onClick={closeWidget} aria-label="Close feedback panel">
                  ✕
                </button>
              </div>

              <div className="feedback-types-grid">
                {feedbackOptions.map((option) => (
                  <button
                    key={option.id}
                    className="feedback-type-card"
                    onClick={() => {
                      setSelectedType(option.id)
                      setStatusKind(null)
                      setStatusMessage(null)
                    }}
                  >
                    <span className="feedback-type-emoji" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <span className="feedback-type-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="feedback-panel-header with-back">
                <button
                  className="feedback-icon-btn"
                  onClick={() => {
                    setSelectedType(null)
                    setStatusKind(null)
                    setStatusMessage(null)
                  }}
                  aria-label="Back"
                >
                  ←
                </button>

                <h3>
                  <span aria-hidden="true">{selectedOption.emoji}</span>
                  <span>{selectedOption.label}</span>
                </h3>

                <button className="feedback-icon-btn" onClick={closeWidget} aria-label="Close feedback panel">
                  ✕
                </button>
              </div>

              <textarea
                className="feedback-textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell me in detail what is going on..."
                rows={6}
              />

              <div className="feedback-form-actions">
                <label className="feedback-upload-btn" aria-label="Upload image">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    aria-label="Select image"
                  />
                </label>

                <button
                  className="feedback-submit-btn"
                  disabled={!message.trim() || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>

              {screenshotName && <p className="feedback-help">Image attached: {screenshotName}</p>}
              {statusMessage && (
                <p className={`feedback-status ${statusKind === 'error' ? 'error' : 'success'}`}>
                  {statusMessage}
                </p>
              )}
            </>
          )}

        </div>
      )}

      <button
        className={`feedback-fab ${isExpanded ? 'expanded' : ''}`}
        onClick={() => {
          if (isExpanded) {
            closeWidget()
          } else {
            setIsExpanded(true)
          }
        }}
        aria-label="Open feedback widget"
      >
        <span className="feedback-fab-icon" aria-hidden="true">
          💬
        </span>
        {isExpanded && <span className="feedback-fab-text">Feedback</span>}
      </button>
    </div>
  )
}
