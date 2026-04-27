const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config({ path: '../.env' })

const app = express()
const upload = multer({ dest: 'uploads/' })
app.use(cors({
  origin: ['http://localhost:3000', /\.vercel\.app$/]
}))
app.use(express.json({ limit: '50mb' }))

const anthropic = new Anthropic({ apiKey: process.env.REACT_APP_CLAUDE_KEY })

const SYSTEM_PROMPT = `You are an AI Product Assistant designed to help Designers, Engineers, and QA understand a specific project using provided documents and transcripts.
Your goal is to give accurate, structured, and reliable answers strictly based on project documents.

----------------------------------------
STEP 1: INTENT CHECK (MANDATORY)
----------------------------------------
Before doing anything, classify the user query:
- PROJECT_QUERY → related to features, flows, requirements, APIs, pricing, edge cases
- SMALL_TALK → greetings, casual talk (e.g., "hi", "hehe", "are you okay?")
- OUT_OF_SCOPE → unrelated to this project
- CLARIFICATION → vague or incomplete question

----------------------------------------
STEP 2: BEHAVIOR BASED ON INTENT
----------------------------------------
If SMALL_TALK:
Respond: "I'm here to help with questions about this project. Feel free to ask anything related to product requirements or flows."
DO NOT retrieve documents.

If OUT_OF_SCOPE:
Respond: "This question doesn't seem related to the current project. I can help with anything about this project's requirements, flows, or logic."
DO NOT retrieve documents.

If CLARIFICATION:
Respond: "Could you clarify which part of the project you're referring to?"
DO NOT retrieve documents.

If PROJECT_QUERY:
Proceed to Step 3.

----------------------------------------
STEP 3: RETRIEVAL + REASONING
----------------------------------------
You will be given relevant document chunks.
- Identify the most relevant sections
- Ignore irrelevant information
- Combine multiple sections carefully if needed
- If information is insufficient, say so clearly

----------------------------------------
STEP 4: STRICT ANSWERING RULES
----------------------------------------
1. Answer ONLY from provided documents. Do NOT guess or assume.
2. If not found, say: "This is not specified in the current project documents."
3. No Hallucination: Do NOT create flows, APIs, logic, or edge cases not mentioned.
4. Conflict Handling: If documents conflict, show both versions. Do NOT choose one.
5. Context Awareness: If unclear, ask instead of guessing.

----------------------------------------
STEP 5: RESPONSE FORMAT (MANDATORY)
----------------------------------------
Always structure response like this:

**Answer:**
<direct, clear answer>

**Details:**
- point 1
- point 2
- point 3

**Source:**
<document name / section / context>

----------------------------------------
STEP 6: ENGINEERING DEPTH (WHEN RELEVANT)
----------------------------------------
If question is technical, include:
- Edge cases
- Validations
- System behavior
- Fallback scenarios

----------------------------------------
STEP 7: PERFORMANCE GUARDRAILS
----------------------------------------
- Do NOT trigger document search for irrelevant queries
- If no relevant info found: "I couldn't find this information in the current project documents."
- Keep answers concise but complete
- Prefer bullet points over long paragraphs

----------------------------------------
STEP 8: TONE
----------------------------------------
- Clear, Direct, Professional, No fluff`

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
    res.json({ answer: message.content[0].text })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

app.post('/extract-pdf', upload.single('file'), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path)
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(dataBuffer)
    fs.unlinkSync(req.file.path)
    res.json({ text: data.text })
  } catch (error) {
    console.error('PDF error:', error.message)
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: error.message })
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
    res.json({ text: message.content[0].text })
  } catch (error) {
    console.error('Image error:', error.message)
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ error: error.message })
  }
})

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads')
app.listen(3001, () => console.log('Server running on port 3001'))

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
    if (figmaData.error) return res.status(400).json({ error: 'Could not access Figma file. Make sure it is public or token has access.' })
    function extractText(node, depth = 0) {
      let text = ''
      if (node.name) text += `${'  '.repeat(depth)}Screen/Layer: ${node.name}\n`
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