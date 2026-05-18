import sgMail from '@sendgrid/mail'

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const sendGridApiKey = process.env.SENDGRID_API_KEY
  const feedbackTo = process.env.FEEDBACK_TO_EMAIL
  const feedbackFrom = process.env.FEEDBACK_FROM_EMAIL

  if (!sendGridApiKey || !feedbackTo || !feedbackFrom) {
    return res.status(500).json({ error: 'SendGrid is not configured on server.' })
  }

  try {
    const { type, message, screenshot, screenshotName, metadata } = parseBody(req)

    if (!type || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing required fields.' })
    }

    sgMail.setApiKey(sendGridApiKey)

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
}
