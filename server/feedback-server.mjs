import express from 'express'
import dotenv from 'dotenv'
import sgMail from '@sendgrid/mail'

dotenv.config()

const app = express()
const port = Number(process.env.FEEDBACK_API_PORT ?? 8787)

const sendGridApiKey = process.env.SENDGRID_API_KEY
const feedbackTo = process.env.FEEDBACK_TO_EMAIL
const feedbackFrom = process.env.FEEDBACK_FROM_EMAIL

if (!sendGridApiKey || !feedbackTo || !feedbackFrom) {
  console.error('Missing env vars: SENDGRID_API_KEY, FEEDBACK_TO_EMAIL or FEEDBACK_FROM_EMAIL')
}

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey)
}

app.use(express.json({ limit: '8mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/feedback', async (req, res) => {
  try {
    const { type, message, screenshot, screenshotName, metadata } = req.body ?? {}

    if (!type || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing required fields.' })
    }

    if (!sendGridApiKey || !feedbackTo || !feedbackFrom) {
      return res.status(500).json({ error: 'SendGrid is not configured on server.' })
    }

    const safeType = String(type)
    const safeMessage = String(message).trim()
    const safeUrl = String(metadata?.href ?? 'unknown')
    const safeAgent = String(metadata?.userAgent ?? 'unknown')
    const safeLang = String(metadata?.language ?? 'unknown')

    const attachments = []
    if (typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
      const base64Content = screenshot.split(',')[1]
      if (base64Content) {
        attachments.push({
          content: base64Content,
          filename: screenshotName || `feedback-${Date.now()}.png`,
          type: 'image/png',
          disposition: 'attachment',
        })
      }
    }

    const subject = `[Dino Feedback] ${safeType}`
    const text = [
      `Type: ${safeType}`,
      '',
      'Message:',
      safeMessage,
      '',
      'Metadata:',
      `URL: ${safeUrl}`,
      `Language: ${safeLang}`,
      `User Agent: ${safeAgent}`,
    ].join('\n')

    const html = `
      <h2>New Feedback</h2>
      <p><strong>Type:</strong> ${safeType}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${safeMessage}</pre>
      <hr />
      <p><strong>URL:</strong> ${safeUrl}</p>
      <p><strong>Language:</strong> ${safeLang}</p>
      <p><strong>User Agent:</strong> ${safeAgent}</p>
    `

    await sgMail.send({
      to: feedbackTo,
      from: feedbackFrom,
      subject,
      text,
      html,
      attachments,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Feedback send error:', error)
    return res.status(500).json({ error: 'Failed to send feedback.' })
  }
})

app.listen(port, () => {
  console.log(`Feedback API running on http://localhost:${port}`)
})
