// ============================================================
// shared.js — PDKV College v5 (Universal OTP Email Verification)
// OTP works for ANY email address entered anywhere on the site.
// Exported: showOtpModal(email, onVerified) — reusable across all pages.
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
      btn.innerHTML = show ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'
      btn.title = show ? 'Hide password' : 'Show password'
    })
  })
}

/* ================================================================
   UNIVERSAL OTP SYSTEM
   Works for ANY email address on any page.
   Uses Supabase signInWithOtp which sends to the actual entered email.
   ================================================================ */

/* ── OTP CSS (injected once) ─────────────────────────────────── */
function _injectOtpStyles() {
  if (document.getElementById('_pdkv_otp_styles')) return
  const style = document.createElement('style')
  style.id = '_pdkv_otp_styles'
  style.textContent = `
    #_otpModalOverlay {
      display:none;
      position:fixed;inset:0;
      background:rgba(8,10,28,0.78);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      z-index:99999;
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    #_otpModalOverlay.otp-open { display:flex; }
    #_otpModalBox {
      background:white;
      border-radius:24px;
      box-shadow:0 32px 88px rgba(0,0,0,0.30);
      width:100%;
      max-width:460px;
      padding:0;
      overflow:hidden;
      animation:_otpModalIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    @keyframes _otpModalIn {
      from{opacity:0;transform:scale(0.84) translateY(28px);}
      to{opacity:1;transform:none;}
    }
    ._otp-header {
      background:linear-gradient(135deg,#1a237e,#3949ab);
      color:white;
      padding:22px 28px 18px;
      display:flex;
      align-items:center;
      justify-content:space-between;
    }
    ._otp-header h3 {
      font-family:'Poppins',sans-serif;
      font-size:1.08rem;
      font-weight:700;
      margin:0;
      display:flex;
      align-items:center;
      gap:9px;
    }
    ._otp-close-btn {
      width:32px;height:32px;border-radius:50%;
      background:rgba(255,255,255,0.18);
      border:none;color:white;cursor:pointer;
      font-size:1.1rem;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.25s ease;
      flex-shrink:0;
    }
    ._otp-close-btn:hover{background:rgba(255,255,255,0.32);}
    ._otp-body { padding:28px 28px 24px; }
    ._otp-step-dots {
      display:flex;align-items:center;justify-content:center;
      gap:8px;margin-bottom:22px;
    }
    ._otp-dot {
      width:9px;height:9px;border-radius:50%;
      background:#e5e7eb;
      transition:background 0.3s,transform 0.3s;
    }
    ._otp-dot.active{background:#4CAF50;transform:scale(1.35);}
    ._otp-dot.done{background:#2196F3;}
    ._otp-dot-line{width:30px;height:1.5px;background:#e5e7eb;transition:background 0.3s;}
    ._otp-dot-line.done{background:#2196F3;}
    ._otp-icon {
      width:66px;height:66px;border-radius:50%;
      background:linear-gradient(135deg,rgba(76,175,80,0.12),rgba(33,150,243,0.12));
      border:2px solid rgba(76,175,80,0.28);
      display:flex;align-items:center;justify-content:center;
      font-size:1.85rem;
      margin:0 auto 16px;
    }
    ._otp-email-chip {
      background:rgba(76,175,80,0.08);
      border:1px solid rgba(76,175,80,0.24);
      border-radius:10px;
      padding:10px 16px;
      font-size:0.86rem;
      color:#388E3C;
      font-weight:700;
      display:flex;align-items:center;gap:9px;
      margin-bottom:18px;
      word-break:break-all;
    }
    ._otp-label {
      text-align:center;
      font-size:0.78rem;
      font-weight:800;
      letter-spacing:0.06em;
      color:#374151;
      margin-bottom:6px;
      text-transform:uppercase;
    }
    ._otp-inputs {
      display:flex;gap:7px;justify-content:center;
      margin:10px 0 6px;
    }
    ._otp-digit {
      width:46px;height:54px;
      border:2px solid #e5e7eb;
      border-radius:10px;
      font-size:1.5rem;font-weight:800;
      text-align:center;
      font-family:'Poppins',monospace;
      color:#1a237e;
      background:white;
      outline:none;
      transition:border-color 0.2s,box-shadow 0.2s,transform 0.18s;
      caret-color:transparent;
    }
    ._otp-digit:focus {
      border-color:#4CAF50;
      box-shadow:0 0 0 4px rgba(76,175,80,0.14);
      transform:scale(1.07);
    }
    ._otp-digit.filled {border-color:#2196F3;background:rgba(33,150,243,0.05);color:#1565C0;}
    ._otp-digit.otp-err {
      border-color:#f44336;background:rgba(244,67,54,0.05);color:#c62828;
      animation:_otpShake 0.38s ease;
    }
    @keyframes _otpShake{0%,100%{transform:translateX(0);}20%{transform:translateX(-5px);}40%{transform:translateX(5px);}60%{transform:translateX(-3px);}80%{transform:translateX(3px);}};
    ._otp-err-msg {
      display:none;text-align:center;
      color:#f44336;font-size:0.82rem;font-weight:700;
      margin-top:8px;min-height:20px;
    }
    ._otp-verify-btn {
      width:100%;padding:13px;margin-top:16px;
      background:linear-gradient(135deg,#4CAF50,#388E3C);
      color:white;border:none;border-radius:50px;
      font-size:0.92rem;font-weight:700;
      font-family:'Plus Jakarta Sans','Inter',sans-serif;
      cursor:pointer;
      transition:all 0.32s cubic-bezier(0.34,1.56,0.64,1);
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    ._otp-verify-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(76,175,80,0.38);}
    ._otp-verify-btn:disabled{opacity:0.55;cursor:not-allowed;transform:none;}
    ._otp-resend-row {
      text-align:center;margin-top:14px;
      font-size:0.82rem;color:#6b7280;
    }
    ._otp-resend-link {
      background:none;border:none;
      color:#2196F3;font-size:0.82rem;font-weight:700;
      cursor:pointer;font-family:inherit;
      text-decoration:underline;padding:0;
    }
    ._otp-resend-link:disabled{color:#6b7280;text-decoration:none;cursor:default;}
    ._otp-hint {
      font-size:0.76rem;color:#9ca3af;text-align:center;
      line-height:1.58;margin-top:10px;
    }
    ._otp-back-link {
      display:flex;align-items:center;justify-content:center;gap:6px;
      background:none;border:none;
      color:#9ca3af;font-size:0.81rem;font-weight:700;
      cursor:pointer;font-family:inherit;
      margin-top:12px;width:100%;padding:6px 0;
      transition:color 0.2s;
    }
    ._otp-back-link:hover{color:#1a237e;}
    ._otp-success-wrap{text-align:center;padding:8px 0 4px;}
    ._otp-success-icon{font-size:3.2rem;display:block;margin-bottom:12px;
      animation:_otpBounce 0.6s cubic-bezier(0.34,1.56,0.64,1);}
    @keyframes _otpBounce{from{transform:scale(0) rotate(-20deg);}to{transform:scale(1) rotate(0);}}
    ._otp-success-title{font-family:'Poppins',sans-serif;font-size:1.2rem;font-weight:800;color:#388E3C;margin-bottom:8px;}
    ._otp-success-sub{font-size:0.88rem;color:#6b7280;line-height:1.65;}
    /* Email verified badge shown next to email inputs */
    ._email-verified-badge {
      display:inline-flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:50px;
      background:rgba(76,175,80,0.12);
      border:1px solid rgba(76,175,80,0.28);
      color:#388E3C;font-size:0.75rem;font-weight:800;
      margin-left:8px;vertical-align:middle;
      animation:_badgeIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes _badgeIn{from{opacity:0;transform:scale(0.7);}to{opacity:1;transform:scale(1);}}
    ._verify-email-btn {
      display:inline-flex;align-items:center;gap:6px;
      padding:7px 14px;border-radius:50px;
      background:linear-gradient(135deg,#1a237e,#3949ab);
      color:white;border:none;font-size:0.78rem;font-weight:700;
      cursor:pointer;margin-top:7px;
      font-family:'Plus Jakarta Sans','Inter',sans-serif;
      transition:all 0.28s cubic-bezier(0.34,1.56,0.64,1);
      white-space:nowrap;
    }
    ._verify-email-btn:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(26,35,126,0.32);}
    ._verify-email-btn:disabled{opacity:0.52;cursor:not-allowed;transform:none;}
    @media(max-width:480px){
      ._otp-digit{width:36px;height:46px;font-size:1.2rem;border-radius:8px;}
      ._otp-inputs{gap:4px;}
      #_otpModalBox{border-radius:18px;}
      ._otp-body{padding:22px 18px 20px;}
    }
  `
  document.head.appendChild(style)
}

/* ── OTP MODAL DOM (injected once) ───────────────────────────── */
function _injectOtpModal() {
  if (document.getElementById('_otpModalOverlay')) return
  const div = document.createElement('div')
  div.id = '_otpModalOverlay'
  div.setAttribute('role', 'dialog')
  div.setAttribute('aria-modal', 'true')
  div.innerHTML = `<div id="_otpModalBox"><div id="_otpModalContent"></div></div>`
  document.body.appendChild(div)
  // Close on backdrop click
  div.addEventListener('click', (e) => {
    if (e.target === div) _otpModalClose()
  })
}

/* ── OTP STATE ───────────────────────────────────────────────── */
const _otp = {
  email:         '',
  onVerified:    null,   // callback(email) when OTP verified
  onClose:       null,   // callback() when modal closed without verifying
  resendTimer:   null,
  resendSecs:    0,
  verifiedEmails: new Set()  // cache verified emails for session
}

/* ── OPEN OTP MODAL ──────────────────────────────────────────── */
/**
 * showOtpModal(email, onVerified, onClose)
 * Call this from any page to verify an email via OTP.
 * - email: the email address to verify
 * - onVerified: async callback(email) called after successful OTP verification
 * - onClose: optional callback if user closes without verifying
 */
export async function showOtpModal(email, onVerified, onClose = null) {
  _injectOtpStyles()
  _injectOtpModal()

  const clean = (email || '').trim().toLowerCase()
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    showToast('Please enter a valid email address first.', 'warning')
    return
  }

  // If already verified in this session, skip OTP
  if (_otp.verifiedEmails.has(clean)) {
    if (typeof onVerified === 'function') await onVerified(clean)
    return
  }

  _otp.email      = clean
  _otp.onVerified = onVerified
  _otp.onClose    = onClose

  // Show modal
  const overlay = document.getElementById('_otpModalOverlay')
  overlay.classList.add('otp-open')
  document.body.style.overflow = 'hidden'

  // Send OTP immediately
  await _otpSendCode(clean, true)
}

/* ── SEND OTP CODE ───────────────────────────────────────────── */
async function _otpSendCode(email, isFirst = false) {
  _renderOtpLoading(email, isFirst)

  // Use Supabase signInWithOtp — works for ANY email address
  // shouldCreateUser:true ensures new emails work too
  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo:  window.location.origin,
      data: { source: 'pdkv_otp_verification' }
    }
  })

  if (error) {
    _renderOtpEntry(email)
    showToast('Could not send OTP: ' + error.message, 'error')
    return
  }

  _renderOtpEntry(email)
  if (!isFirst) showToast('New verification code sent! Check your inbox 📬', 'success', 4000)
}

/* ── RENDER: LOADING ─────────────────────────────────────────── */
function _renderOtpLoading(email, isFirst) {
  const content = document.getElementById('_otpModalContent')
  if (!content) return
  const short = _shortEmail(email)
  content.innerHTML = `
    <div class="_otp-header">
      <h3><i class="fas fa-shield-alt"></i> Email Verification</h3>
    </div>
    <div class="_otp-body" style="text-align:center;padding-top:36px;padding-bottom:36px;">
      <div style="font-size:2.8rem;margin-bottom:16px;">✉️</div>
      <p style="font-size:0.95rem;color:#374151;font-weight:600;margin-bottom:8px;">
        ${isFirst ? 'Sending verification code to' : 'Resending to'}
      </p>
      <p style="font-size:0.88rem;color:#2196F3;font-weight:700;word-break:break-all;">${short}</p>
      <div style="margin-top:20px;">
        <div style="
          width:36px;height:36px;border-radius:50%;
          border:4px solid rgba(76,175,80,0.14);
          border-top-color:#4CAF50;
          animation:_otpSpin 0.8s linear infinite;
          margin:0 auto;
        "></div>
      </div>
      <style>@keyframes _otpSpin{to{transform:rotate(360deg);}}</style>
    </div>`
}

/* ── RENDER: OTP ENTRY ───────────────────────────────────────── */
function _renderOtpEntry(email) {
  const content = document.getElementById('_otpModalContent')
  if (!content) return
  const short = _shortEmail(email)

  content.innerHTML = `
    <div class="_otp-header">
      <h3><i class="fas fa-shield-alt"></i> Email Verification</h3>
      <button class="_otp-close-btn" onclick="window._otpClose()" title="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="_otp-body">
      <div class="_otp-step-dots">
        <div class="_otp-dot done"></div>
        <div class="_otp-dot-line done"></div>
        <div class="_otp-dot active"></div>
      </div>

      <div class="_otp-icon">✉️</div>

      <p style="text-align:center;font-weight:700;color:#1a237e;font-size:1rem;margin-bottom:6px;">
        Check your email inbox!
      </p>
      <p style="text-align:center;color:#6b7280;font-size:0.85rem;margin-bottom:14px;line-height:1.6;">
        We sent a <strong>6-digit code</strong> to:
      </p>

      <div class="_otp-email-chip">
        <i class="fas fa-envelope" style="color:#4CAF50;flex-shrink:0;font-size:0.9rem;"></i>
        <span>${short}</span>
      </div>

      <div class="_otp-label">Enter verification code</div>

      <div class="_otp-inputs" id="_otpInputsRow">
        ${Array.from({length:6}, (_,i) => `
          <input type="text" inputmode="numeric" maxlength="1"
                 class="_otp-digit" id="_odig${i}"
                 autocomplete="${i===0?'one-time-code':'off'}"
                 aria-label="OTP digit ${i+1}"/>`).join('')}
      </div>

      <div class="_otp-err-msg" id="_otpErrMsg"></div>

      <button class="_otp-verify-btn" id="_otpVerifyBtn" onclick="window._otpVerify()">
        <i class="fas fa-check-circle"></i> Verify Code
      </button>

      <div class="_otp-resend-row">
        <span id="_otpResendText">Resend in </span><strong id="_otpResendCount">60</strong><span id="_otpResendSuffix">s</span>
        <button class="_otp-resend-link" id="_otpResendBtn" style="display:none;" onclick="window._otpResend()">
          Resend Code
        </button>
      </div>

      <p class="_otp-hint">
        <i class="fas fa-info-circle"></i>
        Not in inbox? Check your <strong>spam / junk</strong> folder.<br>
        Code expires in <strong>10 minutes</strong>.
      </p>

      <button class="_otp-back-link" onclick="window._otpClose()">
        <i class="fas fa-arrow-left"></i> Cancel verification
      </button>
    </div>`

  _bindOtpDigits()
  _startOtpResendTimer(60)
  setTimeout(() => document.getElementById('_odig0')?.focus(), 80)
}

/* ── RENDER: SUCCESS ─────────────────────────────────────────── */
function _renderOtpSuccess(email) {
  const content = document.getElementById('_otpModalContent')
  if (!content) return
  const short = _shortEmail(email)
  content.innerHTML = `
    <div class="_otp-header">
      <h3><i class="fas fa-shield-alt"></i> Email Verified</h3>
    </div>
    <div class="_otp-body">
      <div class="_otp-success-wrap">
        <span class="_otp-success-icon">✅</span>
        <div class="_otp-success-title">Email Verified!</div>
        <p class="_otp-success-sub">
          <strong>${short}</strong> has been successfully verified.<br>
          Proceeding with your request…
        </p>
      </div>
    </div>`
}

/* ── BIND OTP DIGIT INPUTS ───────────────────────────────────── */
function _bindOtpDigits() {
  const digs = Array.from({length:6}, (_,i) => document.getElementById('_odig' + i))

  digs.forEach((inp, idx) => {
    if (!inp) return

    inp.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g,'').slice(0,1)
      e.target.value = v
      e.target.classList.toggle('filled', v.length > 0)
      _clearOtpErr()
      if (v && idx < 5) digs[idx+1]?.focus()
      if (_getOtpVal(digs).length === 6) window._otpVerify()
    })

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!e.target.value && idx > 0) {
          digs[idx-1].value = ''
          digs[idx-1].classList.remove('filled')
          digs[idx-1].focus()
        } else {
          e.target.value = ''
          e.target.classList.remove('filled')
        }
        _clearOtpErr()
      }
      if (e.key === 'ArrowLeft'  && idx > 0) { e.preventDefault(); digs[idx-1].focus() }
      if (e.key === 'ArrowRight' && idx < 5) { e.preventDefault(); digs[idx+1].focus() }
      if (e.key === 'Enter') window._otpVerify()
    })

    inp.addEventListener('paste', (e) => {
      e.preventDefault()
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g,'')
      pasted.slice(0,6).split('').forEach((ch, i) => {
        if (digs[i]) { digs[i].value = ch; digs[i].classList.add('filled') }
      })
      const nextEmpty = digs.findIndex(d => !d.value)
      digs[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
      if (_getOtpVal(digs).length === 6) window._otpVerify()
    })
  })
}

function _getOtpVal(digs) {
  return digs.map(d => d ? d.value : '').join('')
}

function _showOtpErr(msg) {
  const el = document.getElementById('_otpErrMsg')
  if (el) { el.textContent = msg; el.style.display = 'block' }
  Array.from({length:6}, (_,i) => document.getElementById('_odig'+i)).forEach(d => {
    if (!d) return
    d.classList.add('otp-err')
    setTimeout(() => d.classList.remove('otp-err'), 700)
  })
}

function _clearOtpErr() {
  const el = document.getElementById('_otpErrMsg')
  if (el) el.style.display = 'none'
}

/* ── RESEND TIMER ────────────────────────────────────────────── */
function _startOtpResendTimer(secs) {
  _otp.resendSecs = secs
  if (_otp.resendTimer) clearInterval(_otp.resendTimer)

  const countEl = document.getElementById('_otpResendCount')
  const textEl  = document.getElementById('_otpResendText')
  const sufEl   = document.getElementById('_otpResendSuffix')
  const btnEl   = document.getElementById('_otpResendBtn')
  if (!countEl) return

  btnEl.style.display   = 'none'
  textEl.style.display  = 'inline'
  sufEl.style.display   = 'inline'
  countEl.style.display = 'inline'
  countEl.textContent   = secs

  _otp.resendTimer = setInterval(() => {
    _otp.resendSecs--
    if (countEl) countEl.textContent = _otp.resendSecs
    if (_otp.resendSecs <= 0) {
      clearInterval(_otp.resendTimer)
      if (textEl)  textEl.style.display  = 'none'
      if (sufEl)   sufEl.style.display   = 'none'
      if (countEl) countEl.style.display = 'none'
      if (btnEl)   btnEl.style.display   = 'inline'
    }
  }, 1000)
}

/* ── GLOBAL OTP ACTIONS (called from onclick) ────────────────── */
window._otpVerify = async () => {
  const digs = Array.from({length:6}, (_,i) => document.getElementById('_odig'+i))
  const code = _getOtpVal(digs)

  if (code.length < 6) {
    _showOtpErr('Please enter the complete 6-digit code.')
    return
  }

  const btn = document.getElementById('_otpVerifyBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…' }

  const { data, error } = await supabase.auth.verifyOtp({
    email: _otp.email,
    token: code,
    type:  'email'
  })

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify Code' }

  if (error) {
    _showOtpErr('Invalid or expired code. Please try again.')
    showToast('Wrong code — check and try again.', 'error')
    return
  }

  // Mark this email as verified for the session
  _otp.verifiedEmails.add(_otp.email)

  // Show success state briefly then close
  _renderOtpSuccess(_otp.email)

  if (_otp.resendTimer) clearInterval(_otp.resendTimer)

  // Call the onVerified callback
  const verifiedEmail = _otp.email
  const cb = _otp.onVerified

  setTimeout(async () => {
    _otpModalClose()
    if (typeof cb === 'function') {
      try { await cb(verifiedEmail) } catch(e) { console.error('OTP onVerified error:', e) }
    }
  }, 1200)
}

window._otpResend = async () => {
  await _otpSendCode(_otp.email, false)
}

window._otpClose = () => {
  _otpModalClose()
}

function _otpModalClose() {
  if (_otp.resendTimer) clearInterval(_otp.resendTimer)
  const overlay = document.getElementById('_otpModalOverlay')
  if (overlay) overlay.classList.remove('otp-open')
  document.body.style.overflow = ''
  const cb = _otp.onClose
  _otp.onVerified = null
  _otp.onClose    = null
  if (typeof cb === 'function') cb()
}

function _shortEmail(email) {
  if (!email) return ''
  if (email.length <= 32) return email
  const [local, domain] = email.split('@')
  return local.slice(0,10) + '…@' + domain
}

/* ── HELPER: Check if email is verified in current session ────── */
export function isEmailVerified(email) {
  return _otp.verifiedEmails.has((email || '').trim().toLowerCase())
}

/* ── HELPER: Mark email as verified externally (e.g. from Supabase session) ── */
export function markEmailVerified(email) {
  if (email) _otp.verifiedEmails.add(email.trim().toLowerCase())
}

/* ================================================================
   GLOBAL AUTH SYSTEM (uses the OTP modal above)
   ================================================================ */

let _currentUser  = null
let _userProfile  = null
const _authCbs    = []

export function onAuthChange(cb) { _authCbs.push(cb) }
function _notify() { _authCbs.forEach(cb => { try { cb(_currentUser, _userProfile) } catch(e){} }) }

export function getCurrentUser()  { return _currentUser }
export function getUserProfile()  { return _userProfile }

/* ── AUTH MODAL STATE ────────────────────────────────────────── */
const _authState = {
  mode:       'login',   // 'login' | 'signup'
  email:      '',
  signupData: null
}

/* ── INIT AUTH ───────────────────────────────────────────────── */
export async function initAuth() {
  _injectOtpStyles()
  _injectOtpModal()

  if (!document.getElementById('globalAuthModal')) {
    document.body.insertAdjacentHTML('beforeend', _authModalHTML())
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      _currentUser = session.user
      // Mark the logged-in user's email as already verified
      markEmailVerified(_currentUser.email)
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

  _wireAuthModal()
  updateHeaderAuthUI()
  _notify()

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      _currentUser = session.user
      markEmailVerified(_currentUser.email)
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

/* ── AUTH MODAL HTML ─────────────────────────────────────────── */
function _authModalHTML() {
  return `
  <div class="modal-overlay" id="globalAuthModal" role="dialog" aria-modal="true">
    <div class="modal-box" style="max-width:460px;">
      <div class="modal-header" id="_authModalHeader">
        <h3 id="_authModalTitle">My Account</h3>
        <button class="modal-close" aria-label="Close" id="_authClose">&times;</button>
      </div>
      <div class="modal-body" id="_authModalBody"></div>
    </div>
  </div>`
}

/* ── RENDER EMAIL STEP (auth modal) ──────────────────────────── */
function _renderAuthEmailStep(mode) {
  _authState.mode = mode

  const isLogin = mode === 'login'
  document.getElementById('_authModalTitle').textContent = isLogin ? 'Sign In' : 'Create Account'

  const signupFields = !isLogin ? `
    <div class="form-group">
      <label class="form-label"><i class="fas fa-user"></i> Full Name *</label>
      <input type="text" id="_aName" class="form-input" placeholder="Your full name" required autocomplete="name"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-id-card"></i> Register Number
        <span style="font-weight:400;opacity:0.55;font-size:0.76rem;">(optional)</span>
      </label>
      <input type="text" id="_aRegno" class="form-input" placeholder="e.g. 22CS0001"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-phone"></i> Phone *</label>
      <input type="tel" id="_aPhone" class="form-input" placeholder="+91 99999 99999" required autocomplete="tel"/>
    </div>
    <div class="form-group">
      <label class="form-label"><i class="fas fa-venus-mars"></i> Gender *</label>
      <select id="_aGender" class="form-select" required>
        <option value="">Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <hr style="margin:14px 0;border:none;border-top:1px solid var(--border);">` : ''

  const altMode = isLogin ? 'signup' : 'login'
  const altText = isLogin
    ? "Don't have an account? <strong>Create one</strong>"
    : "Already have an account? <strong>Sign In</strong>"

  document.getElementById('_authModalBody').innerHTML = `
    <p style="text-align:center;color:var(--text-muted);font-size:0.86rem;margin-bottom:18px;line-height:1.6;">
      ${isLogin
        ? 'Enter your email — we\'ll send a verification code to sign you in.'
        : 'Fill your details below. Your email will be verified via OTP.'}
    </p>
    <form id="_authForm" novalidate>
      ${signupFields}
      <div class="form-group">
        <label class="form-label"><i class="fas fa-envelope"></i> Email Address *</label>
        <input type="email" id="_aEmail" class="form-input"
               placeholder="your@email.com" required autocomplete="email"
               value="${_authState.email || ''}"/>
      </div>
      <button type="submit" class="btn btn-primary"
              style="width:100%;justify-content:center;margin-top:12px;" id="_authSubmitBtn">
        <i class="fas fa-paper-plane"></i> Send Verification Code
      </button>
    </form>
    <button type="button" style="
      display:block;width:100%;margin-top:14px;
      background:none;border:none;cursor:pointer;
      color:var(--text-muted);font-size:0.83rem;font-weight:600;
      font-family:var(--font-body);text-align:center;padding:6px 0;
    " id="_authSwitchBtn">${altText}</button>
    <p style="text-align:center;font-size:0.74rem;color:var(--text-light);margin-top:10px;line-height:1.5;">
      <i class="fas fa-shield-alt" style="color:var(--accent2);"></i>
      A secure OTP will be sent to verify your email address
    </p>`

  document.getElementById('_authForm').addEventListener('submit', _handleAuthFormSubmit)
  document.getElementById('_authSwitchBtn').addEventListener('click', () => {
    _authState.signupData = null
    _renderAuthEmailStep(altMode)
  })

  setTimeout(() => document.getElementById('_aEmail')?.focus(), 60)
}

/* ── HANDLE AUTH FORM SUBMIT ─────────────────────────────────── */
async function _handleAuthFormSubmit(e) {
  e.preventDefault()

  const email = (document.getElementById('_aEmail')?.value || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'warning')
    return
  }

  if (_authState.mode === 'signup') {
    const name   = (document.getElementById('_aName')?.value || '').trim()
    const phone  = (document.getElementById('_aPhone')?.value || '').trim()
    const gender = document.getElementById('_aGender')?.value || ''
    if (!name || !phone || !gender) {
      showToast('Please fill in all required fields.', 'warning')
      return
    }
    _authState.signupData = {
      name,
      phone,
      gender,
      regno: (document.getElementById('_aRegno')?.value || '').trim()
    }
  }

  _authState.email = email

  // Close the auth modal and show OTP modal
  closeModal('globalAuthModal')

  await showOtpModal(
    email,
    async (verifiedEmail) => {
      // OTP verified — now get the Supabase session and save profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        _currentUser = user
        await _saveAuthProfile(user, _authState.signupData)
        updateHeaderAuthUI()
        _notify()
      }
      const msg = _authState.mode === 'login' ? 'Welcome back! 👋' : 'Account created! Welcome 🎉'
      showToast(msg, 'success')
      _authState.signupData = null
    },
    () => {
      // User closed OTP without verifying — reopen auth modal
      openModal('globalAuthModal')
    }
  )
}

/* ── SAVE AUTH PROFILE ───────────────────────────────────────── */
async function _saveAuthProfile(user, signupData) {
  const { data: existing } = await supabase
    .from('login_information')
    .select('id, name, phone, gender, regno')
    .eq('id', user.id)
    .maybeSingle()

  const baseData = { id: user.id, email: user.email }

  if (signupData) {
    const payload = {
      ...baseData,
      name:   signupData.name,
      phone:  signupData.phone,
      gender: signupData.gender,
      regno:  signupData.regno || (existing?.regno || '')
    }
    const { data } = await supabase
      .from('login_information')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle()
    _userProfile = data || payload
  } else {
    if (!existing) {
      await supabase.from('login_information').upsert(baseData, { onConflict: 'id' })
    }
    _userProfile = existing || baseData
  }
}

/* ── WIRE AUTH MODAL ─────────────────────────────────────────── */
function _wireAuthModal() {
  document.getElementById('_authClose')?.addEventListener('click', () => {
    closeModal('globalAuthModal')
    _authState.signupData = null
  })
  document.getElementById('globalAuthModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'globalAuthModal') _authState.signupData = null
  })
}

/* ── OPEN AUTH MODAL ─────────────────────────────────────────── */
export function openAuthModal(mode = 'login') {
  _authState.signupData = null
  _authState.email      = ''
  _renderAuthEmailStep(mode)
  openModal('globalAuthModal')
}

/* ── UPDATE HEADER UI ────────────────────────────────────────── */
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

/* ── LOGOUT ──────────────────────────────────────────────────── */
export async function logoutUser() {
  try {
    await supabase.auth.signOut()
    showToast('Signed out successfully.', 'info')
  } catch(e) {
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
      !href || href.startsWith('http') || href.startsWith('#') ||
      href.startsWith('mailto:') || href.startsWith('tel:') ||
      href.startsWith('javascript:') || link.target === '_blank'
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
    .from(bucket).upload(storagePath, uploadFile, { upsert: true, contentType: uploadFile.type })
  URL.revokeObjectURL(localUrl)
  if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null }
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
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
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
  userId, fields, photoFile = null,
  photoBucket = 'image_files',
  photoPathFn = (id) => `avatars/${id}.jpg`,
  photoImgSelectors = [],
  onSuccess = null, onError = null
} = {}) {
  if (!userId) return false
  if (photoFile) {
    const path = photoPathFn(userId)
    const [photoUrl, { error: dbErr }] = await Promise.all([
      uploadProfilePhoto(photoFile, photoBucket, path, photoImgSelectors),
      supabase.from('login_information').upsert({ id: userId, ...fields })
    ])
    if (dbErr) { showToast('Save failed: ' + dbErr.message, 'error'); onError?.(dbErr); return false }
    if (photoUrl) {
      supabase.from('login_information').update({ photo_url: photoUrl }).eq('id', userId).catch(() => {})
    }
    onSuccess?.(photoUrl)
  } else {
    const { error } = await supabase.from('login_information').upsert({ id: userId, ...fields })
    if (error) { showToast('Save failed: ' + error.message, 'error'); onError?.(error); return false }
    onSuccess?.(null)
  }
  return true
}