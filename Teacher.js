import { supabase } from './supabaseClient.js'
import {
  initStickyHeader, initHamburger,
  showToast, initAuth, openAuthModal, logoutUser,
  initRipple, initPageTransitions, initPasswordToggles,
  injectOtpWidget, isEmailVerified, markEmailVerified
} from './shared.js'

const BUCKET   = 'image_files'
const TCH_FOLD = 'Teacher_images'
const SESS_KEY = 'pdkv_tc_regno'

const DEPTS = [
  'Computer Science & Engineering','Artificial Intelligence & Data Science',
  'Cyber Security','Electronics & Communication Engineering',
  'Electrical & Electronics Engineering','Mechanical Engineering',
  'Civil Engineering','Mathematics','Physics','Chemistry','English',
  'MBA','M.Tech CSE','M.Tech VLSI'
]
const DESIGS = [
  'Professor & Head','Professor','Associate Professor','Assistant Professor',
  'Senior Lecturer','Lecturer','Lab Instructor','Teaching Assistant'
]

let _regno     = null
let _profile   = null
let _stus      = []
let _rooms     = []
const _selStu  = new Set()
let _attSt     = {}
let _attStus   = []
let _roomsRtCh = null

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initRipple()

  const saved = sessionStorage.getItem(SESS_KEY)
  if (saved) {
    _regno = saved
    showSec('loading')
    await loadPortal(saved)
  } else {
    showSec('login')
  }

  document.getElementById('loginForm')?.addEventListener('submit', doLogin)
  document.getElementById('headerLoginBtn')
    ?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout')
    .forEach(b => b.addEventListener('click', () => logoutUser()))

  initAuth()
  initPasswordToggles(document.getElementById('secLogin'))
  initFU()

  // ── Global delegated click handler for ALL modal actions ──
  document.addEventListener('click', async e => {

    // Classroom card click (uses data-room-id attribute)
    const card = e.target.closest('.tc-cls-card[data-room-id]')
    if (card && !e.target.closest('button')) {
      const id = card.getAttribute('data-room-id')
      if (id) await openRoom(id)
      return
    }

    // Mark Attendance
    const markBtn = e.target.closest('[data-mark-att]')
    if (markBtn) { await openMarkAtt(markBtn.getAttribute('data-mark-att')); return }

    // Edit Room
    const editBtn = e.target.closest('[data-edit-room]')
    if (editBtn) { await openEditRoom(editBtn.getAttribute('data-edit-room')); return }

    // Delete Room (confirm)
    const delBtn = e.target.closest('[data-delete-room]')
    if (delBtn) { await confirmDeleteRoom(delBtn.getAttribute('data-delete-room')); return }

    // Delete confirm button
    const delConfirm = e.target.closest('[data-delete-confirm]')
    if (delConfirm) { await deleteRoom(delConfirm.getAttribute('data-delete-confirm')); return }

    // View Session
    const viewSessBtn = e.target.closest('[data-view-sess]')
    if (viewSessBtn) { await viewSess(viewSessBtn.getAttribute('data-view-sess')); return }

    // Save Attendance
    const saveAttBtn = e.target.closest('[data-save-att]')
    if (saveAttBtn) { await saveAtt(saveAttBtn.getAttribute('data-save-att')); return }

    // Mark Present
    const presBtn = e.target.closest('[data-mark-present]')
    if (presBtn) { markOne(presBtn.getAttribute('data-mark-present'), 'present'); return }

    // Mark Absent
    const absBtn = e.target.closest('[data-mark-absent]')
    if (absBtn) { markOne(absBtn.getAttribute('data-mark-absent'), 'absent'); return }

    // Save Edit Room
    const saveEditBtn = e.target.closest('[data-save-edit-room]')
    if (saveEditBtn) { await saveEditRoom(saveEditBtn.getAttribute('data-save-edit-room')); return }

    // Select-all dept button
    const sallBtn = e.target.closest('.tc-dp-sall[data-yr]')
    if (sallBtn) {
      const yr   = sallBtn.getAttribute('data-yr')
      const dEnc = sallBtn.getAttribute('data-dept')
      const d    = decodeURIComponent(dEnc)
      const stus = _stus.filter(s => s.department === d && String(s.year) === String(yr))
      const allSel = stus.every(s => _selStu.has(s.register_no))
      stus.forEach(s => allSel ? _selStu.delete(s.register_no) : _selStu.add(s.register_no))
      const q  = document.getElementById('stuSearch')?.value || ''
      const el = document.getElementById('stuList')
      if (el) el.innerHTML = stuSelHTML(grpStus(_stus), q)
      updSelCnt()
      return
    }

    // Student row toggle
    const stuRow = e.target.closest('.tc-sr[data-regno]')
    if (stuRow && !e.target.closest('.tc-dp-sall')) {
      const regno = stuRow.getAttribute('data-regno')
      if (regno) {
        _selStu.has(regno) ? _selStu.delete(regno) : _selStu.add(regno)
        stuRow.classList.toggle('sel', _selStu.has(regno))
        const chk = document.getElementById('ck-' + regno)
        if (chk) chk.textContent = _selStu.has(regno) ? '✓' : ''
        updSelCnt()
      }
    }
  })
})

function initFU() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        setTimeout(() => en.target.classList.add('v'), i * 72)
        obs.unobserve(en.target)
      }
    })
  }, { threshold: .07, rootMargin: '0px 0px -16px 0px' })
  document.querySelectorAll('.tu:not(.v)').forEach(el => obs.observe(el))
}

// ── SECTION SWITCHER ──────────────────────────────────────────
function showSec(id) {
  ;['login','loading','setup','profile'].forEach(s => {
    const key = 'sec' + s.charAt(0).toUpperCase() + s.slice(1)
    const el  = document.getElementById(key)
    if (el) el.style.display = (s === id) ? 'block' : 'none'
  })
  setTimeout(initFU, 75)
}

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day:'2-digit', month:'short', year:'numeric'
    })
  } catch { return d }
}

function sfx(n) { return { 1:'st', 2:'nd', 3:'rd', 4:'th' }[n] || 'th' }

// ── LOGIN ─────────────────────────────────────────────────────
async function doLogin(e) {
  e.preventDefault()
  const regno = document.getElementById('inRegno')?.value?.trim().toUpperCase()
  const pass  = document.getElementById('inPass')?.value
  if (!regno || !pass) {
    setMsg('Enter Register No. & Password', 'err')
    showToast('Enter Register No. & Password', 'warning')
    return
  }

  const btn = document.getElementById('loginBtn')
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In…'
  clearMsg()

  try {
    const [credRes, profileRes] = await Promise.all([
      supabase.from('teacher_credentials').select('password').eq('register_no', regno).maybeSingle(),
      supabase.from('teacher_information').select('*').ilike('register_no', regno).maybeSingle()
    ])

    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'

    if (credRes.error || !credRes.data) {
      setMsg('Register number not found. Contact admin.', 'err')
      showToast('Register number not found.', 'error')
      return
    }
    if (credRes.data.password !== pass) {
      setMsg('Incorrect password.', 'err')
      showToast('Incorrect password.', 'error')
      return
    }

    sessionStorage.setItem(SESS_KEY, regno)
    _regno = regno
    showToast(`Welcome, Teacher ${regno}!`, 'success')

    const t = profileRes.data || null
    if (!t) {
      showSec('setup')
      await renderSetup(regno, null)
    } else {
      _profile = t
      showSec('loading')
      await loadClassroomsAndStudents()
      showSec('profile')
      await renderProfile(t)
      setupRoomsRealtime()
    }
  } catch (err) {
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'
    showToast('Login error: ' + err.message, 'error')
  }
}

function setMsg(txt, tp) {
  const e = document.getElementById('loginMsg')
  if (!e) return
  e.className = `tc-msg tc-${tp}`
  e.innerHTML = `<i class="fas fa-${tp === 'err' ? 'exclamation-circle' : 'check-circle'}"></i> ${txt}`
  e.style.display = 'flex'
}

function clearMsg() {
  const e = document.getElementById('loginMsg')
  if (e) e.style.display = 'none'
}

window.tcLogout = () => {
  sessionStorage.removeItem(SESS_KEY)
  _regno = null; _profile = null; _rooms = []; _stus = []
  if (_roomsRtCh) { supabase.removeChannel(_roomsRtCh); _roomsRtCh = null }
  showSec('login')
  showToast('Logged out.', 'info')
}

// ── LOAD PORTAL ───────────────────────────────────────────────
async function loadPortal(regno) {
  showSec('loading')
  try {
    const { data: t, error } = await supabase
      .from('teacher_information').select('*').ilike('register_no', regno).maybeSingle()

    if (error) { showToast('Error loading profile: ' + error.message, 'error'); showSec('login'); return }

    if (!t) {
      showSec('setup')
      await renderSetup(regno, null)
    } else {
      _profile = t
      await loadClassroomsAndStudents()
      showSec('profile')
      await renderProfile(t)
      setupRoomsRealtime()
    }
  } catch (err) {
    showToast('Failed to load portal. Please try again.', 'error')
    showSec('login')
  }
}

// ── LOAD CLASSROOMS & STUDENTS ────────────────────────────────
async function loadClassroomsAndStudents() {
  try {
    const [sr, rr] = await Promise.all([
      supabase.from('student_information')
        .select('register_no,name,year,department')
        .order('year').order('department').order('name'),
      supabase.from('classrooms')
        .select('*')
        .order('created_at', { ascending: false })
    ])
    if (sr.error) console.error('Students load error:', sr.error)
    else _stus = sr.data || []
    if (rr.error) console.error('Classrooms load error:', rr.error)
    else _rooms = rr.data || []
  } catch (err) {
    console.error('loadClassroomsAndStudents error:', err)
    _stus = []; _rooms = []
  }
}

// ── FETCH ONE CLASSROOM — always fresh from Supabase ─────────
async function fetchRoom(id) {
  if (!id) return null
  const { data, error } = await supabase.from('classrooms').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  const idx = _rooms.findIndex(r => r.id === id)
  if (idx >= 0) _rooms[idx] = data
  else _rooms.unshift(data)
  return data
}

// ── IMAGE UPLOAD ──────────────────────────────────────────────
async function uploadTeacherImg(fileInputId, regno) {
  const inp = document.getElementById(fileInputId)
  const f   = inp?.files?.[0]
  if (!f) return null
  const ext  = (f.name.split('.').pop() || 'jpg').toLowerCase()
  const storagePath = `${TCH_FOLD}/${regno}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, f, { upsert: true, contentType: f.type })
  if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return publicUrl + '?t=' + Date.now()
}

async function findTeacherPhotoInBucket(regno) {
  try {
    const { data: files, error } = await supabase.storage.from(BUCKET).list(TCH_FOLD, { search: regno })
    if (!error && files && files.length > 0) {
      const match = files.find(f2 => f2.name && f2.name.startsWith(regno + '.'))
      if (match) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(`${TCH_FOLD}/${match.name}`)
        return publicUrl + '?t=' + Date.now()
      }
    }
  } catch (_) {}
  return null
}

function bindPrev(fId, wId, iId, rmId) {
  document.getElementById(fId)?.addEventListener('change', () => {
    const f = document.getElementById(fId)?.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => {
      const img  = document.getElementById(iId)
      const wrap = document.getElementById(wId)
      if (img)  img.src = ev.target.result
      if (wrap) wrap.classList.add('show')
    }
    r.readAsDataURL(f)
  })
  document.getElementById(rmId)?.addEventListener('click', () => {
    const fi   = document.getElementById(fId)
    const img  = document.getElementById(iId)
    const wrap = document.getElementById(wId)
    if (fi)   fi.value = ''
    if (img)  img.src  = ''
    if (wrap) wrap.classList.remove('show')
  })
}

// ── SETUP FORM ────────────────────────────────────────────────
async function renderSetup(regno, existingData) {
  if (existingData === undefined) {
    const { data } = await supabase.from('teacher_information').select('*').ilike('register_no', regno).maybeSingle()
    existingData = data || null
  }
  const isEdit = !!existingData
  const d      = existingData || {}
  const c      = document.getElementById('secSetup'); if (!c) return

  const dO  = DEPTS.map(dep  => `<option ${d.department  === dep  ? 'selected' : ''}>${esc(dep)}</option>`).join('')
  const dsO = DESIGS.map(des => `<option ${d.designation === des  ? 'selected' : ''}>${esc(des)}</option>`).join('')
  const gO  = ['Male','Female','Other'].map(g => `<option ${d.gender === g ? 'selected' : ''}>${g}</option>`).join('')

  c.innerHTML = `
  <div class="tc-wrap"><div class="tc-setup-outer">
    <div class="tc-setup-hdr">
      <div class="tc-setup-icon"><i class="fas fa-chalkboard-teacher"></i></div>
      <h2 class="tc-setup-h2">${isEdit ? 'Edit Your Profile' : 'Complete Your Profile'}</h2>
      <p class="tc-setup-sub">Hi <strong style="color:var(--tamb)">${esc(regno)}</strong>! ${isEdit ? 'Update your details below.' : 'Fill your details to activate the portal.'}</p>
    </div>
    <div class="tg tc-setup-card">
      <form id="setupForm" novalidate>
        <div class="tgrid">
          <div class="tdiv"><span class="tdiv-lbl"><i class="fas fa-user"></i> Personal</span><div class="tdiv-line"></div></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-id-badge"></i> Register No</label>
            <input class="ti" value="${esc(regno)}" readonly /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-user"></i> Full Name *</label>
            <input id="f_name" class="ti" value="${esc(d.name||'')}" placeholder="Dr. / Mr. / Ms. Full Name" required /></div>
          <div class="tg-fg" id="f_email_fg">
            <label class="tl">
              <i class="fas fa-envelope"></i> Email *
              <span id="tc_email_verif_badge" style="display:none;margin-left:6px;font-size:0.72rem;font-weight:800;padding:2px 9px;border-radius:50px;background:rgba(52,211,153,0.12);color:#6ee7b7;border:1px solid rgba(52,211,153,0.25);">
                <i class="fas fa-check-circle"></i> Verified
              </span>
            </label>
            <input id="f_email" type="email" class="ti" value="${esc(d.email||'')}" placeholder="your@email.com" required />
          </div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-phone"></i> Phone *</label>
            <input id="f_phone" type="tel" class="ti" value="${esc(d.phone||'')}" placeholder="+91 99999 99999" required /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-venus-mars"></i> Gender *</label>
            <select id="f_gender" class="ts" required><option value="">Select</option>${gO}</select></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-calendar-alt"></i> Date of Joining</label>
            <input id="f_joining" type="date" class="ti" value="${esc(d.joining_date||'')}" /></div>
          <div class="tdiv"><span class="tdiv-lbl"><i class="fas fa-graduation-cap"></i> Professional</span><div class="tdiv-line"></div></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-building"></i> Department *</label>
            <select id="f_dept" class="ts" required><option value="">Select</option>${dO}</select></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-user-tie"></i> Designation *</label>
            <select id="f_desig" class="ts" required><option value="">Select</option>${dsO}</select></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-award"></i> Qualification *</label>
            <input id="f_qual" class="ti" value="${esc(d.qualification||'')}" placeholder="e.g. M.E., Ph.D" required /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-briefcase"></i> Experience</label>
            <input id="f_exp" class="ti" value="${esc(d.experience||'')}" placeholder="e.g. 8 Years" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-flask"></i> Specialization</label>
            <input id="f_spec" class="ti" value="${esc(d.specialization||'')}" placeholder="e.g. Machine Learning" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-hashtag"></i> Employee ID</label>
            <input id="f_empid" class="ti" value="${esc(d.employee_id||'')}" placeholder="e.g. PDKV-TCH-001" /></div>
          <div class="tg-fg tgfull"><label class="tl"><i class="fas fa-book-open"></i> Subjects Handling</label>
            <input id="f_subjects" class="ti" value="${esc(d.subjects||'')}" placeholder="e.g. Data Structures, DBMS (comma separated)" /></div>
          <div class="tdiv"><span class="tdiv-lbl"><i class="fas fa-map-marker-alt"></i> Address &amp; Photo</span><div class="tdiv-line"></div></div>
          <div class="tg-fg tgfull"><label class="tl"><i class="fas fa-home"></i> Address</label>
            <textarea id="f_addr" class="tta" placeholder="Your residential address">${esc(d.address||'')}</textarea></div>
          <div class="tg-fg tgfull">
            <label class="tl"><i class="fas fa-camera"></i> Profile Photo
              <span style="opacity:.4;font-weight:400">(optional${isEdit ? ' — leave blank to keep existing' : ''})</span></label>
            ${d.image_url ? `<div class="tc-existing-photo" style="margin-bottom:12px">
              <img src="${esc(d.image_url.split('?')[0] + '?t=' + Date.now())}" alt="Current" onerror="this.parentElement.style.display='none'" />
              <span>Current photo — upload new to replace</span></div>` : ''}
            <div class="tc-upload" id="tUpArea">
              <input type="file" id="f_img" accept="image/*" />
              <span class="tc-upload-ico"><i class="fas fa-cloud-upload-alt"></i></span>
              <div class="tc-upload-txt"><strong>Click or drag &amp; drop</strong><br><small>JPG, PNG — max 5 MB</small></div>
            </div>
            <div class="tc-img-prev" id="tImgPrev">
              <img id="tImgPrevImg" src="" alt="" />
              <button type="button" class="tc-img-rm" id="tImgRm"><i class="fas fa-times"></i></button>
            </div>
          </div>
        </div>
        ${isEdit ? `<button type="button" class="tb tb-ghost tb-full" style="margin-top:8px" onclick="tcCancelEdit()">
          <i class="fas fa-arrow-left"></i> Cancel</button>` : ''}
        <button type="submit" class="tb tb-pri tb-full" id="setupBtn" style="margin-top:8px">
          <i class="fas fa-save"></i> ${isEdit ? 'Update My Profile' : 'Save My Profile'}
        </button>
      </form>
    </div>
  </div></div>`

  bindPrev('f_img','tImgPrev','tImgPrevImg','tImgRm')
  setTimeout(initFU, 55)

  if (isEdit && d.email) markEmailVerified(d.email)

  injectOtpWidget({
    emailInputId: 'f_email',
    widgetId:     'tc_email_otp',
    theme:        'dark-tc',
    onVerified:   async () => {
      const badge = document.getElementById('tc_email_verif_badge')
      if (badge) badge.style.display = 'inline'
    }
  })

  if (isEdit && d.email) {
    const badge = document.getElementById('tc_email_verif_badge')
    if (badge) badge.style.display = 'inline'
  }

  document.getElementById('f_email')?.addEventListener('input', () => {
    const cur   = document.getElementById('f_email')?.value?.trim().toLowerCase()
    const badge = document.getElementById('tc_email_verif_badge')
    if (badge) badge.style.display = isEmailVerified(cur) ? 'inline' : 'none'
  })

  document.getElementById('setupForm').addEventListener('submit', async ev => {
    ev.preventDefault()
    const g      = id => document.getElementById(id)?.value?.trim() || null
    const name   = g('f_name'), email = g('f_email'), phone = g('f_phone')
    const gender = g('f_gender'), dept = g('f_dept'), desig = g('f_desig'), qual = g('f_qual')

    if (!name || !email || !phone || !gender || !dept || !desig || !qual) {
      showToast('Fill all required (*) fields', 'warning'); return
    }
    if (!isEmailVerified(email)) {
      showToast('Please verify your email with OTP before saving.', 'warning')
      document.getElementById('tc_email_otp')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    await doSaveProfile({ name, email, phone, gender, dept, desig, qual, g, d, isEdit })
  })
}

// ── SAVE PROFILE ──────────────────────────────────────────────
async function doSaveProfile({ name, email, phone, gender, dept, desig, qual, g, d, isEdit }) {
  const btn = document.getElementById('setupBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' }

  let imgUrl = d.image_url || null
  if (document.getElementById('f_img')?.files?.[0]) {
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading photo…'
    const newUrl = await uploadTeacherImg('f_img', _regno)
    if (newUrl) { imgUrl = newUrl; showToast('Photo uploaded!', 'success') }
  }

  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving profile…'

  const payload = {
    register_no: _regno, name, email, phone, gender,
    department: dept, designation: desig, qualification: qual,
    experience: g('f_exp') || null, specialization: g('f_spec') || null,
    employee_id: g('f_empid') || null, subjects: g('f_subjects') || null,
    joining_date: g('f_joining') || null, address: g('f_addr') || null,
    image_url: imgUrl, updated_at: new Date().toISOString()
  }

  const { error } = await supabase.from('teacher_information').upsert(payload, { onConflict: 'register_no' })

  if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-save"></i> ${isEdit ? 'Update My Profile' : 'Save My Profile'}` }
  if (error) { showToast('Save failed: ' + error.message, 'error'); return }

  showToast(isEdit ? 'Profile updated! ✅' : 'Profile saved! 🎉', 'success')

  const { data: t } = await supabase.from('teacher_information').select('*').ilike('register_no', _regno).maybeSingle()
  if (t) {
    if (imgUrl) t.image_url = imgUrl
    _profile = t
    showSec('loading')
    await loadClassroomsAndStudents()
    showSec('profile')
    await renderProfile(t)
    setupRoomsRealtime()
  }
}

// ── EDIT / CANCEL ─────────────────────────────────────────────
window.tcEdit = async () => { if (!_regno) return; showSec('setup'); await renderSetup(_regno, _profile || null) }
window.tcCancelEdit = () => { if (!_profile) return; showSec('profile') }

// ── RENDER PROFILE ────────────────────────────────────────────
async function renderProfile(t) {
  const c = document.getElementById('secProfile'); if (!c) return

  const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || t.register_no)}&background=f59e0b&color=060912&size=300&bold=true`
  let photo = fallbackPhoto
  if (t.image_url && t.image_url.startsWith('http')) {
    photo = t.image_url.split('?')[0] + '?t=' + Date.now()
  } else {
    const found = await findTeacherPhotoInBucket(t.register_no)
    if (found) {
      photo = found
      supabase.from('teacher_information').update({ image_url: found }).ilike('register_no', t.register_no).then(() => {})
    }
  }

  const subjs = t.subjects ? t.subjects.split(',').map(s => s.trim()).filter(Boolean) : []

  c.innerHTML = `
  <div class="tc-wrap">
    <div class="tg tc-prof-card-new tu" style="margin-bottom:22px;">
      <div class="tc-photo-center-wrap">
        <div class="tc-photo-ring-outer">
          <div class="tc-photo-ring-inner">
            <img id="tcProfilePhoto" src="${photo}" alt="${esc(t.name || t.register_no)}" class="tc-photo-big"
              onerror="this.onerror=null;this.src='${fallbackPhoto}'" />
          </div>
          <div class="tc-photo-ring-glow"></div>
        </div>
        <div class="tc-photo-status-dot"></div>
      </div>
      <div class="tc-prof-text-center">
        <div class="tc-prof-name-big">${esc(t.name || t.register_no)}</div>
        <div class="tc-prof-desig-new">${esc(t.designation || '')}</div>
        <div class="tc-prof-dept-new">${t.department ? 'Dept. of ' + esc(t.department) : ''}</div>
        <div class="tc-prof-badges-center">
          <span class="tbd tb-amber"><i class="fas fa-id-badge"></i> ${esc(t.register_no)}</span>
          ${t.qualification ? `<span class="tbd tb-teal"><i class="fas fa-graduation-cap"></i> ${esc(t.qualification)}</span>` : ''}
          ${t.experience    ? `<span class="tbd tb-green"><i class="fas fa-briefcase"></i> ${esc(t.experience)}</span>` : ''}
        </div>
      </div>
      <div class="tc-prof-btns-center">
        <button class="tb tb-ghost" onclick="tcEdit()"><i class="fas fa-edit"></i> Edit Profile</button>
        <button class="tb tb-danger" onclick="tcLogout()"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
      </div>
    </div>
    <div class="tc-info-grid tu">
      ${tci('fas fa-envelope','tci-amb','Email',t.email)}
      ${tci('fas fa-phone','tci-tel','Phone',t.phone)}
      ${tci('fas fa-venus-mars','tci-vio','Gender',t.gender)}
      ${tci('fas fa-calendar-alt','tci-grn','Date of Joining',t.joining_date)}
      ${tci('fas fa-hashtag','tci-amb','Employee ID',t.employee_id)}
      ${tci('fas fa-flask','tci-tel','Specialization',t.specialization)}
      ${tci('fas fa-briefcase','tci-blu','Experience',t.experience)}
      ${tci('fas fa-map-marker-alt','tci-red','Address',t.address)}
    </div>
    ${subjs.length ? `
    <div class="tg tc-subj-wrap tu">
      <div class="tc-subj-h"><i class="fas fa-book-open"></i> Subjects Handling</div>
      <div class="tc-subj-chips">${subjs.map((s,i) => `<span class="tc-schip" style="animation-delay:${i*.06}s"><i class="fas fa-book"></i> ${esc(s)}</span>`).join('')}</div>
    </div>` : ''}
    <div id="examMgr" class="tu"></div>
    <div id="attMgr" class="tu"></div>
  </div>
  <style>
    .tc-photo-center-wrap{position:relative;width:180px;height:180px;margin:0 auto 22px;}
    .tc-photo-ring-outer{width:180px;height:180px;border-radius:50%;padding:4px;
      background:linear-gradient(135deg,var(--tc-amber),var(--tc-blue2) 50%,var(--tc-teal));
      animation:tcRingRotate 8s linear infinite;position:relative;}
    @keyframes tcRingRotate{to{transform:rotate(360deg);}}
    .tc-photo-ring-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;background:var(--tc-void);padding:3px;}
    .tc-photo-big{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.34,1.56,.64,1);}
    .tc-photo-big:hover{transform:scale(1.08);}
    .tc-photo-ring-glow{position:absolute;inset:-8px;border-radius:50%;
      background:conic-gradient(from 0deg,rgba(245,158,11,.4),rgba(96,165,250,.4),rgba(45,212,191,.4),rgba(245,158,11,.4));
      filter:blur(12px);z-index:-1;animation:glowPulse 3s ease-in-out infinite;}
    @keyframes glowPulse{0%,100%{opacity:.6;transform:scale(1);}50%{opacity:1;transform:scale(1.08);}}
    .tc-photo-status-dot{position:absolute;bottom:10px;right:10px;width:18px;height:18px;
      border-radius:50%;background:var(--tc-green);border:3px solid var(--tc-surface);
      box-shadow:0 0 8px rgba(52,211,153,.6);animation:statusPulse 2.5s ease-in-out infinite;}
    @keyframes statusPulse{0%,100%{box-shadow:0 0 8px rgba(52,211,153,.6);}50%{box-shadow:0 0 18px rgba(52,211,153,.9);}}
    .tc-prof-card-new{padding:clamp(28px,5vw,48px) 32px;text-align:center;}
    .tc-prof-text-center{margin-bottom:22px;}
    .tc-prof-name-big{font-family:'Syne',sans-serif;font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800;color:#fff;margin-bottom:6px;
      background:linear-gradient(90deg,#fff 0%,var(--tc-amber) 50%,var(--tc-teal) 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
      background-size:200% auto;animation:tcChroma 5s linear infinite;}
    .tc-prof-desig-new{font-size:1rem;color:var(--tc-amber);font-weight:700;margin-bottom:4px;}
    .tc-prof-dept-new{font-size:.88rem;color:var(--tc-muted);margin-bottom:16px;}
    .tc-prof-badges-center{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;}
    .tc-prof-btns-center{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}

    /* ── EXAM MANAGER STYLES ── */
    .tc-exam-mgr-wrap{margin-top:30px;}
    .tc-exam-mgr-hdr{font-family:'Syne',sans-serif;font-size:1.42rem;color:#fff;
      margin-bottom:22px;display:flex;align-items:center;gap:12px;
      padding-bottom:16px;border-bottom:1px solid var(--tc-border);}
    .tc-exam-mgr-hdr i{color:var(--tc-amber);}
    .tc-exam-search-row{display:flex;gap:10px;align-items:flex-end;margin-bottom:22px;flex-wrap:wrap;}
    .tc-exam-search-row .tg-fg{flex:1;min-width:200px;margin-bottom:0;}
    .tc-exam-result-card{padding:22px 24px;margin-bottom:16px;}
    .tc-exam-stu-info{display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--tc-border);}
    .tc-exam-stu-avatar{width:52px;height:52px;border-radius:50%;
      background:linear-gradient(135deg,var(--tc-amber),var(--tc-amber2));
      display:flex;align-items:center;justify-content:center;
      font-family:'Syne',sans-serif;font-size:1.35rem;font-weight:800;color:var(--tc-void);
      flex-shrink:0;}
    .tc-exam-stu-name{font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:700;color:#fff;margin-bottom:4px;}
    .tc-exam-stu-meta{font-size:.80rem;color:var(--tc-muted);}
    .tc-exam-sem-tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:18px;}
    .tc-exam-sem-tab{padding:7px 16px;border-radius:50px;font-size:.80rem;font-weight:800;
      background:var(--tc-glass);border:1.5px solid var(--tc-border);color:var(--tc-muted);
      cursor:pointer;font-family:'Mulish',sans-serif;
      transition:all .3s cubic-bezier(.34,1.56,.64,1);}
    .tc-exam-sem-tab:hover{border-color:var(--tc-amber);color:var(--tc-amber);}
    .tc-exam-sem-tab.act{background:rgba(245,158,11,.15);border-color:var(--tc-amber);
      color:var(--tc-amber);box-shadow:0 4px 14px rgba(245,158,11,.18);}
    .tc-exam-sem-panel{display:none;}
    .tc-exam-sem-panel.act{display:block;}
    .tc-exam-type-block{margin-bottom:18px;border:1px solid var(--tc-border);border-radius:var(--tc-r);overflow:hidden;}
    .tc-exam-type-hdr{display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px;background:rgba(255,255,255,.03);border-bottom:1px solid var(--tc-border);}
    .tc-exam-type-title{font-size:.92rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;}
    .tc-exam-subj-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;
      padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);align-items:center;}
    .tc-exam-subj-row:last-child{border-bottom:none;}
    .tc-exam-subj-row:hover{background:rgba(255,255,255,.025);}
    .tc-exam-subj-name{font-size:.86rem;font-weight:700;color:#fff;}
    .tc-exam-subj-code{font-size:.74rem;font-family:'JetBrains Mono',monospace;
      color:#93c5fd;background:rgba(59,130,246,.10);padding:2px 8px;border-radius:6px;}
    .tc-exam-subj-marks{font-size:.90rem;font-weight:800;}
    .tc-exam-add-subj-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;
      gap:8px;padding:10px 14px;background:rgba(245,158,11,.04);align-items:end;}
    .tc-exam-add-subj-row input{margin-bottom:0;}
    .tc-exam-empty-type{padding:16px;text-align:center;color:var(--tc-muted);font-size:.84rem;}
    .tc-exam-total-row{padding:10px 16px;display:flex;align-items:center;justify-content:flex-end;
      gap:18px;border-top:1px solid var(--tc-border);background:rgba(255,255,255,.03);}
    .tc-exam-total-label{font-size:.78rem;font-weight:800;color:var(--tc-muted);text-transform:uppercase;letter-spacing:.06em;}
    .tc-exam-total-val{font-family:'JetBrains Mono',monospace;font-size:1rem;font-weight:800;color:var(--tc-amber);}
    .tc-exam-del-subj{width:28px;height:28px;border-radius:8px;background:rgba(248,113,113,.10);
      border:1px solid rgba(248,113,113,.25);color:var(--tc-red);cursor:pointer;
      display:flex;align-items:center;justify-content:center;font-size:.80rem;
      transition:all .25s ease;flex-shrink:0;}
    .tc-exam-del-subj:hover{background:rgba(248,113,113,.22);transform:scale(1.10);}
    .tc-exam-no-data{text-align:center;padding:32px 20px;color:var(--tc-muted);}
    .tc-exam-no-data i{font-size:2.5rem;opacity:.3;display:block;margin-bottom:12px;color:var(--tc-amber);}
  </style>`

  setTimeout(initFU, 80)
  renderExamMgr()
  renderAttMgr()
}

function tci(ico, cls, lbl, val) {
  if (!val) return ''
  return `<div class="tg tc-info-card"><div class="tc-info-icon ${cls}"><i class="${ico}"></i></div><div>
    <div class="tc-info-lbl">${lbl}</div><div class="tc-info-val">${esc(val)}</div>
  </div></div>`
}

// ════════════════════════════════════════════════════════════════
// EXAM MANAGER
// ════════════════════════════════════════════════════════════════

// In-memory exam state for the currently loaded student
let _examRegno  = ''       // student register no being edited
let _examData   = {}       // { sem1: { ciat1: [...], ciat2: [...], final: [...] }, ... }
let _examStuInfo = null    // student info object

const SEM_LABELS = {
  sem1:'Sem 1', sem2:'Sem 2', sem3:'Sem 3', sem4:'Sem 4',
  sem5:'Sem 5', sem6:'Sem 6', sem7:'Sem 7', sem8:'Sem 8'
}
const TYPE_LABELS = {
  ciat1: { label:'CIAT – I',          ico:'fas fa-pencil-alt',     col:'#3b82f6' },
  ciat2: { label:'CIAT – II',         ico:'fas fa-pen-nib',        col:'#8b5cf6' },
  final: { label:'Final Examination', ico:'fas fa-graduation-cap', col:'#f43f5e' }
}

function renderExamMgr() {
  const c = document.getElementById('examMgr'); if (!c) return
  c.innerHTML = `
  <div class="tc-exam-mgr-wrap">
    <div class="tc-exam-mgr-hdr"><i class="fas fa-file-alt"></i> Student Exam Details</div>
    <div class="tg" style="padding:20px 22px;margin-bottom:16px;">
      <p style="font-size:.88rem;color:var(--tc-muted);margin-bottom:16px;line-height:1.65;">
        <i class="fas fa-info-circle" style="color:var(--tc-blue);margin-right:6px;"></i>
        Enter a student's register number to create or update their exam records (CIAT-I, CIAT-II, Final) for any semester.
      </p>
      <div class="tc-exam-search-row">
        <div class="tg-fg">
          <label class="tl"><i class="fas fa-id-card"></i> Student Register Number</label>
          <input id="examStuRegno" class="ti" placeholder="e.g. 22CS0001" autocomplete="off"
            style="text-transform:uppercase;" />
        </div>
        <button class="tb tb-pri" id="examLoadBtn" onclick="tcLoadStudentExam()">
          <i class="fas fa-search"></i> Load / Create
        </button>
      </div>
      <div id="examMsg" style="display:none;font-size:.84rem;padding:10px 14px;border-radius:10px;margin-top:10px;"></div>
    </div>
    <div id="examEditorWrap" style="display:none;"></div>
  </div>`
}

window.tcLoadStudentExam = async () => {
  const rawRegno = document.getElementById('examStuRegno')?.value?.trim().toUpperCase()
  if (!rawRegno) { showToast('Please enter a register number.', 'warning'); return }

  const btn = document.getElementById('examLoadBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading…' }
  _setExamMsg('', '')

  const [stuRes, examRes] = await Promise.all([
    supabase.from('student_information').select('register_no,name,department,year').ilike('register_no', rawRegno).maybeSingle(),
    supabase.from('exam_information').select('*').ilike('register_no', rawRegno).maybeSingle()
  ])

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Load / Create' }

  if (!stuRes.data) {
    _setExamMsg(`⚠️ Student with register number <strong>${esc(rawRegno)}</strong> not found in the system.`, 'warn')
    document.getElementById('examEditorWrap').style.display = 'none'
    return
  }

  _examStuInfo = stuRes.data
  _examRegno   = stuRes.data.register_no

  // Load existing exam_data or start fresh
  if (examRes.data && examRes.data.exam_data) {
    _examData = JSON.parse(JSON.stringify(examRes.data.exam_data))
  } else {
    _examData = {}
  }

  // Ensure all sems exist
  for (let i = 1; i <= 8; i++) {
    const k = 'sem' + i
    if (!_examData[k]) _examData[k] = { ciat1: [], ciat2: [], final: [] }
    ;['ciat1','ciat2','final'].forEach(t => { if (!Array.isArray(_examData[k][t])) _examData[k][t] = [] })
  }

  const isNew = !examRes.data
  _setExamMsg(
    isNew
      ? `✅ No existing exam record found for <strong>${esc(_examStuInfo.name || _examRegno)}</strong>. You can create a new one below.`
      : `✅ Loaded exam data for <strong>${esc(_examStuInfo.name || _examRegno)}</strong>. Edit and save below.`,
    isNew ? 'ok-new' : 'ok'
  )

  renderExamEditor()
}

function _setExamMsg(html, type) {
  const el = document.getElementById('examMsg')
  if (!el) return
  if (!html) { el.style.display = 'none'; return }
  const styles = {
    warn:   'background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.28);color:#fde68a;',
    ok:     'background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.26);color:#6ee7b7;',
    'ok-new':'background:rgba(59,130,246,.10);border:1px solid rgba(59,130,246,.26);color:#93c5fd;',
    err:    'background:rgba(248,113,113,.10);border:1px solid rgba(248,113,113,.26);color:#fca5a5;'
  }
  el.style.cssText = (styles[type] || styles.ok) + 'display:block;'
  el.innerHTML = html
}

function renderExamEditor() {
  const wrap = document.getElementById('examEditorWrap')
  if (!wrap || !_examStuInfo) return
  wrap.style.display = 'block'

  const stu = _examStuInfo
  const initials = (stu.name || stu.register_no).split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  // Build semester tabs — only show sems that have data OR all 8
  const semKeys = Object.keys(SEM_LABELS)

  wrap.innerHTML = `
  <div class="tg tc-exam-result-card">
    <!-- Student info header -->
    <div class="tc-exam-stu-info">
      <div class="tc-exam-stu-avatar">${initials}</div>
      <div>
        <div class="tc-exam-stu-name">${esc(stu.name || stu.register_no)}</div>
        <div class="tc-exam-stu-meta">
          <span style="margin-right:10px;"><i class="fas fa-id-card"></i> ${esc(_examRegno)}</span>
          ${stu.department ? `<span style="margin-right:10px;"><i class="fas fa-building"></i> ${esc(stu.department)}</span>` : ''}
          ${stu.year ? `<span><i class="fas fa-layer-group"></i> Year ${stu.year}</span>` : ''}
        </div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="tb tb-pri tb-sm" id="examSaveAllBtn" onclick="tcSaveExamData()">
          <i class="fas fa-save"></i> Save All Changes
        </button>
      </div>
    </div>

    <!-- Semester tabs -->
    <div class="tc-exam-sem-tabs" id="examSemTabs">
      ${semKeys.map((sk, i) => `
        <button class="tc-exam-sem-tab${i === 0 ? ' act' : ''}"
                data-sem="${sk}" onclick="tcExamSwitchSem('${sk}')">
          ${SEM_LABELS[sk]}
        </button>`).join('')}
    </div>

    <!-- Semester panels -->
    <div id="examSemPanels">
      ${semKeys.map((sk, i) => `
        <div id="examPanel_${sk}" class="tc-exam-sem-panel${i === 0 ? ' act' : ''}">
          ${renderExamSemPanel(sk)}
        </div>`).join('')}
    </div>

    <!-- Bottom save button -->
    <div style="display:flex;justify-content:flex-end;margin-top:18px;padding-top:15px;border-top:1px solid var(--tc-border);">
      <button class="tb tb-pri" onclick="tcSaveExamData()">
        <i class="fas fa-save"></i> Save All Changes
      </button>
    </div>
  </div>`
}

function renderExamSemPanel(semKey) {
  const semData = _examData[semKey] || { ciat1: [], ciat2: [], final: [] }
  let html = ''

  Object.keys(TYPE_LABELS).forEach(typeKey => {
    const cfg     = TYPE_LABELS[typeKey]
    const subjects = semData[typeKey] || []
    const total    = subjects.reduce((s, r) => s + (parseFloat(r.marks) || 0), 0)
    const maxTotal = subjects.reduce((s, r) => s + (parseFloat(r.max) || 0), 0)

    const subjRows = subjects.length > 0
      ? subjects.map((subj, idx) => {
          const pct = subj.max > 0 ? ((subj.marks / subj.max) * 100).toFixed(1) : '—'
          const passThreshold = typeKey === 'final' ? 50 : 40
          const pass = subj.max > 0 && (subj.marks / subj.max * 100) >= passThreshold
          const markCol = pass ? 'var(--tc-green)' : 'var(--tc-red)'
          return `
          <div class="tc-exam-subj-row" data-sem="${semKey}" data-type="${typeKey}" data-idx="${idx}">
            <div>
              <div class="tc-exam-subj-name">${esc(subj.subject_name || subj.subject || '—')}</div>
              ${subj.subject_code ? `<div class="tc-exam-subj-code">${esc(subj.subject_code)}</div>` : ''}
            </div>
            <div style="font-size:.80rem;color:var(--tc-muted);">
              ${esc(subj.subject_code || '—')}
            </div>
            <div class="tc-exam-subj-marks" style="color:${markCol}">
              ${subj.marks !== undefined && subj.marks !== null ? subj.marks : '—'}
              <span style="font-size:.72rem;font-weight:600;color:var(--tc-muted);">/ ${subj.max || 100}</span>
            </div>
            <div style="font-size:.78rem;color:${markCol};font-weight:800;">${pct}%</div>
            <button class="tc-exam-del-subj"
              onclick="tcDeleteSubject('${semKey}','${typeKey}',${idx})"
              title="Remove subject">
              <i class="fas fa-times"></i>
            </button>
          </div>`
        }).join('')
      : `<div class="tc-exam-empty-type">
          <i class="fas fa-inbox" style="font-size:1.4rem;opacity:.35;display:block;margin-bottom:7px;color:${cfg.col};"></i>
          No subjects added yet. Use the form below to add subjects.
        </div>`

    const totalHtml = subjects.length > 0 ? `
      <div class="tc-exam-total-row">
        <span class="tc-exam-total-label">Total:</span>
        <span class="tc-exam-total-val">${total.toFixed(1)} / ${maxTotal.toFixed(0)}</span>
        <span style="font-size:.80rem;color:${maxTotal > 0 && (total/maxTotal*100)>=50?'var(--tc-green)':'var(--tc-red)'};font-weight:800;margin-left:6px;">
          ${maxTotal > 0 ? (total/maxTotal*100).toFixed(1) + '%' : ''}
        </span>
      </div>` : ''

    html += `
    <div class="tc-exam-type-block" style="border-top:3px solid ${cfg.col};">
      <div class="tc-exam-type-hdr">
        <div class="tc-exam-type-title">
          <i class="${cfg.ico}" style="color:${cfg.col};"></i> ${cfg.label}
          <span style="font-size:.74rem;font-weight:600;opacity:.6;margin-left:6px;">(${subjects.length} subject${subjects.length !== 1 ? 's' : ''})</span>
        </div>
        <button class="tb tb-ghost tb-sm" style="font-size:.76rem;padding:5px 12px;"
          onclick="tcToggleAddSubjForm('${semKey}','${typeKey}')">
          <i class="fas fa-plus"></i> Add Subject
        </button>
      </div>

      <!-- Subject rows -->
      <div id="subjList_${semKey}_${typeKey}">
        ${subjRows}
      </div>
      ${totalHtml}

      <!-- Add subject form (hidden by default) -->
      <div id="addSubjForm_${semKey}_${typeKey}" style="display:none;border-top:1px solid var(--tc-border);">
        <div style="padding:12px 14px 4px;font-size:.76rem;font-weight:800;color:${cfg.col};
          text-transform:uppercase;letter-spacing:.06em;">
          <i class="fas fa-plus-circle"></i> Add New Subject to ${cfg.label}
        </div>
        <div class="tc-exam-add-subj-row">
          <div>
            <label style="font-size:.70rem;font-weight:800;color:var(--tc-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px;">Subject Name *</label>
            <input id="newSubjName_${semKey}_${typeKey}" class="ti"
              placeholder="e.g. Data Structures" style="font-size:.84rem;" />
          </div>
          <div>
            <label style="font-size:.70rem;font-weight:800;color:var(--tc-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px;">Subject Code</label>
            <input id="newSubjCode_${semKey}_${typeKey}" class="ti"
              placeholder="e.g. CS3301" style="font-size:.84rem;" />
          </div>
          <div>
            <label style="font-size:.70rem;font-weight:800;color:var(--tc-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px;">Marks Obtained *</label>
            <input id="newSubjMarks_${semKey}_${typeKey}" class="ti" type="number"
              placeholder="e.g. 85" min="0" max="200" step="0.5" style="font-size:.84rem;" />
          </div>
          <div>
            <label style="font-size:.70rem;font-weight:800;color:var(--tc-muted);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px;">Max Marks *</label>
            <input id="newSubjMax_${semKey}_${typeKey}" class="ti" type="number"
              placeholder="100" min="1" max="200" step="0.5" value="100" style="font-size:.84rem;" />
          </div>
          <div style="display:flex;gap:6px;align-items:flex-end;padding-bottom:2px;">
            <button class="tb tb-pri tb-sm" style="white-space:nowrap;"
              onclick="tcAddSubject('${semKey}','${typeKey}')">
              <i class="fas fa-plus"></i> Add
            </button>
            <button class="tb tb-ghost tb-sm"
              onclick="tcToggleAddSubjForm('${semKey}','${typeKey}')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>`
  })

  return html
}

window.tcExamSwitchSem = (semKey) => {
  document.querySelectorAll('.tc-exam-sem-tab').forEach(t => {
    t.classList.toggle('act', t.dataset.sem === semKey)
  })
  document.querySelectorAll('.tc-exam-sem-panel').forEach(p => {
    p.classList.toggle('act', p.id === 'examPanel_' + semKey)
  })
}

window.tcToggleAddSubjForm = (semKey, typeKey) => {
  const el = document.getElementById(`addSubjForm_${semKey}_${typeKey}`)
  if (!el) return
  const isVisible = el.style.display !== 'none'
  el.style.display = isVisible ? 'none' : 'block'
  if (!isVisible) {
    // Focus first input when opening
    setTimeout(() => document.getElementById(`newSubjName_${semKey}_${typeKey}`)?.focus(), 80)
  }
}

window.tcAddSubject = (semKey, typeKey) => {
  const nameEl  = document.getElementById(`newSubjName_${semKey}_${typeKey}`)
  const codeEl  = document.getElementById(`newSubjCode_${semKey}_${typeKey}`)
  const marksEl = document.getElementById(`newSubjMarks_${semKey}_${typeKey}`)
  const maxEl   = document.getElementById(`newSubjMax_${semKey}_${typeKey}`)

  const name  = nameEl?.value?.trim()
  const code  = codeEl?.value?.trim() || ''
  const marks = parseFloat(marksEl?.value)
  const max   = parseFloat(maxEl?.value) || 100

  if (!name) { showToast('Subject name is required.', 'warning'); nameEl?.focus(); return }
  if (isNaN(marks) || marks < 0) { showToast('Please enter valid marks obtained.', 'warning'); marksEl?.focus(); return }
  if (marks > max) { showToast(`Marks obtained (${marks}) cannot exceed max marks (${max}).`, 'warning'); marksEl?.focus(); return }

  if (!_examData[semKey]) _examData[semKey] = { ciat1: [], ciat2: [], final: [] }
  if (!Array.isArray(_examData[semKey][typeKey])) _examData[semKey][typeKey] = []

  _examData[semKey][typeKey].push({
    subject_name: name,
    subject:      name,
    subject_code: code,
    marks:        marks,
    max:          max
  })

  // Clear form fields
  if (nameEl)  nameEl.value  = ''
  if (codeEl)  codeEl.value  = ''
  if (marksEl) marksEl.value = ''
  if (maxEl)   maxEl.value   = '100'

  // Re-render this sem panel only
  const panel = document.getElementById(`examPanel_${semKey}`)
  if (panel) panel.innerHTML = renderExamSemPanel(semKey)

  showToast(`Subject "${name}" added to ${SEM_LABELS[semKey]} — ${TYPE_LABELS[typeKey].label}.`, 'success')
}

window.tcDeleteSubject = (semKey, typeKey, idx) => {
  if (!_examData[semKey]?.[typeKey]) return
  const subj = _examData[semKey][typeKey][idx]
  if (!confirm(`Remove "${subj?.subject_name || subj?.subject || 'this subject'}" from ${SEM_LABELS[semKey]} — ${TYPE_LABELS[typeKey].label}?`)) return

  _examData[semKey][typeKey].splice(idx, 1)

  // Re-render panel
  const panel = document.getElementById(`examPanel_${semKey}`)
  if (panel) panel.innerHTML = renderExamSemPanel(semKey)

  showToast('Subject removed.', 'info')
}

window.tcSaveExamData = async () => {
  if (!_examRegno) { showToast('No student loaded. Please search for a student first.', 'warning'); return }

  const btn = document.getElementById('examSaveAllBtn')
  const allSaveBtns = document.querySelectorAll('[onclick="tcSaveExamData()"]')
  allSaveBtns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' })

  // Clean exam_data: remove empty arrays to keep it tidy, but keep structure
  const cleanData = {}
  let hasAnySubject = false
  for (let i = 1; i <= 8; i++) {
    const sk = 'sem' + i
    const semData = _examData[sk] || {}
    cleanData[sk] = {}
    ;['ciat1','ciat2','final'].forEach(t => {
      cleanData[sk][t] = Array.isArray(semData[t]) ? semData[t] : []
      if (cleanData[sk][t].length > 0) hasAnySubject = true
    })
  }

  const payload = {
    register_no: _examRegno,
    exam_data:   cleanData,
    updated_at:  new Date().toISOString()
  }

  const { error } = await supabase.from('exam_information')
    .upsert(payload, { onConflict: 'register_no' })

  allSaveBtns.forEach(b => { b.disabled = false; b.innerHTML = '<i class="fas fa-save"></i> Save All Changes' })

  if (error) {
    showToast('Failed to save exam data: ' + error.message, 'error')
    return
  }

  showToast(`Exam data for ${esc(_examStuInfo?.name || _examRegno)} saved successfully! ✅`, 'success')
  _setExamMsg(`✅ Exam data saved successfully for <strong>${esc(_examStuInfo?.name || _examRegno)}</strong> (${new Date().toLocaleString('en-IN')}).`, 'ok')
}

// ════════════════════════════════════════════════════════════════
// END EXAM MANAGER
// ════════════════════════════════════════════════════════════════

// ── ROOMS REALTIME ────────────────────────────────────────────
function setupRoomsRealtime() {
  if (_roomsRtCh) { supabase.removeChannel(_roomsRtCh); _roomsRtCh = null }
  _roomsRtCh = supabase.channel('tc-rooms-live-' + _regno + '-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, async () => {
      const { data, error } = await supabase.from('classrooms').select('*').order('created_at', { ascending: false })
      if (!error) { _rooms = data || []; refreshGrids() }
    })
    .subscribe()
}

// ── ATTENDANCE MANAGER ────────────────────────────────────────
function renderAttMgr() {
  const c = document.getElementById('attMgr'); if (!c) return
  const mine = _rooms.filter(r =>
    (r.teacher_regno || '').toUpperCase().trim() === (_regno || '').toUpperCase().trim()
  )
  c.innerHTML = `
  <div style="margin-top:30px">
    <div class="tc-att-hdr"><i class="fas fa-calendar-check"></i> Attendance Manager</div>
    <div class="tc-tabs">
      <button class="tc-tab on" id="tabMy" onclick="tcTab('my',this)">
        <i class="fas fa-door-open"></i> My Classrooms
        <span id="badgeMine" style="margin-left:5px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);color:var(--tc-amber);padding:1px 8px;border-radius:50px;font-size:.72rem;">${mine.length}</span>
      </button>
      <button class="tc-tab" id="tabAll" onclick="tcTab('all',this)">
        <i class="fas fa-list"></i> All Classrooms
        <span id="badgeAll" style="margin-left:5px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.25);color:var(--tc-blue);padding:1px 8px;border-radius:50px;font-size:.72rem;">${_rooms.length}</span>
      </button>
    </div>
    <div id="panMy" class="tc-tpanel on">
      <div style="display:flex;gap:9px;justify-content:flex-end;margin-bottom:16px">
        <button class="tb tb-pri tb-sm" onclick="openCreate()"><i class="fas fa-plus"></i> Create Classroom</button>
      </div>
      <div class="tc-cls-grid" id="gMy">${clsGrid(mine, true)}</div>
    </div>
    <div id="panAll" class="tc-tpanel">
      <div class="tc-cls-grid" id="gAll">${clsGrid(_rooms, false)}</div>
    </div>
  </div>`
}

function clsGrid(rooms, mine) {
  if (!rooms.length) {
    return `<div class="tc-empty" style="grid-column:1/-1">
      <div class="tc-empty-ico">🏫</div>
      <div class="tc-empty-title">${mine ? 'No Classrooms Yet' : 'No Classrooms Found'}</div>
      <div class="tc-empty-sub">${mine ? 'Click "Create Classroom" to get started.' : 'No classrooms have been created yet.'}</div>
    </div>`
  }
  let h = rooms.map(r => `
    <div class="tg tc-cls-card" data-room-id="${esc(r.id)}" style="cursor:pointer;">
      <div class="tc-cls-ico"><i class="fas fa-door-open"></i></div>
      <div class="tc-cls-name">${esc(r.class_name)}</div>
      <div class="tc-cls-meta">
        <div><i class="fas fa-user-tie"></i> ${esc(r.teacher_name || r.teacher_regno || '—')}</div>
        ${r.department ? `<div><i class="fas fa-building"></i> ${esc(r.department)}${r.year ? ' · Year ' + r.year : ''}</div>` : ''}
        ${r.subject ? `<div><i class="fas fa-book"></i> ${esc(r.subject)}</div>` : ''}
      </div>
      <span class="tc-cls-cnt"><i class="fas fa-users"></i> ${(r.student_regnos || []).length} Students</span>
    </div>`).join('')
  if (mine) h += `<button class="tc-create-btn" onclick="openCreate()"><i class="fas fa-plus-circle"></i><span>Create New Classroom</span></button>`
  return h
}

window.tcTab = (t, btn) => {
  document.querySelectorAll('.tc-tab').forEach(b => b.classList.remove('on'))
  btn.classList.add('on')
  document.getElementById('panMy')?.classList.toggle('on',  t === 'my')
  document.getElementById('panAll')?.classList.toggle('on', t === 'all')
}

function refreshGrids() {
  const mine = _rooms.filter(r =>
    (r.teacher_regno || '').toUpperCase().trim() === (_regno || '').toUpperCase().trim()
  )
  const gm = document.getElementById('gMy');  if (gm) gm.innerHTML = clsGrid(mine, true)
  const ga = document.getElementById('gAll'); if (ga) ga.innerHTML = clsGrid(_rooms, false)
  const bm = document.getElementById('badgeMine'); if (bm) bm.textContent = mine.length
  const ba = document.getElementById('badgeAll');  if (ba) ba.textContent = _rooms.length
}

// ── MODAL SYSTEM ──────────────────────────────────────────────
function getModalContainer() {
  let c = document.getElementById('tcModals')
  if (!c) { c = document.createElement('div'); c.id = 'tcModals'; document.body.appendChild(c) }
  return c
}

function modal(h) { getModalContainer().innerHTML = h }

window.closeM = id => {
  const e = document.getElementById(id); if (!e) return
  e.classList.remove('open')
  setTimeout(() => { const c = document.getElementById('tcModals'); if (c) c.innerHTML = '' }, 350)
}

// ── STUDENT GROUPING ──────────────────────────────────────────
function grpStus(stus) {
  const g = {}
  stus.forEach(s => {
    const y = s.year || '?', d = s.department || 'Unknown'
    if (!g[y]) g[y] = {}
    if (!g[y][d]) g[y][d] = []
    g[y][d].push(s)
  })
  return g
}

function stuSelHTML(groups, filter = '') {
  const yrs = Object.keys(groups).map(Number).sort((a, b) => a - b)
  if (!yrs.length) return `<div style="text-align:center;padding:20px;color:var(--tmut)">No students in system yet.</div>`
  let html = ''
  yrs.forEach(yr => {
    const depts = Object.keys(groups[yr]).sort()
    let deptHtml = ''
    depts.forEach(d => {
      let stus = groups[yr][d]
      if (filter) {
        const q = filter.toLowerCase()
        stus = stus.filter(s => (s.name || '').toLowerCase().includes(q) || (s.register_no || '').toLowerCase().includes(q))
      }
      if (!stus.length) return
      const allSel = stus.every(s => _selStu.has(s.register_no))
      deptHtml += `<div class="tc-dp-blk">
        <div class="tc-dp-title">
          <span><i class="fas fa-building"></i> ${esc(d)}</span>
          <button type="button" class="tc-dp-sall" data-yr="${yr}" data-dept="${encodeURIComponent(d)}">
            ${allSel ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        ${stus.map(s => `
          <div class="tc-sr${_selStu.has(s.register_no) ? ' sel' : ''}" data-regno="${esc(s.register_no)}">
            <div>
              <div class="tc-sr-name">${esc(s.name || '—')}</div>
              <div class="tc-sr-meta">${esc(s.register_no)} · ${esc(d)}</div>
            </div>
            <div class="tc-sr-chk" id="ck-${esc(s.register_no)}">${_selStu.has(s.register_no) ? '✓' : ''}</div>
          </div>`).join('')}
      </div>`
    })
    if (!deptHtml.trim()) return
    html += `<div class="tc-yr-blk"><div class="tc-yr-title"><i class="fas fa-layer-group"></i> Year ${yr}${sfx(yr)}</div>${deptHtml}</div>`
  })
  return html || `<div style="text-align:center;padding:20px;color:var(--tmut)">No matching students.</div>`
}

function updSelCnt() {
  const e = document.getElementById('selCnt'); if (e) e.textContent = `${_selStu.size} Selected`
}

window.fltStus = () => {
  const q = document.getElementById('stuSearch')?.value || ''
  const el = document.getElementById('stuList')
  if (el) el.innerHTML = stuSelHTML(grpStus(_stus), q)
}

// ── CREATE CLASSROOM ──────────────────────────────────────────
window.openCreate = () => {
  _selStu.clear()
  modal(`
  <div class="tc-mo open" id="mCreate">
    <div class="tc-mb tc-mb-lg">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-plus-circle"></i> Create New Classroom</div>
        <button class="tc-mc" onclick="closeM('mCreate')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div class="tgrid" style="margin-bottom:18px">
          <div class="tg-fg"><label class="tl"><i class="fas fa-door-open"></i> Classroom Name *</label>
            <input id="cc_name" class="ti" placeholder="e.g. CSE-A 3rd Year" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-book"></i> Subject</label>
            <input id="cc_subj" class="ti" placeholder="e.g. Data Structures" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-building"></i> Department (optional)</label>
            <input id="cc_dept" class="ti" placeholder="Department" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-layer-group"></i> Year (optional)</label>
            <select id="cc_year" class="ts"><option value="">Any Year</option>
              ${[1,2,3,4].map(n => `<option value="${n}">${n}${sfx(n)} Year</option>`).join('')}
            </select></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;flex-wrap:wrap;gap:8px">
          <span style="font-size:.95rem;color:#fff;font-weight:700"><i class="fas fa-users" style="color:var(--tamb);margin-right:7px"></i>Select Students</span>
          <span class="tbd tb-teal" id="selCnt">0 Selected</span>
        </div>
        <div class="tc-msearch tg-fg"><i class="fas fa-search tc-msearch-ico"></i>
          <input id="stuSearch" class="ti" placeholder="Search name or reg no…" oninput="fltStus()" style="padding-left:37px" /></div>
        <div style="max-height:370px;overflow-y:auto;padding-right:3px" id="stuList">${stuSelHTML(grpStus(_stus))}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:15px;border-top:1px solid var(--tbord)">
          <button class="tb tb-ghost tb-sm" onclick="closeM('mCreate')">Cancel</button>
          <button class="tb tb-pri" id="saveRoomBtn" onclick="saveRoom()"><i class="fas fa-save"></i> Create Classroom</button>
        </div>
      </div>
    </div>
  </div>`)
}

// ── SAVE CLASSROOM ────────────────────────────────────────────
window.saveRoom = async () => {
  const name = document.getElementById('cc_name')?.value?.trim()
  const subj = document.getElementById('cc_subj')?.value?.trim() || null
  if (!name) { showToast('Classroom name is required.', 'warning'); return }
  if (_selStu.size === 0) { showToast('Select at least one student.', 'warning'); return }

  const saveBtn = document.getElementById('saveRoomBtn')
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…' }

  const { data, error } = await supabase.from('classrooms').insert({
    teacher_regno:  _regno,
    teacher_name:   _profile?.name || _regno,
    class_name:     name,
    subject:        subj,
    department:     document.getElementById('cc_dept')?.value?.trim() || null,
    year:           parseInt(document.getElementById('cc_year')?.value) || null,
    student_regnos: [..._selStu]
  }).select().single()

  if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Create Classroom' }
  if (error) { showToast('Failed to create classroom: ' + error.message, 'error'); return }

  showToast(`Classroom "${name}" created! 🎉`, 'success')
  _rooms.unshift(data)
  closeM('mCreate')
  refreshGrids()
}

// ── OPEN ROOM — always fetches fresh ─────────────────────────
window.openRoom = async id => {
  if (!id) { showToast('Invalid classroom ID.', 'error'); return }
  const room = await fetchRoom(id)
  if (!room) { showToast('Classroom not found or deleted.', 'error'); return }

  const stus = _stus.filter(s => (room.student_regnos || []).includes(s.register_no))

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
  const cutoffISO = cutoff.toISOString().split('T')[0]

  const { data: sessions } = await supabase.from('attendance_sessions').select('*')
    .eq('classroom_id', id).gte('session_date', cutoffISO)
    .order('session_date', { ascending: false }).order('period', { ascending: true }).limit(30)

  const sessionList = sessions || []

  const sessRows = sessionList.length
    ? sessionList.map(s => `<tr>
        <td>${fmtDate(s.session_date)}</td>
        <td>Period ${s.period}</td>
        <td>${esc(s.subject_name || '—')}</td>
        <td><span class="tbd tb-teal"><i class="fas fa-users"></i> ${(room.student_regnos || []).length}</span></td>
        <td><button class="tb tb-ghost tb-sm" data-view-sess="${esc(s.id)}"><i class="fas fa-eye"></i> View</button></td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--tmut);padding:20px">No sessions in the last 30 days.</td></tr>`

  modal(`
  <div class="tc-mo open" id="mRoom">
    <div class="tc-mb tc-mb-lg">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-door-open"></i> ${esc(room.class_name)}</div>
        <button class="tc-mc" onclick="closeM('mRoom')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:13px;margin-bottom:20px">
          <div>
            <div style="font-size:1.1rem;color:#fff;font-weight:700">${esc(room.class_name)}</div>
            <div style="font-size:.8rem;color:var(--tmut);margin-top:4px">
              ${room.subject ? `<i class="fas fa-book"></i> ${esc(room.subject)} &bull; ` : ''}
              <i class="fas fa-users"></i> ${(room.student_regnos || []).length} Students &bull;
              <i class="fas fa-user-tie"></i> ${esc(room.teacher_name || room.teacher_regno || '—')}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="tb tb-green tb-sm" data-mark-att="${esc(room.id)}"><i class="fas fa-clipboard-check"></i> Mark Attendance</button>
            <button class="tb tb-ghost tb-sm" data-edit-room="${esc(room.id)}"><i class="fas fa-edit"></i> Edit</button>
            <button class="tb tb-danger tb-sm" data-delete-room="${esc(room.id)}"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
        <div style="margin-bottom:20px">
          <div style="font-size:.9rem;color:#fff;font-weight:700;margin-bottom:11px">
            <i class="fas fa-history" style="color:var(--tamb)"></i> Attendance Sessions (Last 30 Days)
            <span style="font-size:.75rem;color:var(--tmut);font-weight:400;margin-left:8px">${sessionList.length} session(s)</span>
          </div>
          <div class="tc-tbl-wrap"><table class="tc-tbl">
            <thead><tr><th>Date</th><th>Period</th><th>Subject</th><th>Students</th><th>Action</th></tr></thead>
            <tbody>${sessRows}</tbody>
          </table></div>
        </div>
        <div>
          <div style="font-size:.9rem;color:#fff;font-weight:700;margin-bottom:10px">
            <i class="fas fa-users" style="color:var(--tamb)"></i> Students (${stus.length})
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${stus.length
              ? stus.map(s => `<span class="tbd tb-teal"><i class="fas fa-user"></i> ${esc(s.name || s.register_no)}</span>`).join('')
              : '<span style="color:var(--tmut);font-size:.84rem">No student profiles found for this classroom.</span>'}
          </div>
        </div>
      </div>
    </div>
  </div>`)
}

// ── CONFIRM DELETE ────────────────────────────────────────────
window.confirmDeleteRoom = async id => {
  if (!id) return
  const room = await fetchRoom(id)
  if (!room) { showToast('Classroom not found.', 'error'); return }
  modal(`
  <div class="tc-mo open" id="mDeleteConfirm">
    <div class="tc-mb tc-mb-sm">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-trash"></i> Delete Classroom</div>
        <button class="tc-mc" onclick="closeM('mDeleteConfirm')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div style="text-align:center;padding:16px 0 24px;">
          <div style="font-size:2.5rem;margin-bottom:14px;">🗑️</div>
          <div style="font-size:1rem;color:#fff;font-weight:700;margin-bottom:10px;">Delete "${esc(room.class_name)}"?</div>
          <div style="font-size:.86rem;color:var(--tmut);line-height:1.65;margin-bottom:22px;">
            This will permanently delete the classroom and all its attendance records. This action cannot be undone.
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button class="tb tb-ghost" onclick="closeM('mDeleteConfirm')">Cancel</button>
            <button class="tb tb-danger" id="deleteRoomBtn" data-delete-confirm="${esc(room.id)}">
              <i class="fas fa-trash"></i> Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`)
}

window.deleteRoom = async id => {
  if (!id) return
  const btn = document.getElementById('deleteRoomBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…' }
  await supabase.from('attendance_records').delete().eq('classroom_id', id)
  await supabase.from('attendance_sessions').delete().eq('classroom_id', id)
  const { error } = await supabase.from('classrooms').delete().eq('id', id)
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Delete Permanently' }
  if (error) { showToast('Failed to delete: ' + error.message, 'error'); return }
  showToast('Classroom deleted.', 'info')
  _rooms = _rooms.filter(r => r.id !== id)
  closeM('mDeleteConfirm')
  refreshGrids()
}

// ── MARK ATTENDANCE — always fetches fresh ────────────────────
window.openMarkAtt = async id => {
  if (!id) return
  const room = await fetchRoom(id)
  if (!room) { showToast('Classroom not found.', 'error'); return }

  const stus = _stus.filter(s => (room.student_regnos || []).includes(s.register_no))
  _attSt = {}; _attStus = stus
  stus.forEach(s => { _attSt[s.register_no] = null })

  const today = new Date().toISOString().split('T')[0]

  modal(`
  <div class="tc-mo open" id="mAtt">
    <div class="tc-mb tc-mb-md">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-clipboard-check"></i> Mark Attendance — ${esc(room.class_name)}</div>
        <button class="tc-mc" onclick="closeM('mAtt')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div class="tc-sess-hdr">
          <div><label>Date *</label>
            <input id="attDate" type="date" value="${today}" class="ti" style="min-width:145px" /></div>
          <div><label>Period *</label>
            <select id="attPer" class="ts" style="min-width:125px">
              ${[1,2,3,4,5,6,7,8].map(p => `<option value="${p}">Period ${p}</option>`).join('')}
            </select></div>
          <div><label>Subject Name *</label>
            <input id="attSubj" class="ti" placeholder="e.g. Python, OOPS" value="${esc(room.subject || '')}" style="min-width:180px" /></div>
        </div>
        <div class="tc-bulk-row">
          <span class="tc-bulk-lbl">Mark All:</span>
          <button class="tb tb-green tb-sm" onclick="markAll('present')"><i class="fas fa-check-double"></i> All Present</button>
          <button class="tb tb-danger tb-sm" onclick="markAll('absent')"><i class="fas fa-times"></i> All Absent</button>
        </div>
        <div style="margin-bottom:13px">
          <div style="display:flex;justify-content:space-between;font-size:.79rem;color:var(--tmut);margin-bottom:5px">
            <span>Marked: <strong id="markedN" style="color:var(--tamb)">0</strong> / ${stus.length}</span>
          </div>
          <div class="tc-prog"><div class="tc-prog-bar" id="progBar" style="width:0%"></div></div>
        </div>
        <div id="attList">
          ${stus.length
            ? stus.map(s => `
              <div class="tc-att-row" id="ar-${esc(s.register_no)}">
                <div>
                  <div class="tc-att-sname">${esc(s.name || '—')}</div>
                  <div class="tc-att-sreg">${esc(s.register_no)}${s.department ? ' · ' + esc(s.department) : ''} · Yr ${s.year || '—'}</div>
                </div>
                <div class="tc-att-tog">
                  <button class="tc-p" id="ap-${esc(s.register_no)}" data-mark-present="${esc(s.register_no)}"><i class="fas fa-check"></i> P</button>
                  <button class="tc-a" id="aa-${esc(s.register_no)}" data-mark-absent="${esc(s.register_no)}"><i class="fas fa-times"></i> A</button>
                </div>
              </div>`).join('')
            : `<div style="text-align:center;padding:28px;color:var(--tmut)">
                <i class="fas fa-users" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px"></i>
                No student profiles found for this classroom.
              </div>`}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:15px;border-top:1px solid var(--tbord)">
          <button class="tb tb-ghost tb-sm" onclick="closeM('mAtt')">Cancel</button>
          <button class="tb tb-pri" id="saveAttBtn" data-save-att="${esc(room.id)}"><i class="fas fa-save"></i> Save Attendance</button>
        </div>
      </div>
    </div>
  </div>`)
}

window.markOne = (regno, status) => {
  if (!regno) return
  _attSt[regno] = status
  document.getElementById('ap-' + regno)?.classList.toggle('on', status === 'present')
  document.getElementById('aa-' + regno)?.classList.toggle('on', status === 'absent')
  const marked = Object.values(_attSt).filter(v => v !== null).length
  const tot    = _attStus.length || 1
  const mn = document.getElementById('markedN'); if (mn) mn.textContent = marked
  const bar = document.getElementById('progBar'); if (bar) bar.style.width = Math.round(marked / tot * 100) + '%'
}

window.markAll = s => _attStus.forEach(st => markOne(st.register_no, s))

// ── SAVE ATTENDANCE ───────────────────────────────────────────
window.saveAtt = async id => {
  if (!id) return
  const date   = document.getElementById('attDate')?.value
  const period = parseInt(document.getElementById('attPer')?.value)
  const subj   = document.getElementById('attSubj')?.value?.trim()

  if (!date || !period || !subj) { showToast('Enter date, period AND subject name.', 'warning'); return }

  const unmarked = Object.values(_attSt).filter(v => v === null).length
  if (unmarked > 0 && !confirm(`${unmarked} student(s) not marked yet. Save anyway?`)) return

  const btn = document.getElementById('saveAttBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' }
  const resetBtn = () => { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance' } }

  const { data: sess, error: sErr } = await supabase.from('attendance_sessions')
    .upsert({ classroom_id: id, teacher_regno: _regno, session_date: date, period, subject_name: subj },
            { onConflict: 'classroom_id,session_date,period' })
    .select().single()

  if (sErr) { showToast('Session error: ' + sErr.message, 'error'); resetBtn(); return }

  const records = _attStus.filter(s => _attSt[s.register_no] !== null).map(s => ({
    session_id: sess.id, classroom_id: id,
    register_no: s.register_no, student_name: s.name || '',
    status: _attSt[s.register_no], session_date: date, period, subject_name: subj
  }))

  if (records.length) {
    const { error: rErr } = await supabase.from('attendance_records').upsert(records, { onConflict: 'session_id,register_no' })
    if (rErr) { showToast('Records error: ' + rErr.message, 'error'); resetBtn(); return }
  }

  await updateStudentAttendance(id)
  showToast(`Attendance saved for ${records.length} students ✅ (${date} · Period ${period} · ${subj})`, 'success')
  resetBtn()
  closeM('mAtt')
  setTimeout(() => openRoom(id), 400)
}

// ── UPDATE STUDENT ATTENDANCE SUMMARY ────────────────────────
async function updateStudentAttendance(classroomId) {
  try {
    const { data: allRecords } = await supabase.from('attendance_records')
      .select('register_no, status, session_date, period, subject_name').eq('classroom_id', classroomId)
    if (!allRecords || !allRecords.length) return

    const byStudent = {}
    allRecords.forEach(r => {
      if (!byStudent[r.register_no]) byStudent[r.register_no] = []
      byStudent[r.register_no].push(r)
    })

    for (const [regno, records] of Object.entries(byStudent)) {
      const totalDays   = records.length
      const presentDays = records.filter(r => r.status === 'present').length
      const absentDays  = records.filter(r => r.status === 'absent').length
      const absentDetails = records.filter(r => r.status === 'absent')
        .map(r => ({ date: r.session_date, period: r.period, subject_name: r.subject_name }))

      const statsByDate = {}
      records.forEach(r => {
        const d = r.session_date
        if (!statsByDate[d]) statsByDate[d] = { date: d, present: 0, absent: 0, total: 0 }
        statsByDate[d].total++
        if (r.status === 'present') statsByDate[d].present++
        else statsByDate[d].absent++
      })

      await supabase.from('attendance_information').upsert({
        register_no: regno, total_days: totalDays, present_days: presentDays,
        absent_days: absentDays, absent_details: absentDetails,
        period_stats: Object.values(statsByDate), updated_at: new Date().toISOString()
      }, { onConflict: 'register_no' })
    }
  } catch (err) { console.error('updateStudentAttendance error:', err) }
}

// ── VIEW SESSION ──────────────────────────────────────────────
window.viewSess = async sessId => {
  if (!sessId) return
  const [recsRes, sessRes] = await Promise.all([
    supabase.from('attendance_records').select('*').eq('session_id', sessId).order('student_name'),
    supabase.from('attendance_sessions').select('*').eq('id', sessId).maybeSingle()
  ])
  const recs = recsRes.data || [], sess = sessRes.data || null
  const pr = recs.filter(r => r.status === 'present'), ab = recs.filter(r => r.status === 'absent')

  modal(`
  <div class="tc-mo open" id="mSess">
    <div class="tc-mb tc-mb-md">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-eye"></i> Session Report</div>
        <button class="tc-mc" onclick="closeM('mSess')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px">
          <span class="tbd tb-amber"><i class="fas fa-calendar"></i> ${sess ? fmtDate(sess.session_date) : '—'}</span>
          <span class="tbd tb-teal"><i class="fas fa-clock"></i> Period ${sess?.period || '—'}</span>
          <span class="tbd tb-blue"><i class="fas fa-book"></i> ${esc(sess?.subject_name || '—')}</span>
          <span class="tbd tb-green"><i class="fas fa-check"></i> ${pr.length} Present</span>
          <span class="tbd tb-red"><i class="fas fa-times"></i> ${ab.length} Absent</span>
        </div>
        ${recs.length
          ? `<div class="tc-tbl-wrap"><table class="tc-tbl">
              <thead><tr><th>Student</th><th>Reg No</th><th>Status</th></tr></thead>
              <tbody>${recs.map(r => `<tr>
                <td style="font-weight:700;color:#fff">${esc(r.student_name || '—')}</td>
                <td style="font-family:monospace;color:var(--tmut)">${esc(r.register_no)}</td>
                <td><span class="tbd ${r.status === 'present' ? 'tb-green' : 'tb-red'}">
                  <i class="fas fa-${r.status === 'present' ? 'check' : 'times'}"></i> ${r.status}
                </span></td>
              </tr>`).join('')}</tbody>
            </table></div>`
          : `<div class="tc-empty"><div class="tc-empty-title">No records found for this session.</div></div>`}
        <div style="text-align:right;margin-top:15px">
          <button class="tb tb-ghost tb-sm" onclick="closeM('mSess')">Close</button>
        </div>
      </div>
    </div>
  </div>`)
}

// ── EDIT CLASSROOM — always fetches fresh ────────────────────
window.openEditRoom = async id => {
  if (!id) return
  const room = await fetchRoom(id)
  if (!room) { showToast('Classroom not found.', 'error'); return }

  _selStu.clear()
  ;(room.student_regnos || []).forEach(r => _selStu.add(r))

  modal(`
  <div class="tc-mo open" id="mEdit">
    <div class="tc-mb tc-mb-lg">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-edit"></i> Edit Classroom — ${esc(room.class_name)}</div>
        <button class="tc-mc" onclick="closeM('mEdit')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">
        <div class="tgrid" style="margin-bottom:18px">
          <div class="tg-fg"><label class="tl"><i class="fas fa-door-open"></i> Classroom Name *</label>
            <input id="ec_name" class="ti" value="${esc(room.class_name)}" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-book"></i> Subject</label>
            <input id="ec_subj" class="ti" value="${esc(room.subject || '')}" placeholder="e.g. Data Structures" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-building"></i> Department (optional)</label>
            <input id="ec_dept" class="ti" value="${esc(room.department || '')}" /></div>
          <div class="tg-fg"><label class="tl"><i class="fas fa-layer-group"></i> Year (optional)</label>
            <select id="ec_year" class="ts"><option value="">Any Year</option>
              ${[1,2,3,4].map(n => `<option value="${n}" ${room.year == n ? 'selected' : ''}>${n}${sfx(n)} Year</option>`).join('')}
            </select></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;flex-wrap:wrap;gap:8px">
          <span style="font-size:.95rem;color:#fff;font-weight:700"><i class="fas fa-users" style="color:var(--tamb);margin-right:7px"></i>Edit Students</span>
          <span class="tbd tb-teal" id="selCnt">${_selStu.size} Selected</span>
        </div>
        <div class="tc-msearch tg-fg"><i class="fas fa-search tc-msearch-ico"></i>
          <input id="stuSearch" class="ti" placeholder="Search name or reg no…" oninput="fltStus()" style="padding-left:37px" /></div>
        <div style="max-height:340px;overflow-y:auto;padding-right:3px" id="stuList">${stuSelHTML(grpStus(_stus))}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:15px;border-top:1px solid var(--tbord)">
          <button class="tb tb-ghost tb-sm" onclick="closeM('mEdit')">Cancel</button>
          <button class="tb tb-pri" id="saveEditRoomBtn" data-save-edit-room="${esc(room.id)}"><i class="fas fa-save"></i> Save Changes</button>
        </div>
      </div>
    </div>
  </div>`)
}

window.saveEditRoom = async id => {
  if (!id) return
  const name = document.getElementById('ec_name')?.value?.trim()
  if (!name) { showToast('Classroom name is required.', 'warning'); return }

  const btn = document.getElementById('saveEditRoomBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' }

  const subj = document.getElementById('ec_subj')?.value?.trim() || null
  const dept = document.getElementById('ec_dept')?.value?.trim() || null
  const year = parseInt(document.getElementById('ec_year')?.value) || null

  const { error } = await supabase.from('classrooms').update({
    class_name: name, subject: subj, department: dept, year,
    student_regnos: [..._selStu], updated_at: new Date().toISOString()
  }).eq('id', id)

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes' }
  if (error) { showToast('Failed: ' + error.message, 'error'); return }

  const idx = _rooms.findIndex(r => r.id === id)
  if (idx >= 0) _rooms[idx] = { ..._rooms[idx], class_name: name, subject: subj, department: dept, year, student_regnos: [..._selStu] }

  showToast('Classroom updated! ✅', 'success')
  closeM('mEdit')
  refreshGrids()
  setTimeout(() => openRoom(id), 400)
}