// Student.js
const form = document.getElementById('student-form');
const tableBody = document.querySelector('#students-table tbody');
let editingRegNo = null;
let currentImageUrl = '';

const supabase = window.supabase;

function calculateAttendance() {
    const total = parseFloat(document.getElementById('total_days').value) || 0;
    const present = parseFloat(document.getElementById('present_days').value) || 0;
    const perc = total > 0 ? ((present / total) * 100).toFixed(2) : 0;
    document.getElementById('attendance_display').textContent = perc + ' %';
}

['total_days', 'present_days'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateAttendance);
});

document.getElementById('image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('preview-img').src = URL.createObjectURL(file);
    }
});

document.getElementById('add-exam-btn').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'exam-entry';
    div.innerHTML = `
        <input type="text" class="subject" placeholder="Subject Name" required>
        <input type="number" class="marks" placeholder="Marks" required>
        <select class="type">
            <option value="SEM">SEM</option>
            <option value="CIAT">CIAT</option>
        </select>
        <select class="status">
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
        </select>
        <button type="button" class="remove-exam">Remove</button>
    `;
    document.getElementById('exam-list').appendChild(div);
    
    div.querySelector('.remove-exam').onclick = () => div.remove();
});

function getExamDetails() {
    const exams = [];
    document.querySelectorAll('.exam-entry').forEach(entry => {
        exams.push({
            subject: entry.querySelector('.subject').value,
            mark: parseFloat(entry.querySelector('.marks').value),
            type: entry.querySelector('.type').value,
            status: entry.querySelector('.status').value
        });
    });
    return exams;
}

async function loadStudents() {
    const { data, error } = await supabase.from('student_information').select('*').order('register_no');
    if (error) return console.error(error);

    tableBody.innerHTML = '';
    data.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.image_url ? `<img src="${student.image_url}" alt="photo">` : 'No Image'}</td>
            <td>${student.name}</td>
            <td>${student.register_no}</td>
            <td>${student.department}</td>
            <td>${student.year}</td>
            <td>${student.attendance_percentage}%</td>
            <td>
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </td>
        `;
        tr.querySelector('.edit-btn').onclick = () => editStudent(student);
        tr.querySelector('.delete-btn').onclick = () => deleteStudent(student.register_no);
        tableBody.appendChild(tr);
    });
}

async function deleteStudent(regNo) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    await supabase.from('student_information').delete().eq('register_no', regNo);
    loadStudents();
}

function editStudent(student) {
    editingRegNo = student.register_no;
    document.getElementById('form-title').textContent = 'Edit Student';

    document.getElementById('register_no').value = student.register_no;
    document.getElementById('register_no').readOnly = true;

    document.getElementById('name').value = student.name || '';
    document.getElementById('guardian').value = student.guardian_name || '';
    document.getElementById('department').value = student.department || '';
    document.getElementById('year').value = student.year || '';
    document.getElementById('phone').value = student.phone_no || '';
    document.getElementById('email').value = student.email_id || '';
    document.getElementById('linkedin').value = student.linkedin_link || '';
    document.getElementById('github').value = student.github_link || '';
    document.getElementById('dob').value = student.date_of_birth || '';
    document.getElementById('total_days').value = student.total_days || 0;
    document.getElementById('present_days').value = student.present_days || 0;
    document.getElementById('absent_days').value = student.absent_days || 0;

    currentImageUrl = student.image_url || '';
    document.getElementById('preview-img').src = currentImageUrl || '';

    document.getElementById('exam-list').innerHTML = '';
    (student.exam_details || []).forEach(ex => {
        const div = document.createElement('div');
        div.className = 'exam-entry';
        div.innerHTML = `
            <input type="text" class="subject" value="${ex.subject}">
            <input type="number" class="marks" value="${ex.mark}">
            <select class="type"><option value="SEM" ${ex.type==='SEM'?'selected':''}>SEM</option><option value="CIAT" ${ex.type==='CIAT'?'selected':''}>CIAT</option></select>
            <select class="status"><option value="Pass" ${ex.status==='Pass'?'selected':''}>Pass</option><option value="Fail" ${ex.status==='Fail'?'selected':''}>Fail</option></select>
            <button type="button" class="remove-exam">Remove</button>
        `;
        document.getElementById('exam-list').appendChild(div);
        div.querySelector('.remove-exam').onclick = () => div.remove();
    });

    calculateAttendance();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let imageUrl = currentImageUrl;
    const file = document.getElementById('image-upload').files[0];

    if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${document.getElementById('register_no').value}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
            .from('Image_files')
            .upload(`Student_images/${fileName}`, file, { upsert: true });

        if (uploadErr) return alert('Image upload failed: ' + uploadErr.message);

        const { data } = supabase.storage.from('Image_files').getPublicUrl(`Student_images/${fileName}`);
        imageUrl = data.publicUrl;
    }

    const studentData = {
        register_no: document.getElementById('register_no').value.trim(),
        name: document.getElementById('name').value,
        guardian_name: document.getElementById('guardian').value,
        department: document.getElementById('department').value,
        year: parseInt(document.getElementById('year').value),
        phone_no: document.getElementById('phone').value,
        email_id: document.getElementById('email').value,
        linkedin_link: document.getElementById('linkedin').value,
        github_link: document.getElementById('github').value,
        date_of_birth: document.getElementById('dob').value || null,
        exam_details: getExamDetails(),
        total_days: parseInt(document.getElementById('total_days').value) || 0,
        present_days: parseInt(document.getElementById('present_days').value) || 0,
        absent_days: parseInt(document.getElementById('absent_days').value) || 0,
        image_url: imageUrl
    };

    const { error } = await supabase
        .from('student_information')
        .upsert(studentData, { onConflict: 'register_no' });

    if (error) {
        alert('Error saving data: ' + error.message);
    } else {
        alert('✅ Student data saved successfully!');
        form.reset();
        document.getElementById('preview-img').src = '';
        document.getElementById('exam-list').innerHTML = '';
        document.getElementById('form-title').textContent = 'Add New Student';
        document.getElementById('register_no').readOnly = false;
        editingRegNo = null;
        currentImageUrl = '';
        loadStudents();
    }
});

// Load students when page opens
loadStudents();