import { initStickyHeader, initHamburger, initScrollAnimations, initCounters, initAuth, openAuthModal, logoutUser, updateHeaderAuthUI, initRipple, initTiltCards , initPageTransitions } from './shared.js'

document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initRipple()

  // Make hero elements visible immediately
  document.querySelectorAll('.hero-content .animate-fade-up').forEach(el => {
    el.classList.add('visible')
  })

  initScrollAnimations()
  initCounters()
  initTiltCards()

  // Typewriter for hero subtitle
  startTypewriter()

  // Particle canvas
  initParticles()

  await initAuth()

  document.getElementById('headerLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout').forEach(btn => {
    btn.addEventListener('click', async () => { await logoutUser() })
  })
})

// ── TYPEWRITER ────────────────────────────────────────────
function startTypewriter() {
  const el = document.getElementById('heroTypewriter')
  if (!el) return

  const phrases = [
    'Nurturing Innovation • Building Careers • Shaping Futures',
    'NAAC A+ • Anna University Affiliated • AICTE Approved',
    '14+ Years of Excellence • 65-Acre Campus • 2,452+ Students',
  ]

  let phraseIdx = 0
  let charIdx   = 0
  let deleting  = false
  let pauseTick = 0

  el.innerHTML = '<span class="typed-cursor"></span>'

  function tick() {
    const phrase = phrases[phraseIdx]

    if (pauseTick > 0) {
      pauseTick--
      setTimeout(tick, 60)
      return
    }

    if (!deleting && charIdx <= phrase.length) {
      el.innerHTML = phrase.slice(0, charIdx) + '<span class="typed-cursor"></span>'
      charIdx++
      if (charIdx > phrase.length) {
        pauseTick = 30  // pause at end
        deleting = true
      }
      setTimeout(tick, deleting ? 30 : 48)
    } else if (deleting && charIdx >= 0) {
      el.innerHTML = phrase.slice(0, charIdx) + '<span class="typed-cursor"></span>'
      charIdx--
      if (charIdx < 0) {
        deleting = false
        phraseIdx = (phraseIdx + 1) % phrases.length
        charIdx = 0
        pauseTick = 10
      }
      setTimeout(tick, 22)
    }
  }

  // Start after a short delay
  setTimeout(tick, 1200)
}

// ── PARTICLE CANVAS ───────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('heroParticles')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  let W, H, particles

  function resize() {
    W = canvas.width  = canvas.offsetWidth
    H = canvas.height = canvas.offsetHeight
  }

  function Particle() {
    this.reset = function() {
      this.x  = Math.random() * W
      this.y  = Math.random() * H
      this.r  = Math.random() * 2.2 + 0.5
      this.vx = (Math.random() - 0.5) * 0.4
      this.vy = (Math.random() - 0.5) * 0.4 - 0.2
      this.a  = Math.random() * 0.6 + 0.2
    }
    this.reset()
  }

  function init() {
    resize()
    particles = Array.from({ length: 90 }, () => new Particle())
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    particles.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${p.a})`
      ctx.fill()

      p.x += p.vx
      p.y += p.vy

      if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) p.reset()
    })
    requestAnimationFrame(draw)
  }

  init()
  draw()
  window.addEventListener('resize', () => { resize() })
}