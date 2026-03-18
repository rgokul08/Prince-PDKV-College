// Home.js - Connected to Supabase (login-information table)
const supabase = window.supabase;

const loginDiv = document.getElementById('loginForm');
const signupDiv = document.getElementById('signupForm');
const welcomeDiv = document.getElementById('welcomeMessage');

const showSignupBtn = document.getElementById('showSignupBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const loginForm = document.getElementById('loginFormElement');
const signupForm = document.getElementById('signupFormElement');

showSignupBtn.addEventListener('click', () => {
    loginDiv.style.display = 'none';
    signupDiv.style.display = 'block';
});
showLoginBtn.addEventListener('click', () => {
    signupDiv.style.display = 'none';
    loginDiv.style.display = 'block';
});

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) showWelcome(session.user);
}
checkSession();

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const regno = document.getElementById('signupRegNo').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (name.length < 3 || regno.length < 5 || phone.length !== 10 || password.length < 6) {
        showCustomAlert('Please fill all fields correctly', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        await supabase.from('login-information').insert({ id: data.user.id, name, regno, phone, email });

        showCustomAlert('✅ Account created successfully!', 'success');
        signupForm.reset();
        signupDiv.style.display = 'none';
        loginDiv.style.display = 'block';
    } catch (err) {
        showCustomAlert('❌ ' + err.message, 'error');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showWelcome(data.user);
    } catch (err) {
        showCustomAlert('❌ ' + err.message, 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    welcomeDiv.style.display = 'none';
    loginDiv.style.display = 'block';
    showCustomAlert('👋 Logged out successfully!', 'success');
});

async function showWelcome(user) {
    const { data: profile } = await supabase.from('login-information').select('*').eq('id', user.id).single();

    document.getElementById('userName').textContent = profile?.name || 'Student';
    document.getElementById('userRegNo').textContent = profile?.regno || 'N/A';
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userPhone').textContent = profile?.phone || 'N/A';

    loginDiv.style.display = 'none';
    signupDiv.style.display = 'none';
    welcomeDiv.style.display = 'block';
}

function showCustomAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : '#f44336'}; color: white; padding: 15px 25px; 
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; font-weight: bold;`;
    alertDiv.innerHTML = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}