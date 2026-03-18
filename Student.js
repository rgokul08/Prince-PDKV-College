document.addEventListener('DOMContentLoaded', function() {
    // Initialize after DOM loads
    const supabase = window.supabase;
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

    // ✅ FIXED: Attendance calculation
    function calculateAttendance() {
        const total = parseInt(totalDays.value) || 0;
        const present = parseInt(presentDays.value) || 0;
        
        if (total > 0 && present <= total) {
            const percentage = ((present / total) * 100).toFixed(2);
            attendancePercentage.innerHTML = `<strong>Attendance: ${percentage}%</strong>`;
            absentDays.value = total - present;
        } else {
            attendancePercentage.innerHTML = '';
        }
    }

    totalDays.addEventListener('input', calculateAttendance);
    presentDays.addEventListener('input', calculateAttendance);

    // ✅ FIXED: Add exam button - Now works perfectly!
    addExamBtn.addEventListener('click', function() {
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
    });

    // ✅ FIXED: Remove exam function - Global scope
    window.removeExam = function(button) {
        if (examDetails.children.length > 1) {
            button.parentElement.remove();
        }
    };

    // ✅ FIXED: Form submission - Now stores to Supabase correctly
    studentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading
        document.getElementById('submitBtn').innerHTML = '⏳ Saving...';
        document.getElementById('submitBtn').disabled = true;

        try {
            // Format DOB
            const dobInput = document.getElementById('dob').value;
            const dob = new Date(dobInput).toLocaleDateString('en-GB');

            // Collect ALL form data
            const formData = {
                name: document.getElementById('studentName').value,
                guardian_name: document.getElementById('guardianName').value,
                register_no: document.getElementById('registerNo').value,
                department: document.getElementById('department').value,
                year: parseInt(document.getElementById('year').value),
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                linkedin: document.getElementById('linkedin').value || null,
                github: document.getElementById('github').value || null,
                dob: dob,
                total_days: parseInt(totalDays.value),
                present_days: parseInt(presentDays.value),
                absent_days: parseInt(absentDays.value),
                attendance_percentage: parseFloat(attendancePercentage.textContent?.match(/[\d.]+/)?.[0] || '0')
            };

            // Collect exam data
            const examEntries = document.querySelectorAll('.exam-entry');
            const exams = [];
            examEntries.forEach(entry => {
                const subject = entry.querySelector('.exam-subject').value;
                const marks = entry.querySelector('.exam-marks').value;
                const result = entry.querySelector('.exam-result').value;
                const type = entry.querySelector('.exam-type').value;
                
                if (subject && marks) {
                    exams.push({
                        subject: subject,
                        marks: parseInt(marks),
                        result: result,
                        type: type
                    });
                }
            });
            formData.exam_details = exams;

            // ✅ Check duplicate register number
            const { data: existingStudent } = await supabase
                .from('student_information')
                .select('register_no')
                .eq('register_no', formData.register_no)
                .single();

            if (existingStudent) {
                alert('❌ Register number already exists!');
                return;
            }

            // ✅ Upload image to correct bucket path
            let imageUrl = null;
            if (studentImageInput.files[0]) {
                const file = studentImageInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `Student_images/${formData.register_no}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('Image_files')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

                const { data: publicUrl } = supabase.storage
                    .from('Image_files')
                    .getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            // ✅ Insert to Supabase
            const { data: studentData, error } = await supabase
                .from('student_information')
                .insert([{ 
                    ...formData, 
                    image_url: imageUrl,
                    exam_details: formData.exam_details.length > 0 ? formData.exam_details : null
                }])
                .select()
                .single();

            if (error) throw error;

            // ✅ SUCCESS: Hide form, show student data only
            formSection.style.display = 'none';
            displaySection.style.display = 'block';
            displayStudentProfile(studentData);

        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            // Reset button
            document.getElementById('submitBtn').innerHTML = '💾 Submit Student Data';
            document.getElementById('submitBtn').disabled = false;
        }
    });

    // Display student profile
    window.displayStudentProfile = function(student) {
        studentProfile.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="${student.image_url || 'https://via.placeholder.com/150?text=No+Image'}" 
                     alt="${student.name}" class="student-image" 
                     onerror="this.src='https://via.placeholder.com/150?text=Photo'">
                <h3>${student.name}</h3>
                <h4>Register No: ${student.register_no}</h4>
            </div>
            
            <div class="student-info">
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
                    <div class="info-value"><a href="${student.linkedin}" target="_blank">🔗 Profile</a></div>
                </div>` : ''}
                ${student.github ? `
                <div class="info-item">
                    <div class="info-label">GitHub</div>
                    <div class="info-value"><a href="${student.github}" target="_blank">🔗 Profile</a></div>
                </div>` : ''}
            </div>
            
            <div class="exams-grid" style="margin-top: 30px;">
                <h3>📊 Exam Results</h3>
                ${student.exam_details && student.exam_details.length > 0 ? 
                    student.exam_details.map(exam => `
                    <div class="info-item">
                        <div class="info-label">${exam.subject}</div>
                        <div class="info-value">${exam.marks} Marks - ${exam.result} (${exam.type})</div>
                    </div>
                    `).join('') : 
                    '<div class="info-item"><p>No exam details added</p></div>'
                }
            </div>
            
            <div class="attendance-grid" style="margin-top: 20px;">
                <h3>📅 Attendance Details</h3>
                <div class="info-item">
                    <div class="info-label">Attendance %</div>
                    <div class="info-value">${student.attendance_percentage}%</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Present Days</div>
                    <div class="info-value">${student.present_days}/${student.total_days}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Absent Days</div>
                    <div class="info-value">${student.absent_days}</div>
                </div>
            </div>
            
            <button onclick="resetForm()" class="reset-btn">
                ➕ Add Another Student
            </button>
        `;
    };

    // Reset form
    window.resetForm = function() {
        formSection.style.display = 'block';
        displaySection.style.display = 'none';
        studentForm.reset();
        attendancePercentage.innerHTML = '';
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
    };
});
