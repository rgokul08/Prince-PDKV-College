// App State
let currentUser = null;
let currentNotices = [];
let currentFilter = 'all';

// Real college notices & events (March 2026)
const seedNotices = [
    {
        id: 'midterm-mar2026',
        title: '🧮 MIDTERM EXAMINATIONS - March 2026',
        type: 'exam',
        date: '2026-03-17',
        time: '09:00 AM',
        desc: 'Midterm exams for all UG/PG programs (Sem 2,4,6,8). Time: 9 AM - 12 PM daily. Hall tickets mandatory. Check department notice boards for seat arrangements.',
        registrations: []
    },
    {
        id: 'protothon26',
        title: '🚀 PROTO-THON\'26 Hackathon',
        type: 'event',
        date: '2026-03-28',
        time: '08:00 AM',
        desc: 'National Level 24hr Hackathon by CSE/AI&DS. Prize Pool: ₹1,50,000. Register teams of 2-4. Last date: March 20. Venue: Main Auditorium.',
        registrations: []
    },
    {
        id: 'internal-marks',
        title: '📊 INTERNAL MARKS ENTRY DEADLINE',
        type: 'notice',
        date: '2026-03-15',
        time: '05:00 PM',
        desc: 'Faculty to submit CIA marks by March 15, 5 PM. Students check ERP portal from March 16. Grievance window: March 17-19.',
        registrations: []
    },
    {
        id: 'workshop-ai',
        title: '🤖 AI/ML Hands-on Workshop',
        type: 'event',
        date: '2026-03-20',
        time: '02:00 PM',
        desc: 'Free workshop by AI&DS Dept. Topics: Python, TensorFlow, NLP. Limited seats: 100. Register now! Certificates provided.',
        registrations: []
    },
    {
        id: 'seminar-embedded',
        title: '🔧 Embedded Systems Seminar',
        type: 'event',
        date: '2026-03-22',
        time: '10:00 AM',
        desc: 'Expert talk by industry professional from L&T. Topics: IoT, ARM, RTOS. Open to ECE/EEE students. Venue: Seminar Hall A.',
        registrations: []
    },
    {
        id: 'practical-exams',
        title: '🔬 PRACTICAL EXAMINATIONS',
        type: 'exam',
        date: '2026-03-25',
        time: '09:00 AM',
        desc: 'Lab exams for all branches. Schedule available on dept notice boards. Bring lab manuals & records. No late entries.',
        registrations: []
    }
];

document.addEventListener('DOMContentLoaded', function() {
    updateDateDisplay();
    checkAuth();
    loadNotices();
    setupFilters();
});

// Date Display
function updateDateDisplay() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').textContent = now.toLocaleDateString('en-IN', options);
}

// Authentication
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('userInfo').style.display = 'inline-block';
        document.getElementById('userInfo').textContent = `👋 ${currentUser.name}`;
        document.getElementById('logoutBtn').style.display = 'inline-block';
        document.getElementById('addNoticeBtn').style.display = 'block';
    }
}

function showAuth(type) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const toggle = document.getElementById('toggleAuth');
    const extraFields = ['authName', 'authRegno', 'authPhone'];
    
    if (type === 'signup') {
        title.textContent = '👤 Create Account';
        toggle.textContent = 'Already registered? Sign In';
        extraFields.forEach(id => document.getElementById(id).style.display = 'block');
    } else {
        title.textContent = '🔐 Sign In';
        toggle.textContent = "Don't have account? Sign Up";
        extraFields.forEach(id => document.getElementById(id).style.display = 'none');
    }
    
    document.getElementById('authForm').dataset.mode = type;
    modal.style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

document.getElementById('toggleAuth').onclick = (e) => {
    e.preventDefault();
    const mode = document.getElementById('authForm').dataset.mode === 'signup' ? 'login' : 'signup';
    showAuth(mode);
};

document.getElementById('authForm').onsubmit = (e) => {
    e.preventDefault();
    const mode = e.target.dataset.mode;
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (mode === 'signup') {
        const name = document.getElementById('authName').value;
        const regno = document.getElementById('authRegno').value;
        const phone = document.getElementById('authPhone').value;
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.find(u => u.email === email)) {
            alert('❌ Email already registered!');
            return;
        }
        
        const user = { name, email, password, regno, phone, joined: new Date().toISOString() };
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert('✅ Account created successfully!');
    } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            alert('❌ Invalid credentials!');
            return;
        }
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert('✅ Welcome back!');
    }
    
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    checkAuth();
    closeModal('authModal');
};

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('addNoticeBtn').style.display = 'none';
    loadNotices();
}

// Notices Management
function loadNotices() {
    let notices = JSON.parse(localStorage.getItem('notices') || '[]');
    
    // If no custom notices, use seed data
    if (notices.length === 0) {
        notices = [...seedNotices];
        localStorage.setItem('notices', JSON.stringify(notices));
    }
    
    currentNotices = notices;
    renderNotices();
}

function renderNotices() {
    const container = document.getElementById('noticesList');
    const noNotices = document.getElementById('noNotices');
    
    const filtered = currentNotices.filter(notice => {
        if (currentFilter === 'all') return true;
        return notice.type === currentFilter;
    });
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        noNotices.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    noNotices.style.display = 'none';
    
    container.innerHTML = filtered.map(notice => createNoticeCard(notice)).join('');
}

function createNoticeCard(notice) {
    const isPast = new Date(notice.date) < new Date();
    const isRegistered = currentUser && notice.registrations?.some(r => r.userEmail === currentUser.email);
    const today = new Date().toDateString();
    const noticeDate = new Date(notice.date).toDateString();
    const showTillDate = !isPast; // Show registered notices till event date
    
    let btnContent = '';
    if (notice.type === 'notice') {
        btnContent = '📄 View Details';
    } else if (isRegistered && showTillDate) {
        btnContent = '✅ Registered!';
    } else if (currentUser || notice.type === 'notice') {
        btnContent = notice.type === 'notice' ? '📄 View Details' : '📝 Register Now';
    } else {
        btnContent = '🔐 Sign In to Register';
    }
    
    const btnClass = isRegistered ? 'action-btn registered-btn' : 
                    (notice.type === 'notice' ? 'action-btn view-registrations' : 'action-btn register-btn');
    
    const icon = notice.type === 'event' ? '🎉' : notice.type === 'exam' ? '📚' : '📢';
    
    return `
        <div class="notice-card notice-type-${notice.type}" data-id="${notice.id}">
            <span class="notice-icon">${icon}</span>
            <h3 class="notice-title">${notice.title}</h3>
            <div class="notice-meta">
                <span>📅 ${new Date(notice.date).toLocaleDateString('en-IN')}</span>
                ${notice.time ? `<span>🕒 ${notice.time}</span>` : ''}
                <span>👥 ${notice.registrations?.length || 0} registered</span>
            </div>
            <p class="notice-desc">${notice.desc}</p>
            <button class="${btnClass}" onclick="handleNoticeAction('${notice.id}', '${notice.type}')">
                ${btnContent}
            </button>
        </div>
    `;
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            renderNotices();
        };
    });
}

function handleNoticeAction(noticeId, type) {
    if (!currentUser && type !== 'notice') {
        alert('🔐 Please sign in to register for events!');
        showAuth('login');
        return;
    }
    
    if (type === 'notice') {
        showNoticeDetails(noticeId);
    } else {
        showRegisterModal(noticeId);
    }
}

function showRegisterModal(noticeId) {
    const notice = currentNotices.find(n => n.id === noticeId);
    if (!notice) return;
    
    document.getElementById('noticeTitle').textContent = notice.title;
    document.getElementById('noticeDetails').innerHTML = `
        <div class="notice-meta">
            📅 ${new Date(notice.date).toLocaleDateString('en-IN')} | 
            ${notice.time ? `🕒 ${notice.time}` : ''} | 
            👥 ${notice.registrations?.length || 0} registered
        </div>
        <p>${notice.desc}</p>
    `;
    
    const myRegs = notice.registrations?.filter(r => r.userEmail === currentUser.email) || [];
    const regsHtml = myRegs.map(reg => `
        <div class="registration-item">
            <strong>${reg.name}</strong> (${reg.year}, ${reg.dept})<br>
            Reg: ${reg.regno} | Phone: ${reg.phone}<br>
            <small>Registered: ${new Date(reg.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
    
    document.getElementById('myRegistrations').innerHTML = myRegs.length ? 
        `<div class="my-registrations"><h4>✅ Your Registration:</h4>${regsHtml}</div>` : '';
    
    document.getElementById('registerModal').dataset.noticeId = noticeId;
    document.getElementById('registerModal').style.display = 'block';
}

function showNoticeDetails(noticeId) {
    const notice = currentNotices.find(n => n.id === noticeId);
    alert(`📄 ${notice.title}\n\n📅 ${notice.date}\n\n${notice.desc}`);
}

document.getElementById('registerForm').onsubmit = (e) => {
    e.preventDefault();
    const noticeId = document.getElementById('registerModal').dataset.noticeId;
    const notice = currentNotices.find(n => n.id === noticeId);
    
    const regData = {
        name: document.getElementById('regName').value,
        year: document.getElementById('regYear').value,
        dept: document.getElementById('regDept').value,
        regno: document.getElementById('regRegno').value,
        phone: document.getElementById('regPhone').value,
        userEmail: currentUser.email,
        timestamp: new Date().toISOString()
    };
    
    notice.registrations = notice.registrations || [];
    notice.registrations.push(regData);
    
    // Update localStorage
    const notices = JSON.parse(localStorage.getItem('notices') || '[]');
    const noticeIndex = notices.findIndex(n => n.id === noticeId);
    notices[noticeIndex] = notice;
    localStorage.setItem('notices', JSON.stringify(notices));
    
    currentNotices = notices;
    alert('✅ Registration confirmed! Notice will show until event date.');
    closeModal('registerModal');
    renderNotices();
};

function showAddNotice() {
    if (!currentUser) {
        alert('🔐 Login required to post notices!');
        return;
    }
    document.getElementById('addNoticeModal').style.display = 'block';
}

document.getElementById('addNoticeForm').onsubmit = (e) => {
    e.preventDefault();
    const notices = JSON.parse(localStorage.getItem('notices') || '[]');
    
    const newNotice = {
        id: 'notice_' + Date.now(),
        title: document.getElementById('noticeTitleInput').value,
        type: document.getElementById('noticeType').value,
        date: document.getElementById('noticeDate').value,
        time: document.getElementById('noticeTime').value || '',
        desc: document.getElementById('noticeDesc').value,
        registrations: [],
        postedBy: currentUser.name,
        postedAt: new Date().toISOString()
    };
    
    notices.unshift(newNotice); // Add to top
    localStorage.setItem('notices', JSON.stringify(notices));
    
    currentNotices = notices;
    alert('✅ Notice published successfully!');
    closeModal('addNoticeModal');
    renderNotices();
};

// Close modals on outside click
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Auto refresh every 5 minutes for new notices
setInterval(loadNotices, 300000);
