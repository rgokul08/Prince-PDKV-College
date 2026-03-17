// ==================== SUPABASE CONFIGURATION ====================
// ===> REPLACE THESE WITH YOUR OWN SUPABASE DETAILS <===
const SUPABASE_URL = 'https://zsuonqltlodkzrqlhsnm.supabase.co';   // ← Change this
const SUPABASE_ANON_KEY = 'sb_publishable_GPhUq8fpXNSAHkYRSMLBcQ_ST0r9c5R'; // ← Change this (your anon key)

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== DOM ELEMENTS ====================
const loginForm = document.getElementById('loginFormElement');
const signupForm = document.getElementById('signupFormElement');
const loginDiv = document.getElementById('loginForm');
const signupDiv = document.getElementById('signupForm');
const welcomeDiv = document.getElementById('welcomeMessage');

const showSignupBtn = document.getElementById('showSignupBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ==================== CHECK SESSION ON PAGE LOAD ====================
async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showWelcome(session.user);
    }
}
initAuth();

// ==================== TOGGLE FORMS ====================
showSignupBtn.addEventListener('click', () => {
    loginDiv.style.display = 'none';
    signupDiv.style.display = 'block';
});

showLoginBtn.addEventListener('click', () => {
    signupDiv.style.display = 'none';
    loginDiv.style.display = 'block';
});

// ==================== SIGNUP ====================
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const full_name = document.getElementById('signupName').value.trim();
    const reg_no = document.getElementById('signupRegNo').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // Simple validation
    if (full_name.length < 3) return showCustomAlert('Full name is too short', 'error');
    if (!/^\d{10,12}$/.test(reg_no)) return showCustomAlert('Register No must be 10-12 digits', 'error');
    if (!/^\d{10}$/.test(phone)) return showCustomAlert('Phone number must be 10 digits', 'error');
    if (password.length < 6) return showCustomAlert('Password must be at least 6 characters', 'error');

    try {
        // Create user in Supabase Auth
        const { data, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name, reg_no, phone }
            }
        });

        if (authError) throw authError;

        // Insert user details into students table
        const { error: profileError } = await supabase
            .from('students')
            .insert({
                id: data.user.id,
                full_name: full_name,
                reg_no: reg_no,
                phone: phone,
                email: email
            });

        if (profileError) console.error('Profile error:', profileError);

        showCustomAlert('✅ Account created! Please check your email to verify.', 'success');
        
        // Reset and switch to login
        signupForm.reset();
        signupDiv.style.display = 'none';
        loginDiv.style.display = 'block';

    } catch (err) {
        console.error(err);
        showCustomAlert('❌ ' + err.message, 'error');
    }
});

// ==================== LOGIN ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        showWelcome(data.user);

    } catch (err) {
        console.error(err);
        showCustomAlert('❌ Invalid email or password!', 'error');
    }
});

// ==================== LOGOUT ====================
logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error(error);

    welcomeDiv.style.display = 'none';
    loginDiv.style.display = 'block';
    showCustomAlert('👋 Logged out successfully!', 'success');
});

// ==================== SHOW WELCOME DASHBOARD ====================
async function showWelcome(user) {
    // Fetch profile from students table
    const { data: profile, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) console.error('Profile fetch error:', error);

    document.getElementById('userName').textContent = profile?.full_name || user.user_metadata?.full_name || 'Student';
    document.getElementById('userRegNo').textContent = profile?.reg_no || 'N/A';
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userPhone').textContent = profile?.phone || user.user_metadata?.phone || 'N/A';

    loginDiv.style.display = 'none';
    signupDiv.style.display = 'none';
    welcomeDiv.style.display = 'block';
}

// ==================== CUSTOM ALERT FUNCTION ====================
function showCustomAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert show alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-box">
            <span class="alert-icon">${type === 'success' ? '✅' : '❌'}</span>
            <div class="alert-message">${message}</div>
            <button class="alert-close-btn" onclick="this.closest('.custom-alert').remove()">OK</button>
        </div>
    `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}