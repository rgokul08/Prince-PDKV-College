// ── Header Shrink on Scroll & Active Nav ─────────────────
let lastScrollY = window.scrollY;
const header = document.querySelector('.header-main');
const navbar = document.querySelector('.navbar');
const hamburger = document.getElementById('hamburger');

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  
  // Header shrink effect
  if (currentScrollY > 100) {
    header.classList.add('shrink');
  } else {
    header.classList.remove('shrink');
  }
  
  // Active nav for Home page (default)
  setTimeout(() => {
    document.querySelector('.nav-link[data-page="home"]').classList.add('active');
    document.querySelectorAll('.nav-link[data-page]:not([data-page="home"])').forEach(link => {
      link.classList.remove('active');
    });
  }, 100);
  
  lastScrollY = currentScrollY;
});

// ── Mobile Hamburger Menu ───────────────────────────────
hamburger.addEventListener('click', () => {
  navbar.classList.toggle('active');
  hamburger.classList.toggle('active');
});

// ── Counter Animation ───────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  
  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-target'));
    const increment = target / 100;
    let current = 0;
    
    if (counter.getBoundingClientRect().top < window.innerHeight && 
        !counter.classList.contains('animated')) {
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target.toLocaleString();
          if (target === 82.37) counter.textContent += '%';
          if (target === 3.8 || target === 8) counter.textContent += ' LPA';
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString();
        }
      }, 30);
      counter.classList.add('animated');
    }
  });
}

window.addEventListener('scroll', animateCounters);
animateCounters();

// ── Smooth Scroll Animations ────────────────────────────
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
document.querySelectorAll('.fact-card, .service-card, .gallery-item, .stat-box').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(40px)';
  el.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
  observer.observe(el);
});

// ── Parallax Hero Effect ───────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero-dashboard');
  if (hero) {
    hero.style.transform = `translateY(${Math.min(scrolled * 0.5, 50)}px)`;
  }
});

// ── Service Cards Hover Scale ──────────────────────────
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-15px) scale(1.02)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) scale(1)';
  });
});
