import { supabase } from './supabaseClient.js'
import { initStickyHeader, initHamburger, initScrollAnimations, openModal, closeModal, initModalCloseHandlers, showToast, initAuth, openAuthModal, logoutUser, initRipple, initPageTransitions } from './shared.js'

// ── Course Data ───────────────────────────────────────────────
const courseData = {
  'btech-cse': {
    title: 'B.Tech Computer Science and Engineering',
    badge: 'B.Tech • UG', badgeClass: 'badge-blue',
    duration: '4 Years', seats: '60 Seats',
    desc: 'A flagship 4-year undergraduate program affiliated with Anna University. Focuses on software development, algorithms, artificial intelligence, data science, and networking. Strong industry placements in TCS, Infosys, Zoho, and more.',
    highlights: ['Anna University Affiliated', 'AICTE Approved', 'Admission via TNEA', 'AI & Data Science Tracks'],
    link: 'https://www.princedrkvasudevan.com/departments/BE.CSE.html',
    img: 'https://ddn.gehu.ac.in/uploads/image/Nw1oCYC1-trending-course-gehu-1-jpg.webp'
  },
  'btech-aids': {
    title: 'B.Tech Artificial Intelligence & Data Science',
    badge: 'B.Tech • UG', badgeClass: 'badge-green',
    duration: '4 Years', seats: '60 Seats',
    desc: 'A cutting-edge 4-year program focusing on AI, Machine Learning, Deep Learning, Big Data Analytics, and Natural Language Processing.',
    highlights: ['Machine Learning & Deep Learning', 'Big Data & Analytics', 'Industry Projects', 'AICTE Approved'],
    link: 'https://www.princedrkvasudevan.com',
    img: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
  },
  'btech-cyber': {
    title: 'B.Tech Cyber Security',
    badge: 'B.Tech • UG', badgeClass: 'badge-red',
    duration: '4 Years', seats: '60 Seats',
    desc: '4-year program in network security, ethical hacking, cryptography, digital forensics, and cybercrime investigation.',
    highlights: ['Ethical Hacking', 'Cryptography & Forensics', 'Cybercrime Investigation', 'High Demand Roles'],
    link: 'https://www.princedrkvasudevan.com',
    img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
  },
  'btech-ece': {
    title: 'B.Tech Electronics & Communication Engineering',
    badge: 'B.Tech • UG', badgeClass: 'badge-blue',
    duration: '4 Years', seats: '60 Seats',
    desc: '4-year program covering communication systems, VLSI design, embedded systems, and signal processing. Anna University affiliated, AICTE approved.',
    highlights: ['Communication Systems', 'VLSI & Embedded', 'Signal Processing', 'Fees ~₹2 Lakh'],
    link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/course-b-e-in-electronics-and-communication-engineering-539701',
    img: 'https://sru.edu.in/assets/schools/ece/ece.png'
  },
  'btech-eee': {
    title: 'B.Tech Electrical & Electronics Engineering',
    badge: 'B.Tech • UG', badgeClass: 'badge-gold',
    duration: '4 Years', seats: '60 Seats',
    desc: '4-year program covering power systems, control systems, electrical machines, renewable energy, and smart grids.',
    highlights: ['Power Systems', 'Control Systems', 'Renewable Energy', 'Smart Grid Technology'],
    link: 'https://www.princedrkvasudevan.com',
    img: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
  },
  'btech-mech': {
    title: 'B.Tech Mechanical Engineering',
    badge: 'B.Tech • UG', badgeClass: 'badge-gold',
    duration: '4 Years', seats: '60 Seats',
    desc: '4-year UG program focusing on design, manufacturing, and thermal engineering. Lateral entry available.',
    highlights: ['Design & Manufacturing', 'Thermal Engineering', 'Lateral Entry Available', 'Modern Lab Facilities'],
    link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/courses/be-btech-bc',
    img: 'https://cache.careers360.mobi/media/article_images/2020/5/6/B-Tech-in-Mechanical-and-Automation-Engineering.jpg'
  },
  'btech-civil': {
    title: 'B.Tech Civil Engineering',
    badge: 'B.Tech • UG', badgeClass: 'badge-blue',
    duration: '4 Years', seats: '60 Seats',
    desc: '4-year program covering structural engineering, construction management, geotechnical engineering, and environmental engineering.',
    highlights: ['Structural Engineering', 'Construction Management', 'Geo-Technical', 'Site Visit Training'],
    link: 'https://www.princedrkvasudevan.com',
    img: 'https://sijoul.sandipuniversity.edu.in/engineering-technology/images/header/UG/Civil.jpg'
  },
  'mtech-cse': {
    title: 'M.Tech Computer Science and Engineering',
    badge: 'M.Tech • PG', badgeClass: 'badge-red',
    duration: '2 Years', seats: '9 Seats',
    desc: '2-year postgraduate program. Advanced topics in algorithms, cloud computing, machine learning, and distributed networks.',
    highlights: ['GATE / TANCET Admission', 'Only 9 Seats', 'ML & Cloud Computing', 'Research Oriented'],
    link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/courses/me-mtech-bc',
    img: 'https://theredpen.in/wp-content/uploads/2024/09/medium-shot-man-wearing-vr-glasses-1-scaled.jpg'
  },
  'mtech-vlsi': {
    title: 'M.Tech VLSI Design',
    badge: 'M.Tech • PG', badgeClass: 'badge-red',
    duration: '2 Years', seats: '18 Seats',
    desc: '2-year PG program focusing on CMOS design, semiconductor technology, HDL programming, and embedded systems.',
    highlights: ['CMOS & HDL Design', 'Semiconductor Tech', 'Chip Design Careers', 'High Industry Demand'],
    link: 'https://www.princedrkvasudevan.com',
    img: 'https://www.msruas.ac.in/assets/frontend/images/oview-img-vlsi.webp'
  },
  'mba': {
    title: 'Master of Business Administration (MBA)',
    badge: 'MBA • PG', badgeClass: 'badge-gold',
    duration: '2 Years', seats: '60 Seats',
    desc: '2-year full-time MBA program. Specializations in marketing, finance, and HR.',
    highlights: ['Marketing / Finance / HR', 'Industry Projects', 'Guest Lectures', 'Anna University Affiliated'],
    link: 'https://psvpec.in/mba/',
    img: 'https://media.istockphoto.com/id/1159875854/photo/mba-with-man.jpg?s=612x612&w=0&k=20&c=fm3BxaCV0OksY-P-khvO7mv1jdWLYHFlYEPaHEvZlVo='
  }
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initStickyHeader()
  initHamburger()
  initPageTransitions()
  initScrollAnimations()
  initModalCloseHandlers()
  initRipple()

  await initAuth()

  document.getElementById('headerLoginBtn')?.addEventListener('click', () => openAuthModal('login'))
  document.querySelectorAll('.global-header-logout').forEach(btn => {
    btn.addEventListener('click', async () => { await logoutUser() })
  })

  // Course card click → modal
  document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.course
      const data = courseData[id]
      if (!data) return

      document.getElementById('modalTitle').textContent = data.title
      const img = document.getElementById('modalImg')
      img.src = ''; img.src = data.img
      img.alt = data.title
      document.getElementById('modalDesc').textContent = data.desc
      document.getElementById('modalLink').href = data.link

      const badge = document.getElementById('modalBadge')
      badge.textContent = data.badge
      badge.className = `badge ${data.badgeClass}`

      const seats = document.getElementById('modalSeats')
      seats.innerHTML = `<i class="fas fa-users"></i> ${data.seats}`

      const dur = document.getElementById('modalDuration')
      if (dur) {
        dur.innerHTML = `<i class="fas fa-clock"></i> ${data.duration}`
        dur.style.display = data.duration ? '' : 'none'
      }

      const hl = document.getElementById('modalHighlights')
      if (hl && data.highlights?.length) {
        hl.innerHTML = `<div class="modal-highlights-grid">${data.highlights.map(h =>
          `<span class="modal-highlight-chip"><i class="fas fa-check-circle"></i> ${h}</span>`
        ).join('')}</div>`
      } else if (hl) { hl.innerHTML = '' }

      openModal('courseModal')
    })
  })

  document.getElementById('modalCloseBtn')?.addEventListener('click', () => closeModal('courseModal'))

  // Filter buttons
  document.querySelectorAll('.cf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cf-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const filter = btn.dataset.filter
      document.querySelectorAll('.course-card').forEach(card => {
        card.classList.toggle('hidden', filter !== 'all' && card.dataset.category !== filter)
      })
    })
  })

  // Init admission form
  initAdmissionForm()
})

// ── ADMISSION FORM ────────────────────────────────────────────
function initAdmissionForm() {
  let currentStep = 1
  const totalSteps = 4

  // Show/hide panels
  function goToStep(step) {
    // Hide all panels
    for (let i = 1; i <= totalSteps; i++) {
      const panel = document.getElementById(`adm-panel-${i}`)
      if (panel) panel.style.display = 'none'
    }
    // Show current
    const panel = document.getElementById(`adm-panel-${step}`)
    if (panel) panel.style.display = 'block'

    // Update step indicators
    document.querySelectorAll('.adm-step').forEach(s => {
      const n = parseInt(s.dataset.step)
      s.classList.remove('active', 'done')
      if (n < step) s.classList.add('done')
      else if (n === step) s.classList.add('active')
    })

    // Update step lines
    document.querySelectorAll('.adm-step-line').forEach((line, idx) => {
      line.classList.toggle('done', idx + 1 < step)
    })

    currentStep = step

    if (step === 4) buildReview()

    // Scroll to admission section
    document.getElementById('admission')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Expose globally for onclick handlers in HTML
  window.admNext = function(fromStep) {
    if (fromStep === 1) {
      const name = document.getElementById('adm-name')?.value?.trim()
      const email = document.getElementById('adm-email')?.value?.trim()
      const phone = document.getElementById('adm-phone')?.value?.trim()
      const gender = document.getElementById('adm-gender')?.value
      const dob = document.getElementById('adm-dob')?.value
      const category = document.getElementById('adm-category')?.value
      const address = document.getElementById('adm-address')?.value?.trim()
      const city = document.getElementById('adm-city')?.value?.trim()
      const pincode = document.getElementById('adm-pincode')?.value?.trim()

      if (!name || !email || !phone || !gender || !dob || !category || !address || !city || !pincode) {
        showToast('Please fill all required fields in Step 1.', 'warning')
        return
      }
    }

    if (fromStep === 2) {
      const tenth = document.getElementById('adm-tenth')?.value
      const tenthSchool = document.getElementById('adm-tenthSchool')?.value?.trim()
      const tenthBoard = document.getElementById('adm-tenthBoard')?.value?.trim()
      const twelfth = document.getElementById('adm-twelfth')?.value
      const twelfthSchool = document.getElementById('adm-twelfthSchool')?.value?.trim()
      const stream = document.getElementById('adm-stream')?.value

      if (!tenth || !tenthSchool || !tenthBoard || !twelfth || !twelfthSchool || !stream) {
        showToast('Please fill all required academic details in Step 2.', 'warning')
        return
      }
    }

    if (fromStep === 3) {
      const course1 = document.getElementById('adm-course1')?.value
      if (!course1) {
        showToast('Please select at least your first course preference.', 'warning')
        return
      }
    }

    goToStep(fromStep + 1)
  }

  window.admBack = function(fromStep) {
    goToStep(fromStep - 1)
  }

  // UG/PG radio toggle
  document.querySelectorAll('input[name="applicantType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPG = radio.value === 'PG'
      const pgSection = document.getElementById('adm-pg-section')
      if (pgSection) pgSection.style.display = isPG ? 'block' : 'none'

      // Update label active state
      document.querySelectorAll('.adm-type-btn').forEach(lbl => lbl.classList.remove('active'))
      radio.closest('.adm-type-btn')?.classList.add('active')
    })
  })

  // Cutoff auto-calculate for PCM/PCB
  const calcCutoff = () => {
    const stream = document.getElementById('adm-stream')?.value || ''
    const maths = parseFloat(document.getElementById('adm-maths')?.value) || 0
    const physics = parseFloat(document.getElementById('adm-physics')?.value) || 0
    const chemistry = parseFloat(document.getElementById('adm-chemistry')?.value) || 0
    const biology = parseFloat(document.getElementById('adm-biology')?.value) || 0

    let cutoff = 0
    if (stream.includes('PCM')) {
      cutoff = (maths / 2) + (physics / 4) + (chemistry / 4)
    } else if (stream.includes('PCB')) {
      cutoff = (biology / 2) + (physics / 4) + (chemistry / 4)
    }

    const cutoffEl = document.getElementById('adm-cutoff-display')
    if (cutoffEl) {
      cutoffEl.textContent = cutoff > 0 ? cutoff.toFixed(2) : '—'
    }
    const cutoffInput = document.getElementById('adm-cutoff')
    if (cutoffInput) cutoffInput.value = cutoff > 0 ? cutoff.toFixed(2) : ''
  }

  ['adm-maths','adm-physics','adm-chemistry','adm-biology','adm-stream'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', calcCutoff)
    document.getElementById(id)?.addEventListener('input', calcCutoff)
  })

  // Form submit
  document.getElementById('admissionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()

    const declCheck = document.getElementById('adm-declaration')
    if (!declCheck?.checked) {
      showToast('Please agree to the declaration before submitting.', 'warning')
      return
    }

    const submitBtn = document.getElementById('adm-submitBtn')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'
    }

    const getVal = (id) => document.getElementById(id)?.value?.trim() || null
    const getNum = (id) => parseFloat(document.getElementById(id)?.value) || null
    const getInt = (id) => parseInt(document.getElementById(id)?.value) || null
    const getBool = (id) => document.getElementById(id)?.checked || false

    const activeType = document.querySelector('input[name="applicantType"]:checked')?.value || 'UG'

    const payload = {
      applicant_type:      activeType,
      name:                getVal('adm-name'),
      gender:              getVal('adm-gender'),
      dob:                 getVal('adm-dob') || null,
      email:               getVal('adm-email'),
      phone:               getVal('adm-phone'),
      category:            getVal('adm-category'),
      quota:               getVal('adm-quota'),
      address:             getVal('adm-address'),
      city:                getVal('adm-city'),
      state:               getVal('adm-state') || 'Tamil Nadu',
      pincode:             getVal('adm-pincode'),

      tenth_school:        getVal('adm-tenthSchool'),
      tenth_board:         getVal('adm-tenthBoard'),
      tenth_year:          getInt('adm-tenthYear'),
      tenth_percentage:    getNum('adm-tenth'),

      twelfth_school:      getVal('adm-twelfthSchool'),
      twelfth_board:       getVal('adm-twelfthBoard'),
      twelfth_year:        getInt('adm-twelfthYear'),
      twelfth_stream:      getVal('adm-stream'),
      twelfth_percentage:  getNum('adm-twelfth'),
      twelfth_physics:     getNum('adm-physics'),
      twelfth_chemistry:   getNum('adm-chemistry'),
      twelfth_maths:       getNum('adm-maths'),
      twelfth_biology:     getNum('adm-biology'),
      twelfth_english:     getNum('adm-english'),
      twelfth_cutoff:      getNum('adm-cutoff'),

      ug_degree:           getVal('adm-ugDegree'),
      ug_college:          getVal('adm-ugCollege'),
      ug_university:       getVal('adm-ugUniversity'),
      ug_year:             getInt('adm-ugYear'),
      ug_cgpa:             getNum('adm-ugCgpa'),
      ug_percentage:       getNum('adm-ugPct'),

      course_pref_1:       getVal('adm-course1'),
      course_pref_2:       getVal('adm-course2'),
      course_pref_3:       getVal('adm-course3'),
      entrance_exam:       getVal('adm-entrance'),
      entrance_score:      getVal('adm-entranceScore'),
      sports_quota:        getBool('adm-sports'),
      ncc_quota:           getBool('adm-ncc'),
      extra_curricular:    getVal('adm-extra'),
      declaration_agreed:  true,
      status:              'Pending'
    }

    if (!payload.name || !payload.email || !payload.phone) {
      showToast('Please fill in all required fields.', 'error')
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application' }
      return
    }

    const { error } = await supabase.from('admission_information').insert(payload)

    if (error) {
      showToast('Submission failed: ' + error.message, 'error')
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application' }
      return
    }

    // Show success
    const formWrap = document.querySelector('.admission-form-wrap')
    if (formWrap) {
      formWrap.innerHTML = `
        <div class="adm-success">
          <div class="adm-success-icon">🎉</div>
          <h3>Application Submitted Successfully!</h3>
          <p>Thank you <strong>${payload.name}</strong>! Your application has been received. Our admissions team will contact you at <strong>${payload.email}</strong> within 2-3 working days.</p>
          <div class="adm-success-id">Application ID: PDKV-${Date.now().toString().slice(-8)}</div>
          <div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <a href="index.html" class="btn btn-primary"><i class="fas fa-home"></i> Go to Home</a>
            <a href="Courses.html" class="btn btn-outline" style="color:var(--primary)"><i class="fas fa-redo"></i> Apply Again</a>
          </div>
        </div>`
    }
    showToast('Application submitted successfully! 🎉 We will contact you soon.', 'success', 6000)
  })

  function buildReview() {
    const reviewEl = document.getElementById('adm-review-content')
    if (!reviewEl) return
    const getVal = (id) => document.getElementById(id)?.value?.trim() || '—'
    const activeType = document.querySelector('input[name="applicantType"]:checked')?.value || 'UG'
    const stream = getVal('adm-stream')

    reviewEl.innerHTML = `
      <div class="adm-review-section">
        <h4>Personal Info</h4>
        <div class="adm-review-grid">
          <div class="adm-review-item"><span class="adm-review-lbl">Type</span><span class="adm-review-val">${activeType}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Name</span><span class="adm-review-val">${getVal('adm-name')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Gender</span><span class="adm-review-val">${getVal('adm-gender')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">DOB</span><span class="adm-review-val">${getVal('adm-dob')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Email</span><span class="adm-review-val">${getVal('adm-email')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Phone</span><span class="adm-review-val">${getVal('adm-phone')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Category</span><span class="adm-review-val">${getVal('adm-category')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Quota</span><span class="adm-review-val">${getVal('adm-quota')}</span></div>
        </div>
      </div>
      <div class="adm-review-section">
        <h4>Academic Details</h4>
        <div class="adm-review-grid">
          <div class="adm-review-item"><span class="adm-review-lbl">10th %</span><span class="adm-review-val">${getVal('adm-tenth')}%</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">10th Board</span><span class="adm-review-val">${getVal('adm-tenthBoard')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">12th %</span><span class="adm-review-val">${getVal('adm-twelfth')}%</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">12th Stream</span><span class="adm-review-val">${stream}</span></div>
          ${(stream.includes('PCM') || stream.includes('PCB')) ? `
          <div class="adm-review-item"><span class="adm-review-lbl">Physics</span><span class="adm-review-val">${getVal('adm-physics')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Chemistry</span><span class="adm-review-val">${getVal('adm-chemistry')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Maths / Biology</span><span class="adm-review-val">${stream.includes('PCM') ? getVal('adm-maths') : getVal('adm-biology')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Cutoff</span><span class="adm-review-val">${document.getElementById('adm-cutoff-display')?.textContent || '—'}</span></div>
          ` : ''}
          ${activeType === 'PG' ? `
          <div class="adm-review-item"><span class="adm-review-lbl">UG Degree</span><span class="adm-review-val">${getVal('adm-ugDegree')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">UG College</span><span class="adm-review-val">${getVal('adm-ugCollege')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">UG CGPA/%</span><span class="adm-review-val">${getVal('adm-ugCgpa') || getVal('adm-ugPct')}</span></div>
          ` : ''}
        </div>
      </div>
      <div class="adm-review-section">
        <h4>Course Preference</h4>
        <div class="adm-review-grid">
          <div class="adm-review-item"><span class="adm-review-lbl">1st Choice</span><span class="adm-review-val">${getVal('adm-course1')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">2nd Choice</span><span class="adm-review-val">${getVal('adm-course2')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">3rd Choice</span><span class="adm-review-val">${getVal('adm-course3')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Entrance</span><span class="adm-review-val">${getVal('adm-entrance')} — ${getVal('adm-entranceScore')}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">Sports</span><span class="adm-review-val">${document.getElementById('adm-sports')?.checked ? 'Yes' : 'No'}</span></div>
          <div class="adm-review-item"><span class="adm-review-lbl">NCC</span><span class="adm-review-val">${document.getElementById('adm-ncc')?.checked ? 'Yes' : 'No'}</span></div>
        </div>
      </div>`
  }
}