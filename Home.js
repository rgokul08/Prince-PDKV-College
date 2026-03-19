// Enhanced Student Dashboard Script

// ── HEADER SCROLL EFFECTS ────────────────────────────
let isScrolled = false;
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  
  // Header shrink effect
  if (window.scrollY > 100 && !isScrolled) {
    header.classList.add('scrolled');
    isScrolled = true;
    document.querySelector('.college-title').style.opacity = '0.7';
  } else if (window.scrollY <= 100 && isScrolled) {
    header.classList.remove('scrolled');
    isScrolled = false;
    document.querySelector('.college-title').style.opacity = '1';
  }
  
  // Navbar active state based on URL
  updateActiveNav();
  
  // Trigger counters
  animateCounters();
});

// ── DEFAULT HOME PAGE ACTIVE ─────────────────────────
function updateActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop() || 'Home.html';
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const page = link.getAttribute('data-page');
    
    if (currentPage.toLowerCase().includes(page)) {
      link.classList.add('active');
    }
  });
}

// Initialize active nav on load
document.addEventListener('DOMContentLoaded', updateActiveNav);

// ── COUNTER ANIMATION ────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  
  counters.forEach(counter => {
    if (counter.classList.contains('animated')) return;
    
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
          });
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

// ── SMOOTH SCROLL & ANIMATIONS ───────────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fact-card, .service-card, .gallery-item, .stat-box, .stat-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.4,0,0.2,1)';
    observer.observe(el);
  });
  
  // Hero parallax
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-dashboard');
    if (hero) {
      hero.style.transform = `translateY(${Math.min(scrolled * 0.3, 30)}px)`;
    }
  });
});
