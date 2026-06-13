// ============================================================
// floatingAd.js — Floating Ad Widget (Home Page only)
// Fetches active ads from Supabase table "ads" and shows the
// highest-priority one as a dismissible floating card.
//
// Table schema expected (see ads_table.sql):
//   id, title, description, image_url, link_url,
//   button_text, is_active, priority, starts_at, ends_at, created_at
// ============================================================
import { supabase } from './supabaseClient.js'

const DISMISS_KEY_PREFIX = 'pdkv_ad_dismissed_'   // sessionStorage key per ad id
const SHOW_DELAY_MS      = 1200                   // wait a bit after page load before showing

export async function initFloatingAd() {
  // Only run on the home page (index.html). If the container isn't present, do nothing.
  let container = document.getElementById('floatingAdContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'floatingAdContainer'
    document.body.appendChild(container)
  }

  let ad = null

  try {
    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Ads load error:', error.message)
      return
    }

    const candidates = (data || []).filter(a => {
      // Respect optional scheduling window
      if (a.starts_at && a.starts_at > nowIso) return false
      if (a.ends_at   && a.ends_at   < nowIso) return false
      // Skip ads the user already dismissed this session
      if (sessionStorage.getItem(DISMISS_KEY_PREFIX + a.id)) return false
      return true
    })

    ad = candidates[0] || null
  } catch (err) {
    console.warn('Ads fetch failed:', err)
    return
  }

  if (!ad) return

  renderAd(container, ad)
}

function renderAd(container, ad) {
  const title   = escHtml(ad.title || 'Check this out!')
  const desc    = ad.description ? escHtml(ad.description) : ''
  const btnText = escHtml(ad.button_text || 'Learn More')
  const img     = ad.image_url || ''
  const link    = ad.link_url || '/'

  // Determine if the link is external (different origin) -> open in new tab
  const isExternal = /^https?:\/\//i.test(link) && !link.includes(window.location.host)

  container.innerHTML = `
    <a class="float-ad" id="floatAdCard"
       href="${escAttr(link)}"
       ${isExternal ? 'target="_blank" rel="noopener"' : ''}
       aria-label="${title}">
      ${img ? `<img class="float-ad-img" src="${escAttr(img)}" alt="${title}" loading="lazy"
                onerror="this.style.display='none'" />` : ''}
      <div class="float-ad-body">
        <div class="float-ad-title">${title}</div>
        ${desc ? `<div class="float-ad-desc">${desc}</div>` : ''}
        <span class="float-ad-btn">${btnText} <i class="fas fa-arrow-right"></i></span>
      </div>
      <button class="float-ad-close" id="floatAdClose" aria-label="Close ad" type="button">
        <i class="fas fa-times"></i>
      </button>
    </a>`

  const card  = document.getElementById('floatAdCard')
  const close = document.getElementById('floatAdClose')

  // Animate in after a short delay
  setTimeout(() => card?.classList.add('show'), SHOW_DELAY_MS)

  // Close button: stop navigation, remember dismissal for this session, animate out
  close?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    sessionStorage.setItem(DISMISS_KEY_PREFIX + ad.id, '1')
    card?.classList.remove('show')
    card?.classList.add('hide')
    setTimeout(() => { container.innerHTML = '' }, 500)
  })
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;')
}