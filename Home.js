// Home.js - Enhanced with Smooth Animations & Scroll Effects

let isScrolled = false;

window.addEventListener('scroll', () => {
  const header = document.getElementById('header');

  // Header shrink effect
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

  animateCounters();
});

// Counter Animation
function animateCounters() {
  const counters = document.querySelectorAll('.counter:not(.animated)');

  counters.forEach(counter => {
    const rect = counter.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) {
      const target = parseFloat(counter.getAttribute('data-target'));
      let current = 0;
      const increment = target / 80;
      const isPercentage = counter.getAttribute('data-target') === "82.37";

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = isPercentage 
            ? target.toFixed(2) + '%' 
            : Math.floor(target).toLocaleString('en-IN');
          counter.classList.add('animated');
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString('en-IN');
        }
      }, 25);
    }
  });
}

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.15 });

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
  // Observe all animated elements
  document.querySelectorAll('.fact-card, .gallery-item, .stat-item, .service-card, .stat-box').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(50px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });

  // Trigger counters on load
  setTimeout(animateCounters, 800);
});