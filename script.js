// Initialize Lucide Icons
lucide.createIcons();

// Data Source URL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQisfAjXtdhgNsKx0tRWZfxpKE3ZqnTko7Nza9JI0Kk5F4Syl58jky7G0iOoNy5L5Zzyr9jO16rX1Np/pub?gid=1152285208&single=true&output=csv';

// Fetch and Parse CSV
Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        processData(results.data);
        
        // Hide Loader
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 800);
    },
    error: function(err) {
        console.error("Error fetching data: ", err);
        const loader = document.getElementById('loader');
        if (loader) {
            loader.innerHTML = '<h2>Failed to load data.</h2>';
        }
    }
});

// State variables
let currentStudentData = [];
let currentStudentMap = {};
let currentAssignmentsList = [];
let searchQuery = "";

function processData(data) {
    // Valid entries only
    const validData = data.filter(r => r["Student Name"] && r["Timestamp"]);
    
    currentStudentMap = {};
    let totalSubmissions = 0;
    
    validData.forEach(row => {
        const student = row["Student Name"].trim();
        const rollNumber = row["Roll Number"] ? row["Roll Number"].trim() : "";
        const assignment = row["Assignment Name"] ? row["Assignment Name"].trim() : "Unknown";
        
        if (!currentStudentMap[student]) {
            currentStudentMap[student] = {
                name: student,
                rollNumber: rollNumber,
                assignmentsCompleted: new Set(),
                submissions: [] // Store full submission details
            };
        }
        
        // Track unique assignments completed
        currentStudentMap[student].assignmentsCompleted.add(assignment);
        
        // Store the submission details
        currentStudentMap[student].submissions.push({
            assignment: assignment,
            timestamp: row["Timestamp"],
            javaFile: row["Java File Upload"],
            githubLink: row["Github Repository Link"],
            outputScreenshot: row["Output Screenshot"]
        });
        
        totalSubmissions++;
    });

    currentStudentData = Object.values(currentStudentMap).map(s => ({
        name: s.name,
        rollNumber: s.rollNumber,
        score: s.assignmentsCompleted.size,
        submissions: s.submissions
    }));

    // Sort by score descending
    currentStudentData.sort((a, b) => b.score - a.score);

    // Update Stats
    const statStudents = document.getElementById('stat-students');
    const statSub = document.getElementById('stat-submissions');
    const statHighest = document.getElementById('stat-highest');

    if (statStudents) statStudents.innerText = currentStudentData.length;
    if (statSub) statSub.innerText = totalSubmissions;
    if (statHighest) statHighest.innerText = currentStudentData.length > 0 ? currentStudentData[0].score : 0;

    // Collect all assignments
    const allAssignments = new Set();
    validData.forEach(row => {
        if (row["Assignment Name"]) allAssignments.add(row["Assignment Name"].trim());
    });
    currentAssignmentsList = Array.from(allAssignments).sort();

    // Render Views
    renderViews();
    
    setupEventListeners();
}

function renderViews() {
    // Filter data based on search
    const filteredData = currentStudentData.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    renderLeaderboard(filteredData, currentAssignmentsList.length);
    renderStatusMatrix(filteredData, currentStudentMap, currentAssignmentsList);
    
    // Re-init lucide icons for dynamically added content
    lucide.createIcons();
}

function setupEventListeners() {
    // Search Box listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // Remove old listeners by cloning to avoid duplicates if processData is called again
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        newSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderViews();
        });
    }

    // Modal Close
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.remove('active');
    }
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }

    // Export PDF
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const element = document.querySelector('.main-grid');
            const opt = {
                margin:       10,
                filename:     'student-leaderboard-export.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            
            // Add a temporary class to fix layout for PDF if needed
            element.style.background = 'var(--bg-color)';
            element.style.padding = '20px';
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Reset styles
                element.style.background = '';
                element.style.padding = '';
            });
        };
    }
}

function renderLeaderboard(students, totalAssignments) {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    container.innerHTML = '';
    
    if(students.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No data available.</p>';
        return;
    }

    students.forEach((student, index) => {
        let rankClass = '';
        if(index === 0) rankClass = 'rank-1';
        else if(index === 1) rankClass = 'rank-2';
        else if(index === 2) rankClass = 'rank-3';

        const percent = totalAssignments > 0 ? Math.round((student.score / totalAssignments) * 100) : 0;

        const item = document.createElement('div');
        item.className = 'leader-item';
        item.onclick = () => openStudentProfile(student.name);
        item.innerHTML = `
            <div class="rank ${rankClass}">#${index + 1}</div>
            <div class="leader-info" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="leader-name">${student.name}</div>
                    <div class="leader-score" style="margin-left: auto; font-size: 0.8rem; padding: 0.2rem 0.5rem;">
                        <i data-lucide="check-circle" size="14"></i>
                        <span>${student.score}/${totalAssignments}</span>
                    </div>
                </div>
                <div class="leader-roll">${student.rollNumber} - ${percent}%</div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderStatusMatrix(studentArray, studentMap, assignmentsList) {
    const thead = document.getElementById('matrix-table-head');
    const tbody = document.getElementById('matrix-table-body');
    if (!thead || !tbody) return;

    // Build Header
    let headerHTML = '<tr><th>Student</th>';
    assignmentsList.forEach(assignment => {
        headerHTML += `<th style="text-align: center; min-width: 120px;">${assignment}</th>`;
    });
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // Build Body
    tbody.innerHTML = '';
    
    if(studentArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${assignmentsList.length + 1}" style="text-align: center; padding: 2rem; color: var(--text-muted);">No matching students found</td></tr>`;
        return;
    }

    studentArray.forEach(student => {
        const studentInfo = studentMap[student.name];
        
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.onclick = () => openStudentProfile(student.name);

        let rowHTML = `
            <td>
                <div style="font-weight: 500;">${student.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${student.rollNumber}</div>
            </td>
        `;
        
        assignmentsList.forEach(assignment => {
            const completed = studentInfo.assignmentsCompleted.has(assignment);
            if (completed) {
                rowHTML += `<td style="text-align: center;"><i data-lucide="check-circle" style="color: var(--success);" size="22"></i></td>`;
            } else {
                rowHTML += `<td style="text-align: center;"><i data-lucide="x-circle" style="color: var(--text-muted); opacity: 0.3;" size="22"></i></td>`;
            }
        });
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
}

function openStudentProfile(studentName) {
    const student = currentStudentMap[studentName];
    if (!student) return;

    const modal = document.getElementById('profile-modal');
    
    // Header
    document.getElementById('modal-student-name').innerText = student.name;
    document.getElementById('modal-student-roll').innerText = student.rollNumber || "No Roll Number";

    // Stats
    const totalAssignments = currentAssignmentsList.length;
    const completed = student.assignmentsCompleted.size;
    const percent = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
    
    document.getElementById('modal-stat-percent').innerText = `${percent}%`;
    document.getElementById('modal-stat-fraction').innerText = `(${completed}/${totalAssignments})`;

    // Get last active
    // Submissions usually chronologically in CSV, but parse dates to be safe
    let lastActiveText = "Never";
    let sortedSubmissions = [];

    if (student.submissions.length > 0) {
        sortedSubmissions = [...student.submissions].sort((a, b) => {
            // Rough date parse based on typical google forms timestamp format (MM/DD/YYYY HH:MM:SS)
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        const lastDate = new Date(sortedSubmissions[0].timestamp);
        if(!isNaN(lastDate)) {
            // Format nice date
            lastActiveText = lastDate.toLocaleDateString() + ' ' + lastDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            lastActiveText = sortedSubmissions[0].timestamp; // fallback to raw string
        }
    }
    
    document.getElementById('modal-stat-last-active').innerText = lastActiveText;

    // Build Submissions List
    const listContainer = document.getElementById('modal-submissions-list');
    listContainer.innerHTML = '';

    if (sortedSubmissions.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-muted)">No submissions found.</p>';
    } else {
        sortedSubmissions.forEach(sub => {
            const item = document.createElement('div');
            item.className = 'submission-item';
            
            let linksHTML = '';
            if(sub.githubLink) {
                linksHTML += `<a href="${sub.githubLink}" target="_blank" class="submission-link"><i data-lucide="github" size="14"></i> Repository</a>`;
            }
            if(sub.javaFile && sub.javaFile.trim() !== '') {
               // Usually Google forms leaves multiple file uploads as comma separated
               linksHTML += `<a href="${sub.javaFile}" target="_blank" class="submission-link"><i data-lucide="file-code" size="14"></i> Files</a>`;
            }

            item.innerHTML = `
                <div class="submission-header">
                    <span class="submission-title">${sub.assignment}</span>
                    <span class="submission-time">${sub.timestamp}</span>
                </div>
                ${linksHTML ? `<div class="submission-links">${linksHTML}</div>` : ''}
            `;
            listContainer.appendChild(item);
        });
    }

    lucide.createIcons();
    modal.classList.add('active');
}
