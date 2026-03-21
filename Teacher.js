import { supabase } from './supabaseClient.js'
import {
  initStickyHeader, initHamburger, initScrollAnimations,
  initAuth, openAuthModal, logoutUser,
  getCurrentUser, getUserProfile, onAuthChange,
  initRipple, initPageTransitions, showToast
} from './shared.js'

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initScrollAnimations()
  initRipple()

  await initAuth()

  // Header auth buttons
  document.getElementById('headerLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout').forEach(btn => {
    btn.addEventListener('click', async () => { await logoutUser() })
  })

  // Page-level auth buttons
  document.getElementById('tch-loginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.getElementById('tch-signupBtn')?.addEventListener('click', () => openAuthModal('signup'))
  document.getElementById('tch-logoutBtn')?.addEventListener('click', async () => { await logoutUser() })
  document.getElementById('tch-editBtn')?.addEventListener('click', () => {
    showSection('regForm')
    populateEditForm()
  })

  // Form submit
  setupProfileForm()

  // React to auth changes (login / logout)
  onAuthChange(async (user) => {
    await handleAuthState(user)
  })

  // Initial state
  const user = getCurrentUser()
  await handleAuthState(user)
})

// ── AUTH STATE HANDLER ───────────────────────────────────────
async function handleAuthState(user) {
  if (!user) {
    showSection('notAuth')
    return
  }

  showSection('loading')

  // Look up teacher by email (linked to their account)
  const { data, error } = await supabase
    .from('teacher_information')
    .select('*')
    .eq('email', user.email)
    .maybeSingle()

  if (error) {
    showToast('Error loading profile: ' + error.message, 'error')
    showSection('notAuth')
    return
  }

  if (!data) {
    // Teacher not in DB — show registration form
    showSection('regForm')
    // Pre-fill email from auth
    const emailInput = document.getElementById('tc-email')
    if (emailInput) emailInput.value = user.email

    // Pre-fill name from auth profile if available
    const profile = getUserProfile()
    if (profile?.name) {
      const nameInput = document.getElementById('tc-name')
      if (nameInput) nameInput.value = profile.name
    }
  } else {
    // Found — render profile
    renderProfile(data)
    showSection('profile')
  }
}

// ── SECTION SWITCHER ─────────────────────────────────────────
function showSection(which) {
  const map = {
    notAuth: 'tch-notAuth',
    loading: 'tch-loading',
    regForm: 'tch-regForm',
    profile: 'tch-profile'
  }
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id)
    if (el) el.style.display = (key === which) ? 'block' : 'none'
  })
  // After showing regForm or profile, re-init animations
  if (which === 'regForm' || which === 'profile') {
    setTimeout(() => initScrollAnimations(), 80)
  }
}

// ── RENDER PROFILE ───────────────────────────────────────────
function renderProfile(data) {
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val || '—'
  }

  set('tp-name', data.name)
  set('tp-desig', data.designation)
  set('tp-dept', `Department of ${data.department}`)
  set('tp-email', data.email)
  set('tp-phone', data.phone)
  set('tp-gender', data.gender)
  set('tp-empid', data.employee_id || data.register_no)
  set('tp-spec', data.specialization)
  set('tp-address', data.address)

  // Joining date formatted
  const joiningEl = document.getElementById('tp-joining')
  if (joiningEl) {
    joiningEl.textContent = data.joining_date
      ? new Date(data.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
  }

  // Badges
  const regnoBadge = document.getElementById('tp-regno-badge')
  if (regnoBadge) regnoBadge.textContent = `Reg: ${data.register_no}`

  const qualBadge = document.getElementById('tp-qual-badge')
  if (qualBadge) qualBadge.textContent = data.qualification || 'Faculty'

  const expBadge = document.getElementById('tp-exp-badge')
  if (expBadge) expBadge.textContent = data.experience ? `${data.experience} Exp.` : 'Faculty'

  // Subjects chips
  const subjectsContainer = document.getElementById('tp-subjects')
  if (subjectsContainer) {
    if (data.subjects) {
      const subjects = data.subjects.split(',').map(s => s.trim()).filter(Boolean)
      subjectsContainer.innerHTML = subjects.map((s, i) => `
        <span class="tch-subj-chip" style="animation-delay:${i * 0.07}s;">
          <i class="fas fa-book"></i> ${s}
        </span>`).join('')
    } else {
      subjectsContainer.innerHTML = '<span style="color:var(--text-muted);font-size:0.9rem;">No subjects assigned yet.</span>'
    }
  }

  // Store data globally for edit
  window._teacherData = data
}

// ── POPULATE EDIT FORM ───────────────────────────────────────
function populateEditForm() {
  const data = window._teacherData
  if (!data) return

  const setVal = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.value = val || ''
  }

  setVal('tc-regno', data.register_no)
  setVal('tc-name', data.name)
  setVal('tc-email', data.email)
  setVal('tc-phone', data.phone)
  setVal('tc-gender', data.gender)
  setVal('tc-dept', data.department)
  setVal('tc-desig', data.designation)
  setVal('tc-qual', data.qualification)
  setVal('tc-exp', data.experience)
  setVal('tc-joining', data.joining_date)
  setVal('tc-empid', data.employee_id)
  setVal('tc-specialization', data.specialization)
  setVal('tc-subjects', data.subjects)
  setVal('tc-address', data.address)
}

// ── PROFILE FORM SUBMIT ──────────────────────────────────────
function setupProfileForm() {
  document.getElementById('teacherProfileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const user = getCurrentUser()
    if (!user) {
      showToast('Please sign in first.', 'error')
      return
    }

    const btn = document.getElementById('tc-submitBtn')
    if (btn) {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'
    }

    const getVal = id => document.getElementById(id)?.value?.trim() || null

    const regno    = getVal('tc-regno')
    const name     = getVal('tc-name')
    const email    = getVal('tc-email') || user.email
    const dept     = getVal('tc-dept')
    const desig    = getVal('tc-desig')
    const qual     = getVal('tc-qual')

    if (!regno || !name || !dept || !desig || !qual) {
      showToast('Please fill all required fields (*)', 'warning')
      if (btn) {
        btn.disabled = false
        btn.innerHTML = '<i class="fas fa-save"></i> Save My Profile'
      }
      return
    }

    const payload = {
      user_id:        user.id,
      register_no:    regno,
      name,
      email,
      phone:          getVal('tc-phone'),
      gender:         getVal('tc-gender'),
      department:     dept,
      designation:    desig,
      qualification:  qual,
      experience:     getVal('tc-exp'),
      joining_date:   getVal('tc-joining') || null,
      employee_id:    getVal('tc-empid'),
      specialization: getVal('tc-specialization'),
      subjects:       getVal('tc-subjects'),
      address:        getVal('tc-address')
    }

    const { data, error } = await supabase
      .from('teacher_information')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single()

    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-save"></i> Save My Profile'
    }

    if (error) {
      showToast('Failed to save profile: ' + error.message, 'error')
      return
    }

    showToast('Profile saved successfully! 🎉', 'success')
    renderProfile(data)
    showSection('profile')
  })
}