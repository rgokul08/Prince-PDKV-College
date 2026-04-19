// shared.js — PDKV College — v5 OTP Edition
// 8-digit OTP via Supabase Edge Functions + Resend email

import { supabase } from './supabaseClient.js'
import { injectSpeedInsights } from '@vercel/speed-insights'

injectSpeedInsights({ debug: false })

// ── CONSTANTS ─────────────────────────────────────────────────
const SUPABASE_URL      = 'https://zsuonqltlodkzrqlhsnm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdW9ucWx0bG9ka3pycWxoc25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODUwNzAsImV4cCI6MjA4OTE2MTA3MH0.Ea8xTDxxp6GaDfUNuByjkQaUcFxJPrdO1VrzG06cTH4'
const EDGE_BASE         = `${SUPABASE_URL}/functions/v1`

// In-memory OTP verification state { email → { verified: bool, timestamp: number } }
const _otpVerifiedMap = new Map()

// ── TOAST ─────────────────────────────────────────────────────
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

// ── OTP CORE API ───────────────────────────────────────────────
/**
 * Calls the send-otp Edge Function.
 * Returns: { success, fallback, dev_otp?, error? }
 */
export async function sendOtp(email) {
  try {
    const res = await fetch(`${EDGE_BASE}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: email.toLowerCase().trim(), action: 'send' }),
    })

    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || 'Failed to send OTP' }
    return data
  } catch (err) {
    console.error('sendOtp error:', err)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Calls the verify-otp Edge Function.
 * Returns: { success, email?, error?, attempts_remaining? }
 */
export async function verifyOtp(email, otp) {
  try {
    const res = await fetch(`${EDGE_BASE}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: email.toLowerCase().trim(), otp: otp.trim() }),
    })

    const data = await res.json()
    if (data.success) {
      _otpVerifiedMap.set(email.toLowerCase().trim(), { verified: true, timestamp: Date.now() })
    }
    return data
  } catch (err) {
    console.error('verifyOtp error:', err)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/** Check if email is verified in this session (within last 30 minutes) */
export function isOtpVerified(email) {
  const key    = email.toLowerCase().trim()
  const record = _otpVerifiedMap.get(key)
  if (!record || !record.verified) return false
  // Verification expires after 30 minutes
  if (Date.now() - record.timestamp > 30 * 60 * 1000) {
    _otpVerifiedMap.delete(key)
    return false
  }
  return true
}

export function clearOtpVerification(email) {
  _otpVerifiedMap.delete(email.toLowerCase().trim())
}

// Keep these exported for backward compat with Courses.js etc.
export { sendOtp as sendEmailOtp }
export function isEmailOtpVerified(email) { return isOtpVerified(email) }
export function clearOtpState(email) { clearOtpVerification(email) }
export async function verifyEmailOtp(email, token) { return verifyOtp(email, token) }

// ── OTP CSS ────────────────────────────────────────────────────
function _injectOtpStyles() {
  if (document.getElementById('pdkv-otp-styles')) return
  const style = document.createElement('style')
  style.id = 'pdkv-otp-styles'
  style.textContent = `
/* ── OTP Modal Overlay ──────────────────────────── */
#pdkv-otp-modal-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(8,10,46,0.76);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  opacity: 0; transition: opacity 0.28s ease;
  pointer-events: none;
}
#pdkv-otp-modal-overlay.otp-visible {
  opacity: 1; pointer-events: all;
}

#pdkv-otp-modal {
  background: #ffffff;
  border-radius: 28px;
  width: 100%; max-width: 460px;
  box-shadow: 0 32px 80px rgba(26,35,126,0.28), 0 8px 24px rgba(0,0,0,0.18);
  overflow: hidden;
  transform: scale(0.88) translateY(28px);
  transition: transform 0.42s cubic-bezier(0.34,1.56,0.64,1);
}
#pdkv-otp-modal-overlay.otp-visible #pdkv-otp-modal {
  transform: scale(1) translateY(0);
}

/* Header */
.otp-modal-hdr {
  background: linear-gradient(135deg, #1a237e 0%, #3949ab 55%, #4CAF50 100%);
  padding: 30px 32px 26px;
  text-align: center; color: white; position: relative;
}
.otp-modal-hdr-logo {
  width: 64px; height: 64px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.35);
  display: block; margin: 0 auto 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.otp-modal-hdr h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 1.25rem; font-weight: 800; margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.otp-modal-hdr p {
  font-size: 0.84rem; opacity: 0.82; margin: 0; line-height: 1.55;
}
.otp-modal-hdr p strong {
  background: rgba(255,255,255,0.18);
  padding: 1px 8px; border-radius: 50px;
  font-weight: 800;
}
.otp-modal-close-btn {
  position: absolute; top: 14px; right: 16px;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.25);
  color: white; cursor: pointer; font-size: 1.05rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.28s cubic-bezier(0.34,1.56,0.64,1);
}
.otp-modal-close-btn:hover {
  background: rgba(255,255,255,0.30);
  transform: rotate(90deg) scale(1.1);
}

/* Body */
.otp-modal-body { padding: 30px 32px 28px; }

/* Fallback dev notice */
.otp-dev-notice {
  background: linear-gradient(135deg, rgba(33,150,243,0.07), rgba(76,175,80,0.07));
  border: 1.5px solid rgba(33,150,243,0.22);
  border-radius: 14px; padding: 14px 16px;
  margin-bottom: 22px; font-size: 0.82rem; line-height: 1.6;
  color: #1565C0;
}
.otp-dev-notice strong {
  display: block; margin-bottom: 4px; font-size: 0.86rem;
  color: #0d47a1;
}
.otp-dev-otp-display {
  font-family: 'Courier New', monospace; font-size: 1.55rem;
  font-weight: 900; letter-spacing: 0.18em; color: #1a237e;
  text-align: center; display: block; margin-top: 8px;
  background: rgba(26,35,126,0.07); padding: 8px 16px;
  border-radius: 10px; border: 1.5px dashed rgba(26,35,126,0.25);
}

/* OTP digit inputs */
.otp-digits-wrap {
  display: flex; gap: 10px; justify-content: center;
  margin-bottom: 6px;
}
.otp-digit-input {
  width: 48px; height: 58px;
  border: 2px solid #e5e7eb; border-radius: 14px;
  background: #f8fafc; color: #1a237e;
  font-size: 1.5rem; font-weight: 900; text-align: center;
  font-family: 'Poppins', 'Courier New', monospace;
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
  outline: none; caret-color: #4CAF50;
}
.otp-digit-input:focus {
  border-color: #3949ab;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(57,73,171,0.12);
  transform: translateY(-3px) scale(1.06);
}
.otp-digit-input.otp-filled { border-color: #4CAF50; background: #f0fdf4; }
.otp-digit-input.otp-error {
  border-color: #f44336 !important; background: #fff5f5 !important;
  animation: otpShake 0.42s ease;
}
@keyframes otpShake {
  0%,100%{transform:translateX(0);}25%{transform:translateX(-7px);}75%{transform:translateX(7px);}
}

/* Timer & resend */
.otp-timer-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.8rem; color: #9ca3af; margin: 12px 0 18px;
}
.otp-countdown { font-weight: 700; color: #3949ab; }
.otp-resend-btn {
  background: none; border: 1px solid rgba(76,175,80,0.35);
  color: #388E3C; font-size: 0.8rem; font-weight: 700; cursor: pointer;
  padding: 4px 12px; border-radius: 50px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.25s ease; display: none;
}
.otp-resend-btn.otp-resend-visible { display: inline-flex; align-items: center; gap: 5px; }
.otp-resend-btn:hover { background: rgba(76,175,80,0.08); }
.otp-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Message area */
.otp-msg-area {
  text-align: center; font-size: 0.84rem; font-weight: 700;
  padding: 10px 14px; border-radius: 12px; margin-bottom: 16px;
  display: none;
}
.otp-msg-area.otp-msg-err {
  background: rgba(244,67,54,0.08); border: 1px solid rgba(244,67,54,0.25);
  color: #c62828;
}
.otp-msg-area.otp-msg-ok {
  background: rgba(76,175,80,0.09); border: 1px solid rgba(76,175,80,0.28);
  color: #2e7d32;
}

/* Verify button */
.otp-verify-btn {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #1a237e, #3949ab);
  color: white; border: none; border-radius: 50px;
  font-size: 0.96rem; font-weight: 800; cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 4px 18px rgba(26,35,126,0.32);
  display: flex; align-items: center; justify-content: center; gap: 9px;
}
.otp-verify-btn:hover:not(:disabled) {
  transform: translateY(-3px); box-shadow: 0 10px 32px rgba(26,35,126,0.44);
  background: linear-gradient(135deg, #0d1555, #283593);
}
.otp-verify-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* Progress dots */
.otp-progress-dots {
  display: flex; justify-content: center; gap: 6px; margin-top: 20px;
}
.otp-progress-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: #e5e7eb; transition: background 0.3s ease;
}
.otp-progress-dots span.otp-dot-filled { background: #4CAF50; }

/* ── Inline OTP trigger (email field row) */
.otp-email-field-wrap { display: flex; gap: 9px; align-items: stretch; }
.otp-email-field-wrap .form-input { flex: 1; min-width: 0; }
.otp-send-trigger-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 17px; border-radius: 12px;
  font-size: 0.81rem; font-weight: 700; white-space: nowrap;
  background: linear-gradient(135deg, #3949ab, #1a237e);
  color: white; border: none; cursor: pointer; flex-shrink: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.32s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 3px 12px rgba(26,35,126,0.28);
}
.otp-send-trigger-btn:hover:not(:disabled) {
  transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,35,126,0.4);
}
.otp-send-trigger-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.otp-send-trigger-btn.otp-trigger-verified {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
  box-shadow: 0 3px 12px rgba(76,175,80,0.3);
}

/* Verified chip below email */
.otp-verified-chip {
  display: none; align-items: center; gap: 6px;
  background: rgba(76,175,80,0.09); border: 1px solid rgba(76,175,80,0.28);
  color: #2e7d32; font-size: 0.78rem; font-weight: 700;
  padding: 5px 12px; border-radius: 50px; margin-top: 7px;
  animation: chipPop 0.42s cubic-bezier(0.34,1.56,0.64,1);
  width: fit-content;
}
@keyframes chipPop {
  from{transform:scale(0.75);opacity:0;} to{transform:scale(1);opacity:1;}
}
.otp-verified-chip.otp-chip-visible { display: inline-flex; }
.otp-not-verified-hint {
  font-size: 0.76rem; color: #9ca3af; margin-top: 5px;
  display: flex; align-items: center; gap: 5px;
}

/* ── Dark theme overrides (Student / Teacher portals) */
.tc-page .otp-digit-input,
body.dark-portal .otp-digit-input {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.12);
  color: #fff;
}
.tc-page .otp-digit-input:focus,
body.dark-portal .otp-digit-input:focus {
  background: rgba(245,158,11,0.07);
  border-color: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245,158,11,0.14);
}

/* ── Responsive */
@media (max-width: 480px) {
  .otp-digit-input { width: 38px; height: 48px; font-size: 1.2rem; }
  .otp-digits-wrap { gap: 7px; }
  .otp-modal-hdr, .otp-modal-body { padding-left: 20px; padding-right: 20px; }
}
`
  document.head.appendChild(style)
}

// ── OTP MODAL STATE ────────────────────────────────────────────
let _otpModalCallback = null
let _otpTimerInterval = null
let _otpCurrentEmail  = ''
let _otpDevFallback   = false
let _otpDevCode       = ''

function _buildOtpModal() {
  const overlay = document.createElement('div')
  overlay.id = 'pdkv-otp-modal-overlay'
  overlay.innerHTML = `
    <div id="pdkv-otp-modal" role="dialog" aria-modal="true" aria-label="Email Verification">
      <div class="otp-modal-hdr">
        <img src="https://yt3.googleusercontent.com/ytc/AIdro_k_qv60q5J-ADkI2QNCezEuT1zrK5KTSCIZMtIrhxphKU8=s900-c-k-c0x00ffffff-no-rj"
             alt="PDKV" class="otp-modal-hdr-logo" />
        <h3>📧 Verify Your Email</h3>
        <p>We sent an 8-digit code to<br><strong id="otp-email-display"></strong></p>
        <button class="otp-modal-close-btn" id="otp-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="otp-modal-body">
        <div class="otp-dev-notice" id="otp-dev-notice" style="display:none">
          <strong>🛠 Development Mode</strong>
          Email delivery is unavailable — use this code:
          <span class="otp-dev-otp-display" id="otp-dev-code-display"></span>
        </div>
        <div class="otp-digits-wrap" id="otp-digits-wrap">
          ${[0,1,2,3,4,5,6,7].map(i =>
            `<input class="otp-digit-input" id="otp-d${i}" type="text"
              inputmode="numeric" pattern="[0-9]" maxlength="1"
              autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
              aria-label="Digit ${i+1}" />`
          ).join('')}
        </div>
        <div class="otp-timer-row">
          <span class="otp-countdown" id="otp-countdown">Expires in 10:00</span>
          <button class="otp-resend-btn" id="otp-resend-btn" disabled>
            <i class="fas fa-redo-alt"></i> Resend
          </button>
        </div>
        <div class="otp-msg-area" id="otp-msg"></div>
        <button class="otp-verify-btn" id="otp-verify-btn">
          <i class="fas fa-shield-check"></i> Verify & Continue
        </button>
        <div class="otp-progress-dots">
          ${[0,1,2,3,4,5,6,7].map(i => `<span id="otp-dot-${i}"></span>`).join('')}
        </div>
      </div>
    </div>`

  document.body.appendChild(overlay)

  // Wire digit inputs
  const digits = () => [...document.querySelectorAll('.otp-digit-input')]

  overlay.querySelectorAll('.otp-digit-input').forEach((inp, idx) => {
    inp.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '')
      e.target.value = val ? val[0] : ''
      e.target.classList.toggle('otp-filled', !!val)
      e.target.classList.remove('otp-error')
      _updateDots(digits())
      if (val && idx < 7) digits()[idx + 1]?.focus()
    })
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) digits()[idx - 1]?.focus()
      if (e.key === 'Enter') _triggerVerify()
    })
    inp.addEventListener('paste', e => {
      e.preventDefault()
      const text = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 8)
      const ds   = digits()
      text.split('').forEach((ch, i) => {
        if (ds[i]) { ds[i].value = ch; ds[i].classList.add('otp-filled') }
      })
      _updateDots(ds)
      const next = ds.findIndex(d => !d.value)
      ;(next >= 0 ? ds[next] : ds[7])?.focus()
    })
  })

  document.getElementById('otp-verify-btn')?.addEventListener('click', _triggerVerify)
  document.getElementById('otp-resend-btn')?.addEventListener('click', _resendOtp)
  document.getElementById('otp-close-btn')?.addEventListener('click', () => {
    if (confirm('Close verification? Your action will be cancelled.')) _closeOtpModal()
  })

  // Close on backdrop
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      if (confirm('Close verification? Your action will be cancelled.')) _closeOtpModal()
    }
  })
}

function _updateDots(ds) {
  ds.forEach((d, i) => {
    document.getElementById(`otp-dot-${i}`)?.classList.toggle('otp-dot-filled', !!d.value)
  })
}

function _showOtpMsg(msg, type = 'err') {
  const el = document.getElementById('otp-msg')
  if (!el) return
  el.textContent = msg
  el.className   = `otp-msg-area otp-msg-${type}`
  el.style.display = 'block'
}

function _clearOtpMsg() {
  const el = document.getElementById('otp-msg')
  if (el) el.style.display = 'none'
}

function _getEnteredOtp() {
  return [...document.querySelectorAll('.otp-digit-input')]
    .map(d => d.value).join('')
}

function _startOtpTimer(seconds = 600) {
  clearInterval(_otpTimerInterval)
  let remaining = seconds
  const countEl  = document.getElementById('otp-countdown')
  const resendEl = document.getElementById('otp-resend-btn')

  const tick = () => {
    if (!countEl) return
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    countEl.textContent = `Expires in ${m}:${String(s).padStart(2,'0')}`
    if (remaining <= 60) countEl.style.color = '#f44336'
    if (remaining <= 0) {
      clearInterval(_otpTimerInterval)
      countEl.textContent = 'OTP expired'
      if (resendEl) {
        resendEl.disabled = false
        resendEl.classList.add('otp-resend-visible')
      }
      return
    }
    remaining--
  }

  tick()
  _otpTimerInterval = setInterval(tick, 1000)

  // Show resend after 60s
  setTimeout(() => {
    if (resendEl) {
      resendEl.disabled = false
      resendEl.classList.add('otp-resend-visible')
    }
  }, 60000)
}

async function _triggerVerify() {
  const enteredOtp = _getEnteredOtp()
  const btn        = document.getElementById('otp-verify-btn')
  const digits     = document.querySelectorAll('.otp-digit-input')

  _clearOtpMsg()

  if (enteredOtp.length < 8) {
    _showOtpMsg('Please enter all 8 digits of your OTP.')
    digits.forEach(d => { if (!d.value) d.classList.add('otp-error') })
    return
  }

  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…'

  // If dev fallback, verify locally
  let result
  if (_otpDevFallback && _otpDevCode) {
    if (enteredOtp === _otpDevCode) {
      result = { success: true, email: _otpCurrentEmail }
      _otpVerifiedMap.set(_otpCurrentEmail, { verified: true, timestamp: Date.now() })
    } else {
      result = { success: false, error: 'Incorrect OTP. Please try again.' }
    }
  } else {
    result = await verifyOtp(_otpCurrentEmail, enteredOtp)
  }

  btn.disabled = false
  btn.innerHTML = '<i class="fas fa-shield-check"></i> Verify & Continue'

  if (!result.success) {
    _showOtpMsg(result.error || 'Incorrect OTP. Please try again.')
    digits.forEach(d => d.classList.add('otp-error'))
    setTimeout(() => digits.forEach(d => d.classList.remove('otp-error')), 800)
    return
  }

  // SUCCESS
  clearInterval(_otpTimerInterval)
  _showOtpMsg('✅ Email verified successfully!', 'ok')
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Verified!'
  btn.style.background = 'linear-gradient(135deg,#4CAF50,#388E3C)'
  btn.style.boxShadow  = '0 4px 18px rgba(76,175,80,0.4)'

  setTimeout(() => {
    _closeOtpModal()
    if (_otpModalCallback) _otpModalCallback(result.email)
  }, 750)
}

async function _resendOtp() {
  const resendEl = document.getElementById('otp-resend-btn')
  if (resendEl) { resendEl.disabled = true; resendEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>' }

  _otpDevFallback = false
  _otpDevCode     = ''

  const result = await sendOtp(_otpCurrentEmail)
  if (result.success) {
    if (result.fallback) {
      _otpDevFallback = true
      _otpDevCode     = result.dev_otp || ''
      const devEl = document.getElementById('otp-dev-notice')
      const codeEl = document.getElementById('otp-dev-code-display')
      if (devEl)  devEl.style.display = 'block'
      if (codeEl) codeEl.textContent  = _otpDevCode
    }
    // Clear inputs
    document.querySelectorAll('.otp-digit-input').forEach(d => {
      d.value = ''; d.classList.remove('otp-filled','otp-error')
    })
    document.querySelectorAll('.otp-progress-dots span').forEach(d => d.classList.remove('otp-dot-filled'))
    document.getElementById('otp-countdown').style.color = '#3949ab'
    _clearOtpMsg()
    _startOtpTimer(600)
    showToast('New OTP sent!', 'success')
  } else {
    showToast(result.error || 'Failed to resend OTP', 'error')
  }

  if (resendEl) {
    resendEl.disabled = false
    resendEl.innerHTML = '<i class="fas fa-redo-alt"></i> Resend'
    resendEl.classList.remove('otp-resend-visible')
  }
}

function _closeOtpModal() {
  clearInterval(_otpTimerInterval)
  const overlay = document.getElementById('pdkv-otp-modal-overlay')
  if (overlay) {
    overlay.classList.remove('otp-visible')
    setTimeout(() => overlay.remove(), 300)
  }
  _otpModalCallback = null
}

/**
 * Open OTP modal for an email. Calls `onVerified(email)` when done.
 * If already verified and fresh, skips modal and calls onVerified immediately.
 */
export async function openOtpModal(email, onVerified) {
  _injectOtpStyles()

  const normalizedEmail = email.toLowerCase().trim()

  // Already verified? Skip modal.
  if (isOtpVerified(normalizedEmail)) {
    onVerified(normalizedEmail)
    return
  }

  // Send OTP first
  const sendBtn = document.getElementById(`otp-trigger-${CSS.escape(normalizedEmail)}`)
  if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…' }

  const result = await sendOtp(normalizedEmail)

  if (sendBtn) {
    sendBtn.disabled = false
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Sent ✓'
  }

  if (!result.success) {
    showToast(result.error || 'Failed to send OTP', 'error')
    return
  }

  _otpCurrentEmail  = normalizedEmail
  _otpModalCallback = onVerified
  _otpDevFallback   = result.fallback || false
  _otpDevCode       = result.dev_otp  || ''

  // Remove any existing modal
  document.getElementById('pdkv-otp-modal-overlay')?.remove()
  _buildOtpModal()

  // Set email display
  const emailEl = document.getElementById('otp-email-display')
  if (emailEl) emailEl.textContent = normalizedEmail

  // Show dev notice if fallback
  const devEl  = document.getElementById('otp-dev-notice')
  const codeEl = document.getElementById('otp-dev-code-display')
  if (_otpDevFallback) {
    if (devEl)  devEl.style.display = 'block'
    if (codeEl) codeEl.textContent  = _otpDevCode
  }

  // Open modal
  const overlay = document.getElementById('pdkv-otp-modal-overlay')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay?.classList.add('otp-visible'))
  })

  // Start timer & focus first digit
  _startOtpTimer(600)
  setTimeout(() => document.getElementById('otp-d0')?.focus(), 400)
}

// ── GLOBAL WINDOW HANDLERS for inline onclick ─────────────────
// Used by auth modal buttons (declared on window for dynamic HTML)
window.pdkvSendOtp = async function(emailInputId, wrapperId) {
  const emailInput = document.getElementById(emailInputId)
  const email      = emailInput?.value?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address first.', 'warning')
    emailInput?.focus()
    return
  }

  openOtpModal(email, (verifiedEmail) => {
    // Mark email field as verified in UI
    if (emailInput) { emailInput.readOnly = true; emailInput.classList.add('verified-email') }
    const triggerBtn = document.getElementById(wrapperId + '_sendBtn') ||
                       document.getElementById(`otp-trigger-${CSS.escape(email)}`)
    if (triggerBtn) {
      triggerBtn.innerHTML = '✓ Verified'
      triggerBtn.classList.add('otp-trigger-verified')
      triggerBtn.disabled = true
    }
    // Show verified chip
    const chip = document.getElementById(wrapperId + '_chip')
    if (chip) chip.classList.add('otp-chip-visible')
    // Dispatch event
    document.dispatchEvent(new CustomEvent('pdkv:emailVerified', {
      detail: { email: verifiedEmail, emailInputId, wrapperId }
    }))
  })
}

// Keep old names working
window.pdkvVerifyOtp  = () => {}
window.pdkvResendOtp  = () => {}

// ── STICKY HEADER + SCROLL PROGRESS + BACK-TO-TOP ─────────── */
export function initStickyHeader() {
  _injectOtpStyles()
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

// ── HAMBURGER ─────────────────────────────────────────────────
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

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })
}

// ── SCROLL ANIMATIONS ─────────────────────────────────────────
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

// ── COUNTER ───────────────────────────────────────────────────
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

// ── MODAL HELPERS ─────────────────────────────────────────────
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

// ── PASSWORD TOGGLE ───────────────────────────────────────────
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

// ── GLOBAL AUTH ───────────────────────────────────────────────
let _currentUser  = null
let _userProfile  = null
const _authCbs    = []

export function onAuthChange(cb) { _authCbs.push(cb) }
function _notify() { _authCbs.forEach(cb => { try { cb(_currentUser, _userProfile) } catch(e){} }) }

export function getCurrentUser()  { return _currentUser }
export function getUserProfile()  { return _userProfile }

export async function initAuth() {
  _injectOtpStyles()
  if (!document.getElementById('globalAuthModal')) {
    document.body.insertAdjacentHTML('beforeend', _authModalHTML())
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      _currentUser = session.user
      await _fetchProfile(_currentUser.id)
    }
  } catch(e) { console.warn('Auth session error:', e) }

  _wireAuthForms()
  updateHeaderAuthUI()
  _notify()

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      _currentUser = session.user
      await _fetchProfile(_currentUser.id)
    } else {
      _currentUser = null
      _userProfile = null
    }
    updateHeaderAuthUI()
    _notify()
  })
}

async function _fetchProfile(userId) {
  try {
    const { data } = await supabase
      .from('login_information')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    _userProfile = data || {}
  } catch { _userProfile = {} }
  updateHeaderAuthUI()
  _notify()
}

// ── AUTH MODAL HTML ───────────────────────────────────────────
function _authModalHTML() {
  return `
  <div class="modal-overlay" id="globalAuthModal" role="dialog" aria-modal="true">
    <div class="modal-box">
      <div class="modal-header">
        <h3>My Account</h3>
        <button class="modal-close" aria-label="Close" id="_authClose">&times;</button>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login"  id="loginTab">Sign In</button>
          <button class="auth-tab"        data-tab="signup" id="signupTab">Create Account</button>
        </div>

        <!-- ── SIGN IN PANEL ── -->
        <div class="auth-tab-panel active" id="loginPanel">
          <form id="globalLoginForm" novalidate>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-envelope"></i> Email</label>
              <div class="otp-email-field-wrap">
                <input type="email" id="loginEmail" class="form-input"
                  placeholder="your@email.com" required autocomplete="email"/>
                <button type="button" class="otp-send-trigger-btn" id="login_otp_sendBtn"
                  onclick="pdkvSendOtp('loginEmail','login_otp')">
                  <i class="fas fa-paper-plane"></i> Send OTP
                </button>
              </div>
              <span class="otp-not-verified-hint" id="login_otp_hint">
                <i class="fas fa-info-circle"></i> Verify your email with OTP first
              </span>
              <span class="otp-verified-chip" id="login_otp_chip">
                <i class="fas fa-check-circle"></i> Email Verified
              </span>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-lock"></i> Password</label>
              <div class="pw-toggle-wrap">
                <input type="password" id="loginPassword" class="form-input"
                  placeholder="••••••••" required autocomplete="current-password"/>
                <button type="button" class="pw-eye-btn" title="Show password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary"
              style="width:100%;justify-content:center;margin-top:12px;" id="loginSubmitBtn">
              <i class="fas fa-sign-in-alt"></i> Sign In
            </button>
          </form>
        </div>

        <!-- ── CREATE ACCOUNT PANEL ── -->
        <div class="auth-tab-panel" id="signupPanel">
          <form id="globalSignupForm" novalidate>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-user"></i> Full Name *</label>
              <input type="text" id="signupName" class="form-input"
                placeholder="Your full name" required/>
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="fas fa-id-card"></i> Register Number
                <span style="font-weight:400;opacity:.55;font-size:.75rem;">(optional)</span>
              </label>
              <input type="text" id="signupRegno" class="form-input" placeholder="e.g. 22CS0001"/>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-phone"></i> Phone *</label>
              <input type="tel" id="signupPhone" class="form-input"
                placeholder="+91 99999 99999" required/>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-venus-mars"></i> Gender *</label>
              <select id="signupGender" class="form-select" required>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-envelope"></i> Email *</label>
              <div class="otp-email-field-wrap">
                <input type="email" id="signupEmail" class="form-input"
                  placeholder="your@email.com" required autocomplete="email"/>
                <button type="button" class="otp-send-trigger-btn" id="signup_otp_sendBtn"
                  onclick="pdkvSendOtp('signupEmail','signup_otp')">
                  <i class="fas fa-paper-plane"></i> Send OTP
                </button>
              </div>
              <span class="otp-not-verified-hint" id="signup_otp_hint">
                <i class="fas fa-info-circle"></i> Verify your email with OTP first
              </span>
              <span class="otp-verified-chip" id="signup_otp_chip">
                <i class="fas fa-check-circle"></i> Email Verified
              </span>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-lock"></i> Password (min 6 chars) *</label>
              <div class="pw-toggle-wrap">
                <input type="password" id="signupPassword" class="form-input"
                  placeholder="••••••••" required minlength="6" autocomplete="new-password"/>
                <button type="button" class="pw-eye-btn" title="Show password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary"
              style="width:100%;justify-content:center;margin-top:12px;" id="signupSubmitBtn">
              <i class="fas fa-user-plus"></i> Create Account
            </button>
          </form>
        </div>

      </div>
    </div>
  </div>`
}

function _wireAuthForms() {
  document.getElementById('_authClose')
    ?.addEventListener('click', () => closeModal('globalAuthModal'))

  document.querySelectorAll('#globalAuthModal .auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#globalAuthModal .auth-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('#globalAuthModal .auth-tab-panel').forEach(p => p.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById(tab.dataset.tab + 'Panel')?.classList.add('active')
    })
  })

  initPasswordToggles(document.getElementById('globalAuthModal'))

  // Listen for OTP verified events to hide hints, show chips
  document.addEventListener('pdkv:emailVerified', (ev) => {
    const { wrapperId } = ev.detail
    const hint = document.getElementById(wrapperId + '_hint')
    if (hint) hint.style.display = 'none'
  })

  // ── SIGN IN ──────────────────────────────────────────────────
  document.getElementById('globalLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email    = document.getElementById('loginEmail')?.value.trim()
    const password = document.getElementById('loginPassword')?.value

    if (!email || !password) {
      showToast('Please enter your email and password.', 'warning'); return
    }

    // Require OTP verification
    if (!isOtpVerified(email)) {
      showToast('Please verify your email with OTP before signing in.', 'warning')
      const sendBtn = document.getElementById('login_otp_sendBtn')
      if (sendBtn) {
        sendBtn.style.boxShadow = '0 0 0 4px rgba(26,35,126,0.35)'
        setTimeout(() => sendBtn.style.boxShadow = '', 1200)
      }
      return
    }

    const btn = document.getElementById('loginSubmitBtn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…'

    // Try password sign-in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // If user doesn't exist, prompt to create account
      if (error.message.includes('Invalid login credentials')) {
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'
        showToast('No account found. Please create one or check your password.', 'error', 5000)
        return
      }
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'
      showToast(error.message, 'error')
      return
    }

    // Save last login
    if (data.user) {
      await supabase.from('login_information').upsert(
        { id: data.user.id, email, last_login: new Date().toISOString() },
        { onConflict: 'id' }
      )
    }

    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'
    showToast('Welcome back! 👋', 'success')
    closeModal('globalAuthModal')
    clearOtpVerification(email)
    document.getElementById('globalLoginForm').reset()
    _resetOtpFieldUI('login_otp', 'loginEmail')
  })

  // ── CREATE ACCOUNT ────────────────────────────────────────────
  document.getElementById('globalSignupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name     = document.getElementById('signupName')?.value.trim()
    const regno    = document.getElementById('signupRegno')?.value.trim() || ''
    const phone    = document.getElementById('signupPhone')?.value.trim()
    const gender   = document.getElementById('signupGender')?.value
    const email    = document.getElementById('signupEmail')?.value.trim()
    const password = document.getElementById('signupPassword')?.value

    if (!name || !phone || !gender || !email || !password) {
      showToast('Please fill all required fields.', 'warning'); return
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning'); return
    }
    if (!isOtpVerified(email)) {
      showToast('Please verify your email with OTP before creating an account.', 'warning')
      const sendBtn = document.getElementById('signup_otp_sendBtn')
      if (sendBtn) {
        sendBtn.style.boxShadow = '0 0 0 4px rgba(26,35,126,0.35)'
        setTimeout(() => sendBtn.style.boxShadow = '', 1200)
      }
      return
    }

    const btn = document.getElementById('signupSubmitBtn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account…'

    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account'
      showToast(error.message, 'error')
      return
    }

    const userId = data.user?.id

    // Save full profile to login_information
    if (userId) {
      await supabase.from('login_information').upsert({
        id:         userId,
        name,
        regno:      regno || null,
        phone,
        gender,
        email,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }, { onConflict: 'id' })
    }

    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account'

    showToast('Account created! Welcome to PDKV College 🎉', 'success', 5000)
    closeModal('globalAuthModal')
    clearOtpVerification(email)
    document.getElementById('globalSignupForm').reset()
    _resetOtpFieldUI('signup_otp', 'signupEmail')
  })
}

function _resetOtpFieldUI(wrapperId, emailInputId) {
  const emailInput = document.getElementById(emailInputId)
  if (emailInput) { emailInput.readOnly = false; emailInput.classList.remove('verified-email') }
  const sendBtn = document.getElementById(wrapperId + '_sendBtn')
  if (sendBtn) {
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'
    sendBtn.classList.remove('otp-trigger-verified')
    sendBtn.disabled = false
    sendBtn.style.boxShadow = ''
  }
  const chip = document.getElementById(wrapperId + '_chip')
  if (chip) chip.classList.remove('otp-chip-visible')
  const hint = document.getElementById(wrapperId + '_hint')
  if (hint) hint.style.display = 'flex'
}

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
      c.innerHTML = `<i class="fas fa-user-circle"></i> ${_escHtml(name)}${regno ? ' · ' + _escHtml(regno) : ''}`
    })
    logoutBtns.forEach(b => { b.style.display = 'inline-flex' })
  } else {
    authBtns.forEach(b  => { b.style.display = 'inline-flex' })
    userChips.forEach(c => { c.style.display = 'none' })
    logoutBtns.forEach(b => { b.style.display = 'none' })
  }
}

function _escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function openAuthModal(tab = 'login') {
  document.querySelectorAll('#globalAuthModal .auth-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('#globalAuthModal .auth-tab-panel').forEach(p => p.classList.remove('active'))
  if (tab === 'signup') {
    document.getElementById('signupTab')?.classList.add('active')
    document.getElementById('signupPanel')?.classList.add('active')
  } else {
    document.getElementById('loginTab')?.classList.add('active')
    document.getElementById('loginPanel')?.classList.add('active')
  }
  openModal('globalAuthModal')
}

export async function logoutUser() {
  try {
    await supabase.auth.signOut()
    showToast('Signed out successfully.', 'info')
  } catch (e) {
    showToast('Sign-out error: ' + e.message, 'error')
  }
}

// ── RIPPLE ────────────────────────────────────────────────────
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

// ── TILT CARDS ────────────────────────────────────────────────
export function initTiltCards(selector = '.fact-card, .qlink-card, .about-stat-card') {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)
      const dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)
      card.style.transform  = `translateY(-10px) rotateX(${-dy*4}deg) rotateY(${dx*4}deg) scale(1.02)`
      card.style.transition = 'transform 0.12s ease'
    })
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)'
      card.style.transform  = ''
    })
  })
}

// ── SKELETON NOTICES ──────────────────────────────────────────
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

// ── PAGE TRANSITIONS ──────────────────────────────────────────
export function initPageTransitions() {
  const overlay = document.getElementById('pageTransition')
  if (!overlay) return
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('#') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.startsWith('javascript:') || link.target === '_blank') return
    link.addEventListener('click', (e) => {
      e.preventDefault()
      overlay.classList.add('leaving')
      setTimeout(() => { window.location.href = href }, 265)
    })
  })
}

// ── UTILS ─────────────────────────────────────────────────────
export function formatNumber(n) { return Number(n).toLocaleString('en-IN') }

// ── UPLOAD PHOTO ──────────────────────────────────────────────
export async function uploadProfilePhoto(file, bucket, storagePath, imgSelectors = []) {
  if (!file) return null
  const localUrl = URL.createObjectURL(file)
  imgSelectors.forEach(sel =>
    document.querySelectorAll(sel).forEach(img => { img.src = localUrl })
  )

  let uploadFile = file
  if (file.size > 1_000_000 && file.type.startsWith('image/')) {
    try { uploadFile = await _compressImage(file, 800, 0.82) } catch (_) {}
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, uploadFile, { upsert: true, contentType: uploadFile.type })

  URL.revokeObjectURL(localUrl)

  if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  const finalUrl = `${publicUrl}?t=${Date.now()}`
  imgSelectors.forEach(sel =>
    document.querySelectorAll(sel).forEach(img => { img.src = finalUrl })
  )
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

// ── SAVE PROFILE ──────────────────────────────────────────────
export async function saveProfile({
  userId, fields,
  photoFile = null, photoBucket = 'image_files',
  photoPathFn = (id) => `avatars/${id}.jpg`,
  photoImgSelectors = [],
  onSuccess = null, onError = null
} = {}) {
  if (!userId) return false

  if (photoFile) {
    const path     = photoPathFn(userId)
    const photoUrl = await uploadProfilePhoto(photoFile, photoBucket, path, photoImgSelectors)
    const { error: dbErr } = await supabase
      .from('login_information')
      .upsert({ id: userId, ...fields })
    if (dbErr) { showToast('Save failed: ' + dbErr.message, 'error'); onError?.(dbErr); return false }
    if (photoUrl) {
      supabase.from('login_information').update({ photo_url: photoUrl }).eq('id', userId).catch(() => {})
    }
    onSuccess?.(photoUrl)
  } else {
    const { error } = await supabase
      .from('login_information')
      .upsert({ id: userId, ...fields })
    if (error) { showToast('Save failed: ' + error.message, 'error'); onError?.(error); return false }
    onSuccess?.(null)
  }
  return true
}

// ── buildOtpEmailField (compat for Courses.js injection) ──────
export function buildOtpEmailField(fieldId, otpWrapperId, label = 'Email *', placeholder = 'your@email.com') {
  return `
    <div class="form-group">
      <label class="form-label"><i class="fas fa-envelope"></i> ${label}</label>
      <div class="otp-email-field-wrap">
        <input type="email" id="${fieldId}" class="form-input" placeholder="${placeholder}" required autocomplete="email"/>
        <button type="button" class="otp-send-trigger-btn" id="${otpWrapperId}_sendBtn"
          onclick="pdkvSendOtp('${fieldId}','${otpWrapperId}')">
          <i class="fas fa-paper-plane"></i> Send OTP
        </button>
      </div>
      <span class="otp-not-verified-hint" id="${otpWrapperId}_hint">
        <i class="fas fa-info-circle"></i> Verify your email with OTP first
      </span>
      <span class="otp-verified-chip" id="${otpWrapperId}_chip">
        <i class="fas fa-check-circle"></i> Email Verified
      </span>
    </div>`
}