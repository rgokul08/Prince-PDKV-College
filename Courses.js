// Courses.js
document.addEventListener('DOMContentLoaded', function() {
  const courseCards = document.querySelectorAll('.course-card');
  const modal = document.getElementById('course-modal');
  const closeBtn = document.querySelector('.close');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-description');
  const courseLink = document.getElementById('course-link');

  // Course data from college website and reliable sources [web:1][web:2][web:3][web:4][web:5][web:9][page:2]
  const courseDetails = {
    'btech-cse': {
      title: 'B.Tech Computer Science and Engineering',
      desc: '4-year UG program affiliated with Anna University. Focuses on software development, algorithms, AI, and data science. Established in 1985 with excellent placements in TCS, Infosys, Zoho. 420 seats available across B.Tech specializations. [web:1][web:9][page:2]',
      link: 'https://www.princedrkvasudevan.com/departments/BE.CSE.html'
    },
    'btech-ece': {
      title: 'B.Tech Electronics & Communication Engineering',
      desc: '4-year program (60 seats) with total fees around ₹2 Lakh. Covers communication systems, VLSI, embedded systems. Admission via TNEA/CBSE 12th. [web:2][web:10]',
      link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/course-b-e-in-electronics-and-communication-engineering-539701'
    },
    'btech-mech': {
      title: 'B.Tech Mechanical Engineering',
      desc: '4-year UG program focusing on design, manufacturing, thermal engineering. Lateral entry available (3 years, ₹1.65 Lakh). Strong industry connections. [web:3]',
      link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/courses/be-btech-bc'
    },
    'btech-civil': {
      title: 'B.Tech Civil Engineering',
      desc: '4-year program covering structural engineering, construction management. Affiliated with Anna University. Practical training emphasis. [web:1]',
      link: 'https://www.princedrkvasudevan.com'
    },
    'mtech-cse': {
      title: 'M.Tech Computer Science and Engineering',
      desc: '2-year PG program (9 seats) based on GATE/CEETA scores. Advanced topics in algorithms, networks, software engineering. [web:5]',
      link: 'https://www.shiksha.com/college/prince-dr-k-vasudevan-college-of-engineering-and-technology-chennai-53970/courses/me-mtech-bc'
    },
    'mtech-vlsi': {
      title: 'M.Tech VLSI Design',
      desc: '2-year postgraduate program focusing on CMOS design, semiconductor tech, HDL, embedded systems. High industry demand. [web:6]',
      link: 'https://www.niet.co.in/blog/mtech-in-vlsi-design-best-colleges-in-india-admission-process--placement-packages'
    },
    'mba': {
      title: 'Master of Business Administration (MBA)',
      desc: '2-year full-time program (60 seats) affiliated with Anna University, AICTE approved. Specializations in marketing, finance, HR. Industry projects & internships. [web:7]',
      link: 'https://psvpec.in/mba/'
    },
    'arts': {
      title: 'Arts and Humanities',
      desc: 'Programs fostering critical thinking, communication, cultural studies. Prepares for diverse career paths in education, media, public service. [web:4]',
      link: 'https://www.princedrkvasudevan.com'
    }
  };

  // Add click event to course cards
  courseCards.forEach(card => {
    card.addEventListener('click', function() {
      const courseId = this.getAttribute('data-course');
      const details = courseDetails[courseId];
      
      if (details) {
        modalTitle.textContent = details.title;
        modalDesc.innerHTML = details.desc;
        courseLink.href = details.link;
        modal.style.display = 'block';
      }
    });
  });

  // Close modal
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  };

  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});
