const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config({ path: '../.env' })

const app = express()
const upload = multer({ dest: 'uploads/' })
app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /\.vercel\.app$/, /\.onrender\.com$/]
}))
app.use(express.json({ limit: '50mb' }))

const anthropic = new Anthropic({ apiKey: process.env.REACT_APP_CLAUDE_KEY })

// ---- Atlassian (Jira + Confluence) config ----
const ATLASSIAN_BASE_URL = process.env.ATLASSIAN_BASE_URL   // e.g. https://yourcompany.atlassian.net
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL         // your Atlassian login email
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN // token from id.atlassian.com/manage-profile/security/api-tokens

function atlassianConfigured() {
  return Boolean(ATLASSIAN_BASE_URL && ATLASSIAN_EMAIL && ATLASSIAN_API_TOKEN)
}
function atlassianHeaders() {
  const token = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64')
  return { Authorization: `Basic ${token}`, Accept: 'application/json' }
}
// Atlassian Document Format (Jira descriptions/comments) -> plain text
function adfToText(node) {
  if (!node) return ''
  if (Array.isArray(node)) return node.map(adfToText).join('')
  let out = ''
  if (node.type === 'text') out += node.text || ''
  if (node.type === 'hardBreak') out += '\n'
  if (node.content) out += adfToText(node.content)
  if (['paragraph', 'heading', 'listItem', 'blockquote', 'tableRow'].includes(node.type)) out += '\n'
  return out
}
// Confluence storage HTML -> plain text
function htmlToText(html) {
  return (html || '')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const SYSTEM_PROMPT = `You are an AI Product Assistant designed to help Designers, Engineers, and QA understand a specific project using provided documents and transcripts.

INTENT CLASSIFICATION (internal only, never show this to user):
- If the message is small talk or greetings: respond warmly but redirect to project help
- If out of scope: politely say you can only help with this project
- If vague: ask a clarifying question
- If project related: answer from documents

STRICT RULES:
1. Answer ONLY from provided documents. Never guess or assume.
2. If not found, say: "This is not specified in the current project documents."
3. Never create flows, APIs, logic, or edge cases not in the documents.
4. If documents conflict, show both versions without choosing.
5. Keep answers clear, concise, and structured.
6. Use bullet points for flows and requirements.
7. Stay strictly within the current project scope.

RESPONSE FORMAT:
- Start with a direct answer
- Add supporting details as bullet points if needed
- Keep it concise — no fluff, no long paragraphs
- Do NOT include "Intent Check:", "Source:", or "Answer:" labels in your response
- Write naturally as a helpful assistant would`

app.post('/ask', async (req, res) => {
  const { question, context, projectName, history, image } = req.body
  try {
    const historyMessages = (history || []).map(m => ({ role: m.role, content: m.content }))

    const userContent = image
      ? [
          { type: 'image', source: { type: 'base64', media_type: image.type, data: image.base64 } },
          { type: 'text', text: question }
        ]
      : question

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nPROJECT: ${projectName}\n\nDOCUMENTS:\n${context}`,
      messages: [
        ...historyMessages,
        { role: 'user', content: userContent }
      ]
    })
    // Find the text block defensively (don't assume content[0] is text)
    const textBlock = message.content.find(b => b.type === 'text')
    res.json({ answer: textBlock ? textBlock.text : 'No response generated.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

// ---- PDF EXTRACTION (FIXED) ----
// The common reason PDF upload "silently" fails is that requiring the package
// root ("pdf-parse") runs its built-in debug/test harness, which tries to open a
// sample file that doesn't exist in production and throws ENOENT. Importing the
// library file directly avoids that entirely. Also make sure version 1.1.1 is
// installed:  cd server && npm install pdf-parse@1.1.1
app.post('/extract-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received by server' })
  const filePath = req.file.path
  try {
    const pdfParse = require('pdf-parse/lib/pdf-parse.js')
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    fs.unlinkSync(filePath)
    const text = (data.text || '').trim()
    if (!text) {
      return res.json({
        text: '',
        warning: 'No selectable text found — this looks like a scanned/image PDF. Upload it as a screenshot (PNG/JPG) instead, or use a text-based PDF.'
      })
    }
    res.json({ text })
  } catch (error) {
    console.error('PDF error:', error)
    if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath) } catch (e) {} }
    res.status(500).json({ error: error.message || 'Failed to read PDF' })
  }
})

app.post('/extract-image', upload.single('file'), async (req, res) => {
  try {
    const imageData = fs.readFileSync(req.file.path)
    const base64Image = imageData.toString('base64')
    const mimeType = req.file.mimetype
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
          { type: 'text', text: 'Extract all text content from this image. Include everything visible — headings, body text, labels, captions, table contents. Format it cleanly.' }
        ]
      }]
    })
    fs.unlinkSync(req.file.path)
    const textBlock = message.content.find(b => b.type === 'text')
    res.json({ text: textBlock ? textBlock.text : '' })
  } catch (error) {
    console.error('Image error:', error.message)
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: error.message })
  }
})

app.post('/extract-figma', async (req, res) => {
  const { url } = req.body
  try {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
    if (!match) return res.status(400).json({ error: 'Invalid Figma URL' })
    const fileKey = match[1]
    const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN }
    })
    const figmaData = await figmaRes.json()
    if (figmaData.error) return res.status(400).json({ error: 'Could not access Figma file. Make sure it is public or the token has access.' })
    function extractText(node, depth = 0) {
      let text = ''
      if (node.name) text += `${'  '.repeat(depth)}Screen: ${node.name}\n`
      if (node.type === 'TEXT' && node.characters) text += `${'  '.repeat(depth)}Text: ${node.characters}\n`
      if (node.children) node.children.forEach(child => { text += extractText(child, depth + 1) })
      return text
    }
    const extracted = extractText(figmaData.document)
    res.json({ text: `Figma File: ${figmaData.name}\n\n${extracted}` })
  } catch (error) {
    console.error('Figma error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.post('/extract-confluence', async (req, res) => {
  const { url } = req.body
  if (!atlassianConfigured()) {
    return res.status(400).json({ error: 'Atlassian is not set up on the server yet. Add ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN.' })
  }
  try {
    // Pull the page ID from a Confluence Cloud URL: /wiki/spaces/SPACE/pages/123456789/Title
    let pageId = null
    const m = (url || '').match(/\/pages\/(\d+)/)
    if (m) pageId = m[1]
    else if (/^\d+$/.test((url || '').trim())) pageId = url.trim()
    if (!pageId) return res.status(400).json({ error: 'Could not find a page ID in that link. Paste the full Confluence page URL — it contains /pages/<number>/.' })

    const api = `${ATLASSIAN_BASE_URL.replace(/\/$/, '')}/wiki/rest/api/content/${pageId}?expand=body.storage`
    const r = await fetch(api, { headers: atlassianHeaders() })
    if (r.status === 401 || r.status === 403) return res.status(400).json({ error: 'Atlassian rejected the credentials. Check the email, API token, and that you can view this page.' })
    if (r.status === 404) return res.status(400).json({ error: 'Page not found. Check the link or that your token has access to that space.' })
    if (!r.ok) return res.status(400).json({ error: `Confluence returned an error (${r.status}).` })
    const data = await r.json()
    const title = data.title || `Confluence ${pageId}`
    const html = data.body && data.body.storage ? data.body.storage.value : ''
    const text = htmlToText(html)
    if (!text) return res.json({ text: '', warning: 'That page has no readable text content.' })
    res.json({ title: `Confluence: ${title}`, text: `Confluence Page: ${title}\n\n${text}` })
  } catch (e) {
    console.error('Confluence error:', e)
    res.status(500).json({ error: e.message || 'Failed to fetch Confluence page' })
  }
})

app.post('/extract-jira', async (req, res) => {
  let { key } = req.body
  if (!atlassianConfigured()) {
    return res.status(400).json({ error: 'Atlassian is not set up on the server yet. Add ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN.' })
  }
  try {
    key = (key || '').trim()
    const match = key.match(/([A-Za-z][A-Za-z0-9]+-\d+)/)  // accepts a raw key or a full Jira URL
    if (match) key = match[1].toUpperCase()
    if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) return res.status(400).json({ error: 'That does not look like a Jira ID. Use something like WAY-123.' })

    const api = `${ATLASSIAN_BASE_URL.replace(/\/$/, '')}/rest/api/3/issue/${key}?fields=summary,description,comment,status,issuetype`
    const r = await fetch(api, { headers: atlassianHeaders() })
    if (r.status === 401 || r.status === 403) return res.status(400).json({ error: 'Atlassian rejected the credentials. Check the email, API token, and that you can view this issue.' })
    if (r.status === 404) return res.status(400).json({ error: `Issue ${key} not found (or your token has no access).` })
    if (!r.ok) return res.status(400).json({ error: `Jira returned an error (${r.status}).` })
    const data = await r.json()
    const f = data.fields || {}
    const summary = f.summary || ''
    const desc = adfToText(f.description).replace(/\n{3,}/g, '\n\n').trim()
    const comments = (f.comment && f.comment.comments ? f.comment.comments : [])
      .map(c => `- ${(c.author && c.author.displayName) || 'User'}: ${adfToText(c.body).trim()}`)
      .join('\n')
    let out = `Jira Ticket ${key}: ${summary}\n`
    if (f.issuetype && f.issuetype.name) out += `Type: ${f.issuetype.name}\n`
    if (f.status && f.status.name) out += `Status: ${f.status.name}\n`
    out += `\nDescription:\n${desc || '(no description)'}\n`
    if (comments) out += `\nComments:\n${comments}\n`
    res.json({ title: `Jira: ${key} - ${summary}`.slice(0, 120), text: out })
  } catch (e) {
    console.error('Jira error:', e)
    res.status(500).json({ error: e.message || 'Failed to fetch Jira issue' })
  }
})

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads')

// Use the port the host (e.g. Render) provides, fall back to 3001 locally
const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))