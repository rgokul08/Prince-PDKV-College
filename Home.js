import { supabase } from './supabaseClient.js'
import { initStickyHeader, initHamburger, initScrollAnimations, initCounters, initAuth, openAuthModal, logoutUser, updateHeaderAuthUI, initRipple, initTiltCards, initPageTransitions } from './shared.js'

document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initRipple()

  // Hero elements visible immediately
  document.querySelectorAll('.hero-content .animate-fade-up').forEach(el => {
    el.classList.add('visible')
  })

  initScrollAnimations()
  initCounters()
  initTiltCards()

  startTypewriter()
  initParticles()

  // Load gallery from Supabase
  await loadGallery()

  await initAuth()

  document.getElementById('headerLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout').forEach(btn => {
    btn.addEventListener('click', async () => { await logoutUser() })
  })
})

// ── GALLERY FROM SUPABASE ─────────────────────────────────
async function loadGallery() {
  const galleryGrid = document.getElementById('galleryGrid')
  if (!galleryGrid) return

  // Show skeleton loading
  galleryGrid.innerHTML = Array(8).fill(0).map(() => `
    <div class="gallery-item skeleton-gallery">
      <div class="skeleton" style="width:100%;height:100%;border-radius:var(--radius-md);"></div>
    </div>`).join('')

  try {
    // List all files in College_images folder
    const { data: files, error } = await supabase
      .storage
      .from('image_files')
      .list('College_images', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) throw error

    if (!files || files.length === 0) {
      // Fallback to default images if no files in bucket
      renderDefaultGallery(galleryGrid)
      return
    }

    // Filter only image and video files
    const mediaFiles = files.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return ['jpg','jpeg','png','gif','webp','svg','mp4','webm','mov'].includes(ext)
    })

    if (mediaFiles.length === 0) {
      renderDefaultGallery(galleryGrid)
      return
    }

    // Generate public URLs
    const mediaItems = mediaFiles.map(file => {
      const { data: { publicUrl } } = supabase
        .storage
        .from('image_files')
        .getPublicUrl(`College_images/${file.name}`)
      const ext = file.name.split('.').pop().toLowerCase()
      const isVideo = ['mp4','webm','mov'].includes(ext)
      return { url: publicUrl, name: file.name, isVideo }
    })

    renderGallery(galleryGrid, mediaItems)

    // Setup realtime-like polling (check for new uploads every 30s)
    setInterval(async () => {
      const { data: newFiles } = await supabase
        .storage
        .from('image_files')
        .list('College_images', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
      if (newFiles && newFiles.length !== mediaFiles.length) {
        const newMediaItems = newFiles
          .filter(f => {
            const ext = f.name.split('.').pop().toLowerCase()
            return ['jpg','jpeg','png','gif','webp','svg','mp4','webm','mov'].includes(ext)
          })
          .map(file => {
            const { data: { publicUrl } } = supabase.storage.from('image_files').getPublicUrl(`College_images/${file.name}`)
            const ext = file.name.split('.').pop().toLowerCase()
            const isVideo = ['mp4','webm','mov'].includes(ext)
            return { url: publicUrl, name: file.name, isVideo }
          })
        renderGallery(galleryGrid, newMediaItems)
      }
    }, 30000)

  } catch (err) {
    console.error('Gallery load error:', err)
    renderDefaultGallery(galleryGrid)
  }
}

function renderGallery(container, items) {
  container.innerHTML = items.map((item, i) => {
    if (item.isVideo) {
      return `
        <div class="gallery-item animate-fade-up" style="animation-delay:${i * 0.07}s;">
          <video autoplay muted loop playsinline class="gallery-video" style="width:100%;height:100%;object-fit:cover;">
            <source src="${item.url}" />
          </video>
          <div class="gallery-video-badge"><i class="fas fa-play-circle"></i></div>
        </div>`
    }
    return `
      <div class="gallery-item animate-fade-up" style="animation-delay:${i * 0.07}s;">
        <img src="${item.url}" alt="Campus - ${item.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80'" />
      </div>`
  }).join('')

  // Re-init scroll animations for new elements
  setTimeout(() => {
    document.querySelectorAll('#galleryGrid .animate-fade-up:not(.visible)').forEach(el => {
      el.classList.add('visible')
    })
  }, 100)
}

function renderDefaultGallery(container) {
  const defaultImages = [
    { url: 'https://www.princedrkvasudevan.com/image/img5.jpg', alt: 'Campus Building' },
    { url: 'https://www.princedrkvasudevan.com/image/img1.jpg', alt: 'Library' },
    { url: 'https://www.eduska.com/assets/user_photo/2621c4362ec6124fe7a6b731e5a23fb7.jpg', alt: 'Campus View' },
    { url: 'https://images.shiksha.com/mediadata/images/1504601387phpG5m3PE.jpeg', alt: 'Laboratory' },
    { url: 'https://www.princedrkvasudevan.com/image/img7.jpg', alt: 'Lab' },
    { url: 'https://www.princedrkvasudevan.com/image/img3.jpg', alt: 'Campus' },
    { url: 'https://images.shiksha.com/mediadata/images/1504601205phpnWD3OX.jpeg', alt: 'Lab Facilities' },
    { url: 'https://www.sikshapedia.com/public/data/colleges/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-tamil-nadu/8U_CA2spqD.webp', alt: 'College Campus' }
  ]

  container.innerHTML = defaultImages.map((img, i) => `
    <div class="gallery-item animate-fade-up" style="animation-delay:${i * 0.07}s;">
      <img src="${img.url}" alt="${img.alt}" loading="lazy" />
    </div>`).join('')

  setTimeout(() => {
    document.querySelectorAll('#galleryGrid .animate-fade-up:not(.visible)').forEach(el => {
      el.classList.add('visible')
    })
  }, 100)
}

// ── TYPEWRITER ────────────────────────────────────────────
function startTypewriter() {
  const el = document.getElementById('heroTypewriter')
  if (!el) return

  const phrases = [
    'Nurturing Innovation • Building Careers • Shaping Futures',
    'NAAC A+ • Anna University Affiliated • AICTE Approved',
    '14+ Years of Excellence • 65-Acre Campus • 2,452+ Students',
  ]

  let phraseIdx = 0, charIdx = 0, deleting = false, pauseTick = 0
  el.innerHTML = '<span class="typed-cursor"></span>'

  function tick() {
    const phrase = phrases[phraseIdx]
    if (pauseTick > 0) { pauseTick--; setTimeout(tick, 60); return }

    if (!deleting && charIdx <= phrase.length) {
      el.innerHTML = phrase.slice(0, charIdx) + '<span class="typed-cursor"></span>'
      charIdx++
      if (charIdx > phrase.length) { pauseTick = 30; deleting = true }
      setTimeout(tick, deleting ? 30 : 48)
    } else if (deleting && charIdx >= 0) {
      el.innerHTML = phrase.slice(0, charIdx) + '<span class="typed-cursor"></span>'
      charIdx--
      if (charIdx < 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; charIdx = 0; pauseTick = 10 }
      setTimeout(tick, 22)
    }
  }
  setTimeout(tick, 1200)
}

// ── PARTICLE CANVAS ───────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('heroParticles')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  let W, H, particles

  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight }

  function Particle() {
    this.reset = function() {
      this.x = Math.random() * W; this.y = Math.random() * H
      this.r = Math.random() * 2.2 + 0.5
      this.vx = (Math.random() - 0.5) * 0.4; this.vy = (Math.random() - 0.5) * 0.4 - 0.2
      this.a = Math.random() * 0.6 + 0.2
    }
    this.reset()
  }

  function init() { resize(); particles = Array.from({ length: 90 }, () => new Particle()) }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.fill()
      p.x += p.vx; p.y += p.vy
      if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) p.reset()
    })
    requestAnimationFrame(draw)
  }

  init(); draw()
  window.addEventListener('resize', resize)
}