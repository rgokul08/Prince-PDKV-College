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

    // Toggle date group expand/collapse in room modal
    const dateGroupHdr = e.target.closest('.tc-date-group-hdr')
    if (dateGroupHdr && !e.target.closest('button')) {
      const grp = dateGroupHdr.closest('.tc-date-group')
      if (grp) {
        grp.classList.toggle('expanded')
        const arrow = dateGroupHdr.querySelector('.tc-date-arrow')
        if (arrow) arrow.style.transform = grp.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)'
      }
      return
    }

    // Show student list in room modal
    const stuListBtn = e.target.closest('[data-show-stu-list]')
    if (stuListBtn) {
      const roomId = stuListBtn.getAttribute('data-show-stu-list')
      const panel = document.getElementById('tc-stu-list-panel-' + roomId)
      if (panel) {
        const isHidden = panel.style.display === 'none'
        panel.style.display = isHidden ? 'block' : 'none'
        stuListBtn.innerHTML = isHidden
          ? '<i class="fas fa-users"></i> Hide Student List'
          : '<i class="fas fa-users"></i> Student List'
      }
      return
    }

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

function fmtDateFull(d) {
  if (!d) return '—'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday:'short', day:'2-digit', month:'short', year:'numeric'
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
    <div id="odMgr" class="tu"></div>
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

    /* ── Date group styles for classroom session view ── */
    .tc-date-group { border:1px solid var(--tc-border); border-radius:12px; margin-bottom:8px; overflow:hidden; }
    .tc-date-group-hdr {
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 16px; cursor:pointer;
      background:rgba(255,255,255,0.03);
      transition:background .22s ease;
      user-select:none;
    }
    .tc-date-group-hdr:hover { background:rgba(245,158,11,0.07); }
    .tc-date-group.expanded .tc-date-group-hdr { background:rgba(245,158,11,0.09); border-bottom:1px solid var(--tc-border); }
    .tc-date-group-left { display:flex; align-items:center; gap:12px; }
    .tc-date-group-date { font-weight:800; color:#fff; font-size:.92rem; }
    .tc-date-group-meta { font-size:.76rem; color:var(--tc-muted); }
    .tc-date-arrow { color:var(--tc-amber); font-size:.8rem; transition:transform .25s ease; flex-shrink:0; }
    .tc-date-group-body { display:none; padding:12px 14px; }
    .tc-date-group.expanded .tc-date-group-body { display:block; }
    .tc-period-row {
      display:flex; align-items:center; justify-content:space-between;
      padding:9px 12px; border-radius:9px; margin-bottom:6px;
      background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05);
      flex-wrap:wrap; gap:8px;
    }
    .tc-period-row:last-child { margin-bottom:0; }
    .tc-period-left { display:flex; align-items:center; gap:10px; }
    .tc-period-badge {
      font-size:.72rem; font-weight:800; padding:2px 10px;
      border-radius:50px; background:rgba(245,158,11,.12);
      color:var(--tc-amber); border:1px solid rgba(245,158,11,.25);
      white-space:nowrap;
    }
    .tc-period-subj { font-size:.80rem; color:var(--tc-muted); }

    /* Student list panel */
    .tc-stu-list-panel {
      margin-top:14px; padding:16px;
      background:rgba(255,255,255,0.025);
      border:1px solid var(--tc-border);
      border-radius:12px;
    }
    .tc-stu-list-title {
      font-size:.84rem; font-weight:800; color:var(--tc-amber);
      margin-bottom:12px; display:flex; align-items:center; gap:7px;
    }
    .tc-stu-chips { display:flex; flex-wrap:wrap; gap:7px; }
    .tc-stu-chip {
      display:inline-flex; align-items:center; gap:5px;
      padding:4px 12px; border-radius:50px; font-size:.76rem; font-weight:700;
      background:rgba(45,212,191,0.08); color:var(--tc-teal);
      border:1px solid rgba(45,212,191,0.22);
    }
  </style>`

  setTimeout(initFU, 80)
  renderExamMgr()
  renderOdMgr()
  renderAttMgr()
}

function tci(ico, cls, lbl, val) {
  if (!val) return ''
  return `<div class="tg tc-info-card"><div class="tc-info-icon ${cls}"><i class="${ico}"></i></div><div>
    <div class="tc-info-lbl">${lbl}</div><div class="tc-info-val">${esc(val)}</div>
  </div></div>`
}

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

// ══════════════════════════════════════════════════════════════
// ── EXAM MANAGEMENT ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

let _examRegno    = ''
let _examData     = {}
let _activeSem    = 'sem1'
let _activeExType = 'ciat1'

function renderExamMgr() {
  const c = document.getElementById('examMgr'); if (!c) return
  c.innerHTML = `
  <div style="margin-top:30px;margin-bottom:8px">
    <div class="tc-att-hdr"><i class="fas fa-file-alt"></i> Student Exam Management</div>
    <div class="tg" style="padding:26px 24px;">
      <p style="font-size:.88rem;color:var(--tc-muted);margin-bottom:18px;line-height:1.7;">
        <i class="fas fa-info-circle" style="color:var(--tc-blue)"></i>
        Enter a student's Register Number to create or edit their exam details. Data is saved to the <strong style="color:var(--tc-amber)">exam_information</strong> table.
      </p>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:200px;">
          <label class="tl" style="margin-bottom:7px;"><i class="fas fa-id-badge"></i> Student Register Number</label>
          <input id="examRegnoInput" class="ti" placeholder="e.g. 22CS0001" style="text-transform:uppercase;" />
        </div>
        <button class="tb tb-pri" id="loadExamBtn" onclick="loadStudentExam()">
          <i class="fas fa-search"></i> Load / Create
        </button>
      </div>
      <div id="examEditorArea" style="display:none;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
          <span id="examStudentBadge" class="tbd tb-amber" style="font-size:.86rem;padding:6px 16px;"></span>
          <span class="tbd tb-blue" id="examModeBadge" style="font-size:.80rem;padding:5px 13px;"></span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;" id="examSemTabs">
          ${[1,2,3,4,5,6,7,8].map(n => `
            <button class="tc-tab${n===1?' act':''}" data-exsem="sem${n}" onclick="switchExamSem('sem${n}',this)">
              Sem ${n}
            </button>`).join('')}
        </div>
        <div class="tc-tabs" style="margin-bottom:20px;" id="examTypeTabs">
          <button class="tc-tab act" data-extype="ciat1" onclick="switchExamType('ciat1',this)"><i class="fas fa-pencil-alt"></i> CIAT – I</button>
          <button class="tc-tab" data-extype="ciat2" onclick="switchExamType('ciat2',this)"><i class="fas fa-pen-nib"></i> CIAT – II</button>
          <button class="tc-tab" data-extype="final" onclick="switchExamType('final',this)"><i class="fas fa-graduation-cap"></i> Final Exam</button>
        </div>
        <div id="examSubjectsArea"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--tc-border);">
          <button class="tb tb-ghost tb-sm" onclick="addExamSubjectRow()"><i class="fas fa-plus"></i> Add Subject</button>
          <button class="tb tb-pri" id="saveExamBtn" onclick="saveExamData()"><i class="fas fa-save"></i> Save Exam Data</button>
        </div>
      </div>
      <div id="examLoadMsg" style="display:none;"></div>
    </div>
  </div>
  <style>
    .exam-subj-row {
      display:grid; grid-template-columns: 2fr 1fr 80px 80px 80px 36px;
      gap:8px; align-items:center; padding:8px 10px; margin-bottom:6px;
      background:rgba(255,255,255,0.03); border:1px solid var(--tc-border);
      border-radius:10px; transition:background .2s;
    }
    .exam-subj-row:hover { background:rgba(255,255,255,0.06); }
    .exam-subj-row input { width:100%; }
    .exam-subj-hdr {
      display:grid; grid-template-columns: 2fr 1fr 80px 80px 80px 36px;
      gap:8px; padding:6px 10px; font-size:.70rem; font-weight:800;
      text-transform:uppercase; letter-spacing:.06em; color:var(--tc-muted); margin-bottom:4px;
    }
    @media(max-width:600px){
      .exam-subj-row,.exam-subj-hdr{grid-template-columns:1fr 1fr;gap:6px;}
      .exam-subj-row input:last-of-type{grid-column:1/-1;}
    }
    .exam-rm-btn {
      width:30px;height:30px;border-radius:8px;
      background:rgba(248,113,113,.10);border:1px solid rgba(248,113,113,.28);
      color:var(--tc-red);cursor:pointer;font-size:.8rem;
      display:flex;align-items:center;justify-content:center; transition:all .25s;flex-shrink:0;
    }
    .exam-rm-btn:hover{background:rgba(248,113,113,.22);transform:scale(1.1);}
  </style>`
}

window.loadStudentExam = async () => {
  const raw = document.getElementById('examRegnoInput')?.value?.trim().toUpperCase()
  if (!raw) { showToast('Enter a Register Number.', 'warning'); return }

  _examRegno = raw
  _examData  = {}
  _activeSem    = 'sem1'
  _activeExType = 'ciat1'

  const btn = document.getElementById('loadExamBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading…' }

  const msgEl = document.getElementById('examLoadMsg')
  if (msgEl) { msgEl.style.display = 'none'; msgEl.innerHTML = '' }

  const { data: stuData } = await supabase.from('student_information')
    .select('register_no,name,department,year').ilike('register_no', raw).maybeSingle()

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Load / Create' }

  if (!stuData) {
    if (msgEl) {
      msgEl.style.display = 'flex'
      msgEl.className = 'tc-msg tc-msg-err'
      msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Student not found with this Register Number.'
    }
    return
  }

  const { data: examRow } = await supabase.from('exam_information')
    .select('*').ilike('register_no', raw).maybeSingle()

  const isNew = !examRow
  if (examRow && examRow.exam_data) {
    _examData = JSON.parse(JSON.stringify(examRow.exam_data))
  }

  const editorEl = document.getElementById('examEditorArea')
  if (editorEl) editorEl.style.display = 'block'

  const studentBadge = document.getElementById('examStudentBadge')
  if (studentBadge) {
    studentBadge.innerHTML = `<i class="fas fa-user-graduate"></i> ${esc(stuData.name || raw)} · ${esc(raw)}`
  }

  const modeBadge = document.getElementById('examModeBadge')
  if (modeBadge) {
    modeBadge.innerHTML = isNew
      ? '<i class="fas fa-plus-circle"></i> New Record'
      : '<i class="fas fa-edit"></i> Editing Existing'
    modeBadge.className = `tbd ${isNew ? 'tb-green' : 'tb-amber'}`
  }

  if (msgEl) { msgEl.style.display = 'none' }

  document.querySelectorAll('#examSemTabs .tc-tab').forEach(t => t.classList.remove('act'))
  document.querySelector('#examSemTabs [data-exsem="sem1"]')?.classList.add('act')
  document.querySelectorAll('#examTypeTabs .tc-tab').forEach(t => t.classList.remove('act'))
  document.querySelector('#examTypeTabs [data-extype="ciat1"]')?.classList.add('act')
  _activeSem = 'sem1'; _activeExType = 'ciat1'

  renderExamSubjectsTable()
  showToast(isNew ? `Creating new exam record for ${raw}` : `Loaded exam data for ${raw}`, isNew ? 'info' : 'success')
}

window.switchExamSem = (sem, btn) => {
  _collectCurrentSubjects()
  _activeSem = sem
  document.querySelectorAll('#examSemTabs .tc-tab').forEach(t => t.classList.remove('act'))
  btn.classList.add('act')
  renderExamSubjectsTable()
}

window.switchExamType = (typ, btn) => {
  _collectCurrentSubjects()
  _activeExType = typ
  document.querySelectorAll('#examTypeTabs .tc-tab').forEach(t => t.classList.remove('act'))
  btn.classList.add('act')
  renderExamSubjectsTable()
}

function _getSubjects() {
  if (!_examData[_activeSem]) _examData[_activeSem] = {}
  if (!_examData[_activeSem][_activeExType]) _examData[_activeSem][_activeExType] = []
  return _examData[_activeSem][_activeExType]
}

function _collectCurrentSubjects() {
  const rows = document.querySelectorAll('.exam-subj-row[data-idx]')
  if (!rows.length) return
  if (!_examData[_activeSem]) _examData[_activeSem] = {}
  const collected = []
  rows.forEach(row => {
    const subjectName = row.querySelector('.ex-subj-name')?.value?.trim() || ''
    const subjectCode = row.querySelector('.ex-subj-code')?.value?.trim() || ''
    const maxMark     = row.querySelector('.ex-subj-max')?.value?.trim() || ''
    const marks       = row.querySelector('.ex-subj-marks')?.value?.trim() || ''
    if (subjectName || subjectCode) {
      collected.push({
        subject:      subjectName,
        subject_name: subjectName,
        code:         subjectCode,
        subject_code: subjectCode,
        max:          maxMark !== '' ? parseFloat(maxMark) : 100,
        marks:        marks !== ''   ? parseFloat(marks)   : 0
      })
    }
  })
  _examData[_activeSem][_activeExType] = collected
}

function renderExamSubjectsTable() {
  const area = document.getElementById('examSubjectsArea'); if (!area) return
  const subjects = _getSubjects()
  const typeLabelMap = { ciat1: 'CIAT – I', ciat2: 'CIAT – II', final: 'Final Examination' }
  const semNum = parseInt(_activeSem.replace('sem',''))

  area.innerHTML = `
    <div style="font-size:.85rem;font-weight:800;color:var(--tc-amber);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-layer-group"></i> Semester ${semNum} &nbsp;→&nbsp; ${typeLabelMap[_activeExType] || _activeExType}
      <span style="font-size:.72rem;color:var(--tc-muted);font-weight:600;margin-left:4px;">(${subjects.length} subject${subjects.length !== 1 ? 's' : ''})</span>
    </div>
    ${subjects.length === 0 ? `
      <div class="tc-empty" style="padding:28px 20px;margin-bottom:14px;">
        <div class="tc-empty-ico" style="font-size:1.8rem;">📋</div>
        <div class="tc-empty-title">No Subjects Added</div>
        <div class="tc-empty-sub">Click "Add Subject" below to start entering exam data.</div>
      </div>` : `
      <div class="exam-subj-hdr">
        <span>Subject Name</span><span>Subject Code</span><span>Max Marks</span>
        <span>Marks Obtained</span><span>Percentage</span><span></span>
      </div>
      <div id="examSubjRows">
        ${subjects.map((s, i) => examSubjRowHTML(s, i)).join('')}
      </div>`}`

  _bindExamRowListeners()
}

function examSubjRowHTML(s, idx) {
  const max   = parseFloat(s.max)   || 100
  const marks = parseFloat(s.marks) || 0
  const pct   = max > 0 ? (marks / max * 100).toFixed(1) : '—'
  const pctCol = parseFloat(pct) >= 75 ? 'var(--tc-green)' : parseFloat(pct) >= 50 ? 'var(--sp-gold, #fbbf24)' : 'var(--tc-red)'

  return `<div class="exam-subj-row" data-idx="${idx}">
    <input class="ti ex-subj-name" placeholder="Subject Name *" value="${esc(s.subject || s.subject_name || '')}" />
    <input class="ti ex-subj-code" placeholder="e.g. CS3401" value="${esc(s.code || s.subject_code || '')}" />
    <input class="ti ex-subj-max" type="number" placeholder="Max" value="${max}" min="0" max="200" step="0.5" />
    <input class="ti ex-subj-marks" type="number" placeholder="Marks" value="${marks}" min="0" max="200" step="0.5" />
    <span class="ex-subj-pct" style="color:${pctCol};font-weight:800;font-size:.85rem;text-align:center;">${pct}%</span>
    <button type="button" class="exam-rm-btn" data-rm-idx="${idx}" title="Remove subject"><i class="fas fa-trash"></i></button>
  </div>`
}

function _bindExamRowListeners() {
  document.querySelectorAll('.exam-subj-row').forEach(row => {
    const maxInp   = row.querySelector('.ex-subj-max')
    const marksInp = row.querySelector('.ex-subj-marks')
    const pctSpan  = row.querySelector('.ex-subj-pct')

    const updatePct = () => {
      const mx = parseFloat(maxInp?.value) || 0
      const ob = parseFloat(marksInp?.value) || 0
      if (mx > 0) {
        const p = (ob / mx * 100).toFixed(1)
        if (pctSpan) {
          pctSpan.textContent = p + '%'
          pctSpan.style.color = parseFloat(p) >= 75 ? 'var(--tc-green)' : parseFloat(p) >= 50 ? '#fbbf24' : 'var(--tc-red)'
        }
      } else {
        if (pctSpan) { pctSpan.textContent = '—'; pctSpan.style.color = 'var(--tc-muted)' }
      }
    }

    maxInp?.addEventListener('input', updatePct)
    marksInp?.addEventListener('input', updatePct)

    const rmBtn = row.querySelector('.exam-rm-btn')
    if (rmBtn) {
      rmBtn.addEventListener('click', () => {
        _collectCurrentSubjects()
        const idx = parseInt(rmBtn.getAttribute('data-rm-idx'))
        if (!isNaN(idx) && _examData[_activeSem]?.[_activeExType]) {
          _examData[_activeSem][_activeExType].splice(idx, 1)
        }
        renderExamSubjectsTable()
      })
    }
  })
}

window.addExamSubjectRow = () => {
  _collectCurrentSubjects()
  if (!_examData[_activeSem]) _examData[_activeSem] = {}
  if (!_examData[_activeSem][_activeExType]) _examData[_activeSem][_activeExType] = []
  _examData[_activeSem][_activeExType].push({ subject: '', subject_name: '', code: '', subject_code: '', max: 100, marks: 0 })
  renderExamSubjectsTable()
  setTimeout(() => {
    const rows = document.querySelectorAll('.exam-subj-row')
    rows[rows.length - 1]?.querySelector('.ex-subj-name')?.focus()
  }, 60)
}

window.saveExamData = async () => {
  if (!_examRegno) { showToast('No student loaded.', 'warning'); return }
  _collectCurrentSubjects()

  let totalSubjects = 0
  Object.values(_examData).forEach(sem => {
    Object.values(sem).forEach(type => { totalSubjects += (type || []).length })
  })

  if (totalSubjects === 0) {
    showToast('Please add at least one subject before saving.', 'warning')
    return
  }

  const btn = document.getElementById('saveExamBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' }

  const { error } = await supabase.from('exam_information')
    .upsert({ register_no: _examRegno, exam_data: _examData, updated_at: new Date().toISOString() },
            { onConflict: 'register_no' })

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Exam Data' }
  if (error) { showToast('Save failed: ' + error.message, 'error'); return }

  showToast(`Exam data saved for ${_examRegno}! ✅`, 'success')

  const modeBadge = document.getElementById('examModeBadge')
  if (modeBadge) {
    modeBadge.innerHTML = '<i class="fas fa-edit"></i> Editing Existing'
    modeBadge.className = 'tbd tb-amber'
  }
}

// ── END EXAM MANAGEMENT ───────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// ── OD MANAGEMENT (UPDATED) ───────────────────────────────────
// ══════════════════════════════════════════════════════════════

function renderOdMgr() {
  const c = document.getElementById('odMgr'); if (!c) return
  c.innerHTML = `
  <div style="margin-top:30px;margin-bottom:8px">
    <div class="tc-att-hdr"><i class="fas fa-user-check"></i> OD / Attendance Correction</div>
    <div class="tg" style="padding:26px 24px;">
      <p style="font-size:.88rem;color:var(--tc-muted);margin-bottom:18px;line-height:1.7;">
        <i class="fas fa-info-circle" style="color:var(--tc-blue)"></i>
        Enter a student's Register Number to view their attendance and correct absent records by granting OD.
      </p>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px;">
        <div style="flex:1;min-width:200px;">
          <label class="tl" style="margin-bottom:7px;"><i class="fas fa-id-badge"></i> Student Register Number</label>
          <input id="odRegnoInput" class="ti" placeholder="e.g. 22CS0001" style="text-transform:uppercase;"
            onkeydown="if(event.key==='Enter'){event.preventDefault();loadStudentOd();}" />
        </div>
        <button class="tb tb-pri" id="loadOdBtn" onclick="loadStudentOd()">
          <i class="fas fa-search"></i> Load Attendance
        </button>
      </div>
      <div id="odResultArea" style="display:none;"></div>
      <div id="odLoadMsg" style="display:none;"></div>
    </div>
  </div>`
}

window.loadStudentOd = async () => {
  const raw = document.getElementById('odRegnoInput')?.value?.trim().toUpperCase()
  if (!raw) { showToast('Enter a Register Number.', 'warning'); return }

  const btn = document.getElementById('loadOdBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading…' }

  const msgEl = document.getElementById('odLoadMsg')
  if (msgEl) { msgEl.style.display = 'none'; msgEl.innerHTML = '' }

  const resultEl = document.getElementById('odResultArea')
  if (resultEl) { resultEl.style.display = 'none'; resultEl.innerHTML = '' }

  // Check student exists
  const { data: stuData } = await supabase.from('student_information')
    .select('register_no,name,department,year').ilike('register_no', raw).maybeSingle()

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Load Attendance' }

  if (!stuData) {
    if (msgEl) {
      msgEl.style.display = 'flex'
      msgEl.className = 'tc-msg tc-msg-err'
      msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Student not found with this Register Number.'
    }
    return
  }

  // Load all attendance_records for this student
  const { data: allRecords } = await supabase.from('attendance_records')
    .select('*').ilike('register_no', raw)
    .order('session_date', { ascending: true })
    .order('period', { ascending: true })

  const records = allRecords || []

  if (records.length === 0) {
    if (msgEl) {
      msgEl.style.display = 'flex'
      msgEl.className = 'tc-msg tc-msg-err'
      msgEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> No attendance records found for this student yet.'
    }
    return
  }

  // ── Attendance Calculation (same logic as shared.js / Student.js) ──
  // Group records by date
  const byDate = {}
  records.forEach(r => {
    const d = (r.session_date || '').split('T')[0]
    if (!d) return
    if (!byDate[d]) byDate[d] = { present: 0, absent: 0, total: 0 }
    byDate[d].total++
    if (r.status === 'present') byDate[d].present++
    else byDate[d].absent++
  })

  const workingDates = Object.keys(byDate).sort()
  const D = workingDates.length // total working days

  // Sum of daily present/absent values (each day = present_periods/total_periods for that day)
  let sumP = 0, sumA = 0
  workingDates.forEach(date => {
    const day = byDate[date]
    sumP += day.total > 0 ? day.present / day.total : 0
    sumA += day.total > 0 ? day.absent  / day.total : 0
  })

  const presentPct = D > 0 ? (sumP / D) * 100 : 0
  const absentPct  = D > 0 ? (sumA / D) * 100 : 0

  const totalPeriods   = records.length
  const presentPeriods = records.filter(r => r.status === 'present').length
  const absentPeriods  = records.filter(r => r.status === 'absent').length

  const pNum = parseFloat(presentPct.toFixed(1))
  const aNum = parseFloat(absentPct.toFixed(1))
  const pctCol = pNum >= 75 ? 'var(--tc-green)' : pNum >= 65 ? '#fbbf24' : 'var(--tc-red)'

  // Warning text
  let warnTxt = '', warnBg = '', warnCol = ''
  if (pNum >= 75) {
    warnTxt = '✅ Good standing! Attendance meets the 75% requirement.'
    warnBg  = 'rgba(52,211,153,0.10)'; warnCol = '#6ee7b7'
  } else if (pNum >= 65) {
    const need = Math.ceil((0.75 * D - sumP) / 0.25)
    warnTxt = `⚠️ Low attendance! Needs ${Math.max(0, need)} more consecutive full-day attendances to reach 75%.`
    warnBg  = 'rgba(251,191,36,0.10)'; warnCol = '#fde68a'
  } else {
    warnTxt = '🚨 Critical attendance! Immediate improvement required.'
    warnBg  = 'rgba(248,113,113,0.12)'; warnCol = '#fca5a5'
  }

  const absentRecords  = records.filter(r => r.status === 'absent')
  const presentRecords = records.filter(r => r.status === 'present')

  const yr = stuData.year || 0
  const yrSfx = { 1:'st', 2:'nd', 3:'rd', 4:'th' }[yr] || 'th'

  if (resultEl) {
    resultEl.style.display = 'block'
    resultEl.innerHTML = `
    <div style="border:1px solid var(--tc-border);border-radius:16px;overflow:hidden;margin-bottom:4px;">

      <!-- Student Header -->
      <div style="background:rgba(245,158,11,0.08);border-bottom:1px solid var(--tc-border);
                  padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:700;color:#fff;">
            <i class="fas fa-user-graduate" style="color:var(--tc-amber);margin-right:8px;"></i>${esc(stuData.name || raw)}
          </div>
          <div style="font-size:.78rem;color:var(--tc-muted);margin-top:4px;">
            ${esc(raw)}${stuData.department ? ' &bull; ' + esc(stuData.department) : ''}${yr ? ' &bull; Year ' + yr + yrSfx : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="tbd tb-amber" style="font-size:.9rem;padding:6px 16px;">
            <i class="fas fa-percentage"></i> ${pNum.toFixed(1)}% Attendance
          </span>
          <span class="tbd ${pNum >= 75 ? 'tb-green' : 'tb-red'}" style="font-size:.85rem;">
            ${pNum >= 75
              ? '<i class="fas fa-check-circle"></i> Good Standing'
              : '<i class="fas fa-exclamation-triangle"></i> Low Attendance'}
          </span>
        </div>
      </div>

      <!-- Stats Row: 5 columns -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--tc-border);">
        <div style="padding:14px 10px;text-align:center;border-right:1px solid var(--tc-border);">
          <div style="font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;color:var(--tc-blue);">${D}</div>
          <div style="font-size:.68rem;color:var(--tc-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Working Days</div>
        </div>
        <div style="padding:14px 10px;text-align:center;border-right:1px solid var(--tc-border);">
          <div style="font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;color:var(--tc-green);">${presentPeriods}</div>
          <div style="font-size:.68rem;color:var(--tc-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Present Periods</div>
        </div>
        <div style="padding:14px 10px;text-align:center;border-right:1px solid var(--tc-border);">
          <div style="font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;color:var(--tc-red);">${absentPeriods}</div>
          <div style="font-size:.68rem;color:var(--tc-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Absent Periods</div>
        </div>
        <div style="padding:14px 10px;text-align:center;border-right:1px solid var(--tc-border);">
          <div style="font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;color:#93c5fd;">${totalPeriods}</div>
          <div style="font-size:.68rem;color:var(--tc-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Total Periods</div>
        </div>
        <div style="padding:14px 10px;text-align:center;">
          <div style="font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;color:${pctCol};">${pNum.toFixed(1)}%</div>
          <div style="font-size:.68rem;color:var(--tc-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:2px;">Attendance %</div>
        </div>
      </div>

      <!-- Warning bar -->
      <div style="padding:10px 20px;background:${warnBg};border-bottom:1px solid var(--tc-border);">
        <span style="font-size:.83rem;font-weight:700;color:${warnCol};">${warnTxt}</span>
      </div>

      <!-- Absent Records Section -->
      <div style="padding:18px 20px;">
        <div style="font-size:.9rem;font-weight:800;color:#fff;margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <i class="fas fa-times-circle" style="color:var(--tc-red);"></i>
          Absent Sessions (${absentRecords.length})
          <span style="font-size:.72rem;color:var(--tc-muted);font-weight:500;">
            — Tick checkboxes to grant OD &amp; mark as Present
          </span>
        </div>

        ${absentRecords.length === 0
          ? `<div style="text-align:center;padding:24px;color:var(--tc-muted);background:rgba(52,211,153,0.04);
                         border:1px solid rgba(52,211,153,0.14);border-radius:12px;">
              <i class="fas fa-check-circle" style="font-size:2rem;color:var(--tc-green);opacity:.6;display:block;margin-bottom:10px;"></i>
              <div style="font-weight:700;color:var(--tc-green);margin-bottom:4px;">No Absent Records</div>
              <div style="font-size:.82rem;">This student has no absent sessions on record.</div>
            </div>`
          : `<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="tb tb-ghost tb-sm" onclick="odSelectAll()">
                <i class="fas fa-check-double"></i> Select All
              </button>
              <button class="tb tb-ghost tb-sm" onclick="odDeselectAll()">
                <i class="fas fa-times"></i> Deselect All
              </button>
              <span id="odSelCount" style="font-size:.78rem;color:var(--tc-muted);font-weight:700;">0 selected</span>
            </div>
            <div id="odAbsentList" style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;padding-right:2px;">
              ${absentRecords.map(r => {
                const rawDate = (r.session_date || '').split('T')[0]
                const dateStr = rawDate
                  ? new Date(rawDate + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday:'short', day:'2-digit', month:'short', year:'numeric'
                    })
                  : '—'
                return `<label class="od-abs-row" data-record-id="${esc(r.id)}"
                          style="display:flex;align-items:center;gap:12px;
                                 padding:11px 14px;
                                 background:rgba(248,113,113,0.05);
                                 border:1px solid rgba(248,113,113,0.16);
                                 border-radius:10px;cursor:pointer;
                                 transition:all .22s;user-select:none;">
                  <input type="checkbox" class="od-chk" data-record-id="${esc(r.id)}"
                         onchange="odUpdateSelCount()"
                         style="width:17px;height:17px;accent-color:var(--tc-green);cursor:pointer;flex-shrink:0;" />
                  <div style="flex:1;">
                    <div style="font-size:.86rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <i class="fas fa-calendar-times" style="color:var(--tc-red);font-size:.8rem;"></i>
                      <span>${dateStr}</span>
                      ${r.period ? `<span style="color:var(--tc-amber);background:rgba(245,158,11,0.10);padding:1px 8px;border-radius:50px;font-size:.75rem;">Period ${esc(String(r.period))}</span>` : ''}
                    </div>
                    <div style="font-size:.74rem;color:var(--tc-muted);margin-top:3px;">
                      ${r.subject_name ? `<i class="fas fa-book" style="margin-right:4px;"></i>${esc(r.subject_name)}` : '<i class="fas fa-minus"></i> Subject not recorded'}
                    </div>
                  </div>
                  <span style="font-size:.72rem;font-weight:800;padding:3px 10px;border-radius:50px;
                        flex-shrink:0;background:rgba(248,113,113,0.12);color:var(--tc-red);
                        border:1px solid rgba(248,113,113,0.24);white-space:nowrap;">
                    <i class="fas fa-times"></i> Absent
                  </span>
                </label>`
              }).join('')}
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid var(--tc-border);">
              <button class="tb tb-pri" id="saveOdBtn" onclick="saveOdChanges('${esc(raw)}')">
                <i class="fas fa-user-check"></i> Grant OD &amp; Save
              </button>
            </div>`
        }
      </div>

      <!-- Present Records Summary -->
      ${presentRecords.length > 0 ? `
      <div style="padding:0 20px 18px;border-top:1px solid var(--tc-border);">
        <div style="font-size:.88rem;font-weight:800;color:var(--tc-green);margin:14px 0 10px;display:flex;align-items:center;gap:7px;">
          <i class="fas fa-check-circle"></i> Present Sessions (${presentRecords.length})
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:140px;overflow-y:auto;">
          ${presentRecords.map(r => {
            const rawDate = (r.session_date || '').split('T')[0]
            const dateStr = rawDate
              ? new Date(rawDate + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
              : '—'
            return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;
                          background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.20);
                          border-radius:50px;font-size:.71rem;font-weight:700;color:var(--tc-green);">
              <i class="fas fa-check" style="font-size:.6rem;"></i>
              ${dateStr}${r.period ? ' P' + r.period : ''}${r.subject_name ? ' · ' + esc(r.subject_name) : ''}
            </span>`
          }).join('')}
        </div>
      </div>` : ''}
    </div>`
  }
}

window.odUpdateSelCount = () => {
  const total   = document.querySelectorAll('.od-chk').length
  const checked = document.querySelectorAll('.od-chk:checked').length
  const el = document.getElementById('odSelCount')
  if (el) el.textContent = `${checked} of ${total} selected`
}

window.odSelectAll = () => {
  document.querySelectorAll('.od-chk').forEach(c => { c.checked = true })
  odUpdateSelCount()
}

window.odDeselectAll = () => {
  document.querySelectorAll('.od-chk').forEach(c => { c.checked = false })
  odUpdateSelCount()
}

window.saveOdChanges = async (regno) => {
  const checkboxes = document.querySelectorAll('.od-chk:checked')
  if (checkboxes.length === 0) {
    showToast('No sessions selected. Tick the checkboxes for sessions you want to grant OD.', 'warning')
    return
  }

  const btn = document.getElementById('saveOdBtn')
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…' }

  const selectedIds = Array.from(checkboxes)
    .map(c => c.getAttribute('data-record-id'))
    .filter(Boolean)

  let successCount = 0, errorCount = 0

  for (const recId of selectedIds) {
    const { error } = await supabase.from('attendance_records')
      .update({ status: 'present' }).eq('id', recId)
    if (error) errorCount++
    else successCount++
  }

  if (errorCount > 0 && successCount === 0) {
    showToast('Failed to update records. Please try again.', 'error')
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-check"></i> Grant OD & Save' }
    return
  }

  await _recalcStudentAttendance(regno)

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-check"></i> Grant OD & Save' }

  if (errorCount > 0) {
    showToast(`${successCount} session(s) updated, ${errorCount} failed.`, 'warning')
  } else {
    showToast(`OD granted for ${successCount} session(s)! Attendance recalculated. ✅`, 'success')
  }

  setTimeout(() => loadStudentOd(), 400)
}

async function _recalcStudentAttendance(regno) {
  try {
    const { data: records } = await supabase.from('attendance_records')
      .select('*').ilike('register_no', regno)

    if (!records || !records.length) return

    const totalDays    = records.length
    const presentDays  = records.filter(r => r.status === 'present').length
    const absentDays   = records.filter(r => r.status === 'absent').length
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
      register_no:    regno,
      total_days:     totalDays,
      present_days:   presentDays,
      absent_days:    absentDays,
      absent_details: absentDetails,
      period_stats:   Object.values(statsByDate),
      updated_at:     new Date().toISOString()
    }, { onConflict: 'register_no' })

  } catch (err) { console.error('_recalcStudentAttendance error:', err) }
}

// ── END OD MANAGEMENT ─────────────────────────────────────────

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

// ── OPEN ROOM (UPDATED) — last 7 days grouped by date ────────
window.openRoom = async id => {
  if (!id) { showToast('Invalid classroom ID.', 'error'); return }
  const room = await fetchRoom(id)
  if (!room) { showToast('Classroom not found or deleted.', 'error'); return }

  const stus = _stus.filter(s => (room.student_regnos || []).includes(s.register_no))

  // Fetch last 7 days of sessions
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 6) // today + 6 days back = 7 days total
  const cutoffISO = cutoff.toISOString().split('T')[0]
  const todayISO  = new Date().toISOString().split('T')[0]

  const { data: sessions } = await supabase.from('attendance_sessions').select('*')
    .eq('classroom_id', id)
    .gte('session_date', cutoffISO)
    .lte('session_date', todayISO)
    .order('session_date', { ascending: false })
    .order('period', { ascending: true })

  const sessionList = sessions || []

  // Group sessions by date
  const byDate = {}
  sessionList.forEach(s => {
    const d = (s.session_date || '').split('T')[0]
    if (!d) return
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(s)
  })

  // Sort dates descending (most recent first)
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Build grouped date HTML
  const dateGroupsHtml = sortedDates.length === 0
    ? `<div style="text-align:center;padding:24px;color:var(--tc-muted);">
        <i class="fas fa-calendar-times" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px;"></i>
        No sessions in the last 7 days.
       </div>`
    : sortedDates.map(date => {
        const daySessions = byDate[date]
        const isToday = date === todayISO
        const dateStr = fmtDateFull(date)
        const periodCount = daySessions.length

        // Collect unique subjects for summary
        const subjects = [...new Set(daySessions.map(s => s.subject_name).filter(Boolean))]
        const subjSummary = subjects.length > 0 ? subjects.slice(0, 2).join(', ') + (subjects.length > 2 ? '…' : '') : ''

        const periodRows = daySessions.map(s => `
          <div class="tc-period-row">
            <div class="tc-period-left">
              <span class="tc-period-badge">Period ${s.period || '—'}</span>
              <span class="tc-period-subj">${esc(s.subject_name || 'No subject recorded')}</span>
            </div>
            <button class="tb tb-ghost tb-sm" data-view-sess="${esc(s.id)}"
              style="font-size:.72rem;padding:5px 12px;">
              <i class="fas fa-eye"></i> View
            </button>
          </div>`).join('')

        return `
        <div class="tc-date-group">
          <div class="tc-date-group-hdr">
            <div class="tc-date-group-left">
              <div>
                <div class="tc-date-group-date">
                  ${isToday ? '<span style="color:var(--tc-amber);font-size:.72rem;font-weight:800;margin-right:6px;background:rgba(245,158,11,0.12);padding:1px 7px;border-radius:50px;border:1px solid rgba(245,158,11,0.25);">TODAY</span>' : ''}
                  ${dateStr}
                </div>
                <div class="tc-date-group-meta">
                  ${periodCount} period${periodCount !== 1 ? 's' : ''}
                  ${subjSummary ? ` &bull; ${esc(subjSummary)}` : ''}
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="tbd tb-amber" style="font-size:.72rem;padding:2px 9px;">${periodCount} Period${periodCount !== 1 ? 's' : ''}</span>
              <i class="fas fa-chevron-down tc-date-arrow"></i>
            </div>
          </div>
          <div class="tc-date-group-body">
            ${periodRows}
          </div>
        </div>`
      }).join('')

  // Student list panel HTML
  const stuListHtml = stus.length > 0
    ? stus.map(s => `<span class="tc-stu-chip"><i class="fas fa-user"></i> ${esc(s.name || s.register_no)}</span>`).join('')
    : '<span style="color:var(--tc-muted);font-size:.84rem;">No student profiles found for this classroom.</span>'

  modal(`
  <div class="tc-mo open" id="mRoom">
    <div class="tc-mb tc-mb-lg">
      <div class="tc-mh">
        <div class="tc-mt"><i class="fas fa-door-open"></i> ${esc(room.class_name)}</div>
        <button class="tc-mc" onclick="closeM('mRoom')"><i class="fas fa-times"></i></button>
      </div>
      <div class="tc-mbd">

        <!-- Room info & action buttons -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:13px;margin-bottom:20px">
          <div>
            <div style="font-size:1.1rem;color:#fff;font-weight:700">${esc(room.class_name)}</div>
            <div style="font-size:.8rem;color:var(--tc-muted);margin-top:4px">
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

        <!-- Student List toggle button -->
        <div style="margin-bottom:18px;">
          <button class="tb tb-ghost tb-sm" data-show-stu-list="${esc(room.id)}">
            <i class="fas fa-users"></i> Student List
          </button>
          <div id="tc-stu-list-panel-${esc(room.id)}" class="tc-stu-list-panel" style="display:none;">
            <div class="tc-stu-list-title">
              <i class="fas fa-users"></i> Students in this Classroom (${stus.length})
            </div>
            <div class="tc-stu-chips">${stuListHtml}</div>
          </div>
        </div>

        <!-- Last 7 days attendance sessions (grouped by date) -->
        <div style="margin-bottom:20px">
          <div style="font-size:.9rem;color:#fff;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span><i class="fas fa-history" style="color:var(--tc-amber)"></i> Attendance Sessions — Last 7 Days</span>
            <span style="font-size:.75rem;color:var(--tc-muted);font-weight:400;">${sortedDates.length} day${sortedDates.length !== 1 ? 's' : ''} · ${sessionList.length} session${sessionList.length !== 1 ? 's' : ''}</span>
            <span style="font-size:.72rem;color:var(--tc-muted);font-weight:500;">
              (Click a date to expand sessions)
            </span>
          </div>
          <div id="dateGroupsContainer">
            ${dateGroupsHtml}
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
          <div style="font-size:.86rem;color:var(--tc-muted);line-height:1.65;margin-bottom:22px;">
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

// ── MARK ATTENDANCE ───────────────────────────────────────────
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

// ── EDIT CLASSROOM ────────────────────────────────────────────
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