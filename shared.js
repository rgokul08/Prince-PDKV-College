// ============================================================
// shared.js — PDKV College v5 (OTP Email Verification)
// CHANGED: Auth modal now uses 8-digit OTP email verification
//          via Supabase signInWithOtp / verifyOtp.
//          Exported OTP helpers for profile/admission forms.
// ============================================================
import { supabase } from './supabaseClient.js'
import { injectSpeedInsights } from '@vercel/speed-insights'

/* ── VERCEL SPEED INSIGHTS ──────────────────────────────────── */
injectSpeedInsights({ debug: false })

/* ── TOAST ──────────────────────────────────────────────────── */
export function showToast(message, type = 'success', duration = 4000) {
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }
  const toast = document.createElement('div')
  toast.className = `toast${type !== 'success' ? ' ' + type : ''}`
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span>${message}</span>`
  container.appendChild(toast)
  setTimeout(() => {
    toast.classList.add('toast-exit')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
  }, duration)
}

/* ── STICKY HEADER + SCROLL PROGRESS + BACK-TO-TOP ─────────── */
export function initStickyHeader() {
  const header = document.querySelector('.site-header')
  if (!header) return

  if (!document.getElementById('scrollProgressBar')) {
    const bar = document.createElement('div')
    bar.id = 'scrollProgressBar'
    document.body.prepend(bar)
  }

  if (!document.getElementById('backToTop')) {
    const btn = document.createElement('button')
    btn.id = 'backToTop'
    btn.setAttribute('aria-label', 'Back to top')
    btn.innerHTML = '<i class="fas fa-chevron-up"></i>'
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
    document.body.appendChild(btn)
  }

  const onScroll = () => {
    const scrolled = window.scrollY
    header.classList.toggle('scrolled', scrolled > 60)
    const bar = document.getElementById('scrollProgressBar')
    if (bar) {
      const docH = document.documentElement.scrollHeight - window.innerHeight
      bar.style.width = (docH > 0 ? (scrolled / docH) * 100 : 0) + '%'
    }
    const btt = document.getElementById('backToTop')
    if (btt) btt.classList.toggle('visible', scrolled > 400)
  }

  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

/* ── HAMBURGER ───────────────────────────────────────────────── */
export function initHamburger() {
  const btn = document.querySelector('.hamburger')
  const nav = document.querySelector('.site-nav')
  if (!btn || !nav) return

  const close = () => {
    btn.classList.remove('open')
    nav.classList.remove('open')
    document.body.style.overflow = ''
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const isOpen = btn.classList.toggle('open')
    nav.classList.toggle('open', isOpen)
    document.body.style.overflow = isOpen ? 'hidden' : ''
  })

  nav.querySelectorAll('.nav-link, .nav-auth-btn').forEach(link =>
    link.addEventListener('click', close)
  )

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) close()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
}

/* ── SCROLL ANIMATIONS ───────────────────────────────────────── */
export function initScrollAnimations() {
  const els = document.querySelectorAll('.animate-fade-up:not(.visible)')
  if (!els.length) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80)
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' })

  els.forEach(el => observer.observe(el))
}

/* ── COUNTER ANIMATION ────────────────────────────────────────── */
export function animateCounter(el) {
  const target    = parseFloat(el.dataset.target)
  if (isNaN(target)) return
  const isDecimal = String(el.dataset.target).includes('.')
  const isPercent = el.dataset.percent === 'true'
  const duration  = 1800
  const startTime = performance.now()

  const fmt = (val) => {
    const n   = isDecimal ? parseFloat(val.toFixed(2)) : Math.floor(val)
    const str = isDecimal ? n.toFixed(2) : n.toLocaleString('en-IN')
    return str + (isPercent ? '%' : '')
  }

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1)
    const eased    = 1 - Math.pow(1 - progress, 3)
    el.textContent = fmt(target * eased)
    if (progress < 1) requestAnimationFrame(tick)
    else el.textContent = fmt(target)
  }

  requestAnimationFrame(tick)
}

export function initCounters() {
  const counters = document.querySelectorAll('[data-target]')
  if (!counters.length) return
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true'
        animateCounter(entry.target)
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.4 })
  counters.forEach(c => observer.observe(c))
}

/* ── MODAL HELPERS ───────────────────────────────────────────── */
export function openModal(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add('active')
  document.body.style.overflow = 'hidden'
  setTimeout(() => {
    const focusable = el.querySelector(
      'input:not([type="hidden"]):not([disabled]), button:not([disabled]), textarea, select, [tabindex="0"]'
    )
    focusable?.focus()
  }, 60)
}

export function closeModal(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('active')
  if (!document.querySelector('.modal-overlay.active')) {
    document.body.style.overflow = ''
  }
}

export function initModalCloseHandlers() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id)
    })
  })
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal))
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const open = document.querySelectorAll('.modal-overlay.active')
    if (open.length) closeModal(open[open.length - 1].id)
  })
}

/* ── PASSWORD TOGGLE ─────────────────────────────────────────── */
export function initPasswordToggles(container) {
  const scope = container || document
  scope.querySelectorAll('.pw-toggle-wrap').forEach(wrap => {
    if (wrap.dataset.pwInit) return
    wrap.dataset.pwInit = '1'
    const inp = wrap.querySelector('input')
    const btn = wrap.querySelector('.pw-eye-btn')
    if (!inp || !btn) return
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const show = inp.type === 'password'
      inp.type   = show ? 'text' : 'password'
      btn.innerHTML = show
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>'
      btn.title = show ? 'Hide password' : 'Show password'
    })
  })
}

/* ── GLOBAL AUTH ─────────────────────────────────────────────── */
let _currentUser  = null
let _userProfile  = null
const _authCbs    = []

export function onAuthChange(cb) { _authCbs.push(cb) }
function _notify() { _authCbs.forEach(cb => { try { cb(_currentUser, _userProfile) } catch(e){} }) }

export function getCurrentUser() { return _currentUser }
export function getUserProfile() { return _userProfile }

/* ── OTP AUTH STATE ──────────────────────────────────────────── */
const _otpState = {
  step:       'email',
  mode:       'login',
  email:      '',
  signupData: null,
  resendTimer: null,
  resendSecs:  0
}

/* ── AUTH MODAL HTML ─────────────────────────────────────────── */
export async function initAuth() {
  if (!document.getElementById('globalAuthModal')) {
    document.body.insertAdjacentHTML('beforeend', _authModalHTML())
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      _currentUser = session.user
      supabase
        .from('login_information')
        .select('*')
        .eq('id', _currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          _userProfile = data || {}
          updateHeaderAuthUI()
          _notify()
        })
        .catch(() => { _userProfile = {}; updateHeaderAuthUI(); _notify() })
    }
  } catch(e) { console.warn('Auth session error:', e) }

  _wireAuthForms()
  updateHeaderAuthUI()
  _notify()

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      _currentUser = session.user
      supabase
        .from('login_information')
        .select('*')
        .eq('id', _currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          _userProfile = data || {}
          updateHeaderAuthUI()
          _notify()
        })
        .catch(() => { _userProfile = {}; updateHeaderAuthUI(); _notify() })
    } else {
      _currentUser = null
      _userProfile = null
      updateHeaderAuthUI()
      _notify()
    }
  })
}

function _authModalHTML() {
  return `
  <div class="modal-overlay" id="globalAuthModal" role="dialog" aria-modal="true">
    <div class="modal-box" style="max-width:460px;">
      <div class="modal-header" id="_authModalHeader">
        <h3 id="_authModalTitle">My Account</h3>
        <button class="modal-close" aria-label="Close" id="_authClose">&times;</button>
      </div>
      <div class="modal-body" id="_authModalBody">
      </div>
    </div>
  </div>

  <style>
    .otp-email-display {
      background: rgba(76,175,80,0.07);
      border: 1px solid rgba(76,175,80,0.22);
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 0.88rem;
      color: var(--accent-dark);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      word-break: break-all;
    }
    .otp-inputs-wrap {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin: 18px 0 6px;
    }
    .otp-digit {
      width: 44px;
      height: 52px;
      border: 2px solid var(--border);
      border-radius: 10px;
      font-size: 1.45rem;
      font-weight: 800;
      text-align: center;
      font-family: 'Poppins', monospace;
      color: var(--primary);
      background: white;
      outline: none;
      transition: border-color 0.22s, box-shadow 0.22s, transform 0.18s;
      caret-color: transparent;
    }
    .otp-digit:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(76,175,80,0.14);
      transform: scale(1.06);
    }
    .otp-digit.filled {
      border-color: var(--accent2);
      background: rgba(33,150,243,0.05);
      color: var(--accent2-dark);
    }
    .otp-digit.error {
      border-color: var(--danger);
      background: rgba(244,67,54,0.05);
      color: var(--danger);
      animation: otpShake 0.38s ease;
    }
    @keyframes otpShake {
      0%,100%{transform:translateX(0);}
      20%{transform:translateX(-5px);}
      40%{transform:translateX(5px);}
      60%{transform:translateX(-3px);}
      80%{transform:translateX(3px);}
    }
    .otp-resend-row {
      text-align: center;
      font-size: 0.83rem;
      color: var(--text-muted);
      margin-top: 14px;
    }
    .otp-resend-btn {
      background: none;
      border: none;
      color: var(--accent2);
      font-size: 0.83rem;
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font-body);
      padding: 0;
      text-decoration: underline;
    }
    .otp-resend-btn:disabled {
      color: var(--text-muted);
      text-decoration: none;
      cursor: default;
    }
    .otp-back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.83rem;
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font-body);
      padding: 0;
      margin-top: 12px;
      width: 100%;
      justify-content: center;
    }
    .otp-back-btn:hover { color: var(--primary); }
    .auth-step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .auth-step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--border);
      transition: background 0.3s, transform 0.3s;
    }
    .auth-step-dot.active {
      background: var(--accent);
      transform: scale(1.3);
    }
    .auth-step-dot.done {
      background: var(--accent2);
    }
    .otp-verify-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(76,175,80,0.12), rgba(33,150,243,0.12));
      border: 2px solid rgba(76,175,80,0.26);
      font-size: 1.75rem;
    }
    .auth-divider {
      height: 1px;
      background: var(--border);
      margin: 18px 0;
    }
    .otp-hint {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.55;
      margin-top: 8px;
    }

    /* ── Inline OTP widget styles (for profile/admission forms) ── */
    .pdkv-otp-widget {
      margin-top: 10px;
      border: 1.5px solid rgba(76,175,80,0.22);
      border-radius: 14px;
      padding: 16px 18px;
      background: rgba(76,175,80,0.04);
      animation: fadeInUp 0.35s ease both;
    }
    @keyframes fadeInUp {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .pdkv-otp-widget .otp-info {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .pdkv-otp-widget .otp-info i { color: var(--accent); }
    .pdkv-otp-widget .otp-digits-row {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .pdkv-otp-widget .otp-d {
      width: 40px;
      height: 48px;
      border: 2px solid var(--border);
      border-radius: 9px;
      font-size: 1.3rem;
      font-weight: 800;
      text-align: center;
      font-family: 'Poppins', monospace;
      color: var(--primary);
      background: white;
      outline: none;
      transition: all 0.2s ease;
      caret-color: transparent;
    }
    .pdkv-otp-widget .otp-d:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(76,175,80,0.12);
      transform: scale(1.05);
    }
    .pdkv-otp-widget .otp-d.filled {
      border-color: var(--accent2);
      background: rgba(33,150,243,0.05);
      color: var(--accent2-dark);
    }
    .pdkv-otp-widget .otp-d.error {
      border-color: var(--danger);
      background: rgba(244,67,54,0.05);
      animation: otpShake 0.35s ease;
    }
    .pdkv-otp-widget .otp-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }
    .pdkv-otp-widget .otp-verify-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 20px;
      border-radius: 50px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: white;
      font-size: 0.86rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      font-family: var(--font-body);
      transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .pdkv-otp-widget .otp-verify-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(76,175,80,0.35);
    }
    .pdkv-otp-widget .otp-verify-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .pdkv-otp-widget .otp-resend-sm {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .pdkv-otp-widget .otp-resend-sm button {
      background: none; border: none;
      color: var(--accent2); font-weight: 700;
      cursor: pointer; font-size: 0.78rem;
      font-family: var(--font-body);
      text-decoration: underline;
    }
    .pdkv-otp-widget .otp-resend-sm button:disabled {
      color: var(--text-muted); text-decoration: none; cursor: default;
    }
    .pdkv-otp-verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 50px;
      background: rgba(76,175,80,0.10);
      border: 1.5px solid rgba(76,175,80,0.28);
      color: var(--accent-dark);
      font-size: 0.82rem;
      font-weight: 700;
      margin-top: 8px;
      animation: fadeInUp 0.3s ease both;
    }
    .email-send-otp-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .email-send-otp-row input {
      flex: 1;
    }
    .btn-send-otp-inline {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 0 16px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--accent2), var(--accent2-dark));
      color: white;
      font-size: 0.82rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      font-family: var(--font-body);
      white-space: nowrap;
      transition: all 0.28s ease;
      flex-shrink: 0;
    }
    .btn-send-otp-inline:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33,150,243,0.35);
    }
    .btn-send-otp-inline:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Dark theme variants for Student/Teacher portals */
    .sp-otp-widget, .tc-otp-widget {
      margin-top: 10px;
      border: 1.5px solid rgba(0,245,212,0.22);
      border-radius: 14px;
      padding: 16px 18px;
      background: rgba(0,245,212,0.04);
      animation: fadeInUp 0.35s ease both;
    }
    .tc-otp-widget {
      border-color: rgba(245,158,11,0.22);
      background: rgba(245,158,11,0.04);
    }
    .sp-otp-widget .otp-info, .tc-otp-widget .otp-info {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.55);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .sp-otp-widget .otp-digits-row, .tc-otp-widget .otp-digits-row {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .sp-otp-widget .otp-d, .tc-otp-widget .otp-d {
      width: 40px;
      height: 48px;
      border: 2px solid rgba(255,255,255,0.12);
      border-radius: 9px;
      font-size: 1.3rem;
      font-weight: 800;
      text-align: center;
      font-family: 'Space Mono', monospace;
      color: #fff;
      background: rgba(255,255,255,0.05);
      outline: none;
      transition: all 0.2s ease;
      caret-color: transparent;
    }
    .sp-otp-widget .otp-d:focus {
      border-color: #00f5d4;
      box-shadow: 0 0 0 3px rgba(0,245,212,0.15);
      transform: scale(1.05);
    }
    .tc-otp-widget .otp-d:focus {
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245,158,11,0.15);
      transform: scale(1.05);
    }
    .sp-otp-widget .otp-d.filled { border-color: rgba(0,245,212,0.5); background: rgba(0,245,212,0.08); }
    .tc-otp-widget .otp-d.filled { border-color: rgba(245,158,11,0.5); background: rgba(245,158,11,0.08); }
    .sp-otp-widget .otp-d.error, .tc-otp-widget .otp-d.error {
      border-color: #f87171;
      background: rgba(248,113,113,0.08);
      animation: otpShake 0.35s ease;
    }
    .sp-otp-widget .otp-actions, .tc-otp-widget .otp-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }
    .sp-otp-widget .otp-verify-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 20px; border-radius: 50px;
      background: linear-gradient(135deg, #00f5d4, #00c4aa);
      color: #020c1b; font-size: 0.86rem; font-weight: 800;
      border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
      transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .tc-otp-widget .otp-verify-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 20px; border-radius: 50px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #06080f; font-size: 0.86rem; font-weight: 800;
      border: none; cursor: pointer; font-family: 'Mulish', sans-serif;
      transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .sp-otp-widget .otp-verify-btn:hover:not(:disabled),
    .tc-otp-widget .otp-verify-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.3);
    }
    .sp-otp-widget .otp-verify-btn:disabled,
    .tc-otp-widget .otp-verify-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .sp-otp-widget .otp-resend-sm, .tc-otp-widget .otp-resend-sm {
      font-size: 0.76rem; color: rgba(255,255,255,0.4);
    }
    .sp-otp-widget .otp-resend-sm button {
      background: none; border: none;
      color: #00f5d4; font-weight: 700;
      cursor: pointer; font-size: 0.76rem;
      font-family: 'Plus Jakarta Sans', sans-serif; text-decoration: underline;
    }
    .tc-otp-widget .otp-resend-sm button {
      background: none; border: none;
      color: #f59e0b; font-weight: 700;
      cursor: pointer; font-size: 0.76rem;
      font-family: 'Mulish', sans-serif; text-decoration: underline;
    }
    .sp-otp-widget .otp-resend-sm button:disabled,
    .tc-otp-widget .otp-resend-sm button:disabled {
      color: rgba(255,255,255,0.28); text-decoration: none; cursor: default;
    }
    .sp-otp-verified-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 50px;
      background: rgba(0,245,212,0.10);
      border: 1.5px solid rgba(0,245,212,0.28);
      color: #00f5d4; font-size: 0.82rem; font-weight: 700;
      margin-top: 8px; animation: fadeInUp 0.3s ease both;
    }
    .tc-otp-verified-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 50px;
      background: rgba(245,158,11,0.10);
      border: 1.5px solid rgba(245,158,11,0.28);
      color: #f59e0b; font-size: 0.82rem; font-weight: 700;
      margin-top: 8px; animation: fadeInUp 0.3s ease both;
    }
    .sp-email-row, .tc-email-row {
      display: flex; gap: 8px; align-items: stretch;
    }
    .sp-email-row input, .tc-email-row input { flex: 1; }
    .sp-send-otp-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 0 14px; border-radius: var(--sp-r, 16px);
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white; font-size: 0.80rem; font-weight: 800;
      border: none; cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      white-space: nowrap; flex-shrink: 0;
      transition: all 0.28s ease;
    }
    .sp-send-otp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
    .sp-send-otp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .tc-send-otp-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 0 14px; border-radius: 11px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #06080f; font-size: 0.80rem; font-weight: 800;
      border: none; cursor: pointer;
      font-family: 'Mulish', sans-serif;
      white-space: nowrap; flex-shrink: 0;
      transition: all 0.28s ease;
    }
    .tc-send-otp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.4); }
    .tc-send-otp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>`
}

/* ── RENDER EMAIL STEP ───────────────────────────────────────── */
function _renderEmailStep(mode) {
  _otpState.step = 'email'
  _otpState.mode = mode

  const title    = mode === 'login' ? 'Sign In' : 'Create Account'
  const subtitle = mode === 'login'
    ? 'Enter your email to receive a verification code'
    : 'Enter your details below to create your account'
  const altMode  = mode === 'login' ? 'signup' : 'login'
  const altText  = mode === 'login' ? "Don't have an account? <strong>Create one</strong>" : "Already have an account? <strong>Sign In</strong>"

  document.getElementById('_authModalTitle').textContent = title

  const signupExtra = mode === 'signup' ? `
    <div class="form-group">
      <label class="form-label"><i class="fas fa-user"></i> Full Name *</label>
      <input type="text" id="_authName" class="form-input" placeholder="Your full name" required autocomplete="name"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-id-card"></i> Register Number
        <span style="font-weight:400;opacity:0.55;font-size:0.76rem;">(optional)</span>
      </label>
      <input type="text" id="_authRegno" class="form-input" placeholder="e.g. 22CS0001"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-phone"></i> Phone *</label>
      <input type="tel" id="_authPhone" class="form-input" placeholder="+91 99999 99999" required autocomplete="tel"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-venus-mars"></i> Gender *</label>
      <select id="_authGender" class="form-select" required>
        <option value="">Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="auth-divider"></div>` : ''

  document.getElementById('_authModalBody').innerHTML = `
    <p style="text-align:center;color:var(--text-muted);font-size:0.88rem;margin-bottom:20px;line-height:1.6;">${subtitle}</p>

    <div class="auth-step-indicator">
      <div class="auth-step-dot active"></div>
      <div style="width:28px;height:1px;background:var(--border);"></div>
      <div class="auth-step-dot"></div>
    </div>

    <form id="_authEmailForm" novalidate>
      ${signupExtra}
      <div class="form-group">
        <label class="form-label"><i class="fas fa-envelope"></i> Email Address *</label>
        <input type="email" id="_authEmail" class="form-input"
               placeholder="your@email.com" required autocomplete="email"
               value="${_otpState.email || ''}"/>
      </div>
      <button type="submit" class="btn btn-primary"
              style="width:100%;justify-content:center;margin-top:12px;" id="_authEmailBtn">
        <i class="fas fa-paper-plane"></i> Send Verification Code
      </button>
    </form>

    <button type="button" style="
      display:block;width:100%;margin-top:14px;
      background:none;border:none;
      color:var(--text-muted);font-size:0.83rem;font-weight:600;
      cursor:pointer;font-family:var(--font-body);text-align:center;
      padding:6px 0;
    " onclick="window._authSwitchMode('${altMode}')">${altText}</button>

    <p style="text-align:center;font-size:0.76rem;color:var(--text-light);margin-top:10px;line-height:1.5;">
      <i class="fas fa-shield-alt" style="color:var(--accent2);"></i>
      A secure 8-digit OTP will be sent to your email
    </p>`

  document.getElementById('_authEmailForm').addEventListener('submit', _handleEmailSubmit)
  document.getElementById('_authEmail')?.focus()
}

/* ── RENDER OTP STEP ─────────────────────────────────────────── */
function _renderOtpStep() {
  _otpState.step = 'otp'

  const modeLabel = _otpState.mode === 'login' ? 'Sign In' : 'Verify Email'
  document.getElementById('_authModalTitle').textContent = modeLabel

  const emailShort = _otpState.email.length > 28
    ? _otpState.email.slice(0, 12) + '…' + _otpState.email.slice(_otpState.email.lastIndexOf('@'))
    : _otpState.email

  document.getElementById('_authModalBody').innerHTML = `
    <div class="auth-step-indicator">
      <div class="auth-step-dot done"></div>
      <div style="width:28px;height:1px;background:var(--accent2);"></div>
      <div class="auth-step-dot active"></div>
    </div>

    <div class="otp-verify-icon">✉️</div>

    <p style="text-align:center;font-weight:700;color:var(--primary);font-size:1.02rem;margin-bottom:6px;">
      Check your inbox!
    </p>
    <p style="text-align:center;color:var(--text-muted);font-size:0.86rem;line-height:1.65;margin-bottom:14px;">
      We sent an <strong>8-digit code</strong> to:
    </p>

    <div class="otp-email-display">
      <i class="fas fa-envelope" style="color:var(--accent);flex-shrink:0;"></i>
      <span>${emailShort}</span>
    </div>

    <label style="display:block;text-align:center;font-size:0.80rem;font-weight:700;
                  color:var(--text-dark);letter-spacing:0.04em;margin-bottom:4px;">
      ENTER 8-DIGIT CODE
    </label>

    <div class="otp-inputs-wrap" id="_otpInputsWrap">
      ${Array.from({length:8}, (_,i) => `
        <input type="text" inputmode="numeric" maxlength="1"
               class="otp-digit" id="_od${i}"
               autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
               aria-label="OTP digit ${i+1}"/>`).join('')}
    </div>

    <div id="_otpErrMsg" style="
      display:none;text-align:center;color:var(--danger);
      font-size:0.82rem;font-weight:700;margin-top:8px;
    "></div>

    <button type="button" class="btn btn-primary"
            style="width:100%;justify-content:center;margin-top:18px;" id="_otpVerifyBtn">
      <i class="fas fa-check-circle"></i> Verify Code
    </button>

    <div class="otp-resend-row">
      <span id="_resendText">Resend code in </span>
      <strong id="_resendCount">60</strong><span id="_resendSuffix">s</span>
      <button type="button" class="otp-resend-btn" id="_resendBtn"
              style="display:none;" onclick="window._authResendOtp()">
        Resend Code
      </button>
    </div>

    <p class="otp-hint">
      <i class="fas fa-info-circle"></i>
      Can't find it? Check your spam / junk folder.<br>
      Code expires in <strong>10 minutes</strong>.
    </p>

    <button type="button" class="otp-back-btn" onclick="window._authGoBack()">
      <i class="fas fa-arrow-left"></i> Use a different email
    </button>`

  _bindOtpInputs()
  _startResendTimer()
  document.getElementById('_od0')?.focus()
}

/* ── OTP INPUT BINDING ───────────────────────────────────────── */
function _bindOtpInputs() {
  const digits = Array.from({length:8}, (_,i) => document.getElementById('_od' + i))

  digits.forEach((inp, idx) => {
    if (!inp) return

    inp.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 1)
      e.target.value = val
      e.target.classList.toggle('filled', val.length > 0)
      _clearOtpError()
      if (val && idx < 7) digits[idx + 1]?.focus()
      _autoVerifyIfComplete(digits)
    })

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!e.target.value && idx > 0) {
          digits[idx - 1].value = ''
          digits[idx - 1].classList.remove('filled')
          digits[idx - 1].focus()
        } else {
          e.target.value = ''
          e.target.classList.remove('filled')
        }
        _clearOtpError()
      }
      if (e.key === 'ArrowLeft'  && idx > 0) { e.preventDefault(); digits[idx - 1].focus() }
      if (e.key === 'ArrowRight' && idx < 7) { e.preventDefault(); digits[idx + 1].focus() }
      if (e.key === 'Enter') _triggerOtpVerify(digits)
    })

    inp.addEventListener('paste', (e) => {
      e.preventDefault()
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '')
      if (!pasted) return
      pasted.slice(0, 8).split('').forEach((ch, i) => {
        if (digits[i]) {
          digits[i].value = ch
          digits[i].classList.add('filled')
        }
      })
      const nextEmpty = digits.findIndex(d => !d.value)
      const focusIdx  = nextEmpty === -1 ? 7 : nextEmpty
      digits[focusIdx]?.focus()
      _autoVerifyIfComplete(digits)
    })
  })

  document.getElementById('_otpVerifyBtn')?.addEventListener('click', () => _triggerOtpVerify(digits))
}

function _getOtpValue(digits) {
  return digits.map(d => (d ? d.value : '')).join('')
}

function _autoVerifyIfComplete(digits) {
  if (_getOtpValue(digits).length === 8) _triggerOtpVerify(digits)
}

function _showOtpError(msg) {
  const el = document.getElementById('_otpErrMsg')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
  Array.from({length:8}, (_,i) => document.getElementById('_od' + i)).forEach(d => {
    if (d) { d.classList.add('error'); setTimeout(() => d.classList.remove('error'), 600) }
  })
}

function _clearOtpError() {
  const el = document.getElementById('_otpErrMsg')
  if (el) el.style.display = 'none'
}

/* ── RESEND TIMER ────────────────────────────────────────────── */
function _startResendTimer(secs = 60) {
  _otpState.resendSecs = secs
  if (_otpState.resendTimer) clearInterval(_otpState.resendTimer)

  const countEl  = document.getElementById('_resendCount')
  const textEl   = document.getElementById('_resendText')
  const suffEl   = document.getElementById('_resendSuffix')
  const btnEl    = document.getElementById('_resendBtn')
  if (!countEl) return

  btnEl.style.display   = 'none'
  textEl.style.display  = 'inline'
  suffEl.style.display  = 'inline'
  countEl.style.display = 'inline'
  countEl.textContent   = secs

  _otpState.resendTimer = setInterval(() => {
    _otpState.resendSecs--
    if (countEl) countEl.textContent = _otpState.resendSecs
    if (_otpState.resendSecs <= 0) {
      clearInterval(_otpState.resendTimer)
      if (textEl)  textEl.style.display  = 'none'
      if (suffEl)  suffEl.style.display  = 'none'
      if (countEl) countEl.style.display = 'none'
      if (btnEl)   btnEl.style.display   = 'inline'
    }
  }, 1000)
}

/* ── HANDLE EMAIL SUBMIT ─────────────────────────────────────── */
async function _handleEmailSubmit(e) {
  e.preventDefault()

  const emailInp = document.getElementById('_authEmail')
  const email    = emailInp?.value?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'warning')
    emailInp?.focus()
    return
  }

  if (_otpState.mode === 'signup') {
    const name   = document.getElementById('_authName')?.value?.trim()
    const phone  = document.getElementById('_authPhone')?.value?.trim()
    const gender = document.getElementById('_authGender')?.value
    if (!name || !phone || !gender) {
      showToast('Please fill in all required fields.', 'warning')
      return
    }
    _otpState.signupData = {
      name,
      phone,
      gender,
      regno: document.getElementById('_authRegno')?.value?.trim() || ''
    }
  }

  _otpState.email = email

  const btn = document.getElementById('_authEmailBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…' }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin
    }
  })

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Verification Code' }

  if (error) {
    showToast('Failed to send code: ' + error.message, 'error')
    return
  }

  showToast('Verification code sent! Check your inbox 📬', 'success', 5000)
  _renderOtpStep()
}

/* ── VERIFY OTP ──────────────────────────────────────────────── */
async function _triggerOtpVerify(digits) {
  const otp = _getOtpValue(digits)
  if (otp.length < 6) {
    _showOtpError('Please enter the complete verification code.')
    return
  }

  const btn = document.getElementById('_otpVerifyBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…' }

  let verifyError = null
  let verifySession = null

  const attempt1 = await supabase.auth.verifyOtp({
    email: _otpState.email,
    token: otp,
    type:  'email'
  })

  if (attempt1.error) {
    const attempt2 = await supabase.auth.verifyOtp({
      email: _otpState.email,
      token: otp.slice(-6),
      type:  'email'
    })
    if (attempt2.error) {
      verifyError = attempt2.error
    } else {
      verifySession = attempt2.data?.session
    }
  } else {
    verifySession = attempt1.data?.session
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Code' }

  if (verifyError) {
    _showOtpError('Invalid or expired code. Please try again.')
    showToast('Verification failed — wrong or expired code.', 'error')
    return
  }

  const user = verifySession?.user || (await supabase.auth.getUser()).data?.user
  if (user) {
    _currentUser = user
    await _saveLoginInformation(user)
    updateHeaderAuthUI()
    _notify()
  }

  if (_otpState.resendTimer) clearInterval(_otpState.resendTimer)

  const modeMsg = _otpState.mode === 'login' ? 'Welcome back! 👋' : 'Account created! Welcome 🎉'
  showToast(modeMsg, 'success')
  closeModal('globalAuthModal')
  _resetOtpState()
}

/* ── SAVE TO login_information TABLE ─────────────────────────── */
async function _saveLoginInformation(user) {
  const existingData = _otpState.signupData
  const profileData  = {
    id:    user.id,
    email: user.email
  }

  if (existingData) {
    profileData.name   = existingData.name
    profileData.phone  = existingData.phone
    profileData.gender = existingData.gender
    profileData.regno  = existingData.regno || ''
  }

  const { data: existing } = await supabase
    .from('login_information')
    .select('id, name, phone, gender, regno')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    if (existingData) {
      await supabase.from('login_information').update({
        name:   existingData.name,
        phone:  existingData.phone,
        gender: existingData.gender,
        regno:  existingData.regno || existing.regno || ''
      }).eq('id', user.id)
    }
    _userProfile = { ...existing, ...profileData }
  } else {
    const { data: inserted } = await supabase
      .from('login_information')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .maybeSingle()
    _userProfile = inserted || profileData
  }
}

/* ── RESEND OTP ──────────────────────────────────────────────── */
window._authResendOtp = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: _otpState.email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
  })
  if (error) { showToast('Resend failed: ' + error.message, 'error'); return }
  showToast('New verification code sent! 📬', 'success', 4000)
  _startResendTimer(60)
}

/* ── GO BACK ─────────────────────────────────────────────────── */
window._authGoBack = () => {
  if (_otpState.resendTimer) clearInterval(_otpState.resendTimer)
  _renderEmailStep(_otpState.mode)
}

/* ── SWITCH MODE ─────────────────────────────────────────────── */
window._authSwitchMode = (mode) => {
  _otpState.signupData = null
  _renderEmailStep(mode)
}

/* ── RESET ───────────────────────────────────────────────────── */
function _resetOtpState() {
  if (_otpState.resendTimer) clearInterval(_otpState.resendTimer)
  _otpState.step       = 'email'
  _otpState.email      = ''
  _otpState.signupData = null
  _otpState.mode       = 'login'
}

/* ── WIRE FORMS ──────────────────────────────────────────────── */
function _wireAuthForms() {
  document.getElementById('_authClose')?.addEventListener('click', () => {
    closeModal('globalAuthModal')
    _resetOtpState()
  })
  document.getElementById('globalAuthModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'globalAuthModal') _resetOtpState()
  })
}

/* ── HEADER AUTH UI ──────────────────────────────────────────── */
export function updateHeaderAuthUI() {
  const authBtns   = document.querySelectorAll('.global-header-auth')
  const userChips  = document.querySelectorAll('.global-header-user')
  const logoutBtns = document.querySelectorAll('.global-header-logout')
  if (_currentUser) {
    const name  = _userProfile?.name || _currentUser.email.split('@')[0]
    const regno = _userProfile?.regno || ''
    authBtns.forEach(b  => { b.style.display = 'none' })
    userChips.forEach(c => {
      c.style.display = 'inline-flex'
      c.innerHTML = `<i class="fas fa-user-circle"></i> ${name}${regno ? ' · ' + regno : ''}`
    })
    logoutBtns.forEach(b => { b.style.display = 'inline-flex' })
  } else {
    authBtns.forEach(b  => { b.style.display = 'inline-flex' })
    userChips.forEach(c => { c.style.display = 'none' })
    logoutBtns.forEach(b => { b.style.display = 'none' })
  }
}

/* ── OPEN AUTH MODAL ─────────────────────────────────────────── */
export function openAuthModal(mode = 'login') {
  _otpState.signupData = null
  _otpState.email      = ''
  _renderEmailStep(mode)
  openModal('globalAuthModal')
}

/* ── LOGOUT ──────────────────────────────────────────────────── */
export async function logoutUser() {
  try {
    await supabase.auth.signOut()
    showToast('Signed out successfully.', 'info')
  } catch (e) {
    showToast('Sign-out error: ' + e.message, 'error')
  }
}

/* ── RIPPLE EFFECT ───────────────────────────────────────────── */
export function initRipple() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .nav-link')
    if (!btn || btn.disabled) return
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.2
    const x    = e.clientX - rect.left - size / 2
    const y    = e.clientY - rect.top  - size / 2
    const r    = document.createElement('span')
    r.className = 'ripple'
    r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`
    const pos = getComputedStyle(btn).position
    if (pos === 'static') btn.style.position = 'relative'
    btn.appendChild(r)
    r.addEventListener('animationend', () => r.remove(), { once: true })
  })
}

/* ── TILT CARDS ──────────────────────────────────────────────── */
export function initTiltCards(selector = '.fact-card, .qlink-card, .about-stat-card') {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)
      const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)
      card.style.transform  = `translateY(-10px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg) scale(1.02)`
      card.style.transition = 'transform 0.12s ease'
    })
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)'
      card.style.transform  = ''
    })
  })
}

/* ── SKELETON NOTICES ────────────────────────────────────────── */
export function showSkeletonNotices(containerId = 'noticesList') {
  const c = document.getElementById(containerId)
  if (!c) return
  c.innerHTML = Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line tall" style="width:82%;margin-top:4px;"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line full"></div>
      <div class="skeleton skeleton-line full"></div>
      <div class="skeleton skeleton-line" style="height:40px;border-radius:10px;margin-top:8px;"></div>
    </div>`).join('')
}

/* ── PAGE TRANSITIONS ────────────────────────────────────────── */
export function initPageTransitions() {
  const overlay = document.getElementById('pageTransition')
  if (!overlay) return
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href')
    if (
      !href ||
      href.startsWith('http')  ||
      href.startsWith('#')     ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')    ||
      href.startsWith('javascript:') ||
      link.target === '_blank'
    ) return
    link.addEventListener('click', (e) => {
      e.preventDefault()
      overlay.classList.add('leaving')
      setTimeout(() => { window.location.href = href }, 265)
    })
  })
}

/* ── UTILS ───────────────────────────────────────────────────── */
export function formatNumber(n) { return Number(n).toLocaleString('en-IN') }

/* ── PHOTO UPLOAD ────────────────────────────────────────────── */
export async function uploadProfilePhoto(file, bucket, storagePath, imgSelectors = []) {
  if (!file) return null

  const localUrl = URL.createObjectURL(file)
  imgSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(img => { img.src = localUrl })
  })

  let uploadFile = file
  if (file.size > 1_000_000 && file.type.startsWith('image/')) {
    try { uploadFile = await _compressImage(file, 800, 0.82) } catch (_) {}
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, uploadFile, { upsert: true, contentType: uploadFile.type })

  URL.revokeObjectURL(localUrl)

  if (error) {
    showToast('Photo upload failed: ' + error.message, 'error')
    return null
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  const finalUrl = `${publicUrl}?t=${Date.now()}`

  imgSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(img => { img.src = finalUrl })
  })

  return finalUrl
}

function _compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale  = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w      = Math.round(img.width  * scale)
        const h      = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Compression failed')); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

/* ── FAST PROFILE SAVE ───────────────────────────────────────── */
export async function saveProfile({
  userId,
  fields,
  photoFile         = null,
  photoBucket       = 'image_files',
  photoPathFn       = (id) => `avatars/${id}.jpg`,
  photoImgSelectors = [],
  onSuccess         = null,
  onError           = null
} = {}) {
  if (!userId) return false

  if (photoFile) {
    const path = photoPathFn(userId)

    const [photoUrl, { error: dbErr }] = await Promise.all([
      uploadProfilePhoto(photoFile, photoBucket, path, photoImgSelectors),
      supabase.from('login_information').upsert({ id: userId, ...fields })
    ])

    if (dbErr) {
      showToast('Save failed: ' + dbErr.message, 'error')
      onError?.(dbErr)
      return false
    }

    if (photoUrl) {
      supabase.from('login_information')
        .update({ photo_url: photoUrl })
        .eq('id', userId)
        .catch(() => {})
    }

    onSuccess?.(photoUrl)
  } else {
    const { error } = await supabase
      .from('login_information')
      .upsert({ id: userId, ...fields })

    if (error) {
      showToast('Save failed: ' + error.message, 'error')
      onError?.(error)
      return false
    }

    onSuccess?.(null)
  }

  return true
}

/* ══════════════════════════════════════════════════════════════
   INLINE OTP WIDGET — for profile & admission email fields
   Used by: Student.js (profile setup), Courses.js (admission),
            Teacher.js already has its own via initiateOtp()
   ══════════════════════════════════════════════════════════════ */

// Track verification state per email
const _verifiedEmails = new Map()  // email -> true

/**
 * Inject an OTP send button next to a form email input, and
 * render the OTP entry widget below it on send.
 *
 * @param {object} opts
 *   emailInputId  - id of the <input type="email"> element
 *   widgetId      - id to give the injected widget div
 *   theme         - 'light' | 'dark-sp' | 'dark-tc'
 *   onVerified    - async callback() called after OTP verified
 */
export function injectOtpWidget({ emailInputId, widgetId, theme = 'light', onVerified }) {
  const emailInput = document.getElementById(emailInputId)
  if (!emailInput || document.getElementById(widgetId + '_wrap')) return

  // Wrap input + send button
  const parent = emailInput.parentElement
  const wrapper = document.createElement('div')
  const rowClass = theme === 'dark-sp' ? 'sp-email-row' : theme === 'dark-tc' ? 'tc-email-row' : 'email-send-otp-row'
  wrapper.className = rowClass
  wrapper.id = widgetId + '_wrap'

  parent.insertBefore(wrapper, emailInput)
  wrapper.appendChild(emailInput)

  const sendBtn = document.createElement('button')
  sendBtn.type = 'button'
  sendBtn.id = widgetId + '_sendBtn'
  const btnClass = theme === 'dark-sp' ? 'sp-send-otp-btn' : theme === 'dark-tc' ? 'tc-send-otp-btn' : 'btn-send-otp-inline'
  sendBtn.className = btnClass
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'
  wrapper.appendChild(sendBtn)

  // Widget container (shown after send)
  const widgetDiv = document.createElement('div')
  widgetDiv.id = widgetId
  widgetDiv.style.display = 'none'
  parent.appendChild(widgetDiv)

  // Verified badge (shown after verify)
  const badge = document.createElement('div')
  badge.id = widgetId + '_badge'
  badge.style.display = 'none'
  const badgeClass = theme === 'dark-sp' ? 'sp-otp-verified-badge' : theme === 'dark-tc' ? 'tc-otp-verified-badge' : 'pdkv-otp-verified-badge'
  badge.className = badgeClass
  badge.innerHTML = '<i class="fas fa-check-circle"></i> Email Verified!'
  parent.appendChild(badge)

  // Track timer per widget
  let _timer = null
  let _resendSecs = 0

  // Reset verification when email changes
  emailInput.addEventListener('input', () => {
    const cur = emailInput.value.trim().toLowerCase()
    if (!_verifiedEmails.has(cur)) {
      badge.style.display = 'none'
      sendBtn.disabled = false
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'
      widgetDiv.style.display = 'none'
    } else {
      _showVerified()
    }
  })

  function _showVerified() {
    widgetDiv.style.display = 'none'
    badge.style.display = 'inline-flex'
    sendBtn.disabled = true
    sendBtn.innerHTML = '<i class="fas fa-check"></i> Verified'
  }

  async function _sendOtp() {
    const email = emailInput.value.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address first.', 'warning')
      emailInput.focus()
      return
    }

    // Already verified for this email
    if (_verifiedEmails.get(email)) { _showVerified(); return }

    sendBtn.disabled = true
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
    })

    if (error) {
      sendBtn.disabled = false
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'
      showToast('Failed to send OTP: ' + error.message, 'error')
      return
    }

    showToast('OTP sent to ' + email + '! Check your inbox 📬', 'success', 5000)
    sendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend'
    sendBtn.disabled = false

    _renderWidget(email)
  }

  function _renderWidget(email) {
    const widgetClass = theme === 'dark-sp' ? 'sp-otp-widget' : theme === 'dark-tc' ? 'tc-otp-widget' : 'pdkv-otp-widget'
    const emailShort = email.length > 30 ? email.slice(0, 10) + '…' + email.slice(email.lastIndexOf('@')) : email

    widgetDiv.style.display = 'block'
    widgetDiv.innerHTML = `
      <div class="${widgetClass}">
        <div class="otp-info">
          <i class="fas fa-envelope-open-text"></i>
          <span>Enter the 8-digit code sent to <strong>${emailShort}</strong></span>
        </div>
        <div class="otp-digits-row" id="${widgetId}_digits">
          ${Array.from({length:8}, (_,i) => `
            <input type="text" inputmode="numeric" maxlength="1"
                   class="otp-d" id="${widgetId}_d${i}"
                   autocomplete="${i===0?'one-time-code':'off'}"
                   aria-label="OTP digit ${i+1}"/>`).join('')}
        </div>
        <div id="${widgetId}_err" style="display:none;text-align:center;color:#ef4444;font-size:0.78rem;font-weight:700;margin-bottom:8px;"></div>
        <div class="otp-actions">
          <button type="button" class="otp-verify-btn" id="${widgetId}_verifyBtn">
            <i class="fas fa-shield-check"></i> Verify
          </button>
          <div class="otp-resend-sm">
            <span id="${widgetId}_timer">Resend in <strong id="${widgetId}_sec">60</strong>s</span>
            <button type="button" id="${widgetId}_resendBtn" style="display:none;" onclick="_pdkvResend_${widgetId}()">Resend</button>
          </div>
        </div>
        <p style="font-size:0.72rem;color:${theme==='light'?'var(--text-muted)':'rgba(255,255,255,0.38)'};text-align:center;margin-top:10px;line-height:1.5;">
          <i class="fas fa-info-circle"></i> Check spam/junk. Code expires in 10 minutes.
        </p>
      </div>`

    // Bind digit inputs
    const digitEls = Array.from({length:8}, (_,i) => document.getElementById(`${widgetId}_d${i}`))
    digitEls.forEach((inp, idx) => {
      if (!inp) return
      inp.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g,'').slice(0,1)
        e.target.value = val
        e.target.classList.toggle('filled', !!val)
        _clearErr()
        if (val && idx < 7) digitEls[idx+1]?.focus()
        if (digitEls.map(d=>d.value).join('').length === 8) _doVerify(email, digitEls)
      })
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (!e.target.value && idx > 0) {
            digitEls[idx-1].value = ''
            digitEls[idx-1].classList.remove('filled')
            digitEls[idx-1].focus()
          } else {
            e.target.value = ''
            e.target.classList.remove('filled')
          }
          _clearErr()
        }
        if (e.key === 'ArrowLeft' && idx > 0)  { e.preventDefault(); digitEls[idx-1].focus() }
        if (e.key === 'ArrowRight' && idx < 7) { e.preventDefault(); digitEls[idx+1].focus() }
        if (e.key === 'Enter') _doVerify(email, digitEls)
      })
      inp.addEventListener('paste', (e) => {
        e.preventDefault()
        const p = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'')
        p.slice(0,8).split('').forEach((ch,i) => { if(digitEls[i]){digitEls[i].value=ch;digitEls[i].classList.add('filled')} })
        const nxt = digitEls.findIndex(d=>!d.value)
        digitEls[nxt===-1?7:nxt]?.focus()
        if (digitEls.map(d=>d.value).join('').length===8) _doVerify(email, digitEls)
      })
    })

    document.getElementById(`${widgetId}_verifyBtn`)?.addEventListener('click', () => _doVerify(email, digitEls))
    digitEls[0]?.focus()

    // Start timer
    _startWidgetTimer()

    // Expose resend function globally
    window[`_pdkvResend_${widgetId}`] = async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
      })
      if (error) { showToast('Resend failed.', 'error'); return }
      showToast('New OTP sent! 📬', 'success', 4000)
      digitEls.forEach(d => { d.value=''; d.classList.remove('filled','error') })
      digitEls[0]?.focus()
      _clearErr()
      _startWidgetTimer()
      const rb = document.getElementById(`${widgetId}_resendBtn`)
      const tb = document.getElementById(`${widgetId}_timer`)
      if (rb) rb.style.display = 'none'
      if (tb) tb.style.display = 'inline'
    }
  }

  function _clearErr() {
    const el = document.getElementById(`${widgetId}_err`)
    if (el) el.style.display = 'none'
  }

  function _showErr(msg) {
    const el = document.getElementById(`${widgetId}_err`)
    if (!el) return
    el.textContent = msg
    el.style.display = 'block'
    const digitEls = Array.from({length:8}, (_,i) => document.getElementById(`${widgetId}_d${i}`))
    digitEls.forEach(d => { if(d){d.classList.add('error');setTimeout(()=>d.classList.remove('error'),600)} })
  }

  async function _doVerify(email, digitEls) {
    const otp = digitEls.map(d=>d.value).join('')
    if (otp.length < 6) { _showErr('Please enter the complete code.'); return }

    const vBtn = document.getElementById(`${widgetId}_verifyBtn`)
    if (vBtn) { vBtn.disabled=true; vBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Verifying…' }

    // Try full OTP first, then last 6
    let ok = false
    const a1 = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (!a1.error) {
      ok = true
    } else {
      const a2 = await supabase.auth.verifyOtp({ email, token: otp.slice(-6), type: 'email' })
      if (!a2.error) ok = true
    }

    if (vBtn) { vBtn.disabled=false; vBtn.innerHTML='<i class="fas fa-shield-check"></i> Verify' }

    if (!ok) {
      _showErr('Invalid or expired code. Please try again.')
      return
    }

    // Mark email verified
    _verifiedEmails.set(email, true)
    if (_timer) clearInterval(_timer)

    showToast('Email verified! ✅', 'success')
    _showVerified()

    // Update auth state
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      _currentUser = user
      if (!_userProfile) {
        const { data } = await supabase.from('login_information').select('*').eq('id', user.id).maybeSingle()
        _userProfile = data || { id: user.id, email: user.email }
      }
      updateHeaderAuthUI()
      _notify()
    }

    if (onVerified) await onVerified(email)
  }

  function _startWidgetTimer(secs = 60) {
    if (_timer) clearInterval(_timer)
    _resendSecs = secs
    const secEl  = document.getElementById(`${widgetId}_sec`)
    const timerEl = document.getElementById(`${widgetId}_timer`)
    const resendEl = document.getElementById(`${widgetId}_resendBtn`)

    if (secEl) secEl.textContent = secs
    if (timerEl) timerEl.style.display = 'inline'
    if (resendEl) resendEl.style.display = 'none'

    _timer = setInterval(() => {
      _resendSecs--
      if (secEl) secEl.textContent = _resendSecs
      if (_resendSecs <= 0) {
        clearInterval(_timer)
        if (timerEl) timerEl.style.display = 'none'
        if (resendEl) resendEl.style.display = 'inline'
      }
    }, 1000)
  }

  // Wire send button
  sendBtn.addEventListener('click', _sendOtp)
}

/**
 * Check if an email has been OTP-verified via injectOtpWidget
 */
export function isEmailVerified(email) {
  return _verifiedEmails.get((email || '').trim().toLowerCase()) === true
}

/**
 * Manually mark an email as verified (for edit mode where email unchanged)
 */
export function markEmailVerified(email) {
  if (email) _verifiedEmails.set(email.trim().toLowerCase(), true)
}

/**
 * Clear verification for an email
 */
export function clearEmailVerified(email) {
  if (email) _verifiedEmails.delete(email.trim().toLowerCase())
}

/* ── LEGACY STUBS (kept for backward compat with Courses.js) ── */
export function sendEmailOtp(email) {
  console.warn('sendEmailOtp stub — use injectOtpWidget instead')
  return Promise.resolve()
}

export function verifyEmailOtp(email, otp) {
  console.warn('verifyEmailOtp stub — use injectOtpWidget instead')
  markEmailVerified(email)
  return Promise.resolve(true)
}

export function isEmailOtpVerified(email) {
  return isEmailVerified(email)
}

export function clearOtpState(email) {
  clearEmailVerified(email)
}