// Enhanced Student Dashboard - Complete Functionality

// ── HEADER SCROLL EFFECTS & NAVBAR ───────────────────
let isScrolled = false;

window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  
  // Smart header shrink (scroll > 100px)
  if (window.scrollY > 100) {
    if (!isScrolled) {
      header.classList.add('scrolled');
      isScrolled = true;
    }
  } else {
    if (isScrolled) {
      header.classList.remove('scrolled');
      isScrolled = false;
    }
  }
  
  // Update active navigation
  updateActiveNav();
  
  // Animate counters on scroll
  animateCounters();
});

// ── INTELLIGENT NAVBAR ACTIVE STATE ──────────────────
function updateActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop() || 'Home.html';
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const targetPage = link.getAttribute('data-page');
    
    // Match current page to nav link
    if (currentPage.toLowerCase().includes(targetPage) || 
        (currentPage === 'Home.html' && targetPage === 'home')) {
      link.classList.add('active');
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateActiveNav();
});

// ── ADVANCED COUNTER ANIMATION ───────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('.counter:not(.animated)');
  
  counters.forEach(counter => {
    const rect = counter.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const target = parseFloat(counter.getAttribute('data-target'));
      const increment = target / 100;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target.toLocaleString('en-IN', {
            maximumFractionDigits: target % 1 === 0 ? 0 : 2
          }) + (target === 82.37 ? '%' : '');
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString('en-IN', {
            maximumFractionDigits: 0
          });
        }
        counter.classList.add('animated');
      }, 30);
    }
  });
}

// ── SMOOTH SCROLL OBSERVER ANIMATIONS ────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Initialize all scroll animations
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fact-card, .service-card, .gallery-item, .stat-box, .stat-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.4,0,0.2,1)';
    observer.observe(el);
  });
});

// ── HERO PARALLAX EFFECT ────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero-dashboard');
  if (hero) {
    hero.style.transform = `translateY(${Math.min(scrolled * 0.3, 30)}px)`;
  }
});

// ── GALLERY MOUSE EFFECTS ───────────────────────────
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('mousemove', (e) => {
    const rect = item.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    item.style.setProperty('--mouse-x', `${x}px`);
    item.style.setProperty('--mouse-y', `${y}px`);
  });
});
