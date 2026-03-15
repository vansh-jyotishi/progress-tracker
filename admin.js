// Initialize Icons
lucide.createIcons();

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQisfAjXtdhgNsKx0tRWZfxpKE3ZqnTko7Nza9JI0Kk5F4Syl58jky7G0iOoNy5L5Zzyr9jO16rX1Np/pub?gid=1152285208&single=true&output=csv';

let allSubmissions = [];

Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        allSubmissions = results.data.filter(r => r["Student Name"] && r["Timestamp"]);
        allSubmissions.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
        
        populateFilters();
        renderGallery(allSubmissions);

        document.getElementById('filter-student').addEventListener('change', filterGallery);
        document.getElementById('filter-assignment').addEventListener('change', filterGallery);
    }
});

function populateFilters() {
    const students = new Set();
    const assignments = new Set();

    allSubmissions.forEach(sub => {
        students.add(sub["Student Name"].trim());
        if (sub["Assignment Name"]) assignments.add(sub["Assignment Name"].trim());
    });

    const studentSelect = document.getElementById('filter-student');
    Array.from(students).sort().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.innerText = s;
        studentSelect.appendChild(opt);
    });

    const assignmentSelect = document.getElementById('filter-assignment');
    Array.from(assignments).sort().forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.innerText = a;
        assignmentSelect.appendChild(opt);
    });
}

function filterGallery() {
    const studentFilter = document.getElementById('filter-student').value;
    const assignmentFilter = document.getElementById('filter-assignment').value;

    const filtered = allSubmissions.filter(sub => {
        const mStudent = studentFilter === 'ALL' || sub["Student Name"].trim() === studentFilter;
        const mAssignment = assignmentFilter === 'ALL' || (sub["Assignment Name"] && sub["Assignment Name"].trim() === assignmentFilter);
        return mStudent && mAssignment;
    });

    renderGallery(filtered);
}

function extractDriveId(url) {
    if (!url) return null;
    let match = url.match(/id=([^&]+)/);
    if (match) return match[1];
    match = url.match(/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}

function renderGallery(submissions) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    
    document.getElementById('submission-count').innerText = `${submissions.length} Submissions`;

    submissions.forEach(sub => {
        const studentName = sub["Student Name"].trim();
        const rollNumber = sub["Roll Number"] ? sub["Roll Number"].trim() : '';
        const assignment = sub["Assignment Name"] || 'Unknown';
        const dateObj = new Date(sub.Timestamp);
        const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const screenshotUrl = sub["Upload Screenshot of Output"];
        const githubUrl = sub["GitHub Repository Link"];
        const javaUrl = sub["upload .java file with appropriate naming"];
        
        const driveId = extractDriveId(screenshotUrl);
        
        let previewContent = '';
        if (driveId) {
            // Use Google Drive thumbnail API trick. Fallback to export=view if thumbnail not generated.
            previewContent = `<img src="https://drive.google.com/uc?id=${driveId}&export=view" onerror="if(this.src!=='https://drive.google.com/thumbnail?id=${driveId}&sz=w600-h600'){this.src='https://drive.google.com/thumbnail?id=${driveId}&sz=w600-h600';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}" alt="Output Screenshot" loading="lazy">
                              <div class="no-image" style="display: none;">
                                  <i data-lucide="image-off" size="32"></i>
                                  <span>Image cannot be embedded</span>
                              </div>`;
        } else if (screenshotUrl) {
            previewContent = `<div class="no-image">
                                  <i data-lucide="external-link" size="32"></i>
                                  <a href="${screenshotUrl}" target="_blank" style="color: var(--primary-color);">Open External Link</a>
                              </div>`;
        } else {
            previewContent = `<div class="no-image">
                                  <i data-lucide="image-off" size="32"></i>
                                  <span>No Screenshot Provided</span>
                              </div>`;
        }

        const card = document.createElement('div');
        card.className = 'submission-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="student-info">
                    <span class="student-name">${studentName}</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${rollNumber} • ${formattedDate}</span>
                    <span class="assignment-badge">${assignment}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="image-preview" onclick="window.open('${screenshotUrl}', '_blank')" style="cursor: pointer;" title="Click to view full screenshot">
                    ${previewContent}
                </div>
            </div>
            <div class="card-footer">
                ${javaUrl ? `<a href="${javaUrl}" target="_blank" class="action-btn" title="View Java File"><i data-lucide="file-code"></i></a>` : ''}
                ${githubUrl ? `<a href="${githubUrl}" target="_blank" class="action-btn" title="View GitHub Repo"><i data-lucide="github"></i></a>` : ''}
                ${screenshotUrl ? `<a href="${screenshotUrl}" target="_blank" class="action-btn primary" title="View Full Output"><i data-lucide="external-link"></i> Full View</a>` : ''}
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}
