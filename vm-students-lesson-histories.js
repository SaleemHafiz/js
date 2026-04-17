// ==UserScript==
// @name         Students Lesson Histories (Tampermonkey Optimized)
// @namespace    Violentmonkey Scripts
// @match        https://my.learnquraan.co.uk/employees/teacher/student-list
// @grant        none
// @version      3.5
// @author       Hafiz Saleem Ullah
// @description  Sticky header/column, Poppins font, and 100vw/vh HTML export. Optimized for Tampermonkey.
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==UserScript==

(function() {
    'use strict';

    // Inject Poppins Font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    function getTeacherName() {
        const nameSpan = document.querySelector('footer.main-footer .fw-bold.fs-8.text-uppercase');
        return nameSpan ? nameSpan.textContent.trim() : "Teacher";
    }

    function getFiveMonthRange() {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const start = new Date();
        start.setMonth(start.getMonth() - 4);
        const pad = (n) => String(n).padStart(2, '0');
        return {
            start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
            end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
        };
    }

    async function fetchLatestLesson(name, url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
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

    function triggerDownloads(data, teacherName, tableId) {
        const fileName = `${teacherName}_Progress_Report`;
        const container = document.getElementById('dashboard-container');
        const downloadBtn = document.getElementById('multi-download-btn');

        // 1. Excel
        const worksheet = XLSX.utils.aoa_to_sheet([['Student', 'Date', 'Course', 'Juzz', 'Page', 'Lesson Detail', 'Additional', 'Section', 'Page', 'Add. Detail'], ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);

        // 2. HTML (Full Viewport + Sticky)
        const htmlContent = `<!DOCTYPE html><html><head><title>${fileName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; font-family: 'Poppins', sans-serif; }
                .main-container { display: flex; flex-direction: column; width: 100%; height: 100%; padding: 15px; background: #f0f2f5; }
                h2 { margin: 0 0 10px 0; color: #1e4db7; font-size: 1.2rem; }
                .table-viewport { flex-grow: 1; overflow: auto; background: white; border: 1px solid #ddd; border-radius: 4px; position: relative; }
                table { border-collapse: separate; border-spacing: 0; width: max-content; }
                thead th { position: sticky; top: 0; background: #1e4db7 !important; color: white; z-index: 25; padding: 12px; font-weight: 600; font-size: 13px; text-align: left; border-bottom: 2px solid #000; }
                td:first-child { position: sticky; left: 0; z-index: 10; background: #f8faff !important; font-weight: 700; color: #1e4db7; border-right: 2px solid #1e4db7; }
                thead th:first-child { position: sticky; left: 0; top: 0; z-index: 40; background: #1e4db7 !important; }
                th, td { border: 1px solid #eee; padding: 12px; min-width: 150px; }
                tr:nth-child(even) td { background: #fafafa; }
                .highlight-cell { background: #f0f7ff !important; font-weight: 700; color: #1e4db7; }
            </style></head>
            <body>
                <div class="main-container">
                    <h2>${teacherName} - Progress Report</h2>
                    <div class="table-viewport">${document.getElementById(tableId).outerHTML}</div>
                </div>
            </body></html>`;
        
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const htmlLink = document.createElement('a');
        htmlLink.href = URL.createObjectURL(htmlBlob);
        htmlLink.download = `${fileName}.html`;
        htmlLink.click();

        // 3. PNG
        downloadBtn.style.visibility = 'hidden';
        html2canvas(container, {
            scale: 2,
            windowWidth: 2300,
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.getElementById('dashboard-container');
                clonedContainer.style.width = "2200px";
                clonedContainer.style.fontFamily = "'Poppins', sans-serif";
            }
        }).then(canvas => {
            const pngLink = document.createElement('a');
            pngLink.href = canvas.toDataURL("image/png");
            pngLink.download = `${fileName}.png`;
            pngLink.click();
            downloadBtn.style.visibility = 'visible';
        });
    }

    async function buildMasterTable() {
        const dates = getFiveMonthRange();
        const teacherName = getTeacherName();
        const studentCards = document.querySelectorAll('.box.bg-secondary-light');
        
        const container = document.createElement('div');
        container.id = "dashboard-container";
        container.style.cssText = `font-family: 'Poppins', sans-serif; background:white; border:2px solid #1e4db7; border-radius:8px; margin:20px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.1);`;
        
        container.innerHTML = `
            <div id="header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #eee; padding-bottom:10px;">
                <h3 style="color:#1e4db7; font-weight:700; margin:0; text-transform:uppercase;">${teacherName}</h3>
                <i id="multi-download-btn" class="fa fa-download" style="font-size:24px; color:#1e4db7; cursor:pointer;"></i>
            </div>
            <div class="table-responsive" style="max-height: 600px; overflow: auto;">
                <table class="table table-sm table-striped table-hover mb-0" id="main-summary-table" style="width:100%; border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr>
                            ${['Student', 'Date', 'Course', 'Juzz', 'Page', 'Lesson Detail', 'Additional', 'Section', 'Page', 'Add. Detail'].map((h, i) => `
                                <th style="min-width:140px; padding:12px; background:#1e4db7; color:white; position:sticky; top:0; z-index:${i===0?40:20}; border-bottom:2px solid #000; ${i===0?'left:0;':''}">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="master-history-body">
                        <tr><td colspan="10" style="text-align:center; padding:30px;">Loading student records...</td></tr>
                    </tbody>
                </table>
            </div>`;
        
        document.querySelector('.content-header').prepend(container);

        const tasks = Array.from(studentCards).map(card => {
            const sid = card.querySelector('[data-sid]').getAttribute('data-sid');
            const name = card.querySelector('h4').childNodes[0].textContent.trim();
            const url = `https://my.learnquraan.co.uk/employees/teacher/class_history?sid=${sid}&sd=${dates.start}&ed=${dates.end}`;
            return fetchLatestLesson(name, url);
        });

        const results = await Promise.all(tasks);
        const tableBody = document.getElementById('master-history-body');

        tableBody.innerHTML = results.map(r => `
            <tr style="font-size:13px; vertical-align:middle;">
                <td style="font-weight:700; color:#1e4db7; background:#f9f9ff; position:sticky; left:0; z-index:10; border-right:2px solid #1e4db7;">${r[0]}</td>
                <td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td>
                <td class="highlight-cell">${r[5]}</td>
                <td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td>
                <td class="highlight-cell">${r[9]}</td>
            </tr>`).join('');

        document.getElementById('multi-download-btn').onclick = () => triggerDownloads(results, teacherName, 'main-summary-table');
    }

    window.addEventListener('load', () => setTimeout(buildMasterTable, 1500));
})();
