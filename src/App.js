import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from './supabase'

const ACCESS_PIN = process.env.REACT_APP_ACCESS_PIN || 'MIND01'

const SERVER = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('mind-theme') !== 'dark')
  function toggle() {
    setDark(d => {
      localStorage.setItem('mind-theme', d ? 'light' : 'dark')
      return !d
    })
  }
  return { dark, toggle }
}

function makeStyles(dark) {
  const bg = dark ? '#0F0F0F' : '#F5F5F7'
  const bg2 = dark ? '#161616' : '#FFFFFF'
  const bg3 = dark ? '#1A1A1A' : '#F0F0F2'
  const border = dark ? '#1E1E1E' : '#E5E5EA'
  const border2 = dark ? '#2A2A2A' : '#D8D8DC'
  const text1 = dark ? '#FFFFFF' : '#111111'
  const text2 = dark ? '#888888' : '#666666'
  const text3 = dark ? '#444444' : '#AAAAAA'
  const inputBg = dark ? '#1A1A1A' : '#FFFFFF'
  const tabBg = dark ? '#161616' : '#EBEBED'
  const tabActive = dark ? '#252525' : '#FFFFFF'

  return {
    page: { minHeight: '100vh', background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    header: { background: bg2, borderBottom: `1px solid ${border}`, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
    logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoIcon: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
    logoText: { fontSize: '18px', fontWeight: '700', color: text1, letterSpacing: '-0.3px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    badge: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
    pmBadge: { background: dark ? '#1E1B4B' : '#EDE9FE', color: dark ? '#818CF8' : '#5B21B6' },
    themeBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '13px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' },
    container: { maxWidth: '920px', margin: '0 auto', padding: '32px 24px' },
    card: { background: bg2, borderRadius: '16px', padding: '24px', marginBottom: '16px', border: `1px solid ${border}` },
    cardTitle: { fontSize: '14px', fontWeight: '600', color: text1, marginBottom: '16px' },
    input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: inputBg, color: text1 },
    textarea: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '14px', height: '160px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', background: inputBg, color: text1 },
    btn: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' },
    btnSm: { background: '#6366F1', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
    btnDanger: { background: 'transparent', color: '#F87171', border: '1px solid #3F1515', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },
    projectCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', cursor: 'pointer' },
    projectName: { fontSize: '15px', fontWeight: '600', color: text1, marginBottom: '6px' },
    projectDesc: { fontSize: '13px', color: text2, marginBottom: '16px', lineHeight: '1.5' },
    projectFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    projectMeta: { fontSize: '12px', color: text3 },
    projectArrow: { fontSize: '13px', color: '#6366F1', fontWeight: '600' },
    tabs: { display: 'flex', gap: '2px', background: tabBg, borderRadius: '12px', padding: '4px', marginBottom: '24px', border: `1px solid ${border}` },
    tab: { flex: 1, padding: '8px 12px', borderRadius: '9px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: text2, fontWeight: '500' },
    tabActive: { flex: 1, padding: '8px 12px', borderRadius: '9px', border: 'none', background: tabActive, fontSize: '13px', cursor: 'pointer', color: text1, fontWeight: '600', boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' },
    uploadBox: { border: `1px dashed ${border2}`, borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px', background: bg3 },
    uploadText: { fontSize: '14px', fontWeight: '600', color: text1 },
    uploadSub: { fontSize: '12px', color: text3, marginTop: '6px' },
    divider: { textAlign: 'center', color: text3, fontSize: '12px', margin: '20px 0' },
    docItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${border}`, marginBottom: '8px', background: bg2 },
    docIcon: { width: '36px', height: '36px', borderRadius: '8px', background: bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 },
    docInfo: { flex: 1, minWidth: 0 },
    docTitle: { fontSize: '14px', fontWeight: '500', color: text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    docMeta: { fontSize: '12px', color: text3, marginTop: '3px' },
    linkBox: { background: dark ? '#0D1F12' : '#F0FDF4', border: dark ? '1px solid #1A3A22' : '1px solid #BBF7D0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' },
    linkText: { flex: 1, fontSize: '13px', color: dark ? '#4ADE80' : '#15803D', fontFamily: 'monospace', wordBreak: 'break-all' },
    historyItem: { padding: '16px', borderRadius: '12px', border: `1px solid ${border}`, marginBottom: '10px', background: bg2 },
    historyQ: { fontSize: '13px', fontWeight: '600', color: text1, marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' },
    historyQBadge: { fontSize: '10px', fontWeight: '700', background: '#6366F1', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginTop: '2px', flexShrink: 0 },
    historyA: { fontSize: '13px', color: text2, lineHeight: '1.6' },
    historyMeta: { fontSize: '11px', color: text3, marginTop: '10px' },
    chatPage: { minHeight: '100vh', background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' },
    chatHeader: { background: bg2, borderBottom: `1px solid ${border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '14px' },
    chatHeaderInfo: { flex: 1 },
    chatProjectName: { fontSize: '17px', fontWeight: '700', color: text1 },
    chatProjectSub: { fontSize: '12px', color: text3, marginTop: '2px' },
    chatBody: { flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', padding: '28px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
    chatBox: { flex: 1, padding: '8px 0', minHeight: '400px', maxHeight: '560px', overflowY: 'auto', marginBottom: '16px' },
    emptyChat: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '360px', gap: '12px' },
    emptyChatIcon: { width: '56px', height: '56px', background: bg2, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: `1px solid ${border}` },
    emptyChatTitle: { fontSize: '17px', fontWeight: '600', color: text1 },
    emptyChatSub: { fontSize: '13px', color: text3 },
    userMsg: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
    userBubble: { background: '#6366F1', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '75%', color: '#FFFFFF', fontSize: '14px', lineHeight: '1.6' },
    aiMsgRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' },
    aiAvatar: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginTop: '2px' },
    aiBubble: { background: bg2, border: `1px solid ${border}`, borderRadius: '4px 18px 18px 18px', padding: '14px 18px', maxWidth: '82%', fontSize: '14px', lineHeight: '1.7', color: text1 },
    inputWrap: { background: bg2, borderRadius: '16px', border: `1px solid ${border2}`, padding: '8px 8px 8px 18px', display: 'flex', alignItems: 'center', gap: '8px' },
    chatInput: { flex: 1, border: 'none', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: 'transparent', color: text1 },
    sendBtn: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
    backBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '13px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px' },
    sectionLabel: { fontSize: '11px', fontWeight: '600', color: text3, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' },
    toast: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: dark ? '#1A1A1A' : '#111', color: '#fff', border: `1px solid ${border}`, padding: '10px 20px', borderRadius: '10px', fontSize: '14px', zIndex: 100, whiteSpace: 'nowrap' },
    processing: { fontSize: '13px', color: '#6366F1', marginBottom: '12px', fontStyle: 'italic' },
    poweredBy: { textAlign: 'center', fontSize: '12px', color: text3, marginTop: '12px' },
    pageTitle: { fontSize: '24px', fontWeight: '700', color: text1, marginBottom: '6px' },
    pageSub: { fontSize: '14px', color: text3, marginBottom: '32px' },
    emptyState: { textAlign: 'center', color: text3, padding: '48px', fontSize: '14px' },
    emptyIcon: { fontSize: '28px', marginBottom: '10px' },
    expandBtn: { background: 'none', border: 'none', color: '#6366F1', fontSize: '12px', cursor: 'pointer', padding: '4px 0', marginTop: '4px' },
  }
}

function Logo({ s }) {
  return (
    <div style={s.logoWrap}>
      <div style={s.logoIcon}>🧠</div>
      <span style={s.logoText}>Mind</span>
    </div>
  )
}

function Toast({ msg, s }) {
  return msg ? <div style={s.toast}>{msg}</div> : null
}

function HistoryItem({ item, s }) {
  const [expanded, setExpanded] = useState(false)

  function stripMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim()
  }

  const preview = stripMarkdown(item.answer)
  const isLong = preview.length > 280

  return (
    <div style={s.historyItem}>
      <div style={s.historyQ}>
        <span style={s.historyQBadge}>Q</span>
        {item.question}
      </div>
      <div style={s.historyA}>
        {expanded
          ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
          : preview.substring(0, 280) + (isLong ? '...' : '')
        }
      </div>
      {isLong && (
        <button style={s.expandBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less ↑' : 'Show full answer ↓'}
        </button>
      )}
      <div style={s.historyMeta}>
        {new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}

function LoginPage({ s, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  function handleSubmit() {
    if (pin.toUpperCase() === ACCESS_PIN.toUpperCase()) {
      sessionStorage.setItem('mind-auth', 'true')
      onSuccess()
    } else {
      setError('Incorrect PIN. Please try again.')
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: s.page.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: s.page.fontFamily }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 24px' }}>🧠</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: s.pageTitle.color, marginBottom: '8px', letterSpacing: '-0.5px' }}>Mind</div>
        <div style={{ fontSize: '15px', color: s.pageSub.color, marginBottom: '40px', lineHeight: '1.6' }}>Your AI product assistant.<br />Ask anything about your projects.</div>
        <div style={{ background: s.card.background, border: `1px solid ${s.card.border}`, borderRadius: '16px', padding: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: s.pageSub.color, marginBottom: '12px', textAlign: 'left' }}>Enter access PIN</div>
          <input
            style={{ ...s.input, textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: '600', marginBottom: '12px', animation: shaking ? 'shake 0.5s' : 'none' }}
            placeholder="••••••"
            value={pin}
            maxLength={6}
            onChange={e => { setPin(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && <div style={{ color: '#F87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          <button style={{ ...s.btn, width: '100%' }} onClick={handleSubmit}>Enter →</button>
        </div>
        <div style={{ fontSize: '12px', color: s.poweredBy.color, marginTop: '24px' }}>Powered by Way.com · Built with Claude AI</div>
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }`}</style>
    </div>
  )
}






function PMApp() {
  const [figmaUrl, setFigmaUrl] = useState('')
  const { dark, toggle } = useTheme()
  const s = makeStyles(dark)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [view, setView] = useState('home')
  const [tab, setTab] = useState('docs')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [documents, setDocuments] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [toast, setToast] = useState('')
  const [processing, setProcessing] = useState('')
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef(null)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('mind-auth') === 'true')

  useEffect(() => { fetchProjects() }, [])

  if (!authed) return <LoginPage s={s} onSuccess={() => setAuthed(true)} />

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchProjects() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  async function fetchDocuments(projectId) {
    const { data } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  async function fetchChatHistory(projectId) {
    const { data } = await supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50)
    if (data) setChatHistory(data)
  }

  async function extractFigma() {
    if (!figmaUrl.trim()) return
    setProcessing('Reading Figma file...')
    try {
      const res = await fetch(`${SERVER}/extract-figma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: figmaUrl })
      })
      const data = await res.json()
      if (data.error) { showToast(`Figma error: ${data.error}`); return }
      const { error } = await supabase.from('documents').insert([{
        project_id: selectedProject.id,
        title: `Figma: ${figmaUrl.split('/').pop()}`,
        content: data.text.substring(0, 100000)
      }])
      if (error) showToast('Failed to save Figma content')
      else {
        showToast('Figma screens extracted!')
        setFigmaUrl('')
        fetchDocuments(selectedProject.id)
      }
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
    setProcessing('')
  }







  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase.from('projects').insert([{ name: newName, description: newDesc }]).select()
    if (data) {
      setProjects([data[0], ...projects])
      setNewName('')
      setNewDesc('')
      showToast('Project created!')
    }
    setCreating(false)
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      try {
        let text = ''
        setProcessing(`Processing ${file.name}...`)

        if (file.name.toLowerCase().endsWith('.pdf')) {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch(`${SERVER}/extract-pdf`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.error) { showToast(`PDF error: ${data.error}`); continue }
          text = data.text || ''
        } else if (file.type.startsWith('image/')) {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch(`${SERVER}/extract-image`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.error) { showToast(`Image error: ${data.error}`); continue }
          text = data.text || ''
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          const mammoth = await import('mammoth')
          const arrayBuffer = await file.arrayBuffer()
          const result = await mammoth.extractRawText({ arrayBuffer })
          text = result.value
        } else {
          text = await file.text()
        }

        // eslint-disable-next-line no-control-regex
        text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim()

        if (text.length > 0) {
          const { error } = await supabase.from('documents').insert([{
            project_id: selectedProject.id,
            title: file.name,
            content: text.substring(0, 100000)
          }])
          if (error) showToast(`Failed: ${error.message}`)
          else showToast(`✓ ${file.name} uploaded!`)
        } else {
          showToast(`Could not extract text from ${file.name}`)
        }
      } catch (err) {
        console.error(err)
        showToast(`Error: ${err.message}`)
      }
    }
    setProcessing('')
    fetchDocuments(selectedProject.id)
    e.target.value = ''
  }

  async function uploadPasted() {
    if (!docTitle.trim() || !docContent.trim()) return
    const { error } = await supabase.from('documents').insert([{
      project_id: selectedProject.id,
      title: docTitle,
      content: docContent.substring(0, 100000)
    }])
    if (error) showToast('Upload failed')
    else {
      showToast('Document uploaded!')
      setDocTitle('')
      setDocContent('')
      fetchDocuments(selectedProject.id)
    }
  }

  async function deleteDocument(id) {
    await supabase.from('documents').delete().eq('id', id)
    fetchDocuments(selectedProject.id)
    showToast('Deleted')
  }

  function openProject(p) {
    setSelectedProject(p)
    fetchDocuments(p.id)
    fetchChatHistory(p.id)
    setTab('docs')
    setView('project')
  }

  function copyLink(id) {
    const url = `${window.location.origin}/chat/${id}`
    navigator.clipboard.writeText(url)
    showToast('Link copied!')
  }

  function getDocIcon(title) {
    if (!title) return '📋'
    if (title.toLowerCase().endsWith('.pdf')) return '📄'
    if (title.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return '🖼️'
    if (title.toLowerCase().endsWith('.docx')) return '📝'
    return '📋'
  }

  if (view === 'home') return (
    <div style={s.page}>
      <div style={s.header}>
        <Logo s={s} />
        <div style={s.headerRight}>
          <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️ Light' : '🌙 Dark'}</button>
          <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
        </div>
      </div>
      <div style={s.container}>
        <div style={s.pageTitle}>Your projects</div>
        <div style={s.pageSub}>Create a project, upload docs, share the link with your team</div>
        <div style={s.card}>
          <div style={s.cardTitle}>New project</div>
          <input style={s.input} placeholder="Project name *" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} />
          <input style={s.input} placeholder="Short description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <button style={s.btn} onClick={createProject} disabled={creating}>{creating ? 'Creating...' : '+ Create project'}</button>
        </div>
        <div style={s.sectionLabel}>All projects — {projects.length}</div>
        {projects.length === 0 && <div style={{ color: '#555', fontSize: '14px', padding: '20px 0' }}>No projects yet.</div>}
        <div style={s.grid}>
          {projects.map(p => (
            <div key={p.id} style={s.projectCard} onClick={() => openProject(p)}>
              <div style={s.projectName}>{p.name}</div>
              {p.description && <div style={s.projectDesc}>{p.description}</div>}
              <div style={s.projectFooter}>
                <div style={s.projectMeta}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                <div style={s.projectArrow}>Open →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Toast msg={toast} s={s} />
    </div>
  )

  const chatUrl = `${window.location.origin}/chat/${selectedProject.id}`

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={s.backBtn} onClick={() => setView('home')}>← Back</button>
          <Logo s={s} />
          <span style={{ fontSize: '14px', color: '#555' }}>/ {selectedProject.name}</span>
        </div>
        <div style={s.headerRight}>
          <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️ Light' : '🌙 Dark'}</button>
          <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
        </div>
      </div>
      <div style={s.container}>
        <div style={{ marginBottom: '24px' }}>
          <div style={s.pageTitle}>{selectedProject.name}</div>
          {selectedProject.description && <div style={{ fontSize: '14px', color: '#555' }}>{selectedProject.description}</div>}
        </div>
        <div style={s.tabs}>
          <button style={tab === 'docs' ? s.tabActive : s.tab} onClick={() => setTab('docs')}>Documents {documents.length > 0 && `(${documents.length})`}</button>
          <button style={tab === 'upload' ? s.tabActive : s.tab} onClick={() => setTab('upload')}>+ Upload</button>
          <button style={tab === 'history' ? s.tabActive : s.tab} onClick={() => { setTab('history'); fetchChatHistory(selectedProject.id) }}>Chat history {chatHistory.length > 0 && `(${chatHistory.length})`}</button>
          <button style={tab === 'share' ? s.tabActive : s.tab} onClick={() => setTab('share')}>Share</button>
        </div>

        {tab === 'docs' && (
          <div>
            {documents.length === 0 && (
              <div style={{ ...s.card, ...s.emptyState }}>
                <div style={s.emptyIcon}>📂</div>
                No documents yet. Go to Upload tab to add documents.
              </div>
            )}
            {documents.map(doc => (
              <div key={doc.id} style={s.docItem}>
                <div style={s.docIcon}>{getDocIcon(doc.title)}</div>
                <div style={s.docInfo}>
                  <div style={s.docTitle}>{doc.title}</div>
                  <div style={s.docMeta}>{new Date(doc.created_at).toLocaleDateString()} · {(doc.content.length / 1000).toFixed(1)}k chars</div>
                </div>
                <button style={s.btnDanger} onClick={() => deleteDocument(doc.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'upload' && (
          <div style={s.card}>
            <div style={s.cardTitle}>Upload documents</div>
            <div style={s.uploadBox} onClick={() => fileInputRef.current.click()}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📁</div>
              <div style={s.uploadText}>Click to upload files</div>
              <div style={s.uploadSub}>PDF · DOCX · PNG · JPG · TXT — multiple files supported</div>
              <input ref={fileInputRef} type="file" accept="*/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
            {processing && <div style={s.processing}>{processing}</div>}
            <div style={s.divider}>—  
              
              


              <div style={{ marginBottom: '16px' }}>
  <div style={{ fontSize: '13px', fontWeight: '600', color: text2, marginBottom: '8px' }}>Or add Figma link</div>
  <div style={{ display: 'flex', gap: '8px' }}>
    <input
      style={{ ...s.input, marginBottom: 0, flex: 1 }}
      placeholder="https://www.figma.com/file/..."
      value={figmaUrl}
      onChange={e => setFigmaUrl(e.target.value)}
    />
    <button style={s.btnSm} onClick={extractFigma} disabled={!figmaUrl.trim()}>
      Extract
    </button>
  </div>
</div>

              
               or paste content manually —</div>
            <input style={s.input} placeholder="Document title (e.g. PRD v2, Walkthrough notes)" value={docTitle} onChange={e => setDocTitle(e.target.value)} />
            <textarea style={s.textarea} placeholder="Paste your document content here..." value={docContent} onChange={e => setDocContent(e.target.value)} />
            <button style={s.btn} onClick={uploadPasted}>Upload document</button>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {chatHistory.length === 0 && (
              <div style={{ ...s.card, ...s.emptyState }}>
                <div style={s.emptyIcon}>💬</div>
                No questions asked yet for this project.
              </div>
            )}
            {chatHistory.map((item, i) => (
              <HistoryItem key={i} item={item} s={s} />
            ))}
          </div>
        )}

        {tab === 'share' && (
          <div style={s.card}>
            <div style={s.cardTitle}>Share with your team</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', lineHeight: '1.7' }}>
              Share this link with designers, engineers, and QA. They'll get a clean chat interface for this project only — no PM controls.
            </p>
            <div style={s.linkBox}>
              <div style={s.linkText}>{chatUrl}</div>
              <button style={s.btnSm} onClick={() => copyLink(selectedProject.id)}>Copy link</button>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '16px' }}>
              Make sure all documents are uploaded before sharing.
            </p>
          </div>
        )}
      </div>
      <Toast msg={toast} s={s} />
    </div>
  )
}

function ChatApp() {
  
  const [chatImage, setChatImage] = useState(null)
const [chatImagePreview, setChatImagePreview] = useState(null)
const imageInputRef = useRef(null)
  
setChatImage(null)
setChatImagePreview(null)

  const { projectId } = useParams()
  const { dark, toggle } = useTheme()
  const s = makeStyles(dark)
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    async function loadProject() {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (data) setProject(data)
      else setNotFound(true)
    }

    function handleChatImage(e) {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        setChatImage({ base64: reader.result.split(',')[1], type: file.type })
        setChatImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }




    async function loadHistory() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(20)
      if (data && data.length > 0) {
        const restored = []
        data.forEach(m => {
          restored.push({ role: 'user', content: m.question })
          restored.push({ role: 'assistant', content: m.answer })
        })
        setMessages(restored)
      }
    }
    loadProject()
    loadHistory()
  }, [projectId])

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function askQuestion() {
    if (!question.trim() || loading) return
    setLoading(true)
    const userQuestion = question
    setQuestion('')
    const newMessages = [...messages, { role: 'user', content: userQuestion }]
    setMessages(newMessages)

    try {
      const { data: docs } = await supabase.from('documents').select('title, content').eq('project_id', projectId)

      if (!docs || docs.length === 0) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No documents have been uploaded for this project yet. Please ask your PM to upload the project documents.' }])
        setLoading(false)
        return
      }

      const context = docs.map(d => `--- Document: ${d.title} ---\n${d.content}`).join('\n\n')
      const history = newMessages.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${SERVER}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, context, projectName: project.name, history, image: chatImage  })
      })
      const data = await res.json()
      const answer = data.answer
      await supabase.from('messages').insert([{ project_id: projectId, question: userQuestion, answer }])
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  if (notFound) return (
    <div style={{ ...s.chatPage, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>Project not found</div>
        <div style={{ fontSize: '14px', color: '#444' }}>Ask your PM for the correct link.</div>
      </div>
    </div>
  )

  if (!project) return (
    <div style={{ ...s.chatPage, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontSize: '14px' }}>Loading...</div>
    </div>
  )

  return (
    <div style={s.chatPage}>
      <div style={s.chatHeader}>
        <div style={s.logoIcon}>🧠</div>
        <div style={s.chatHeaderInfo}>
          <div style={s.chatProjectName}>{project.name}</div>
          <div style={s.chatProjectSub}>Powered by Mind · Answers based on project documents only</div>
        </div>
        <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️' : '🌙'}</button>
      </div>
      <div style={s.chatBody}>
        <div style={s.chatBox}>
          {messages.length === 0 && (
            <div style={s.emptyChat}>
              <div style={s.emptyChatIcon}>🧠</div>
              <div style={s.emptyChatTitle}>Ask anything about {project.name}</div>
              <div style={s.emptyChatSub}>I'll answer strictly from the uploaded project documents</div>
            </div>
          )}
          {messages.map((m, i) => (
            m.role === 'user'
              ? <div key={i} style={s.userMsg}><div style={s.userBubble}>{m.content}</div></div>
              : <div key={i} style={s.aiMsgRow}>
                  <div style={s.aiAvatar}>🧠</div>
                  <div style={s.aiBubble}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
          ))}
          {loading && (
            <div style={s.aiMsgRow}>
              <div style={s.aiAvatar}>🧠</div>
              <div style={{ ...s.aiBubble, color: '#666' }}>Searching documents...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div>
  {chatImagePreview && (
    <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
      <img src={chatImagePreview} alt="attached" style={{ maxHeight: '120px', borderRadius: '8px', border: `1px solid ${s.aiBubble.border}` }} />
      <button onClick={() => { setChatImage(null); setChatImagePreview(null) }} style={{ position: 'absolute', top: '4px', right: '4px', background: '#111', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px' }}>×</button>
    </div>
  )}
  <div style={s.inputWrap}>
    <input
      style={s.chatInput}
      placeholder="Ask anything about this project..."
      value={question}
      onChange={e => setQuestion(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && askQuestion()}
    />
    <button onClick={() => imageInputRef.current.click()} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }} title="Attach screenshot">📎</button>
    <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChatImage} />
    <button style={s.sendBtn} onClick={askQuestion} disabled={loading}>
      {loading ? '...' : 'Ask →'}
    </button>
  </div>
</div>




        
        <div style={s.poweredBy}>Mind by Way.com</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PMApp />} />
        <Route path="/chat/:projectId" element={<ChatApp />} />
      </Routes>
    </BrowserRouter>
  )
}