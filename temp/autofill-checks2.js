// ==UserScript==
// @name         Student Additional Books Selection
// @namespace    Violentmonkey Scripts
// @match        https://my.learnquraan.co.uk/employees/teacher/student-list
// @match        https://emp.learnquraan.co.uk/employees/teacher/addional_correction.php*
// @grant        navigator.clipboard.readText
// @version      12.1
// @author       Hafiz Saleem Ullah
// @description  Automatically checks books and marks Done on the new Correction page.
// ==/UserScript==

(function() {
    'use strict';

    const currentURL = window.location.href;
    // Updated to your new target link
    const TARGET_URL = "https://emp.learnquraan.co.uk/employees/teacher/addional_correction.php";
    const STORAGE_KEY = "student_book_data";

    // Load Material Icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);

    // Simplified Book Naming Logic
    function processBookName(rawName) {
        let name = rawName.trim();
        // If it's any Seerah book, simplify to "Seerah" for easier matching
        if (name.toLowerCase().includes("seerah")) {
            return "Seerah";
        }
        return name;
    }

    // --- SECTION 1: STUDENT LIST PAGE ---
    if (currentURL.includes('student-list')) {
        function getTeacherName() {
            const nameSpan = document.querySelector('footer.main-footer .fw-bold.fs-8.text-uppercase');
            return nameSpan ? nameSpan.textContent.trim() : "Teacher";
        }

        async function fetchBooks(studentName, sid, currentBadgeBook) {
            const url = `https://my.learnquraan.co.uk/employees/teacher/chapter-history?sid=${sid}`;
            let books = [];

            // 1. Add the book from the badge immediately
            if (currentBadgeBook) {
                books.push(processBookName(currentBadgeBook));
            }

            try {
                // 2. Fetch history for any older additional books
                const response = await fetch(url);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const rows = Array.from(doc.querySelectorAll('.table tbody tr'));
                let isAdditional = false;

                rows.forEach(row => {
                    if (row.innerText.includes('ADDITIONAL COURSE')) { isAdditional = true; return; }
                    if (isAdditional && row.cells.length >= 3 && !row.classList.contains('table-light')) {
                        const rawBook = row.cells[2]?.innerText.trim();
                        if (rawBook) books.push(processBookName(rawBook));
                    }
                });
                return { name: studentName, books: [...new Set(books.reverse())] };
            } catch (e) {
                return { name: studentName, books: [...new Set(books)] };
            }
        }

        async function initProgressionTable() {
            const studentCards = document.querySelectorAll('.box.bg-secondary-light');
            if (!studentCards.length) return;

            const teacherName = getTeacherName();
            const container = document.createElement('div');
            container.style.cssText = `margin:20px; padding:15px; background:white; border:1px solid #ddd; border-radius:12px; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.05);`;

            container.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4 style="margin:0; color:#333; font-weight:600; font-size:16px;">Correction Tool (Badge + History)</h4>
                    <div style="display:flex; gap:8px;">
                        <button id="btn-copy-txt" title="Copy & Open Correction Page" style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; background:#f0f2f5; color:#555; border:none; border-radius:8px; cursor:pointer; transition:all 0.2s;">
                            <span class="material-icons" style="font-size:20px;">content_copy</span>
                        </button>
                    </div>
                </div>
                <div style="max-height:250px; overflow-y:auto; border-radius:8px; border:1px solid #f0f0f0;">
                    <table style="width:100%; border-collapse: collapse; font-size:13px;">
                        <thead style="position:sticky; top:0; background:#f8f9fa; z-index:1;">
                            <tr>
                                <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Student</th>
                                <th style="padding:10px; border-bottom:1px solid #eee; text-align:left;">Books</th>
                            </tr>
                        </thead>
                        <tbody id="book-table-body"><tr><td colspan="2" style="padding:20px; text-align:center; color:#999;">Loading...</td></tr></tbody>
                    </table>
                </div>`;

            document.querySelector('.content-header').prepend(container);

            const results = await Promise.all(Array.from(studentCards).map(card => {
                const sid = card.querySelector('[data-sid]').getAttribute('data-sid');
                const name = card.querySelector('h4').childNodes[0].textContent.trim();

                // Specifically look for the "Additional Book" badge next to the student name
                const badges = card.querySelectorAll('span.badge');
                const currentBookBadge = badges.length > 1 ? badges[1].innerText.trim() : null;

                return fetchBooks(name, sid, currentBookBadge);
            }));

            document.getElementById('book-table-body').innerHTML = results.map(r => `
                <tr style="border-bottom:1px solid #fafafa;">
                    <td style="padding:10px; font-weight:600; color:#444;">${r.name}</td>
                    <td style="padding:10px; color:#666;">${r.books.join(', ')}</td>
                </tr>`).join('');

            const getFormattedText = () => results.map(r => `${r.name}, ${r.books.join(', ')}`).join('\r\n');

            document.getElementById('btn-copy-txt').onclick = function() {
                const text = getFormattedText();
                navigator.clipboard.writeText(text).then(() => {
                    const icon = this.querySelector('.material-icons');
                    icon.innerText = "done";
                    this.style.background = "#28a745";
                    this.style.color = "white";
                    window.open(TARGET_URL, '_blank');
                    setTimeout(() => {
                        icon.innerText = "content_copy";
                        this.style.background = "#f0f2f5";
                        this.style.color = "#555";
                    }, 2000);
                });
            };
        }
        window.addEventListener('load', () => setTimeout(initProgressionTable, 1500));
    }

    // --- SECTION 2: CORRECTION PAGE (addional_correction.php) ---
    if (currentURL.includes('addional_correction.php')) {

        function addSyncButton() {
            const toolbar = document.querySelector('#kt_app_toolbar_container .flex-stack');
            if (toolbar) {
                const btn = document.createElement('button');
                btn.innerHTML = '<span class="material-icons" style="font-size:18px; margin-right:5px; vertical-align: middle;">sync</span> Apply Checks';
                btn.className = "btn btn-primary btn-sm ms-3 d-flex align-items-center";
                btn.onclick = fetchAndApply;
                toolbar.appendChild(btn);
            }
        }

        async function fetchAndApply() {
            try {
                const text = await navigator.clipboard.readText();
                if (!text || !text.trim()) return;
                localStorage.setItem(STORAGE_KEY, text);
                processLines(text);
            } catch (err) { console.error("Clipboard Error", err); }
        }

        function processLines(text) {
            if (!text) return;
            const headers = Array.from(document.querySelectorAll('thead th')).map(th => th.innerText.trim().toLowerCase());
            const lines = text.split('\n');

            lines.forEach(line => {
                if (!line.trim()) return;
                const parts = line.split(',');
                const studentName = parts[0].trim().toLowerCase();
                const assignedBooks = parts.slice(1).map(b => b.trim().toLowerCase());

                const rows = document.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const nameSpan = row.querySelector('.student-col span.fw-bold') || row.querySelector('td:first-child');
                    if (nameSpan && nameSpan.innerText.trim().toLowerCase().includes(studentName)) {

                        const checkboxes = row.querySelectorAll('input[type="checkbox"]');

                        assignedBooks.forEach(book => {
                            // Smart/Fuzzy Match: Find the column index where header contains book name
                            const colIndex = headers.findIndex(h => h.includes(book) || book.includes(h));

                            if (colIndex >= 0) {
                                // Try to find the checkbox that corresponds to this column index
                                // Note: This assumes checkbox order matches header order
                                const checkbox = checkboxes[colIndex - 1] || row.cells[colIndex]?.querySelector('input');
                                if (checkbox) checkbox.checked = true;
                            }
                        });

                        // Automatically check the "Completed/Done" box if it exists
                        const doneCheckbox = row.querySelector('input[name="completed"]') || row.querySelector('input[value="done"]');
                        if (doneCheckbox) doneCheckbox.checked = true;
                    }
                });
            });
        }

        function initPage() {
            addSyncButton();
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                setTimeout(() => processLines(savedData), 1000);
            }
        }

        if (document.readyState === 'complete') initPage();
        else window.addEventListener('load', initPage);
    }
})();
