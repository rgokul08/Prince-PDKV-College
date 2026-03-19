// Student.js - Enhanced animations & counters

// ── Navbar Smooth Scrolling ────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ── Navbar Active State ────────────────────────────────
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('#navbar a');
  
  let current = 'Home.html'; // default
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 200) {
      current = section.getAttribute('class') || 'home';
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    // Logic for external pages remains visual only
  });
});

// ── Counter Animation ─────────────────────────────────
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'));
    const increment = target / 120;
    let current = 0;
    const isVisible = counter.getBoundingClientRect().top < window.innerHeight;
    
    if (isVisible && !counter.classList.contains('animated')) {
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target + (target === 75 ? '%' : (target === 4 || target === 8 ? ' LPA' : '+'));
          clearInterval(timer);
        } else {
          counter.textContent = Math.ceil(current) + (target === 75 ? '%' : '');
        }
      }, 20);
      counter.classList.add('animated');
    }
  });
}

window.addEventListener('scroll', animateCounters);
animateCounters(); // Initial call

// ── Scroll Animations ─────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fact-card, .service-card, .gallery-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(40px)';
  el.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
  observer.observe(el);
});

// ── Parallax Hero ─────────────────────────────────────
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero-dashboard');
  if (hero) {
    hero.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
});

// ── Gallery Hover Effects ─────────────────────────────
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('mousemove', (e) => {
    const rect = item.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    item.style.setProperty('--mouse-x', `${x}px`);
    item.style.setProperty('--mouse-y', `${y}px`);
  });
});
