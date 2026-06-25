import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from './supabase'

const SERVER = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'
const ACCESS_PIN = process.env.REACT_APP_ACCESS_PIN || 'MIND01'
const ADMIN_PIN = process.env.REACT_APP_ADMIN_PIN || 'WAY999'
const MINUTES_PER_QUESTION = 5

// ---------- helpers ----------
function newId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function titleFrom(text) {
  const t = (text || '').trim().replace(/\s+/g, ' ')
  if (!t) return 'New chat'
  return t.length > 36 ? t.slice(0, 36) + '…' : t
}

function formatMinutes(totalMin) {
  if (!totalMin) return '0 min'
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${h}h ${m}m`
}

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('mind-theme') === 'dark')
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
  const tabActiveBg = dark ? '#252525' : '#FFFFFF'
  const shadow = dark ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)'
  const shadowLg = dark ? '0 12px 40px rgba(0,0,0,0.55)' : '0 12px 40px rgba(16,24,40,0.10)'
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
    card: { background: bg2, borderRadius: '18px', padding: '24px', marginBottom: '16px', border: `1px solid ${border}`, boxShadow: shadow },
    cardTitle: { fontSize: '14px', fontWeight: '600', color: text1, marginBottom: '16px' },
    input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: inputBg, color: text1 },
    textarea: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '14px', height: '160px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', background: inputBg, color: text1 },
    btn: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', padding: '12px 22px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 14px rgba(99,102,241,0.30)' },
    btnSm: { background: '#6366F1', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' },
    btnDanger: { background: 'transparent', color: '#F87171', border: '1px solid #3F1515', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },
    projectCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '18px', padding: '20px', cursor: 'pointer', boxShadow: shadow },
    cardDelBtn: { background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer', padding: '2px 6px', borderRadius: '8px', lineHeight: 1, opacity: 0.7 },
    projectName: { fontSize: '15px', fontWeight: '600', color: text1, marginBottom: '6px' },
    projectDesc: { fontSize: '13px', color: text2, marginBottom: '16px', lineHeight: '1.5' },
    projectFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    projectMeta: { fontSize: '12px', color: text3 },
    projectArrow: { fontSize: '13px', color: '#6366F1', fontWeight: '600' },
    tabs: { display: 'flex', gap: '2px', background: tabBg, borderRadius: '12px', padding: '4px', marginBottom: '24px', border: `1px solid ${border}` },
    tab: { flex: 1, padding: '8px 12px', borderRadius: '9px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: text2, fontWeight: '500' },
    tabActive: { flex: 1, padding: '8px 12px', borderRadius: '9px', border: 'none', background: tabActiveBg, fontSize: '13px', cursor: 'pointer', color: text1, fontWeight: '600', boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' },
    // home toggle (Dashboard / Projects)
    homeToggle: { display: 'inline-flex', gap: '2px', background: tabBg, borderRadius: '12px', padding: '4px', marginBottom: '28px', border: `1px solid ${border}` },
    homeToggleBtn: { padding: '8px 18px', borderRadius: '9px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: text2, fontWeight: '600' },
    homeToggleActive: { padding: '8px 18px', borderRadius: '9px', border: 'none', background: tabActiveBg, fontSize: '13px', cursor: 'pointer', color: text1, fontWeight: '600', boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)' },
    // KPI cards
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' },
    kpiCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '18px', padding: '22px', boxShadow: shadow },
    kpiTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
    kpiIcon: { width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px' },
    kpiLabel: { fontSize: '13px', color: text2, fontWeight: '500' },
    kpiValue: { fontSize: '32px', fontWeight: '700', color: text1, letterSpacing: '-0.6px', lineHeight: 1.1 },
    kpiSub: { fontSize: '12px', color: text3, marginTop: '6px' },
    // table
    tableCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '18px', overflow: 'hidden', boxShadow: shadow },
    tableHeadRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '14px 22px', borderBottom: `1px solid ${border}`, fontSize: '11px', fontWeight: '700', color: text3, textTransform: 'uppercase', letterSpacing: '0.7px' },
    tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '15px 22px', borderBottom: `1px solid ${border}`, fontSize: '14px', color: text1, alignItems: 'center' },
    tableCellName: { fontWeight: '600', color: text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' },
    tableCellNum: { color: text2, fontVariantNumeric: 'tabular-nums' },
    tableCaption: { fontSize: '12px', color: text3, marginTop: '12px', textAlign: 'center' },
    // upload / docs
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
    expandBtn: { background: 'none', border: 'none', color: '#6366F1', fontSize: '12px', cursor: 'pointer', padding: '4px 0', marginTop: '4px' },

    // ---------- CHAT (two-pane) ----------
    chatLayout: { display: 'flex', height: '100vh', width: '100%', background: bg, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    chatSidebar: { width: '280px', flexShrink: 0, background: bg2, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' },
    sidebarHeader: { padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` },
    sidebarFooter: { padding: '14px 16px', borderTop: `1px solid ${border}`, fontSize: '12px', color: text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    newChatBtn: { width: '100%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', padding: '11px', borderRadius: '11px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' },
    chatList: { flex: 1, overflowY: 'auto', padding: '8px' },
    chatListItem: { padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: text2, marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' },
    chatListItemActive: { background: bg3, color: text1, fontWeight: '600' },
    chatDelBtn: { background: 'none', border: 'none', color: text3, fontSize: '15px', cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 },
    iconBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '16px', cursor: 'pointer', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chatMain: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' },
    chatMainHeader: { padding: '12px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', background: bg2 },
    chatProjectName: { fontSize: '15px', fontWeight: '700', color: text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    chatProjectSub: { fontSize: '12px', color: text3, marginTop: '1px' },
    chatScroll: { flex: 1, overflowY: 'auto', padding: '24px 20px', minHeight: 0 },
    chatInner: { maxWidth: '780px', margin: '0 auto', width: '100%' },
    chatInputBar: { borderTop: `1px solid ${border}`, padding: '14px 20px', background: bg2, flexShrink: 0 },
    emptyChat: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', textAlign: 'center' },
    emptyChatIcon: { width: '56px', height: '56px', background: bg2, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: `1px solid ${border}` },
    emptyChatTitle: { fontSize: '17px', fontWeight: '600', color: text1 },
    emptyChatSub: { fontSize: '13px', color: text3, maxWidth: '320px' },
    userMsg: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
    userBubble: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '18px 18px 4px 18px', padding: '12px 18px', maxWidth: '75%', color: '#FFFFFF', fontSize: '14px', lineHeight: '1.6', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' },
    aiMsgRow: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' },
    aiAvatar: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginTop: '2px' },
    aiBubble: { background: bg2, border: `1px solid ${border}`, borderRadius: '4px 18px 18px 18px', padding: '14px 18px', maxWidth: '82%', fontSize: '14px', lineHeight: '1.7', color: text1 },
    inputWrap: { background: bg2, borderRadius: '16px', border: `1px solid ${border2}`, padding: '6px 6px 6px 18px', display: 'flex', alignItems: 'center', gap: '8px' },
    chatInput: { flex: 1, border: 'none', fontSize: '14px', outline: 'none', fontFamily: 'inherit', background: 'transparent', color: text1, padding: '6px 0' },
    sendBtn: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
    attachBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px 8px', color: text2 },
    backBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '13px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px' },
    sectionLabel: { fontSize: '11px', fontWeight: '600', color: text3, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' },
    toast: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: dark ? '#1A1A1A' : '#111', color: '#fff', border: `1px solid ${border}`, padding: '10px 20px', borderRadius: '10px', fontSize: '14px', zIndex: 100, whiteSpace: 'nowrap' },
    processing: { fontSize: '13px', color: '#6366F1', marginBottom: '12px', fontStyle: 'italic' },
    poweredBy: { textAlign: 'center', fontSize: '12px', color: text3, marginTop: '12px' },
    pageTitle: { fontSize: '24px', fontWeight: '700', color: text1, marginBottom: '6px' },
    pageSub: { fontSize: '14px', color: text3, marginBottom: '32px' },
    emptyState: { textAlign: 'center', color: text3, padding: '48px', fontSize: '14px' },
    emptyIcon: { fontSize: '28px', marginBottom: '10px' },
    figmaRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
    imagePreviewWrap: { marginBottom: '8px', position: 'relative', display: 'inline-block' },
    imagePreview: { maxHeight: '120px', borderRadius: '8px', border: `1px solid ${border}` },
    imageRemoveBtn: { position: 'absolute', top: '4px', right: '4px', background: '#111', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dangerZone: { marginTop: '24px', background: dark ? '#1A0F0F' : '#FEF2F2', border: dark ? '1px solid #3F1D1D' : '1px solid #FECACA', borderRadius: '16px', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
    dangerTitle: { fontSize: '14px', fontWeight: '700', color: dark ? '#F87171' : '#B91C1C' },
    dangerSub: { fontSize: '12px', color: dark ? '#9A6B6B' : '#C26B6B', marginTop: '4px', maxWidth: '420px', lineHeight: 1.5 },
    btnDangerSolid: { background: '#DC2626', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(220,38,38,0.30)' },
    adminPill: { fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: dark ? '#3F1D1D' : '#FEE2E2', color: dark ? '#FCA5A5' : '#B91C1C' },
    footer: { textAlign: 'center', fontSize: '12px', color: text3, marginTop: '40px', paddingBottom: '8px' },
    shadowLg,
    bg, bg2, bg3, border, border2, text1, text2, text3,
  }
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; }
      button { transition: transform .12s ease, opacity .12s ease, box-shadow .15s ease, background .15s ease; }
      button:hover:not(:disabled) { opacity: .93; }
      button:active:not(:disabled) { transform: scale(.98); }
      button:disabled { opacity: .55; cursor: default; }
      input, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
      input:focus, textarea:focus { border-color: #6366F1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.16); }
      .mind-card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
      .mind-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(16,24,40,0.10); border-color: rgba(99,102,241,0.35); }
      .mind-chat-item:hover { background: rgba(127,127,127,0.12) !important; }
      .mind-row:hover { background: rgba(99,102,241,0.05); }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.35); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(127,127,127,0.55); }
      ::-webkit-scrollbar-track { background: transparent; }
    `}</style>
  )
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
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/#{1,6}\s/g, '').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/\n/g, ' ').trim()
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
        {expanded ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown> : preview.substring(0, 280) + (isLong ? '...' : '')}
      </div>
      {isLong && <button style={s.expandBtn} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less ↑' : 'Show full answer ↓'}</button>}
      <div style={s.historyMeta}>{new Date(item.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  )
}

function LoginPage({ s, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  function handleSubmit() {
    const entered = pin.toUpperCase()
    const isAdmin = entered === ADMIN_PIN.toUpperCase()
    const isUser = entered === ACCESS_PIN.toUpperCase()
    if (isAdmin || isUser) {
      sessionStorage.setItem('mind-auth', 'true')
      sessionStorage.setItem('mind-admin', isAdmin ? 'true' : 'false')
      onSuccess(isAdmin)
    } else {
      setError('Incorrect PIN. Please try again.')
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 600)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: s.page.background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: s.page.fontFamily, position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} } .shake{animation:shake 0.5s;}`}</style>
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '520px', height: '520px', background: 'radial-gradient(circle, rgba(139,92,246,0.18), rgba(99,102,241,0) 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px', boxShadow: '0 10px 30px rgba(99,102,241,0.35)' }}>🧠</div>
        <div style={{ fontSize: '36px', fontWeight: '700', color: s.text1, marginBottom: '8px', letterSpacing: '-0.5px' }}>Mind</div>
        <div style={{ fontSize: '15px', color: s.text2, marginBottom: '40px', lineHeight: '1.7' }}>Your AI product assistant for Way.com.<br />Ask anything about your projects instantly.</div>
        <div style={{ background: s.bg2, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '32px', boxShadow: s.shadowLg }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: s.text2, marginBottom: '12px', textAlign: 'left' }}>Enter access PIN</div>
          <input
            className={shaking ? 'shake' : ''}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${shaking ? '#F87171' : s.border}`, marginBottom: '12px', fontSize: '22px', letterSpacing: '8px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', outline: 'none', background: s.bg2, color: s.text1, fontFamily: 'monospace' }}
            placeholder="······"
            value={pin}
            maxLength={10}
            onChange={e => { setPin(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && <div style={{ color: '#F87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          <button style={{ ...s.btn, width: '100%', padding: '13px', fontSize: '15px' }} onClick={handleSubmit}>Enter →</button>
        </div>
        <div style={{ fontSize: '12px', color: s.text3, marginTop: '28px' }}>Mind AI built by Mukesh for Way with ❤️</div>
      </div>
    </div>
  )
}

// ---------------- PM PORTAL ----------------
function PMApp() {
  const { dark, toggle } = useTheme()
  const s = makeStyles(dark)
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('mind-auth') === 'true')
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('mind-admin') === 'true')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [view, setView] = useState('home')
  const [homeTab, setHomeTab] = useState('dashboard') // dashboard | projects
  const [tab, setTab] = useState('docs')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [documents, setDocuments] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [toast, setToast] = useState('')
  const [processing, setProcessing] = useState('')
  const [creating, setCreating] = useState(false)
  const [msgCounts, setMsgCounts] = useState({})
  const [totalQuestions, setTotalQuestions] = useState(0)
  const fileInputRef = useRef(null)

  useEffect(() => { if (authed) { fetchProjects(); fetchStats() } }, [authed])

  if (!authed) return <LoginPage s={{ ...s, text1: s.pageTitle?.color || (dark ? '#fff' : '#111'), text2: s.text2, text3: s.text3, bg2: s.card.background, border: s.card.border, btn: s.btn }} onSuccess={(admin) => { setAuthed(true); setIsAdmin(admin) }} />

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function fetchProjects() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  async function fetchStats() {
    const { data } = await supabase.from('messages').select('project_id')
    const counts = {}
    ;(data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
    setMsgCounts(counts)
    setTotalQuestions((data || []).length)
  }

  async function fetchDocuments(projectId) {
    const { data } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (data) setDocuments(data)
  }

  async function fetchChatHistory(projectId) {
    const { data } = await supabase.from('messages').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50)
    if (data) setChatHistory(data)
  }

  async function createProject() {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase.from('projects').insert([{ name: newName, description: newDesc }]).select()
    if (data) { setProjects([data[0], ...projects]); setNewName(''); setNewDesc(''); showToast('Project created!') }
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
          if (!data.text && data.warning) { showToast(data.warning); continue }
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
          const { error } = await supabase.from('documents').insert([{ project_id: selectedProject.id, title: file.name, content: text.substring(0, 100000) }])
          if (error) showToast(`Failed: ${error.message}`)
          else showToast(`✓ ${file.name} uploaded!`)
        } else {
          showToast(`Could not extract text from ${file.name}`)
        }
      } catch (err) { showToast(`Error: ${err.message}`) }
    }
    setProcessing('')
    fetchDocuments(selectedProject.id)
    e.target.value = ''
  }

  async function uploadPasted() {
    if (!docTitle.trim() || !docContent.trim()) return
    const { error } = await supabase.from('documents').insert([{ project_id: selectedProject.id, title: docTitle, content: docContent.substring(0, 100000) }])
    if (error) showToast('Upload failed')
    else { showToast('Document uploaded!'); setDocTitle(''); setDocContent(''); fetchDocuments(selectedProject.id) }
  }

  async function extractFigma() {
    if (!figmaUrl.trim()) return
    setProcessing('Reading Figma file...')
    try {
      const res = await fetch(`${SERVER}/extract-figma`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: figmaUrl }) })
      const data = await res.json()
      if (data.error) { showToast(`Figma error: ${data.error}`); setProcessing(''); return }
      const { error } = await supabase.from('documents').insert([{ project_id: selectedProject.id, title: `Figma: ${figmaUrl.split('/').slice(-1)[0] || 'design'}`, content: data.text.substring(0, 100000) }])
      if (error) showToast('Failed to save Figma content')
      else { showToast('Figma screens extracted!'); setFigmaUrl(''); fetchDocuments(selectedProject.id) }
    } catch (err) { showToast(`Error: ${err.message}`) }
    setProcessing('')
  }

  async function deleteDocument(id) {
    await supabase.from('documents').delete().eq('id', id)
    fetchDocuments(selectedProject.id)
    showToast('Deleted')
  }

  function openProject(p) { setSelectedProject(p); fetchDocuments(p.id); fetchChatHistory(p.id); setTab('docs'); setView('project') }
  function copyLink(id) { navigator.clipboard.writeText(`${window.location.origin}/chat/${id}`); showToast('Link copied!') }

  async function deleteProject(p) {
    if (!window.confirm(`Delete "${p.name}"?\n\nThis permanently removes the project, all its documents, and its chat history. This cannot be undone.`)) return
    await supabase.from('messages').delete().eq('project_id', p.id)
    await supabase.from('documents').delete().eq('project_id', p.id)
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) { showToast(`Delete failed: ${error.message}`); return }
    setProjects(prev => prev.filter(x => x.id !== p.id))
    setMsgCounts(prev => { const n = { ...prev }; delete n[p.id]; return n })
    fetchStats()
    if (selectedProject && selectedProject.id === p.id) setView('home')
    showToast('Project deleted')
  }

  function getDocIcon(title) {
    if (!title) return '📋'
    if (title.toLowerCase().endsWith('.pdf')) return '📄'
    if (title.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return '🖼️'
    if (title.toLowerCase().endsWith('.docx')) return '📝'
    if (title.startsWith('Figma:')) return '🎨'
    return '📋'
  }

  // ----- HOME (Dashboard + Projects) -----
  if (view === 'home') {
    const sortedProjects = [...projects].sort((a, b) => (msgCounts[b.id] || 0) - (msgCounts[a.id] || 0))
    const totalMinutesSaved = totalQuestions * MINUTES_PER_QUESTION

    return (
      <div style={s.page}>
        <div style={s.header}>
          <Logo s={s} />
          <div style={s.headerRight}>
            <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️ Light' : '🌙 Dark'}</button>
            {isAdmin && <span style={s.adminPill}>Admin</span>}
            <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
          </div>
        </div>
        <div style={s.container}>
          <div style={s.homeToggle}>
            <button style={homeTab === 'dashboard' ? s.homeToggleActive : s.homeToggleBtn} onClick={() => { setHomeTab('dashboard'); fetchStats() }}>Dashboard</button>
            <button style={homeTab === 'projects' ? s.homeToggleActive : s.homeToggleBtn} onClick={() => setHomeTab('projects')}>Projects</button>
          </div>

          {homeTab === 'dashboard' && (
            <div>
              <div style={s.pageTitle}>Dashboard</div>
              <div style={s.pageSub}>Team-wide usage and time saved across all projects</div>

              <div style={s.kpiGrid}>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={{ ...s.kpiIcon, background: dark ? '#1E1B4B' : '#EDE9FE' }}>📁</div>
                    <div style={s.kpiLabel}>Total Projects</div>
                  </div>
                  <div style={s.kpiValue}>{projects.length}</div>
                </div>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={{ ...s.kpiIcon, background: dark ? '#0D1F2D' : '#E0F2FE' }}>💬</div>
                    <div style={s.kpiLabel}>Questions Asked</div>
                  </div>
                  <div style={s.kpiValue}>{totalQuestions}</div>
                </div>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={{ ...s.kpiIcon, background: dark ? '#2D2410' : '#FEF3C7' }}>⏱️</div>
                    <div style={s.kpiLabel}>PM Time Saved</div>
                  </div>
                  <div style={s.kpiValue}>{formatMinutes(totalMinutesSaved)}</div>
                  <div style={s.kpiSub}>Based on {MINUTES_PER_QUESTION} min saved per question</div>
                </div>
              </div>

              <div style={s.sectionLabel}>By project</div>
              <div style={s.tableCard}>
                <div style={s.tableHeadRow}>
                  <div>Project</div>
                  <div>Questions Asked</div>
                  <div>Time Saved</div>
                </div>
                {sortedProjects.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: s.text3, fontSize: '14px' }}>No projects yet.</div>
                )}
                {sortedProjects.map(p => {
                  const q = msgCounts[p.id] || 0
                  return (
                    <div key={p.id} className="mind-row" style={s.tableRow}>
                      <div style={s.tableCellName}>{p.name}</div>
                      <div style={s.tableCellNum}>{q}</div>
                      <div style={s.tableCellNum}>{formatMinutes(q * MINUTES_PER_QUESTION)}</div>
                    </div>
                  )
                })}
              </div>
              <div style={s.tableCaption}>1 question ≈ {MINUTES_PER_QUESTION} minutes of PM time saved</div>
            </div>
          )}

          {homeTab === 'projects' && (
            <div>
              <div style={s.pageTitle}>Your projects</div>
              <div style={s.pageSub}>Create a project, upload docs, share the link with your team</div>
              <div style={s.card}>
                <div style={s.cardTitle}>New project</div>
                <input style={s.input} placeholder="Project name *" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} />
                <input style={s.input} placeholder="Short description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                <button style={s.btn} onClick={createProject} disabled={creating}>{creating ? 'Creating...' : '+ Create project'}</button>
              </div>
              <div style={s.sectionLabel}>All projects — {projects.length}</div>
              {projects.length === 0 && <div style={{ color: s.text2, fontSize: '14px', padding: '20px 0' }}>No projects yet.</div>}
              <div style={s.grid}>
                {projects.map(p => (
                  <div key={p.id} className="mind-card" style={s.projectCard} onClick={() => openProject(p)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={s.projectName}>{p.name}</div>
                      {isAdmin && <button style={s.cardDelBtn} title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(p) }}>🗑️</button>}
                    </div>
                    {p.description && <div style={s.projectDesc}>{p.description}</div>}
                    <div style={s.projectFooter}>
                      <div style={s.projectMeta}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={s.projectArrow}>Open →</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={s.footer}>Mind AI built by Mukesh for Way with ❤️</div>
        </div>
        <Toast msg={toast} s={s} />
      </div>
    )
  }

  // ----- PROJECT DETAIL -----
  const chatUrl = `${window.location.origin}/chat/${selectedProject.id}`

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button style={s.backBtn} onClick={() => { setView('home'); fetchStats() }}>← Back</button>
          <Logo s={s} />
          <span style={{ fontSize: '14px', color: s.text2 }}>/ {selectedProject.name}</span>
        </div>
        <div style={s.headerRight}>
          <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️ Light' : '🌙 Dark'}</button>
          {isAdmin && <span style={s.adminPill}>Admin</span>}
          <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
        </div>
      </div>
      <div style={s.container}>
        <div style={{ marginBottom: '24px' }}>
          <div style={s.pageTitle}>{selectedProject.name}</div>
          {selectedProject.description && <div style={{ fontSize: '14px', color: s.text2 }}>{selectedProject.description}</div>}
        </div>
        <div style={s.tabs}>
          <button style={tab === 'docs' ? s.tabActive : s.tab} onClick={() => setTab('docs')}>Documents {documents.length > 0 && `(${documents.length})`}</button>
          <button style={tab === 'upload' ? s.tabActive : s.tab} onClick={() => setTab('upload')}>+ Upload</button>
          <button style={tab === 'history' ? s.tabActive : s.tab} onClick={() => { setTab('history'); fetchChatHistory(selectedProject.id) }}>Chat history {chatHistory.length > 0 && `(${chatHistory.length})`}</button>
          <button style={tab === 'share' ? s.tabActive : s.tab} onClick={() => setTab('share')}>Share</button>
        </div>

        {tab === 'docs' && (
          <div>
            {documents.length === 0 && <div style={{ ...s.card, ...s.emptyState }}><div style={s.emptyIcon}>📂</div>No documents yet.</div>}
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

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: s.text2, marginBottom: '8px' }}>Add Figma link</div>
              <div style={s.figmaRow}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="https://www.figma.com/file/..." value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} />
                <button style={s.btnSm} onClick={extractFigma} disabled={!figmaUrl.trim()}>Extract screens</button>
              </div>
            </div>

            <div style={s.divider}>— or paste content manually —</div>
            <input style={s.input} placeholder="Document title (e.g. PRD v2, Walkthrough notes)" value={docTitle} onChange={e => setDocTitle(e.target.value)} />
            <textarea style={s.textarea} placeholder="Paste your document content here..." value={docContent} onChange={e => setDocContent(e.target.value)} />
            <button style={s.btn} onClick={uploadPasted}>Upload document</button>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {chatHistory.length === 0 && <div style={{ ...s.card, ...s.emptyState }}><div style={s.emptyIcon}>💬</div>No questions asked yet.</div>}
            {chatHistory.map((item, i) => <HistoryItem key={i} item={item} s={s} />)}
          </div>
        )}

        {tab === 'share' && (
          <div style={s.card}>
            <div style={s.cardTitle}>Share with your team</div>
            <p style={{ fontSize: '14px', color: s.text2, marginBottom: '16px', lineHeight: '1.7' }}>
              Share this link with designers, engineers, and QA. They'll get a clean chat interface for this project only.
            </p>
            <div style={s.linkBox}>
              <div style={s.linkText}>{chatUrl}</div>
              <button style={s.btnSm} onClick={() => copyLink(selectedProject.id)}>Copy link</button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div style={s.dangerZone}>
            <div>
              <div style={s.dangerTitle}>Delete this project</div>
              <div style={s.dangerSub}>Permanently removes the project, all its documents, and its chat history. This cannot be undone.</div>
            </div>
            <button style={s.btnDangerSolid} onClick={() => deleteProject(selectedProject)}>Delete project</button>
          </div>
        )}

        <div style={s.footer}>Mind AI built by Mukesh for Way with ❤️</div>
      </div>
      <Toast msg={toast} s={s} />
    </div>
  )
}

// ---------------- CHAT (team-facing) ----------------
function ChatApp() {
  const { projectId } = useParams()
  const { dark, toggle } = useTheme()
  const s = makeStyles(dark)
  const [project, setProject] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatImage, setChatImage] = useState(null)
  const [chatImagePreview, setChatImagePreview] = useState(null)
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth <= 820)
  const [sidebarOpen, setSidebarOpen] = useState(typeof window === 'undefined' ? true : window.innerWidth > 820)
  const chatEndRef = useRef(null)
  const imageInputRef = useRef(null)

  const storeKey = `mind-chats-${projectId}`
  function loadChats() {
    try { return JSON.parse(localStorage.getItem(storeKey)) || [] } catch { return [] }
  }

  // load project
  useEffect(() => {
    async function loadProject() {
      const { data } = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (data) setProject(data)
      else setNotFound(true)
    }
    loadProject()
  }, [projectId])

  // init chats from localStorage (per browser, per project)
  useEffect(() => {
    let existing = loadChats()
    if (!existing.length) {
      existing = [{ id: newId(), title: 'New chat', messages: [], createdAt: Date.now() }]
    }
    setChats(existing)
    setActiveChatId(existing[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // persist chats
  useEffect(() => {
    if (chats.length) { try { localStorage.setItem(storeKey, JSON.stringify(chats)) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats])

  // responsive
  useEffect(() => {
    function onResize() { setIsNarrow(window.innerWidth <= 820) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || { id: null, messages: [] }
  const messages = activeChat.messages || []

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [activeChatId, chats, loading])

  function newChat() {
    const fresh = { id: newId(), title: 'New chat', messages: [], createdAt: Date.now() }
    setChats(prev => [fresh, ...prev])
    setActiveChatId(fresh.id)
    if (isNarrow) setSidebarOpen(false)
  }

  function selectChat(id) {
    setActiveChatId(id)
    if (isNarrow) setSidebarOpen(false)
  }

  function deleteChat(id, e) {
    e.stopPropagation()
    const next = chats.filter(c => c.id !== id)
    if (!next.length) {
      const fresh = { id: newId(), title: 'New chat', messages: [], createdAt: Date.now() }
      setChats([fresh]); setActiveChatId(fresh.id)
    } else {
      setChats(next)
      if (id === activeChatId) setActiveChatId(next[0].id)
    }
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

  async function askQuestion() {
    if ((!question.trim() && !chatImage) || loading) return
    setLoading(true)
    const chatId = activeChatId
    const userQuestion = question || 'What do you see in this image? Does it relate to the project documents?'
    setQuestion('')
    const imageToSend = chatImage
    const imgPreview = chatImagePreview
    setChatImage(null)
    setChatImagePreview(null)

    const current = chats.find(c => c.id === chatId)
    const baseMessages = current ? current.messages : []
    const userMsg = { role: 'user', content: userQuestion, image: imgPreview }
    const newMessages = [...baseMessages, userMsg]

    // add the user message + auto-title the chat from the first question
    setChats(prev => prev.map(c => c.id === chatId
      ? { ...c, messages: newMessages, title: c.title === 'New chat' ? titleFrom(userQuestion) : c.title }
      : c))

    try {
      const { data: docs } = await supabase.from('documents').select('title, content').eq('project_id', projectId)
      if (!docs || docs.length === 0) {
        setChats(prev => prev.map(c => c.id === chatId
          ? { ...c, messages: [...newMessages, { role: 'assistant', content: 'No documents uploaded yet. Ask your PM to upload project documents.' }] }
          : c))
        setLoading(false)
        return
      }
      const context = docs.map(d => `--- Document: ${d.title} ---\n${d.content}`).join('\n\n')
      const history = newMessages.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(`${SERVER}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, context, projectName: project.name, history, image: imageToSend })
      })
      const data = await res.json()
      const answer = data.answer || 'Something went wrong. Please try again.'
      await supabase.from('messages').insert([{ project_id: projectId, question: userQuestion, answer }])
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, messages: [...newMessages, { role: 'assistant', content: answer }] }
        : c))
    } catch {
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, messages: [...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }] }
        : c))
    }
    setLoading(false)
  }

  if (notFound) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: s.text1, marginBottom: '8px' }}>Project not found</div>
        <div style={{ fontSize: '14px', color: s.text2 }}>Ask your PM for the correct link.</div>
      </div>
    </div>
  )

  if (!project) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: s.text2, fontSize: '14px' }}>Loading...</div>
    </div>
  )

  // sidebar styling (responsive)
  const sidebarStyle = isNarrow
    ? { ...s.chatSidebar, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 60, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease', boxShadow: sidebarOpen ? '0 0 40px rgba(0,0,0,0.45)' : 'none' }
    : { ...s.chatSidebar, width: sidebarOpen ? '280px' : '0px', borderRight: sidebarOpen ? s.chatSidebar.borderRight : 'none', overflow: 'hidden', transition: 'width 0.2s ease' }

  return (
    <div style={s.chatLayout}>
      {isNarrow && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 55 }} />
      )}

      <div style={sidebarStyle}>
        <div style={s.sidebarHeader}>
          <Logo s={s} />
          {isNarrow && <button style={s.iconBtn} onClick={() => setSidebarOpen(false)}>×</button>}
        </div>
        <div style={{ padding: '12px' }}>
          <button style={s.newChatBtn} onClick={newChat}>+ New chat</button>
        </div>
        <div style={s.chatList}>
          {chats.map(c => (
            <div
              key={c.id}
              className="mind-chat-item"
              style={c.id === activeChatId ? { ...s.chatListItem, ...s.chatListItemActive } : s.chatListItem}
              onClick={() => selectChat(c.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.title || 'New chat'}</span>
              <button style={s.chatDelBtn} onClick={(e) => deleteChat(c.id, e)} title="Delete chat">×</button>
            </div>
          ))}
        </div>
        <div style={s.sidebarFooter}>{project.name}</div>
      </div>

      <div style={s.chatMain}>
        <div style={s.chatMainHeader}>
          <button style={s.iconBtn} onClick={() => setSidebarOpen(o => !o)} title="Toggle chats">☰</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.chatProjectName}>{project.name}</div>
            <div style={s.chatProjectSub}>Answers based on project documents only</div>
          </div>
          <button style={s.themeBtn} onClick={toggle}>{dark ? '☀️' : '🌙'}</button>
        </div>

        <div style={s.chatScroll}>
          <div style={s.chatInner}>
            {messages.length === 0 && !loading && (
              <div style={s.emptyChat}>
                <div style={s.emptyChatIcon}>🧠</div>
                <div style={s.emptyChatTitle}>Ask anything about {project.name}</div>
                <div style={s.emptyChatSub}>I'll answer strictly from the uploaded project documents. You can also attach a screenshot.</div>
              </div>
            )}
            {messages.map((m, i) => (
              m.role === 'user'
                ? <div key={i} style={s.userMsg}>
                    <div style={s.userBubble}>
                      {m.image && <img src={m.image} alt="attached" style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '8px', display: 'block' }} />}
                      {m.content}
                    </div>
                  </div>
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
                <div style={{ ...s.aiBubble, color: s.text2 }}>Searching documents...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div style={s.chatInputBar}>
          <div style={s.chatInner}>
            {chatImagePreview && (
              <div style={s.imagePreviewWrap}>
                <img src={chatImagePreview} alt="attached" style={s.imagePreview} />
                <button style={s.imageRemoveBtn} onClick={() => { setChatImage(null); setChatImagePreview(null) }}>×</button>
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
              <button style={s.attachBtn} onClick={() => imageInputRef.current.click()} title="Attach screenshot">📎</button>
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChatImage} />
              <button style={s.sendBtn} onClick={askQuestion} disabled={loading}>{loading ? '...' : 'Ask →'}</button>
            </div>
            <div style={s.poweredBy}>Mind AI built by Mukesh for Way with ❤️</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<PMApp />} />
        <Route path="/chat/:projectId" element={<ChatApp />} />
      </Routes>
    </BrowserRouter>
  )
}