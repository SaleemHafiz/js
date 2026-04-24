// ==UserScript==
// @name         Students Lesson Histories 2.0 (Tampermonkey Edition)
// @namespace    https://github.com/SaleemHafiz
// @version      5.3
// @match        https://my.learnquraan.co.uk/employees/teacher/student-list
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /******** LIBS & STYLES ********/
    const links = [
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    ];

    links.forEach(link => {
        const el = link.endsWith('.js') ? document.createElement('script') : document.createElement('link');
        if (link.endsWith('.js')) { el.src = link; } else { el.rel = 'stylesheet'; el.href = link; }
        document.head.appendChild(el);
    });

    /******** HELPERS ********/
    function getTeacherName() {
        const nameSpan = document.querySelector('footer.main-footer .fw-bold.fs-8.text-uppercase');
        return nameSpan ? nameSpan.textContent.trim() : "Teacher";
    }

    function getFiveMonthRange() {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const start = new Date();
        start.setMonth(start.getMonth() - 4);
        const pad = n => String(n).padStart(2, '0');
        return {
            start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
            end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
        };
    }

    async function triggerTripleDownload(elementId, fileName, excelData) {
        const element = document.getElementById(elementId);

        // 1. Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);

        // 2. HTML (Enhanced with Full Site Styling)
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="https://my.learnquraan.co.uk/vendor/assets/css/vendors_css.css">
    <link rel="stylesheet" href="https://my.learnquraan.co.uk/vendor/assets/css/style.css">
    <style>
        body { font-family: 'Poppins', sans-serif; padding: 30px; background-color: #f5f7fa; }
        .export-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        table { width: 100% !important; background: white !important; }
        th { background-color: #1e4db7 !important; color: white !important; }
        .badge-success { background-color: #28a745 !important; color: white !important; }
    </style>
</head>
<body>
    <div class="export-container">
        <h3 style="color:#1e4db7; margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:10px;">${fileName.replace(/_/g, ' ')}</h3>
        ${element.outerHTML}
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}.html`;
        a.click();

        // 3. PNG
        if (window.html2canvas) {
            html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            }).then(canvas => {
                const img = document.createElement('a');
                img.href = canvas.toDataURL("image/png");
                img.download = `${fileName}.png`;
                img.click();
            });
        }
    }

    async function fetchLatestLesson(name, url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const rows = doc.querySelectorAll('.table tbody tr');
            for (let row of rows) {
                const statusCell = row.cells[row.cells.length - 1];
                if (statusCell && statusCell.textContent.includes('(Taken)')) {
                    const getTooltip = (idx) => {
                        const link = row.cells[idx].querySelector('[data-bs-toggle="tooltip"]');
                        return link ? (link.getAttribute('title') || link.getAttribute('data-bs-original-title') || "N/A") : "N/A";
                    };
                    return [name, row.cells[0].textContent.trim(), row.cells[1].textContent.trim(), row.cells[2].textContent.trim(), row.cells[3].textContent.trim(), getTooltip(3), row.cells[4].textContent.trim(), row.cells[5].textContent.trim(), row.cells[6].textContent.trim(), getTooltip(6)];
                }
            }
        } catch (e) { console.error(e); }
        return [name, "No data", "-", "-", "-", "-", "-", "-", "-", "-"];
    }

    async function fetchStudentCourseHistory(studentName, sid) {
        const url = `https://my.learnquraan.co.uk/employees/teacher/chapter-history?sid=${sid}`;
        try {
            const response = await fetch(url);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const rows = Array.from(doc.querySelectorAll('.table tbody tr'));
            let addFound = false;
            const history = [];
            rows.forEach(row => {
                if (row.innerText.includes('ADDITIONAL COURSE')) { addFound = true; return; }
                if (addFound && row.cells.length >= 3 && !row.classList.contains('table-light')) {
                    history.push({ course: row.cells[1]?.innerText.trim(), chapter: row.cells[2]?.innerText.trim() });
                }
            });
            return { name: studentName, history: history.reverse() };
        } catch (error) { return { name: studentName, history: [] }; }
    }

    async function buildMasterTable() {
        const dates = getFiveMonthRange();
        const teacherName = getTeacherName();
        const studentCards = document.querySelectorAll('.box.bg-secondary-light');

        const container = document.createElement('div');
        container.id = "dashboard-container";
        container.style.cssText = `font-family: 'Poppins', sans-serif; background:white; border:2px solid #1e4db7; border-radius:8px; margin:20px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.1);`;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e4db7; font-weight:700; margin:0; font-size:18px; text-transform:uppercase;">Latest Activity</h3>
                <button id="btn-top" class="btn btn-primary btn-sm" style="background:#1e4db7; border:none; border-radius:5px; padding:6px 20px;">Download</button>
            </div>
            <div class="table-responsive" style="max-height: 350px; overflow: auto; margin-bottom:40px; border:1px solid #eee; border-radius:5px;">
                <table class="table table-sm table-bordered table-hover" id="table-top" style="font-size:12px; margin-bottom:0; background:white;">
                    <thead style="position:sticky; top:0; background:#1e4db7; color:white; z-index:10;">
                        <tr><th>Student Name</th><th>Date</th><th>Course</th><th>Juzz</th><th>Page</th><th>Detail</th><th>Add.</th><th>Sec.</th><th>Pg.</th><th>Detail</th></tr>
                    </thead>
                    <tbody id="body-top"></tbody>
                </table>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#1e4db7; font-weight:700; margin:0; font-size:18px; text-transform:uppercase;">Additional Course Progression</h3>
                <button id="btn-bottom" class="btn btn-success btn-sm" style="border:none; border-radius:5px; padding:6px 20px;">Download</button>
            </div>
            <div class="table-responsive" style="max-height: 350px; overflow: auto; border:1px solid #eee; border-radius:5px;">
                <table class="table table-bordered table-hover" id="table-bottom" style="font-size:12px; margin-bottom:0; background:white;">
                    <thead style="position:sticky; top:0; background:#f8f9fa; z-index:10;">
                        <tr><th style="width:200px;">Student Name</th><th>Progression (Oldest First)</th></tr>
                    </thead>
                    <tbody id="body-bottom"></tbody>
                </table>
            </div>`;

        document.querySelector('.content-header').prepend(container);

        const tasks = Array.from(studentCards).map(async (card) => {
            const sid = card.querySelector('[data-sid]').getAttribute('data-sid');
            const name = card.querySelector('h4').childNodes[0].textContent.trim();
            const [summary, courseHistory] = await Promise.all([
                fetchLatestLesson(name, `https://my.learnquraan.co.uk/employees/teacher/class_history?sid=${sid}&sd=${dates.start}&ed=${dates.end}`),
                fetchStudentCourseHistory(name, sid)
            ]);
            return { summary, courseHistory };
        });

        const results = await Promise.all(tasks);

        document.getElementById('body-top').innerHTML = results.map(r => `
            <tr><td style="font-weight:700; color:#1e4db7;">${r.summary[0]}</td>${r.summary.slice(1).map(cell => `<td>${cell}</td>`).join('')}</tr>
        `).join('');

        document.getElementById('body-bottom').innerHTML = results.map(r => `
            <tr>
                <td style="font-weight:700; color:#1e4db7;">${r.courseHistory.name}</td>
                <td>
                    <div style="display:flex; flex-wrap:wrap; gap:5px;">
                        ${r.courseHistory.history.length > 0 ? r.courseHistory.history.map(h => `
                            <span style="background:#f0f4ff; border:1px solid #1e4db7; padding:2px 8px; border-radius:15px; font-size:10px; display:inline-block; margin-bottom:2px;">
                                <b style="color:#333;">${h.course}:</b> <span class="badge badge-success" style="font-size:9px; vertical-align:middle;">${h.chapter}</span>
                            </span>
                        `).join('') : '-'}
                    </div>
                </td>
            </tr>
        `).join('');

        document.getElementById('btn-top').onclick = () => {
            const data = [['Student Name', 'Date', 'Course', 'Juzz', 'Page', 'Detail', 'Add.', 'Sec.', 'Pg.', 'Detail'], ...results.map(r => r.summary)];
            triggerTripleDownload('table-top', `${teacherName}_Activity`, data);
        };

        document.getElementById('btn-bottom').onclick = () => {
            const data = [['Student Name', 'Course', 'Chapter'], ...results.flatMap(r => r.courseHistory.history.map(h => [r.courseHistory.name, h.course, h.chapter]))];
            triggerTripleDownload('table-bottom', `${teacherName}_Progression`, data);
        };
    }

    setTimeout(buildMasterTable, 1500);

})();
