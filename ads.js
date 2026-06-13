// ============================================================
// ads.js — Floating Ads Widget (PDKV College)
// Fetches active ads from the Supabase "ads" table and shows
// a floating card on the right side of the Home page.
// ============================================================
import { supabase } from './supabaseClient.js'

const ROTATE_INTERVAL = 6000   // ms between ad rotations
const SHOW_DELAY      = 1200   // ms before the widget first appears
const SESSION_KEY     = 'pdkv_ads_dismissed'

let _ads          = []
let _currentIndex = 0
let _rotateTimer  = null

export async function initFloatingAds() {
  // Only show on the home page
  const isHome = document.body.dataset.page === 'home' ||
                  location.pathname === '/' ||
                  location.pathname.endsWith('index.html')
  if (!isHome) return

  // If user already dismissed this session, show only the small launcher
  const dismissed = sessionStorage.getItem(SESSION_KEY) === '1'

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) {
    console.warn('Ads load error:', error.message)
    return
  }

  const now = new Date()
  _ads = (data || []).filter(ad => {
    if (ad.ends_at && new Date(ad.ends_at) < now) return false
    if (ad.starts_at && new Date(ad.starts_at) > now) return false
    return true
  })

  if (!_ads.length) return

  injectMarkup()

  if (dismissed) {
    showLauncher()
  } else {
    setTimeout(() => showWidget(), SHOW_DELAY)
  }

  wireEvents()
  startRotation()
}

// ── MARKUP ──────────────────────────────────────────────────
function injectMarkup() {
  if (document.getElementById('adsFloatingWrap')) return

  const wrap = document.createElement('div')
  wrap.id = 'adsFloatingWrap'
  wrap.className = 'ads-floating-wrap'
  wrap.innerHTML = `
    <div class="ads-card" id="adsCard">
      <span class="ads-badge"><i class="fas fa-bullhorn"></i> Ad</span>
      <button class="ads-close-btn" id="adsCloseBtn" aria-label="Close ad" title="Close">
        <i class="fas fa-times"></i>
      </button>
      <div class="ads-img-wrap" id="adsImgWrap">
        <img id="adsImg" src="" alt="" loading="lazy" />
        <div class="ads-img-overlay"></div>
      </div>
      <div class="ads-body">
        <div class="ads-title" id="adsTitle"></div>
        <div class="ads-desc" id="adsDesc"></div>
        <button class="ads-cta-btn" id="adsCtaBtn">
          <span id="adsCtaText">Learn More</span> <i class="fas fa-arrow-right"></i>
        </button>
        <div class="ads-dots" id="adsDots"></div>
      </div>
    </div>`

  document.body.appendChild(wrap)

  const launcher = document.createElement('button')
  launcher.id = 'adsLauncher'
  launcher.className = 'ads-launcher'
  launcher.setAttribute('aria-label', 'Show offers')
  launcher.title = 'Show offers'
  launcher.innerHTML = '<i class="fas fa-gift"></i>'
  document.body.appendChild(launcher)
}

// ── RENDER CURRENT AD ───────────────────────────────────────
function renderAd(index) {
  const ad = _ads[index]
  if (!ad) return

  const imgEl   = document.getElementById('adsImg')
  const titleEl = document.getElementById('adsTitle')
  const descEl  = document.getElementById('adsDesc')
  const ctaText = document.getElementById('adsCtaText')

  if (imgEl) {
    imgEl.style.opacity = '0'
    setTimeout(() => {
      imgEl.src = ad.image_url || 'College_Image.png'
      imgEl.alt = ad.title || 'Advertisement'
      imgEl.onerror = () => { imgEl.src = 'College_Image.png' }
      imgEl.style.transition = 'opacity 0.35s ease'
      imgEl.style.opacity = '1'
    }, 120)
  }

  if (titleEl) titleEl.textContent = ad.title || ''
  if (descEl)  descEl.textContent  = ad.description || ''
  if (ctaText) ctaText.textContent = ad.button_text || 'Learn More'

  renderDots(index)
}

function renderDots(activeIndex) {
  const dotsEl = document.getElementById('adsDots')
  if (!dotsEl) return
  if (_ads.length <= 1) { dotsEl.innerHTML = ''; return }

  dotsEl.innerHTML = _ads.map((_, i) =>
    `<span class="ads-dot${i === activeIndex ? ' active' : ''}" data-idx="${i}"></span>`
  ).join('')

  dotsEl.querySelectorAll('.ads-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt(dot.dataset.idx)
      goToAd(idx)
      restartRotation()
    })
  })
}

// ── NAVIGATION ──────────────────────────────────────────────
function goToAd(index) {
  _currentIndex = ((index % _ads.length) + _ads.length) % _ads.length
  renderAd(_currentIndex)
}

function navigateToAd(ad) {
  if (!ad?.link_url) return
  // Supports relative links like "Courses.html#admission" or full URLs
  window.location.href = ad.link_url
}

// ── ROTATION ────────────────────────────────────────────────
function startRotation() {
  if (_ads.length <= 1) return
  stopRotation()
  _rotateTimer = setInterval(() => {
    goToAd(_currentIndex + 1)
  }, ROTATE_INTERVAL)
}

function stopRotation() {
  if (_rotateTimer) { clearInterval(_rotateTimer); _rotateTimer = null }
}

function restartRotation() {
  stopRotation()
  startRotation()
}

// ── SHOW / HIDE ─────────────────────────────────────────────
function showWidget() {
  renderAd(_currentIndex)
  const wrap     = document.getElementById('adsFloatingWrap')
  const launcher = document.getElementById('adsLauncher')
  if (launcher) launcher.classList.remove('show')
  if (wrap) {
    wrap.classList.remove('leaving')
    wrap.classList.add('show')
  }
}

function hideWidget({ remember = false } = {}) {
  const wrap = document.getElementById('adsFloatingWrap')
  if (!wrap) return
  wrap.classList.add('leaving')
  setTimeout(() => wrap.classList.remove('show'), 550)

  if (remember) {
    sessionStorage.setItem(SESSION_KEY, '1')
    showLauncher()
  }
}

function showLauncher() {
  const launcher = document.getElementById('adsLauncher')
  if (launcher) launcher.classList.add('show')
}

function hideLauncher() {
  const launcher = document.getElementById('adsLauncher')
  if (launcher) launcher.classList.remove('show')
}

// ── EVENTS ──────────────────────────────────────────────────
function wireEvents() {
  // Close button — dismiss for this session, show mini launcher
  document.getElementById('adsCloseBtn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    hideWidget({ remember: true })
  })

  // Click image -> go to ad's linked page
  document.getElementById('adsImgWrap')?.addEventListener('click', () => {
    navigateToAd(_ads[_currentIndex])
  })

  // Click CTA button -> go to ad's linked page
  document.getElementById('adsCtaBtn')?.addEventListener('click', () => {
    navigateToAd(_ads[_currentIndex])
  })

  // Click the title/card body also navigates (nice UX, optional)
  document.getElementById('adsTitle')?.addEventListener('click', () => {
    navigateToAd(_ads[_currentIndex])
  })
  document.getElementById('adsTitle')?.style && (document.getElementById('adsTitle').style.cursor = 'pointer')

  // Launcher reopens the widget
  document.getElementById('adsLauncher')?.addEventListener('click', () => {
    hideLauncher()
    showWidget()
    restartRotation()
  })

  // Pause rotation while hovering the card
  const card = document.getElementById('adsCard')
  card?.addEventListener('mouseenter', stopRotation)
  card?.addEventListener('mouseleave', startRotation)
}