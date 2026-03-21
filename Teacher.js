import { supabase } from './supabaseClient.js'
import { initStickyHeader, initHamburger, initScrollAnimations, showToast, initAuth, openAuthModal, logoutUser, getCurrentUser, initRipple, initPageTransitions } from './shared.js'

let loggedTeacher = null   // teacher row from teacher_information

document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initScrollAnimations()
  initRipple()

  await initAuth()

  document.getElementById('headerLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout').forEach(btn => {
    btn.addEventListener('click', async () => { await logoutUser() })
  })

  setupLoginForm()
  setupRegisterForm()
  setupImageUpload()
  setupSearch()

  await loadAllTeachers()
  showSection('notLoggedIn')
})

// ── SECTION SWITCHER ─────────────────────────────────────
function showSection(which) {
  const map = {
    notLoggedIn: 'tch-notLoggedIn',
    loading:     'tch-loading',
    profile:     'tch-profile'
  }
  Object.values(map).forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  })
  if (which && map[which]) document.getElementById(map[which]).style.display = 'block'
}

// ── LOGIN ─────────────────────────────────────────────────
function setupLoginForm() {
  document.getElementById('tch-loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('tch-loginBtn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in…'

    const regno = document.getElementById('tch-loginRegno').value.trim()
    const pass  = document.getElementById('tch-loginPass').value.trim()

    if (!regno || !pass) {
      showToast('Please enter both Register Number and Password.', 'warning')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
      return
    }

    // Check credentials first
    const { data: cred, error: credErr } = await supabase
      .from('teacher_credentials')
      .select('*')
      .ilike('register_no', regno)
      .maybeSingle()

    if (credErr || !cred) {
      showToast('No account found with this Register Number. Please create an account below.', 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
      return
    }

    if (cred.password_hash !== pass) {
      showToast('Incorrect password. Please try again.', 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
      return
    }

    // Credentials are valid. Now fetch teacher profile from teacher_information
    const { data: teacher, error: tchErr } = await supabase
      .from('teacher_information')
      .select('*')
      .ilike('register_no', regno)
      .maybeSingle()

    if (tchErr) {
      showToast('Error fetching profile: ' + tchErr.message, 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
      return
    }

    if (!teacher) {
      // Credentials exist but no profile — show full registration form pre-filled with regno
      showToast('Account verified! Please complete your faculty profile.', 'info')
      showSection(null)
      document.getElementById('tch-notLoggedIn').style.display = 'none'
      renderSetupProfileForm(regno)
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
      return
    }

    // Both credentials and profile found — show profile
    loggedTeacher = teacher
    showToast(`Welcome back, ${teacher.name}! 👋`, 'success')
    document.getElementById('tch-allTeachers').style.display = 'none'
    showSection('profile')
    renderProfile(teacher)

    btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'
  })
}

// ── SETUP PROFILE FORM (when credentials exist but teacher_information row doesn't) ─────
function renderSetupProfileForm(regno) {
  let container = document.getElementById('tch-setupProfile')
  if (!container) {
    container = document.createElement('div')
    container.id = 'tch-setupProfile'
    document.getElementById('tch-allTeachers').insertAdjacentElement('beforebegin', container)
  }
  container.style.display = 'block'
  document.getElementById('tch-allTeachers').style.display = 'none'

  container.innerHTML = `
    <div style="max-width:900px;margin:0 auto;" class="animate-fade-up">
      <div style="text-align:center;margin-bottom:36px;">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-light));display:flex;align-items:center;justify-content:center;font-size:2rem;color:white;margin:0 auto 16px;box-shadow:0 12px 32px rgba(26,35,126,0.3);">
          <i class="fas fa-id-card"></i>
        </div>
        <h2 style="font-family:'Poppins',sans-serif;font-size:1.8rem;font-weight:800;color:var(--primary);">Complete Your Faculty Profile</h2>
        <p style="color:var(--text-muted);">Your account is verified. Please fill in your details to complete registration.</p>
      </div>
      <div style="background:white;border-radius:var(--radius-xl);box-shadow:var(--shadow-lg);padding:clamp(28px,5vw,48px);">
        <form id="tch-setupForm" novalidate>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:20px;">
            <div class="form-group">
              <label class="form-label"><i class="fas fa-user"></i> Full Name *</label>
              <input type="text" id="setup-name" class="form-input" placeholder="Dr. / Prof. Full Name" required />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-id-badge"></i> Register Number *</label>
              <input type="text" id="setup-regno" class="form-input" value="${regno}" readonly style="background:#f8fafc;" />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-envelope"></i> Email *</label>
              <input type="email" id="setup-email" class="form-input" placeholder="faculty@pdkv.ac.in" required />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-phone"></i> Phone *</label>
              <input type="tel" id="setup-phone" class="form-input" placeholder="+91 99999 99999" required />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-venus-mars"></i> Gender *</label>
              <select id="setup-gender" class="form-select" required>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-book"></i> Department *</label>
              <select id="setup-dept" class="form-select" required>
                <option value="">Select Department</option>
                <option>Computer Science &amp; Engineering (CSE)</option>
                <option>Artificial Intelligence &amp; Data Science (AIDS)</option>
                <option>Cyber Security (CYBER)</option>
                <option>Electronics &amp; Communication Engineering (ECE)</option>
                <option>Electrical &amp; Electronics Engineering (EEE)</option>
                <option>Mechanical Engineering (MECH)</option>
                <option>Civil Engineering (CIVIL)</option>
                <option>Master of Business Administration (MBA)</option>
                <option>M.Tech Computer Science (MTECH-CSE)</option>
                <option>M.Tech VLSI Design (MTECH-VLSI)</option>
                <option>Mathematics</option><option>Physics</option>
                <option>Chemistry</option><option>English</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-user-graduate"></i> Designation *</label>
              <select id="setup-designation" class="form-select" required>
                <option value="">Select Designation</option>
                <option>Professor</option><option>Associate Professor</option>
                <option>Assistant Professor</option><option>Senior Lecturer</option>
                <option>Lecturer</option><option>HOD</option>
                <option>Principal</option><option>Dean</option>
              </select>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-chalkboard"></i> Subjects (comma separated) *</label>
              <input type="text" id="setup-subjects" class="form-input" placeholder="e.g. Data Structures, DBMS, Python" required />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-graduation-cap"></i> Education Qualification *</label>
              <input type="text" id="setup-education" class="form-input" placeholder="e.g. Ph.D. in Computer Science, IIT Madras" required />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-briefcase"></i> Experience</label>
              <input type="text" id="setup-experience" class="form-input" placeholder="e.g. 12 Years" />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-tools"></i> Skills (comma separated)</label>
              <input type="text" id="setup-skills" class="form-input" placeholder="e.g. ML, Cloud, Research" />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-language"></i> Languages</label>
              <input type="text" id="setup-languages" class="form-input" placeholder="e.g. Tamil, English" />
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-image"></i> Profile Photo URL</label>
              <input type="url" id="setup-imageUrl" class="form-input" placeholder="https://..." />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-align-left"></i> Short Bio</label>
              <textarea id="setup-bio" class="form-textarea" rows="3" placeholder="Brief description about yourself..."></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:16px;" id="setup-submitBtn">
            <i class="fas fa-save"></i> Save Profile &amp; Enter Portal
          </button>
        </form>
      </div>
    </div>`

  setTimeout(() => initScrollAnimations(), 50)

  document.getElementById('tch-setupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('setup-submitBtn')
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'

    const g = (id) => document.getElementById(id)?.value?.trim() || null
    const name        = g('setup-name')
    const setupRegno  = g('setup-regno')
    const email       = g('setup-email')
    const phone       = g('setup-phone')
    const gender      = g('setup-gender')
    const dept        = g('setup-dept')
    const designation = g('setup-designation')
    const subjectsRaw = g('setup-subjects')
    const education   = g('setup-education')

    if (!name || !email || !phone || !gender || !dept || !designation || !subjectsRaw || !education) {
      showToast('Please fill all required (*) fields.', 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Profile & Enter Portal'
      return
    }

    const payload = {
      register_no:  setupRegno,
      name,  email,  phone,  gender,
      department:   dept,
      designation,
      subjects:     subjectsRaw.split(',').map(s => s.trim()).filter(Boolean),
      education,
      experience:   g('setup-experience'),
      skills:       g('setup-skills')?.split(',').map(s => s.trim()).filter(Boolean) || [],
      languages:    g('setup-languages')?.split(',').map(s => s.trim()).filter(Boolean) || [],
      bio:          g('setup-bio'),
      image_url:    g('setup-imageUrl')
    }

    const { data, error } = await supabase
      .from('teacher_information')
      .upsert(payload, { onConflict: 'register_no' })
      .select()
      .single()

    if (error) {
      showToast('Failed to save: ' + error.message, 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Profile & Enter Portal'
      return
    }

    loggedTeacher = data || payload
    showToast(`Profile saved! Welcome, ${name}! 🎉`, 'success')
    container.style.display = 'none'
    document.getElementById('tch-allTeachers').style.display = 'none'
    showSection('profile')
    renderProfile(loggedTeacher)
    await loadAllTeachers()
  })
}

// ── REGISTER (new faculty with no existing credentials) ─────────────────────
function setupRegisterForm() {
  document.getElementById('tch-registerForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('tch-registerBtn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account…'

    const name        = document.getElementById('tch-name').value.trim()
    const regno       = document.getElementById('tch-regno').value.trim()
    const email       = document.getElementById('tch-email').value.trim()
    const password    = document.getElementById('tch-password').value
    const phone       = document.getElementById('tch-phone').value.trim()
    const gender      = document.getElementById('tch-gender').value
    const dept        = document.getElementById('tch-dept').value
    const designation = document.getElementById('tch-designation').value
    const subjects    = document.getElementById('tch-subjects').value.split(',').map(s => s.trim()).filter(Boolean)
    const education   = document.getElementById('tch-education').value.trim()
    const experience  = document.getElementById('tch-experience').value.trim()
    const skills      = document.getElementById('tch-skills').value.split(',').map(s => s.trim()).filter(Boolean)
    const languages   = document.getElementById('tch-languages').value.split(',').map(s => s.trim()).filter(Boolean)
    const bio         = document.getElementById('tch-bio').value.trim()

    if (!name || !regno || !email || !password || !phone || !gender || !dept || !designation || subjects.length === 0 || !education) {
      showToast('Please fill in all required fields.', 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Faculty Account'; return
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Faculty Account'; return
    }

    // Check duplicate register_no
    const { data: existing } = await supabase
      .from('teacher_credentials')
      .select('register_no')
      .ilike('register_no', regno)
      .maybeSingle()

    if (existing) {
      showToast('An account with this Register Number already exists. Please use the Login form.', 'warning')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Faculty Account'; return
    }

    // Handle image
    let imageUrl = document.getElementById('tch-imageUrl').value.trim()
    const fileInput = document.getElementById('tch-imageFile')
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0]
      const ext = file.name.split('.').pop()
      const filePath = `Teacher_images/${regno}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('image_files').upload(filePath, file, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('image_files').getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }
    }

    // Insert into teacher_information
    const tchrPayload = {
      register_no: regno, name, email, phone, gender,
      department: dept, designation, subjects, education,
      experience: experience || null, skills, languages,
      bio: bio || null, image_url: imageUrl || null
    }

    const { error: insertErr } = await supabase.from('teacher_information').insert(tchrPayload)
    if (insertErr) {
      showToast('Failed to create profile: ' + insertErr.message, 'error')
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Faculty Account'; return
    }

    // Store credentials
    const { error: credErr } = await supabase.from('teacher_credentials').insert({
      register_no: regno, password_hash: password
    })
    if (credErr) {
      showToast('Profile created but credentials failed: ' + credErr.message, 'warning')
    }

    showToast(`Account created for ${name}! You can now log in.`, 'success')
    document.getElementById('tch-registerForm').reset()
    document.getElementById('tch-imgPreviewWrap').style.display = 'none'
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Faculty Account'
    await loadAllTeachers()
  })
}

// ── IMAGE UPLOAD PREVIEW ──────────────────────────────────
function setupImageUpload() {
  const fileInput  = document.getElementById('tch-imageFile')
  const preview    = document.getElementById('tch-imgPreview')
  const previewWrap = document.getElementById('tch-imgPreviewWrap')
  const fileName   = document.getElementById('tch-imgFileName')
  const uploadArea = document.getElementById('tch-uploadArea')

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      preview.src = e.target.result
      previewWrap.style.display = 'block'
      fileName.textContent = file.name
    }
    reader.readAsDataURL(file)
  })

  uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over') })
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'))
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault(); uploadArea.classList.remove('drag-over')
    fileInput.files = e.dataTransfer.files
    fileInput.dispatchEvent(new Event('change'))
  })
}

window.switchImgTab = function(tab) {
  document.querySelectorAll('.tch-img-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
  document.getElementById('tch-img-url-panel').style.display   = tab === 'url'    ? 'block' : 'none'
  document.getElementById('tch-img-upload-panel').style.display = tab === 'upload' ? 'block' : 'none'
}

// ── LOAD ALL TEACHERS ─────────────────────────────────────
async function loadAllTeachers() {
  const grid = document.getElementById('tch-grid')
  if (!grid) return
  grid.innerHTML = '<div class="tch-grid-loading"><div class="spinner"></div><p>Loading faculty…</p></div>'

  const { data: teachers, error } = await supabase
    .from('teacher_information')
    .select('*')
    .order('name')

  if (error || !teachers?.length) {
    grid.innerHTML = '<div class="tch-grid-loading"><p>No faculty records found yet. Be the first to register!</p></div>'
    return
  }
  renderTeacherGrid(teachers)
}

let _allTeachers = []
function renderTeacherGrid(teachers) {
  _allTeachers = teachers
  const grid = document.getElementById('tch-grid')
  if (!teachers.length) {
    grid.innerHTML = '<div class="tch-grid-loading"><p>No faculty found matching your search.</p></div>'
    return
  }
  grid.innerHTML = teachers.map((t, i) => buildTeacherCard(t, i)).join('')
  setTimeout(() => {
    document.querySelectorAll('.tch-card.animate-fade-up').forEach(el => el.classList.add('visible'))
  }, 50)
}

function buildTeacherCard(t, idx) {
  const photo = t.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a237e&color=fff&size=90`
  const subjects = (t.subjects || []).slice(0, 3).map(s => `<span>${escHtml(s)}</span>`).join('')
  return `
    <div class="tch-card animate-fade-up" style="animation-delay:${idx * 0.06}s">
      <div class="tch-card-header">
        <img src="${photo}" alt="${escHtml(t.name)}" class="tch-card-photo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a237e&color=fff&size=90'" />
        <div class="tch-card-name">${escHtml(t.name)}</div>
        <div class="tch-card-desig">${escHtml(t.designation || '')}</div>
      </div>
      <div class="tch-card-body">
        <div class="tch-card-dept">${escHtml(t.department || '')}</div>
        <div class="tch-card-subjects">${subjects}</div>
        <div class="tch-card-meta">
          ${t.education ? `<span><i class="fas fa-graduation-cap"></i>${escHtml(t.education.split(',')[0])}</span>` : ''}
          ${t.experience ? `<span><i class="fas fa-briefcase"></i>${escHtml(t.experience)}</span>` : ''}
        </div>
      </div>
    </div>`
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── SEARCH ────────────────────────────────────────────────
function setupSearch() {
  let debounce
  document.getElementById('tchSearch')?.addEventListener('input', (e) => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      const q = e.target.value.trim().toLowerCase()
      if (!q) { renderTeacherGrid(_allTeachers); return }
      const filtered = _allTeachers.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.department || '').toLowerCase().includes(q) ||
        (t.subjects || []).some(s => s.toLowerCase().includes(q)) ||
        (t.designation || '').toLowerCase().includes(q)
      )
      renderTeacherGrid(filtered)
    }, 250)
  })
}

// ── RENDER LOGGED-IN PROFILE ──────────────────────────────
function renderProfile(t) {
  const photo = t.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a237e&color=fff&size=140`
  const subjectTags = (t.subjects || []).map(s => `<span class="tch-tag subject">${escHtml(s)}</span>`).join('')
  const skillTags   = (t.skills || []).map(s => `<span class="tch-tag skill">${escHtml(s)}</span>`).join('')
  const langTags    = (t.languages || []).map(l => `<span class="tch-tag lang">${escHtml(l)}</span>`).join('')

  document.getElementById('tch-profileContent').innerHTML = `
    <div class="tch-profile-card">
      <div class="tch-profile-header">
        <div class="tch-profile-photo-wrap">
          <img src="${photo}" alt="${escHtml(t.name)}" class="tch-profile-photo"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a237e&color=fff&size=140'" />
        </div>
        <div class="tch-profile-info">
          <h2>${escHtml(t.name)}</h2>
          <span class="tch-desig-badge">${escHtml(t.designation || '')}</span>
          <span class="tch-dept-badge">&nbsp;<i class="fas fa-building"></i>&nbsp;${escHtml(t.department || '')}</span>
          <div class="tch-profile-actions">
            <button class="tch-edit-btn" onclick="logoutTeacher()"><i class="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </div>
      </div>
      <div class="tch-profile-body">
        <div class="tch-info-grid">
          ${t.register_no ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-id-badge"></i> Register No.</div><div class="tch-info-value">${escHtml(t.register_no)}</div></div>` : ''}
          ${t.email       ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-envelope"></i> Email</div><div class="tch-info-value">${escHtml(t.email)}</div></div>` : ''}
          ${t.phone       ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-phone"></i> Phone</div><div class="tch-info-value">${escHtml(t.phone)}</div></div>` : ''}
          ${t.gender      ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-venus-mars"></i> Gender</div><div class="tch-info-value">${escHtml(t.gender)}</div></div>` : ''}
          ${t.education   ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-graduation-cap"></i> Education</div><div class="tch-info-value">${escHtml(t.education)}</div></div>` : ''}
          ${t.experience  ? `<div class="tch-info-item"><div class="tch-info-label"><i class="fas fa-briefcase"></i> Experience</div><div class="tch-info-value">${escHtml(t.experience)}</div></div>` : ''}
        </div>
        ${subjectTags ? `<div class="tch-tags-section"><h4><i class="fas fa-chalkboard"></i> Subjects</h4><div class="tch-tags">${subjectTags}</div></div>` : ''}
        ${skillTags   ? `<div class="tch-tags-section"><h4><i class="fas fa-tools"></i> Skills</h4><div class="tch-tags">${skillTags}</div></div>` : ''}
        ${langTags    ? `<div class="tch-tags-section"><h4><i class="fas fa-language"></i> Languages</h4><div class="tch-tags">${langTags}</div></div>` : ''}
        ${t.bio       ? `<div class="tch-bio-section"><h4><i class="fas fa-user"></i> About</h4><p>${escHtml(t.bio)}</p></div>` : ''}
      </div>
    </div>`

  initScrollAnimations()
}

window.logoutTeacher = function() {
  loggedTeacher = null
  const setupEl = document.getElementById('tch-setupProfile')
  if (setupEl) setupEl.style.display = 'none'
  showSection('notLoggedIn')
  document.getElementById('tch-allTeachers').style.display = 'block'
  showToast('Logged out successfully.', 'info')
}