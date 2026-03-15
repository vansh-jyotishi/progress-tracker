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

function processData(data) {
    // Valid entries only
    const validData = data.filter(r => r["Student Name"] && r["Timestamp"]);
    
    const studentMap = {};
    let totalSubmissions = 0;
    
    validData.forEach(row => {
        const student = row["Student Name"].trim();
        const rollNumber = row["Roll Number"] ? row["Roll Number"].trim() : "";
        const assignment = row["Assignment Name"] ? row["Assignment Name"].trim() : "Unknown";
        
        if (!studentMap[student]) {
            studentMap[student] = {
                name: student,
                rollNumber: rollNumber,
                assignmentsCompleted: new Set()
            };
        }
        
        // Track unique assignments completed
        studentMap[student].assignmentsCompleted.add(assignment);
        totalSubmissions++;
    });

    const studentArray = Object.values(studentMap).map(s => ({
        name: s.name,
        rollNumber: s.rollNumber,
        score: s.assignmentsCompleted.size
    }));

    // Sort by score descending
    studentArray.sort((a, b) => b.score - a.score);

    // Update Stats
    const statStudents = document.getElementById('stat-students');
    const statSub = document.getElementById('stat-submissions');
    const statHighest = document.getElementById('stat-highest');

    if (statStudents) statStudents.innerText = studentArray.length;
    if (statSub) statSub.innerText = totalSubmissions;
    if (statHighest) statHighest.innerText = studentArray.length > 0 ? studentArray[0].score : 0;

    // Render Leaderboard
    renderLeaderboard(studentArray);

    // Collect all assignments
    const allAssignments = new Set();
    validData.forEach(row => {
        if (row["Assignment Name"]) allAssignments.add(row["Assignment Name"].trim());
    });
    const assignmentsList = Array.from(allAssignments).sort();

    // Render Matrix Table
    renderStatusMatrix(studentArray, studentMap, assignmentsList);
    
    // Re-init lucide icons for dynamically added content
    lucide.createIcons();
}

function renderLeaderboard(students) {
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

        const item = document.createElement('div');
        item.className = 'leader-item';
        item.innerHTML = `
            <div class="rank ${rankClass}">#${index + 1}</div>
            <div class="leader-info">
                <div class="leader-name">${student.name}</div>
                <div class="leader-roll">${student.rollNumber}</div>
            </div>
            <div class="leader-score">
                <i data-lucide="check-circle" size="16"></i>
                <span>${student.score}</span>
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
    studentArray.forEach(student => {
        const studentInfo = studentMap[student.name];
        
        const tr = document.createElement('tr');
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
