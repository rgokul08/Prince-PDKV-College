// Initialize Supabase
const supabase = window.supabase;

// DOM Elements
const studentForm = document.getElementById('studentForm');
const studentImageInput = document.getElementById('studentImage');
const examDetails = document.getElementById('examDetails');
const addExamBtn = document.getElementById('addExamBtn');
const totalDays = document.getElementById('totalDays');
const presentDays = document.getElementById('presentDays');
const absentDays = document.getElementById('absentDays');
const attendancePercentage = document.getElementById('attendancePercentage');
const formSection = document.getElementById('student-form-section');
const displaySection = document.getElementById('student-display-section');
const studentProfile = document.getElementById('studentProfile');

// Attendance calculation
function calculateAttendance() {
    const total = parseInt(totalDays.value) || 0;
    const present = parseInt(presentDays.value) || 0;
    const absent = parseInt(absentDays.value) || 0;
    
    if (total > 0) {
        const percentage = ((present / total) * 100).toFixed(2);
        attendancePercentage.innerHTML = `Attendance: ${percentage}%`;
        absentDays.value = total - present;
    }
}

totalDays.addEventListener('input', calculateAttendance);
presentDays.addEventListener('input', calculateAttendance);

// Add exam fields
let examCount = 1;
addExamBtn.addEventListener('click', () => {
    const examEntry = document.createElement('div');
    examEntry.className = 'exam-entry';
    examEntry.innerHTML = `
        <input type="text" class="exam-subject" placeholder="Subject Name">
        <input type="number" class="exam-marks" placeholder="Marks" min="0">
        <select class="exam-result">
            <option value="">Pass/Fail</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
        </select>
        <select class="exam-type">
            <option value="">Sem/CIA</option>
            <option value="Semester">Semester</option>
            <option value="CIA">CIA</option>
        </select>
        <button type="button" class="remove-exam" onclick="removeExam(this)">❌</button>
    `;
    examDetails.appendChild(examEntry);
    examCount++;
});

function removeExam(button) {
    button.parentElement.remove();
}

// Form submission
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Format DOB to dd-mm-yyyy
    const dobInput = document.getElementById('dob').value;
    const dob = new Date(dobInput).toLocaleDateString('en-GB');
    
    // Collect exam data
    const examEntries = document.querySelectorAll('.exam-entry');
    const exams = Array.from(examEntries).map(entry => ({
        subject: entry.querySelector('.exam-subject').value,
        marks: entry.querySelector('.exam-marks').value,
        result: entry.querySelector('.exam-result').value,
        type: entry.querySelector('.exam-type').value
    })).filter(exam => exam.subject && exam.marks);

    const formData = {
        name: document.getElementById('studentName').value,
        guardian_name: document.getElementById('guardianName').value,
        register_no: document.getElementById('registerNo').value,
        department: document.getElementById('department').value,
        year: document.getElementById('year').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        linkedin: document.getElementById('linkedin').value || null,
        github: document.getElementById('github').value || null,
        dob: dob,
        total_days: parseInt(totalDays.value),
        present_days: parseInt(presentDays.value),
        absent_days: parseInt(absentDays.value),
        attendance_percentage: ((parseInt(presentDays.value) / parseInt(totalDays.value)) * 100).toFixed(2),
        exam_details: exams
    };

    try {
        // Check for duplicate register number
        const { data: existing } = await supabase
            .from('student_information')
            .select('register_no')
            .eq('register_no', formData.register_no)
            .single();

        if (existing) {
            alert('Register number already exists!');
            return;
        }

        // Upload image
        let imageUrl = null;
        if (studentImageInput.files[0]) {
            const file = studentImageInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${formData.register_no}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('Image_files')
                .from('Student_images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;
            
            const { data: publicUrl } = supabase.storage
                .from('Image_files')
                .getPublicUrl(`Student_images/${fileName}`);
            imageUrl = publicUrl.data.publicUrl;
        }

        // Insert student data
        const { data, error } = await supabase
            .from('student_information')
            .insert([{ ...formData, image_url: imageUrl }])
            .select()
            .single();

        if (error) throw error;

        // Display student profile
        displayStudentProfile(data);
        formSection.style.display = 'none';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving data: ' + error.message);
    }
});

function displayStudentProfile(student) {
    studentProfile.innerHTML = `
        <img src="${student.image_url}" alt="${student.name}" class="student-image" onerror="this.src='https://via.placeholder.com/150?text=Photo'">
        <div class="student-info">
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${student.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Register No</div>
                <div class="info-value">${student.register_no}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Department</div>
                <div class="info-value">${student.department}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Year</div>
                <div class="info-value">${student.year}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Guardian</div>
                <div class="info-value">${student.guardian_name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${student.phone}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${student.email}</div>
            </div>
            <div class="info-item">
                <div class="info-label">DOB</div>
                <div class="info-value">${student.dob}</div>
            </div>
            ${student.linkedin ? `
            <div class="info-item">
                <div class="info-label">LinkedIn</div>
                <div class="info-value"><a href="${student.linkedin}" target="_blank">View Profile</a></div>
            </div>` : ''}
            ${student.github ? `
            <div class="info-item">
                <div class="info-label">GitHub</div>
                <div class="info-value"><a href="${student.github}" target="_blank">View Profile</a></div>
            </div>` : ''}
        </div>
        
        <div class="exams-grid">
            <h3>📊 Exam Results</h3>
            ${student.exam_details && student.exam_details.length > 0 ? 
                student.exam_details.map(exam => `
                <div class="info-item">
                    <div class="info-label">${exam.subject}</div>
                    <div class="info-value">${exam.marks} - ${exam.result} (${exam.type})</div>
                </div>
                `).join('') : 
                '<p>No exam details added</p>'
            }
        </div>
        
        <div class="attendance-grid">
            <h3>📅 Attendance</h3>
            <div class="info-item">
                <div class="info-label">Attendance</div>
                <div class="info-value">${student.attendance_percentage}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Present Days</div>
                <div class="info-value">${student.present_days}/${student.total_days}</div>
            </div>
        </div>
        
        <button onclick="loadForm()" style="background: #f44336; color: white; border: none; padding: 12px 25px; border-radius: 25px; cursor: pointer; margin-top: 20px;">
            ➕ Add Another Student
        </button>
    `;
}

function loadForm() {
    formSection.style.display = 'block';
    displaySection.style.display = 'none';
    studentForm.reset();
    examDetails.innerHTML = `
        <div class="exam-entry">
            <input type="text" class="exam-subject" placeholder="Subject Name">
            <input type="number" class="exam-marks" placeholder="Marks" min="0">
            <select class="exam-result">
                <option value="">Pass/Fail</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
            </select>
            <select class="exam-type">
                <option value="">Sem/CIA</option>
                <option value="Semester">Semester</option>
                <option value="CIA">CIA</option>
            </select>
            <button type="button" class="remove-exam" onclick="removeExam(this)">❌</button>
        </div>
    `;
}
