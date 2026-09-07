import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from './supabase'

const SERVER = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'
const ACCESS_PIN = process.env.REACT_APP_ACCESS_PIN || 'MIND01'
const ADMIN_PIN = process.env.REACT_APP_ADMIN_PIN || 'WAY999'
const MINUTES_PER_QUESTION = 5
const TEAMS = ['Design', 'Engineering', 'QA']

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

// ---------- design tokens + style dictionary ----------
function makeStyles(dark) {
  const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  const bg = dark ? '#17161D' : '#FAFAF8'
  const bg2 = dark ? '#1D1C24' : '#FFFFFF'
  const bg3 = dark ? '#24232C' : '#F5F4F1'
  const border = dark ? '#302E39' : '#E7E5E1'
  const border2 = dark ? '#3A3844' : '#D9D7D2'
  const text1 = dark ? '#F3F2F5' : '#1C1B24'
  const text2 = dark ? '#A6A4AD' : '#6B6975'
  const text3 = dark ? '#716F7A' : '#9C9AA3'
  const accent = dark ? '#8C7DF3' : '#6D5AE0'
  const accentHover = dark ? '#9D90F5' : '#5C49CB'
  const accentTint = dark ? '#332C56' : '#EEEAFB'
  const inputBg = dark ? '#1A1922' : '#FFFFFF'
  const tabBg = dark ? '#1A1922' : '#EFEEEA'
  const tabActiveBg = dark ? '#2C2A36' : '#FFFFFF'
  const shadow = dark ? '0 1px 2px rgba(0,0,0,0.35)' : '0 1px 2px rgba(32,28,55,0.05), 0 1px 3px rgba(32,28,55,0.04)'
  const shadowLg = dark ? '0 16px 40px rgba(0,0,0,0.5)' : '0 12px 32px rgba(32,28,55,0.10)'
  const gradient = `linear-gradient(150deg, ${accent} 0%, ${dark ? '#5B4CC4' : '#4F3DC0'} 100%)`
  const danger = dark ? '#F87171' : '#DC2626'

  return {
    FONT, accent, accentHover, accentTint, gradient,
    page: { minHeight: '100vh', background: bg, fontFamily: FONT },
    header: { background: bg2, borderBottom: `1px solid ${border}`, padding: '0 28px', height: '64px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 10 },
    spacer: { flex: 1 },
    logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoIcon: { width: '32px', height: '32px', background: gradient, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' },
    logoText: { fontSize: '16.5px', fontWeight: '800', color: text1, letterSpacing: '-0.02em' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    badge: { fontSize: '11px', fontWeight: '700', padding: '5px 11px', borderRadius: '999px', letterSpacing: '0.01em' },
    pmBadge: { background: accentTint, color: accent },
    themeBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '12.5px', fontWeight: '600', padding: '7px 12px', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    nav: { display: 'flex', gap: '3px', background: bg3, padding: '4px', borderRadius: '11px', border: `1px solid ${border}` },
    navItem: { padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: text2, fontWeight: '600' },
    navItemActive: { padding: '7px 16px', borderRadius: '8px', border: 'none', background: tabActiveBg, fontSize: '13px', cursor: 'pointer', color: text1, fontWeight: '700', boxShadow: dark ? 'none' : shadow },
    container: { maxWidth: '1320px', width: '100%', margin: '0 auto', padding: '36px 48px', boxSizing: 'border-box' },
    card: { background: bg2, borderRadius: '16px', padding: '22px', marginBottom: '16px', border: `1px solid ${border}`, boxShadow: shadow },
    cardTitle: { fontSize: '14px', fontWeight: '700', color: text1, marginBottom: '16px' },
    input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '13.5px', boxSizing: 'border-box', outline: 'none', background: inputBg, color: text1, fontFamily: FONT },
    textarea: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${border2}`, marginBottom: '10px', fontSize: '13.5px', height: '160px', boxSizing: 'border-box', resize: 'vertical', fontFamily: FONT, background: inputBg, color: text1 },
    btn: { background: gradient, color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '11px', fontSize: '13.5px', cursor: 'pointer', fontWeight: '700', boxShadow: `0 4px 14px ${dark ? 'rgba(140,125,243,0.30)' : 'rgba(109,90,224,0.28)'}`, display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: FONT },
    btnSm: { background: accent, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '9px', fontSize: '12.5px', cursor: 'pointer', fontWeight: '700', fontFamily: FONT },
    btnDanger: { background: 'transparent', color: danger, border: `1px solid ${dark ? '#3F1D1D' : '#F5C6C6'}`, padding: '7px 13px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', fontFamily: FONT },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' },
    projectCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', boxShadow: shadow, display: 'flex', flexDirection: 'column', gap: '6px' },
    cardDelBtn: { background: 'none', border: 'none', color: text3, cursor: 'pointer', padding: '4px', borderRadius: '7px', lineHeight: 1, display: 'flex' },
    projectName: { fontSize: '14.5px', fontWeight: '700', color: text1 },
    projectDesc: { fontSize: '12.5px', color: text2, lineHeight: '1.5', minHeight: '34px' },
    projectFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '12px', borderTop: `1px solid ${border}` },
    projectMeta: { fontSize: '11.5px', color: text3 },
    projectArrow: { fontSize: '12.5px', color: accent, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' },
    tabs: { display: 'flex', gap: '2px', background: tabBg, borderRadius: '11px', padding: '4px', marginBottom: '24px', border: `1px solid ${border}`, flexWrap: 'wrap' },
    tab: { flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'none', fontSize: '12.5px', cursor: 'pointer', color: text2, fontWeight: '600', fontFamily: FONT, whiteSpace: 'nowrap' },
    tabActive: { flex: 1, padding: '8px 12px', borderRadius: '8px', border: 'none', background: tabActiveBg, fontSize: '12.5px', cursor: 'pointer', color: text1, fontWeight: '700', fontFamily: FONT, whiteSpace: 'nowrap', boxShadow: dark ? 'none' : shadow },
    // KPI cards
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '32px' },
    kpiCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', boxShadow: shadow },
    kpiTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
    kpiIcon: { width: '36px', height: '36px', borderRadius: '10px', background: accentTint, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    kpiLabel: { fontSize: '12.5px', color: text2, fontWeight: '600' },
    kpiValue: { fontSize: '30px', fontWeight: '800', color: text1, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
    kpiSub: { fontSize: '11.5px', color: text3, marginTop: '6px' },
    // table
    tableCard: { background: bg2, border: `1px solid ${border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: shadow },
    tableHeadRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '13px 20px', borderBottom: `1px solid ${border}`, fontSize: '10.5px', fontWeight: '700', color: text3, textTransform: 'uppercase', letterSpacing: '0.06em', background: bg3 },
    tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '14px 20px', borderBottom: `1px solid ${border}`, fontSize: '13.5px', color: text1, alignItems: 'center' },
    tableCellName: { fontWeight: '700', color: text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' },
    tableCellNum: { color: text2, fontVariantNumeric: 'tabular-nums' },
    tableCaption: { fontSize: '11.5px', color: text3, marginTop: '12px', textAlign: 'center' },
    // upload / docs
    uploadBox: { border: `1.5px dashed ${border2}`, borderRadius: '12px', padding: '30px', textAlign: 'center', cursor: 'pointer', marginBottom: '18px', background: bg3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
    uploadText: { fontSize: '13.5px', fontWeight: '700', color: text1 },
    uploadSub: { fontSize: '11.5px', color: text3, marginTop: '4px' },
    divider: { textAlign: 'center', color: text3, fontSize: '11.5px', margin: '20px 0' },
    docItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 15px', borderRadius: '11px', border: `1px solid ${border}`, marginBottom: '8px', background: bg2 },
    docIcon: { width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0, letterSpacing: '0.02em' },
    docInfo: { flex: 1, minWidth: 0 },
    docTitle: { fontSize: '13.5px', fontWeight: '600', color: text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    docMeta: { fontSize: '11.5px', color: text3, marginTop: '3px' },
    linkBox: { background: dark ? '#0D2418' : '#F0FDF4', border: dark ? '1px solid #1A3A22' : '1px solid #BBF7D0', borderRadius: '11px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' },
    linkText: { flex: 1, fontSize: '12.5px', color: dark ? '#4ADE80' : '#15803D', fontFamily: 'monospace', wordBreak: 'break-all' },
    historyItem: { padding: '16px', borderRadius: '12px', border: `1px solid ${border}`, marginBottom: '10px', background: bg2 },
    historyQ: { fontSize: '13px', fontWeight: '700', color: text1, marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' },
    historyQBadge: { fontSize: '10px', fontWeight: '800', background: accent, color: '#fff', padding: '2px 6px', borderRadius: '5px', marginTop: '2px', flexShrink: 0 },
    historyA: { fontSize: '13px', color: text2, lineHeight: '1.65' },
    historyMeta: { fontSize: '11px', color: text3, marginTop: '10px' },
    expandBtn: { background: 'none', border: 'none', color: accent, fontSize: '12px', cursor: 'pointer', padding: '4px 0', marginTop: '4px', fontWeight: '600', fontFamily: FONT },

    // ---------- CHAT (two-pane) ----------
    chatLayout: { display: 'flex', height: '100vh', width: '100%', background: bg, overflow: 'hidden', fontFamily: FONT },
    chatSidebar: { width: '272px', flexShrink: 0, background: bg3, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' },
    sidebarHeader: { padding: '16px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    sidebarFooter: { padding: '14px 16px', borderTop: `1px solid ${border}`, fontSize: '11.5px', color: text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    newChatBtn: { width: '100%', background: accent, color: '#fff', border: 'none', padding: '11px', borderRadius: '10px', fontSize: '13.5px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: `0 4px 12px ${dark ? 'rgba(140,125,243,0.28)' : 'rgba(109,90,224,0.28)'}`, fontFamily: FONT },
    histLabel: { fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: text3, margin: '18px 12px 8px' },
    chatList: { flex: 1, overflowY: 'auto', padding: '0 8px 8px' },
    chatListItem: { padding: '9px 10px', borderRadius: '9px', cursor: 'pointer', fontSize: '12.5px', color: text2, marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' },
    chatListItemActive: { background: bg2, color: text1, fontWeight: '700', boxShadow: shadow },
    chatDelBtn: { background: 'none', border: 'none', color: text3, fontSize: '15px', cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 },
    iconBtn: { background: bg3, border: `1px solid ${border}`, color: text2, cursor: 'pointer', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chatMain: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' },
    chatMainHeader: { padding: '13px 22px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', background: bg2 },
    switcherWrap: { position: 'relative', maxWidth: '320px' },
    headerSelect: { fontSize: '14.5px', fontWeight: '700', color: text1, background: bg3, border: `1px solid ${border}`, outline: 'none', cursor: 'pointer', maxWidth: '320px', width: '100%', padding: '8px 30px 8px 12px', borderRadius: '10px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', fontFamily: FONT },
    switcherChevron: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: text3, pointerEvents: 'none' },
    teamBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 22px', borderBottom: `1px solid ${border}`, background: bg2, flexWrap: 'wrap' },
    teamLabel: { fontSize: '11px', color: text3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
    teamTabsGroup: { display: 'flex', gap: '2px', background: bg3, padding: '3px', borderRadius: '10px' },
    teamTab: { padding: '6px 14px', borderRadius: '7px', border: 'none', background: 'transparent', color: text2, fontSize: '12.5px', cursor: 'pointer', fontWeight: '600', fontFamily: FONT },
    teamTabActive: { padding: '6px 14px', borderRadius: '7px', border: 'none', background: accent, color: '#fff', fontSize: '12.5px', cursor: 'pointer', fontWeight: '700', fontFamily: FONT },
    chatProjectSub: { fontSize: '11.5px', color: text3, marginTop: '2px' },
    chatScroll: { flex: 1, overflowY: 'auto', padding: '26px 20px', minHeight: 0 },
    chatInner: { maxWidth: '760px', margin: '0 auto', width: '100%' },
    chatInputBar: { borderTop: `1px solid ${border}`, padding: '14px 20px', background: bg2, flexShrink: 0 },
    emptyChat: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', textAlign: 'center' },
    emptyChatIcon: { width: '54px', height: '54px', background: accentTint, color: accent, borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${border}` },
    emptyChatTitle: { fontSize: '16.5px', fontWeight: '700', color: text1 },
    emptyChatSub: { fontSize: '13px', color: text3, maxWidth: '320px', lineHeight: 1.6 },
    userMsg: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
    userBubble: { background: accent, borderRadius: '16px 16px 4px 16px', padding: '11px 16px', maxWidth: '72%', color: '#FFFFFF', fontSize: '14px', lineHeight: '1.6', boxShadow: `0 4px 14px ${dark ? 'rgba(140,125,243,0.22)' : 'rgba(109,90,224,0.22)'}` },
    aiMsgRow: { display: 'flex', gap: '11px', marginBottom: '16px', alignItems: 'flex-start' },
    aiAvatar: { width: '30px', height: '30px', background: gradient, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, marginTop: '2px' },
    aiBubble: { background: bg2, border: `1px solid ${border}`, borderRadius: '4px 16px 16px 16px', padding: '14px 18px', maxWidth: '82%', fontSize: '13.8px', lineHeight: '1.7', color: text1 },
    inputWrap: { background: bg2, borderRadius: '14px', border: `1px solid ${border2}`, padding: '6px 6px 6px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: shadow },
    chatInput: { flex: 1, border: 'none', fontSize: '14px', outline: 'none', fontFamily: FONT, background: 'transparent', color: text1, padding: '7px 0' },
    sendBtn: { background: accent, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: FONT },
    attachBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: text2, display: 'flex' },
    backBtn: { background: bg3, border: `1px solid ${border}`, color: text2, fontSize: '12.5px', cursor: 'pointer', padding: '7px 13px', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontFamily: FONT },
    sectionLabel: { fontSize: '11px', fontWeight: '700', color: text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' },
    toast: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: dark ? '#26242F' : '#1C1B24', color: '#fff', border: `1px solid ${border}`, padding: '10px 20px', borderRadius: '11px', fontSize: '13.5px', zIndex: 100, whiteSpace: 'nowrap', boxShadow: shadowLg },
    processing: { fontSize: '12.5px', color: accent, marginBottom: '12px', fontStyle: 'italic' },
    poweredBy: { textAlign: 'center', fontSize: '11.5px', color: text3, marginTop: '12px' },
    pageTitle: { fontSize: '25px', fontWeight: '800', color: text1, marginBottom: '5px', letterSpacing: '-0.02em' },
    pageSub: { fontSize: '13.5px', color: text3, marginBottom: '30px' },
    emptyState: { textAlign: 'center', color: text3, padding: '44px', fontSize: '13.5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
    figmaRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
    imagePreviewWrap: { marginBottom: '8px', position: 'relative', display: 'inline-block' },
    imagePreview: { maxHeight: '120px', borderRadius: '9px', border: `1px solid ${border}` },
    imageRemoveBtn: { position: 'absolute', top: '4px', right: '4px', background: '#111', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    dangerZone: { marginTop: '24px', background: dark ? '#241416' : '#FEF2F2', border: dark ? '1px solid #3F1D1D' : '1px solid #FECACA', borderRadius: '15px', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
    dangerTitle: { fontSize: '13.5px', fontWeight: '700', color: danger },
    dangerSub: { fontSize: '11.5px', color: dark ? '#9A6B6B' : '#C26B6B', marginTop: '4px', maxWidth: '420px', lineHeight: 1.5 },
    btnDangerSolid: { background: '#DC2626', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '11px', fontSize: '12.5px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(220,38,38,0.28)', fontFamily: FONT },
    adminPill: { fontSize: '10.5px', fontWeight: '700', padding: '5px 11px', borderRadius: '999px', background: dark ? '#3F1D1D' : '#FEE2E2', color: dark ? '#FCA5A5' : '#B91C1C' },
    footer: { textAlign: 'center', fontSize: '11.5px', color: text3, marginTop: '36px', paddingBottom: '8px' },
    shadow, shadowLg,
    bg, bg2, bg3, border, border2, text1, text2, text3,
  }
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      button { transition: transform .12s ease, opacity .12s ease, box-shadow .15s ease, background .15s ease; }
      button:hover:not(:disabled) { opacity: .92; }
      button:active:not(:disabled) { transform: scale(.98); }
      button:disabled { opacity: .55; cursor: default; }
      input, textarea, select { transition: border-color .15s ease, box-shadow .15s ease; }
      input:focus, textarea:focus { border-color: #6D5AE0 !important; box-shadow: 0 0 0 3px rgba(109,90,224,0.16); }
      select:focus { outline: none; box-shadow: 0 0 0 3px rgba(109,90,224,0.16); }
      .mind-card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
      .mind-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(32,28,55,0.10); border-color: rgba(109,90,224,0.35); }
      .mind-chat-item:hover { background: rgba(127,127,127,0.12) !important; }
      .mind-row:hover { background: rgba(109,90,224,0.05); }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.35); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(127,127,127,0.55); }
      ::-webkit-scrollbar-track { background: transparent; }
    `}</style>
  )
}

// ---------- icon set (inline SVG, no emoji) ----------
function Icon({ name, size = 16, strokeWidth = 1.9 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'mark':
      return <svg {...p}><circle cx="6" cy="7" r="2.1" /><circle cx="18" cy="7" r="2.1" /><circle cx="12" cy="17.5" r="2.4" /><path d="M7.7 8.3 10.3 15.8M16.3 8.3 13.7 15.8M8.1 7h7.8" /></svg>
    case 'sun':
      return <svg {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></svg>
    case 'moon':
      return <svg {...p}><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" /></svg>
    case 'folder':
      return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>
    case 'chat':
      return <svg {...p}><path d="M21 12a8 8 0 1 1-3.4-6.5" /><path d="M21 4v5h-5" /></svg>
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 2" /></svg>
    case 'chevronDown':
      return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>
    case 'plus':
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
    case 'arrowRight':
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case 'arrowLeft':
      return <svg {...p}><path d="M5 12h14M11 6l-6 6 6 6" /></svg>
    case 'paperclip':
      return <svg {...p}><path d="M21.4 11.6 12.8 20.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" /></svg>
    case 'trash':
      return <svg {...p}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>
    case 'upload':
      return <svg {...p}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
    case 'menu':
      return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    case 'search':
      return <svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5 15.8 15.8" /></svg>
    case 'inbox':
      return <svg {...p}><path d="M21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" /><path d="M3 13h5l1.6 2.4h4.8L16 13h5" /><path d="M3 13 6 5h12l3 8" /></svg>
    default:
      return null
  }
}

function Logo({ s }) {
  return (
    <div style={s.logoWrap}>
      <div style={s.logoIcon}><Icon name="mark" size={15} strokeWidth={2} /></div>
      <span style={s.logoText}>Mind</span>
    </div>
  )
}

function ThemeToggle({ dark, toggle, s }) {
  return (
    <button style={s.themeBtn} onClick={toggle}>
      <Icon name={dark ? 'sun' : 'moon'} size={14} />
      {dark ? 'Light' : 'Dark'}
    </button>
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
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
        .shake{animation:shake 0.5s;}
      `}</style>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${s.border2 || 'rgba(127,127,127,0.35)'} 1px, transparent 1px)`,
        backgroundSize: '26px 26px', opacity: 0.5,
      }} />
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '520px', height: '520px', background: 'radial-gradient(circle, rgba(139,92,246,0.16), rgba(99,102,241,0) 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: '60px', height: '60px', background: 'linear-gradient(150deg, #6D5AE0, #4F3DC0)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 10px 28px rgba(109,90,224,0.35)', color: '#fff' }}>
          <Icon name="mark" size={28} strokeWidth={1.9} />
        </div>
        <div style={{ fontSize: '34px', fontWeight: '800', color: s.text1, marginBottom: '8px', letterSpacing: '-0.02em' }}>Mind</div>
        <div style={{ fontSize: '14.5px', color: s.text2, marginBottom: '36px', lineHeight: '1.7' }}>Your AI product assistant for Way.com.<br />Ask anything about your projects instantly.</div>
        <div style={{ background: s.bg2, border: `1px solid ${s.border}`, borderRadius: '18px', padding: '30px', boxShadow: s.shadowLg }}>
          <div style={{ fontSize: '12.5px', fontWeight: '700', color: s.text2, marginBottom: '12px', textAlign: 'left' }}>Enter access PIN</div>
          <input
            className={shaking ? 'shake' : ''}
            style={{ width: '100%', padding: '14px', borderRadius: '11px', border: `1px solid ${shaking ? '#F87171' : s.border}`, marginBottom: '12px', fontSize: '22px', letterSpacing: '8px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', outline: 'none', background: s.bg2, color: s.text1, fontFamily: 'monospace' }}
            placeholder="······"
            value={pin}
            maxLength={10}
            onChange={e => { setPin(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && <div style={{ color: '#F87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
          <button style={{ ...s.btn, width: '100%', padding: '13px', fontSize: '14.5px', justifyContent: 'center' }} onClick={handleSubmit}>Enter <Icon name="arrowRight" size={15} strokeWidth={2.4} /></button>
        </div>
        <div style={{ fontSize: '11.5px', color: s.text3, marginTop: '26px' }}>Mind AI built by Mukesh for Way ♥</div>
      </div>
    </div>
  )
}

// ---------- doc type badge (colored monogram, replaces emoji) ----------
function docBadge(title, dark) {
  const t = (title || '')
  if (t.toLowerCase().endsWith('.pdf')) return { label: 'PDF', bg: dark ? '#3A1414' : '#FEF2F2', fg: dark ? '#F87171' : '#DC2626' }
  if (t.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return { label: 'IMG', bg: dark ? '#0D2A3D' : '#EFF6FF', fg: dark ? '#60A5FA' : '#2563EB' }
  if (t.toLowerCase().endsWith('.docx')) return { label: 'DOC', bg: dark ? '#1E1B4B' : '#EEF2FF', fg: dark ? '#918CF0' : '#4F46E5' }
  if (t.startsWith('Figma:')) return { label: 'FIG', bg: dark ? '#2B1638' : '#FAF5FF', fg: dark ? '#C084FC' : '#9333EA' }
  if (t.startsWith('Confluence') || t.toLowerCase().includes('confluence')) return { label: 'CONF', bg: dark ? '#0D2433' : '#ECFEFF', fg: dark ? '#22D3EE' : '#0891B2' }
  if (t.startsWith('Jira') || t.toLowerCase().includes('jira')) return { label: 'JIRA', bg: dark ? '#0D2433' : '#EFF6FF', fg: dark ? '#38BDF8' : '#2563EB' }
  return { label: 'DOC', bg: dark ? '#24232C' : '#F5F4F1', fg: dark ? '#A6A4AD' : '#6B6975' }
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
  const [confluenceUrl, setConfluenceUrl] = useState('')
  const [jiraKey, setJiraKey] = useState('')
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

  async function extractConfluence() {
    if (!confluenceUrl.trim()) return
    setProcessing('Reading Confluence page...')
    try {
      const res = await fetch(`${SERVER}/extract-confluence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: confluenceUrl }) })
      const data = await res.json()
      if (data.error) { showToast(data.error); setProcessing(''); return }
      if (!data.text) { showToast(data.warning || 'No content found on that page.'); setProcessing(''); return }
      const { error } = await supabase.from('documents').insert([{ project_id: selectedProject.id, title: (data.title || 'Confluence page').substring(0, 120), content: data.text.substring(0, 100000) }])
      if (error) showToast('Failed to save Confluence content')
      else { showToast('Confluence page imported!'); setConfluenceUrl(''); fetchDocuments(selectedProject.id) }
    } catch (err) { showToast(`Error: ${err.message}`) }
    setProcessing('')
  }

  async function extractJira() {
    if (!jiraKey.trim()) return
    setProcessing('Reading Jira ticket...')
    try {
      const res = await fetch(`${SERVER}/extract-jira`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: jiraKey }) })
      const data = await res.json()
      if (data.error) { showToast(data.error); setProcessing(''); return }
      const { error } = await supabase.from('documents').insert([{ project_id: selectedProject.id, title: (data.title || `Jira ${jiraKey}`).substring(0, 120), content: data.text.substring(0, 100000) }])
      if (error) showToast('Failed to save Jira content')
      else { showToast('Jira ticket imported!'); setJiraKey(''); fetchDocuments(selectedProject.id) }
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

  // ----- HOME (Dashboard + Projects) -----
  if (view === 'home') {
    const sortedProjects = [...projects].sort((a, b) => (msgCounts[b.id] || 0) - (msgCounts[a.id] || 0))
    const totalMinutesSaved = totalQuestions * MINUTES_PER_QUESTION

    return (
      <div style={s.page}>
        <div style={s.header}>
          <Logo s={s} />
          <div style={s.nav}>
            <button style={homeTab === 'dashboard' ? s.navItemActive : s.navItem} onClick={() => { setHomeTab('dashboard'); fetchStats() }}>Dashboard</button>
            <button style={homeTab === 'projects' ? s.navItemActive : s.navItem} onClick={() => setHomeTab('projects')}>Projects</button>
          </div>
          <div style={s.spacer} />
          <div style={s.headerRight}>
            <ThemeToggle dark={dark} toggle={toggle} s={s} />
            {isAdmin && <span style={s.adminPill}>Admin</span>}
            <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
          </div>
        </div>
        <div style={s.container}>
          {homeTab === 'dashboard' && (
            <div>
              <div style={s.pageTitle}>Dashboard</div>
              <div style={s.pageSub}>Team-wide usage and time saved across all projects</div>

              <div style={s.kpiGrid}>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={s.kpiIcon}><Icon name="folder" size={17} /></div>
                    <div style={s.kpiLabel}>Total Projects</div>
                  </div>
                  <div style={s.kpiValue}>{projects.length}</div>
                </div>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={s.kpiIcon}><Icon name="chat" size={17} /></div>
                    <div style={s.kpiLabel}>Questions Asked</div>
                  </div>
                  <div style={s.kpiValue}>{totalQuestions}</div>
                </div>
                <div style={s.kpiCard}>
                  <div style={s.kpiTop}>
                    <div style={s.kpiIcon}><Icon name="clock" size={17} /></div>
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
                <button style={s.btn} onClick={createProject} disabled={creating}><Icon name="plus" size={14} strokeWidth={2.4} />{creating ? 'Creating...' : 'Create project'}</button>
              </div>
              <div style={s.sectionLabel}>All projects — {projects.length}</div>
              {projects.length === 0 && <div style={{ color: s.text2, fontSize: '14px', padding: '20px 0' }}>No projects yet.</div>}
              <div style={s.grid}>
                {projects.map(p => (
                  <div key={p.id} className="mind-card" style={s.projectCard} onClick={() => openProject(p)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={s.projectName}>{p.name}</div>
                      {isAdmin && <button style={s.cardDelBtn} title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(p) }}><Icon name="trash" size={15} /></button>}
                    </div>
                    {p.description && <div style={s.projectDesc}>{p.description}</div>}
                    <div style={s.projectFooter}>
                      <div style={s.projectMeta}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      <div style={s.projectArrow}>Open <Icon name="arrowRight" size={12} strokeWidth={2.4} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={s.footer}>Mind AI built by Mukesh for Way with ♥</div>
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
        <button style={s.backBtn} onClick={() => { setView('home'); fetchStats() }}><Icon name="arrowLeft" size={13} strokeWidth={2.2} />Back</button>
        <Logo s={s} />
        <span style={{ fontSize: '13.5px', color: s.text2 }}>/ {selectedProject.name}</span>
        <div style={s.spacer} />
        <div style={s.headerRight}>
          <ThemeToggle dark={dark} toggle={toggle} s={s} />
          {isAdmin && <span style={s.adminPill}>Admin</span>}
          <span style={{ ...s.badge, ...s.pmBadge }}>PM Portal</span>
        </div>
      </div>
      <div style={s.container}>
        <div style={{ marginBottom: '24px' }}>
          <div style={s.pageTitle}>{selectedProject.name}</div>
          {selectedProject.description && <div style={{ fontSize: '13.5px', color: s.text2 }}>{selectedProject.description}</div>}
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
              <div style={{ ...s.card, ...s.emptyState }}><Icon name="folder" size={26} strokeWidth={1.6} />No documents yet.</div>
            )}
            {documents.map(doc => {
              const badge = docBadge(doc.title, dark)
              return (
                <div key={doc.id} style={s.docItem}>
                  <div style={{ ...s.docIcon, background: badge.bg, color: badge.fg }}>{badge.label}</div>
                  <div style={s.docInfo}>
                    <div style={s.docTitle}>{doc.title}</div>
                    <div style={s.docMeta}>{new Date(doc.created_at).toLocaleDateString()} · {(doc.content.length / 1000).toFixed(1)}k chars</div>
                  </div>
                  <button style={s.btnDanger} onClick={() => deleteDocument(doc.id)}>Delete</button>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'upload' && (
          <div style={s.card}>
            <div style={s.cardTitle}>Upload documents</div>
            <div style={s.uploadBox} onClick={() => fileInputRef.current.click()}>
              <Icon name="upload" size={24} strokeWidth={1.7} />
              <div style={s.uploadText}>Click to upload files</div>
              <div style={s.uploadSub}>PDF · DOCX · PNG · JPG · TXT — multiple files supported</div>
              <input ref={fileInputRef} type="file" accept="*/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
            {processing && <div style={s.processing}>{processing}</div>}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: s.text2, marginBottom: '8px' }}>Add Figma link</div>
              <div style={s.figmaRow}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="https://www.figma.com/file/..." value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} />
                <button style={s.btnSm} onClick={extractFigma} disabled={!figmaUrl.trim()}>Extract screens</button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: s.text2, marginBottom: '8px' }}>Import from Confluence</div>
              <div style={s.figmaRow}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="Paste Confluence page link" value={confluenceUrl} onChange={e => setConfluenceUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && extractConfluence()} />
                <button style={s.btnSm} onClick={extractConfluence} disabled={!confluenceUrl.trim()}>Import page</button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: s.text2, marginBottom: '8px' }}>Import from Jira</div>
              <div style={s.figmaRow}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="Jira ticket ID (e.g. WAY-123)" value={jiraKey} onChange={e => setJiraKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && extractJira()} />
                <button style={s.btnSm} onClick={extractJira} disabled={!jiraKey.trim()}>Import ticket</button>
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
            {chatHistory.length === 0 && (
              <div style={{ ...s.card, ...s.emptyState }}><Icon name="chat" size={26} strokeWidth={1.6} />No questions asked yet.</div>
            )}
            {chatHistory.map((item, i) => <HistoryItem key={i} item={item} s={s} />)}
          </div>
        )}

        {tab === 'share' && (
          <div style={s.card}>
            <div style={s.cardTitle}>Share with your team</div>
            <p style={{ fontSize: '13.5px', color: s.text2, marginBottom: '16px', lineHeight: '1.7' }}>
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

        <div style={s.footer}>Mind AI built by Mukesh for Way with ♥</div>
      </div>
      <Toast msg={toast} s={s} />
    </div>
  )
}

// ---------------- CHAT (team-facing) ----------------
function ChatApp() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const s = makeStyles(dark)
  const [project, setProject] = useState(null)
  const [allProjects, setAllProjects] = useState([])
  const [notFound, setNotFound] = useState(false)
  const HISTORY_ID = '__history__'
  const [localChats, setLocalChats] = useState([])
  const [historyMsgs, setHistoryMsgs] = useState([])
  const [activeChatId, setActiveChatId] = useState(HISTORY_ID)
  const [team, setTeamState] = useState(() => localStorage.getItem('mind-team') || 'Design')
  function setTeam(t) { setTeamState(t); try { localStorage.setItem('mind-team', t) } catch {} }
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatImage, setChatImage] = useState(null)
  const [chatImagePreview, setChatImagePreview] = useState(null)
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth <= 820)
  const [sidebarOpen, setSidebarOpen] = useState(typeof window === 'undefined' ? true : window.innerWidth > 820)
  const chatEndRef = useRef(null)
  const imageInputRef = useRef(null)

  const storeKey = `mind-localchats-${projectId}`
  function loadLocalChats() {
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

  // load all projects for the project switcher
  useEffect(() => {
    async function loadAll() {
      const { data } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false })
      if (data) setAllProjects(data)
    }
    loadAll()
  }, [])

  // load the shared conversation history for this project + team (same for everyone, on any device)
  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase
        .from('messages')
        .select('question, answer, created_at, team')
        .eq('project_id', projectId)
        .or(`team.eq.${team},team.is.null`)   // selected team + older untagged questions
        .order('created_at', { ascending: true })
        .limit(100)
      const msgs = []
      ;(data || []).forEach(r => {
        msgs.push({ role: 'user', content: r.question })
        msgs.push({ role: 'assistant', content: r.answer })
      })
      setHistoryMsgs(msgs)
    }
    loadHistory()
    setLocalChats(loadLocalChats())
    setActiveChatId(HISTORY_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, team])

  // persist only the local "new chat" sessions (the history lives in the database)
  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(localChats)) } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localChats])

  // responsive
  useEffect(() => {
    function onResize() { setIsNarrow(window.innerWidth <= 820) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isHistory = activeChatId === HISTORY_ID
  const activeLocal = localChats.find(c => c.id === activeChatId)
  const messages = isHistory ? historyMsgs : (activeLocal ? activeLocal.messages : [])
  const sidebarChats = [{ id: HISTORY_ID, title: 'Conversation history', isHistory: true }, ...localChats]

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [activeChatId, historyMsgs, localChats, loading])

  function newChat() {
    const fresh = { id: newId(), title: 'New chat', messages: [], createdAt: Date.now() }
    setLocalChats(prev => [fresh, ...prev])
    setActiveChatId(fresh.id)
    if (isNarrow) setSidebarOpen(false)
  }

  function selectChat(id) {
    setActiveChatId(id)
    if (isNarrow) setSidebarOpen(false)
  }

  function deleteChat(id, e) {
    e.stopPropagation()
    if (id === HISTORY_ID) return  // the shared history can't be deleted
    setLocalChats(prev => prev.filter(c => c.id !== id))
    if (id === activeChatId) setActiveChatId(HISTORY_ID)
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
    const askingHistory = isHistory
    const chatId = activeChatId
    const userQuestion = question || 'What do you see in this image? Does it relate to the project documents?'
    setQuestion('')
    const imageToSend = chatImage
    const imgPreview = chatImagePreview
    setChatImage(null)
    setChatImagePreview(null)

    const baseMessages = askingHistory ? historyMsgs : ((localChats.find(c => c.id === chatId) || {}).messages || [])
    const userMsg = { role: 'user', content: userQuestion, image: imgPreview }
    const newMessages = [...baseMessages, userMsg]

    // show the question immediately
    if (askingHistory) {
      setHistoryMsgs(newMessages)
    } else {
      setLocalChats(prev => prev.map(c => c.id === chatId
        ? { ...c, messages: newMessages, title: c.title === 'New chat' ? titleFrom(userQuestion) : c.title }
        : c))
    }

    function appendAnswer(answer) {
      if (askingHistory) {
        setHistoryMsgs([...newMessages, { role: 'assistant', content: answer }])
      } else {
        setLocalChats(prev => prev.map(c => c.id === chatId
          ? { ...c, messages: [...newMessages, { role: 'assistant', content: answer }] }
          : c))
      }
    }

    try {
      const { data: docs } = await supabase.from('documents').select('title, content').eq('project_id', projectId)
      if (!docs || docs.length === 0) {
        appendAnswer('No documents uploaded yet. Ask your PM to upload project documents.')
        setLoading(false)
        return
      }
      const context = docs.map(d => `--- Document: ${d.title} ---\n${d.content}`).join('\n\n')
      const history = newMessages.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(`${SERVER}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, context, projectName: project.name, history, image: imageToSend, team })
      })
      const data = await res.json()
      const answer = data.answer || 'Something went wrong. Please try again.'
      await supabase.from('messages').insert([{ project_id: projectId, question: userQuestion, answer, team }])
      appendAnswer(answer)
    } catch {
      appendAnswer('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (notFound) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: s.text3, marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><Icon name="search" size={30} strokeWidth={1.6} /></div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: s.text1, marginBottom: '8px' }}>Project not found</div>
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
    : { ...s.chatSidebar, width: sidebarOpen ? '272px' : '0px', borderRight: sidebarOpen ? s.chatSidebar.borderRight : 'none', overflow: 'hidden', transition: 'width 0.2s ease' }

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
          <button style={s.newChatBtn} onClick={newChat}><Icon name="plus" size={14} strokeWidth={2.4} />New chat</button>
        </div>
        <div style={s.histLabel}>Conversation history</div>
        <div style={s.chatList}>
          {sidebarChats.map(c => (
            <div
              key={c.id}
              className="mind-chat-item"
              style={c.id === activeChatId ? { ...s.chatListItem, ...s.chatListItemActive } : s.chatListItem}
              onClick={() => selectChat(c.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {c.isHistory && <Icon name="clock" size={12} />}
                {c.title || 'New chat'}
              </span>
              {!c.isHistory && <button style={s.chatDelBtn} onClick={(e) => deleteChat(c.id, e)} title="Delete chat">×</button>}
            </div>
          ))}
        </div>
        <div style={s.sidebarFooter}>{project.name}</div>
      </div>

      <div style={s.chatMain}>
        <div style={s.chatMainHeader}>
          <button style={s.iconBtn} onClick={() => setSidebarOpen(o => !o)} title="Toggle chats"><Icon name="menu" size={16} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.switcherWrap}>
              <select style={s.headerSelect} value={projectId} onChange={e => navigate(`/chat/${e.target.value}`)} title="Switch project">
                {(allProjects.length ? allProjects : [project]).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span style={s.switcherChevron}><Icon name="chevronDown" size={14} strokeWidth={2.2} /></span>
            </div>
            <div style={s.chatProjectSub}>Answers based on project documents only</div>
          </div>
          <ThemeToggle dark={dark} toggle={toggle} s={s} />
        </div>

        <div style={s.teamBar}>
          <span style={s.teamLabel}>Team</span>
          <div style={s.teamTabsGroup}>
            {TEAMS.map(t => (
              <button key={t} style={t === team ? s.teamTabActive : s.teamTab} onClick={() => setTeam(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div style={s.chatScroll}>
          <div style={s.chatInner}>
            {messages.length === 0 && !loading && (
              <div style={s.emptyChat}>
                <div style={s.emptyChatIcon}><Icon name="mark" size={24} strokeWidth={1.7} /></div>
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
                    <div style={s.aiAvatar}><Icon name="mark" size={14} strokeWidth={1.9} /></div>
                    <div style={s.aiBubble}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
            ))}
            {loading && (
              <div style={s.aiMsgRow}>
                <div style={s.aiAvatar}><Icon name="mark" size={14} strokeWidth={1.9} /></div>
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
              <button style={s.attachBtn} onClick={() => imageInputRef.current.click()} title="Attach screenshot"><Icon name="paperclip" size={17} /></button>
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChatImage} />
              <button style={s.sendBtn} onClick={askQuestion} disabled={loading}>{loading ? '...' : <>Ask <Icon name="arrowRight" size={14} strokeWidth={2.4} /></>}</button>
            </div>
            <div style={s.poweredBy}>Mind AI built by Mukesh for Way with ♥</div>
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