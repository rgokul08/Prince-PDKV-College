import { supabase } from './supabaseClient.js'
import { initStickyHeader, initHamburger, initScrollAnimations, showToast, initAuth, openAuthModal, logoutUser, getCurrentUser, getUserProfile, onAuthChange, initRipple , initPageTransitions } from './shared.js'

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

  document.getElementById('promptLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.getElementById('promptSignupBtn')?.addEventListener('click', () => openAuthModal('signup'))

  onAuthChange(async (user, profile) => {
    await handleAuthState(user, profile)
  })

  const user = getCurrentUser()
  const profile = getUserProfile()
  await handleAuthState(user, profile)
})

async function handleAuthState(user, profile) {
  if (!user) {
    showSection('notLoggedIn')
    return
  }

  const regno = profile?.regno
  if (!regno) {
    showSection('noData')
    document.getElementById('noDataMsg').textContent =
      'Your account does not have a register number associated. Please contact the college administration.'
    document.getElementById('noDataUserInfo').innerHTML =
      `<p><i class="fas fa-envelope"></i> Logged in as: <strong>${user.email}</strong></p>`
    return
  }

  showSection('loading')

  const { data: student, error } = await supabase
    .from('student_information')
    .select('*')
    .ilike('register_no', regno)
    .maybeSingle()

  if (error) {
    showToast('Error fetching records: ' + error.message, 'error')
    showSection('noData')
    return
  }

  if (!student) {
    showSection('setupProfile')
    renderSetupForm(user, profile)
    return
  }

  showSection('profile')
  renderProfile(student, profile)

  // Start listening for admin updates
  setupStudentRealtime(regno)
}

function showSection(which) {
  const sections = ['notLoggedIn', 'loading', 'noData', 'profile', 'setupProfile']
  sections.forEach(s => {
    const el = document.getElementById(s + 'Section')
    if (el) el.style.display = which === s ? 'block' : 'none'
  })
}

function renderSetupForm(user, authProfile) {
  const container = document.getElementById('setupProfileSection')
  container.innerHTML = `
    <div class="setup-profile-wrap animate-fade-up">
      <div class="setup-header">
        <div class="setup-icon"><i class="fas fa-id-card"></i></div>
        <h2>Complete Your Student Profile</h2>
        <p>Fill in your details below. Exam results and attendance will be updated by admin.</p>
      </div>
      <form id="setupProfileForm" class="setup-form" novalidate>
        <div class="setup-grid">
          <div class="form-group">
            <label class="form-label"><i class="fas fa-user"></i> Full Name *</label>
            <input type="text" id="sp_name" class="form-input" placeholder="Your full name" value="${authProfile?.name || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-id-card"></i> Register Number *</label>
            <input type="text" id="sp_regno" class="form-input" placeholder="e.g. 22CS0001" value="${authProfile?.regno || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-book"></i> Department *</label>
            <select id="sp_dept" class="form-select" required>
              <option value="">Select Department</option>
              <option>Computer Science &amp; Engineering</option>
              <option>Electronics &amp; Communication Engineering</option>
              <option>Mechanical Engineering</option>
              <option>Civil Engineering</option>
              <option>Master of Business Administration</option>
              <option>M.Tech Computer Science &amp; Engineering</option>
              <option>M.Tech VLSI Design</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-layer-group"></i> Year *</label>
            <select id="sp_year" class="form-select" required>
              <option value="">Select Year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-phone"></i> Phone Number *</label>
            <input type="tel" id="sp_phone" class="form-input" placeholder="+91 99999 99999" value="${authProfile?.phone || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-envelope"></i> Email ID *</label>
            <input type="email" id="sp_email" class="form-input" placeholder="your@email.com" value="${user?.email || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-birthday-cake"></i> Date of Birth</label>
            <input type="date" id="sp_dob" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fas fa-shield-alt"></i> Guardian Name</label>
            <input type="text" id="sp_guardian" class="form-input" placeholder="Parent / Guardian name" />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fab fa-linkedin"></i> LinkedIn Profile</label>
            <input type="url" id="sp_linkedin" class="form-input" placeholder="https://linkedin.com/in/..." />
          </div>
          <div class="form-group">
            <label class="form-label"><i class="fab fa-github"></i> GitHub Profile</label>
            <input type="url" id="sp_github" class="form-input" placeholder="https://github.com/..." />
          </div>
          <div class="form-group setup-full-col">
            <label class="form-label"><i class="fas fa-image"></i> Profile Photo URL <span style="opacity:0.6;font-weight:400;">(optional)</span></label>
            <input type="url" id="sp_image" class="form-input" placeholder="https://... (direct image link)" />
          </div>
        </div>
        <div class="setup-notice">
          <i class="fas fa-clock"></i>
          <div><strong>Exam Results &amp; Attendance</strong> will be visible once the admin enters your data in the system.</div>
        </div>
        <button type="submit" class="btn btn-primary setup-submit" id="setupSubmitBtn">
          <i class="fas fa-save"></i> Save My Profile
        </button>
      </form>
    </div>`

  document.getElementById('setupProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('setupSubmitBtn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'

    const name     = document.getElementById('sp_name').value.trim()
    const regno    = document.getElementById('sp_regno').value.trim()
    const dept     = document.getElementById('sp_dept').value.trim()
    const year     = document.getElementById('sp_year').value.trim()
    const phone    = document.getElementById('sp_phone').value.trim()
    const email    = document.getElementById('sp_email').value.trim()
    const dob      = document.getElementById('sp_dob').value.trim()
    const guardian = document.getElementById('sp_guardian').value.trim()
    const linkedin = document.getElementById('sp_linkedin').value.trim()
    const github   = document.getElementById('sp_github').value.trim()
    const image    = document.getElementById('sp_image').value.trim()

    if (!name || !regno || !dept || !year || !phone || !email) {
      showToast('Please fill all required fields (*)', 'error')
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-save"></i> Save My Profile'
      return
    }

    const payload = {
      register_no:   regno,
      name,
      department:    dept,
      year:          parseInt(year),
      phone,
      email,
      dob:           dob || null,
      guardian_name: guardian || null,
      linkedin:      linkedin || null,
      github:        github || null,
      image_url:     image || null
    }

    const { error } = await supabase
      .from('student_information')
      .upsert(payload, { onConflict: 'register_no' })

    if (error) {
      showToast('Failed to save: ' + error.message, 'error')
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-save"></i> Save My Profile'
      return
    }

    showToast('Profile saved successfully! 🎉', 'success')

    const { data: student } = await supabase
      .from('student_information')
      .select('*')
      .ilike('register_no', regno)
      .maybeSingle()

    if (student) {
      showSection('profile')
      renderProfile(student, authProfile)
      setupStudentRealtime(regno)
    }
  })

  setTimeout(() => initScrollAnimations(), 50)
}

function renderProfile(student, authProfile) {
  const attPct   = student.attendance_percentage || 0
  const attColor = attPct >= 75 ? '#4CAF50' : '#f44336'
  const yearSuffix = ['st','nd','rd','th'][Math.min((student.year||1) - 1, 3)]

  const examsHtml = student.exam_details?.length
    ? `<div class="exams-section">
         <h3><i class="fas fa-graduation-cap"></i> Exam Results</h3>
         <div class="exams-grid">
           ${student.exam_details.map(ex => `
             <div class="exam-result-card ${ex.result === 'Pass' ? 'exam-pass' : 'exam-fail'}">
               <div class="exam-subj">${ex.subject}</div>
               <div class="exam-score">Marks: ${ex.marks}/100 &bull; <strong>${ex.result}</strong> &bull; ${ex.type}</div>
             </div>`).join('')}
         </div>
       </div>`
    : `<div class="pending-notice">
         <div class="pending-icon"><i class="fas fa-hourglass-half"></i></div>
         <h4>Exam Results Pending</h4>
         <p>Your exam results haven't been entered yet. Please check back after the admin updates your records.</p>
       </div>`

  const attendanceHtml = (student.total_days || student.present_days)
    ? `<div class="attendance-card">
        <h3><i class="fas fa-calendar-check"></i> Attendance Record</h3>
        <div class="attendance-stats">
          <div class="att-stat">
            <span class="att-num" style="color:${attColor};">${attPct}%</span>
            <span class="att-label">Attendance %</span>
          </div>
          <div class="att-stat">
            <span class="att-num">${student.present_days || 0}</span>
            <span class="att-label">Days Present</span>
          </div>
          <div class="att-stat">
            <span class="att-num">${student.absent_days || 0}</span>
            <span class="att-label">Days Absent</span>
          </div>
          <div class="att-stat">
            <span class="att-num">${student.total_days || 0}</span>
            <span class="att-label">Total Days</span>
          </div>
        </div>
        ${attPct < 75 && attPct > 0 ? `<div class="att-warning att-warn-red">⚠️ Attendance below 75% — condonation required</div>`
          : attPct >= 75 ? `<div class="att-warning att-warn-green">✅ Good attendance — eligible for examinations</div>` : ''}
      </div>`
    : `<div class="pending-notice">
         <div class="pending-icon"><i class="fas fa-calendar-times"></i></div>
         <h4>Attendance Pending</h4>
         <p>Your attendance records haven't been entered yet. The admin will update this soon.</p>
       </div>`

  const photoSrc = student.image_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=1a237e&color=fff&size=130`

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-photo-wrap">
          <img src="${photoSrc}" alt="${student.name}" class="profile-photo" />
          <div class="profile-photo-ring"></div>
        </div>
        <div class="profile-name">${student.name}</div>
        <span class="profile-regno">${student.register_no}</span>
        ${student.department ? `<div class="profile-dept">${student.department} &bull; ${student.year}${yearSuffix} Year</div>` : ''}
      </div>

      <div class="profile-body">
        <div class="profile-info-grid">
          ${student.department ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-book"></i> Department</div><div class="profile-info-value">${student.department}</div></div>` : ''}
          ${student.year ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-layer-group"></i> Year</div><div class="profile-info-value">${student.year}${yearSuffix} Year</div></div>` : ''}
          ${student.guardian_name ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-shield-alt"></i> Guardian</div><div class="profile-info-value">${student.guardian_name}</div></div>` : ''}
          ${student.phone ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-phone"></i> Phone</div><div class="profile-info-value">${student.phone}</div></div>` : ''}
          ${student.email ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-envelope"></i> Email</div><div class="profile-info-value">${student.email}</div></div>` : ''}
          ${student.dob ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fas fa-birthday-cake"></i> Date of Birth</div><div class="profile-info-value">${student.dob}</div></div>` : ''}
          ${student.linkedin ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fab fa-linkedin"></i> LinkedIn</div><div class="profile-info-value"><a href="${student.linkedin}" target="_blank"><i class="fas fa-external-link-alt"></i> View Profile</a></div></div>` : ''}
          ${student.github ? `<div class="profile-info-item"><div class="profile-info-label"><i class="fab fa-github"></i> GitHub</div><div class="profile-info-value"><a href="${student.github}" target="_blank"><i class="fas fa-external-link-alt"></i> View Profile</a></div></div>` : ''}
        </div>

        ${attendanceHtml}
        ${examsHtml}
      </div>
    </div>`

  initScrollAnimations()
}

// ── REALTIME SYNC ─────────────────────────────────────────
let _realtimeChannel = null

function setupStudentRealtime(regno) {
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel)
  }

  _realtimeChannel = supabase
    .channel('student-realtime-' + regno)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'student_information',
      filter: `register_no=ilike.${regno}`
    }, async () => {
      // Re-fetch and re-render on any admin change
      const { data: student } = await supabase
        .from('student_information')
        .select('*')
        .ilike('register_no', regno)
        .maybeSingle()

      if (student) {
        showSection('profile')
        renderProfile(student, getUserProfile())
      }
    })
    .subscribe()
}