// ==UserScript==
// @name         Monthly Management Report - Pro Academic Version
// @namespace    http://tampermonkey.net/
// @version      16.0
// @description  Deeply branched reporting logic for Qaida, Nazra, and Hifz tracks with multi-select support.
// @author       Saleem Ullah / Gemini
// @match        https://my.learnquraan.co.uk/employees/teacher/student_reports.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    const SIDEBAR_WIDTH = '440px';
    const PRIMARY_COLOR = '#1e4db7';
    const SUCCESS_COLOR = '#28a745';

    // List of common Tajweed rules for multi-selection
    const TAJWEED_RULES = ["Makharij", "Ghunna", "Ikhfa", "Idgham", "Qalqalah", "Madd", "Izhaar", "Heavy/Light Letters"];

    /**
     * CHAT FLOW DEFINITION
     */
    const chatFlow = {
        q: "Which track was the student primarily on this past month?",
        options: [
            { label: "Qaida", next: "QAIDA_START" },
            { label: "Nazra", next: "NAZRA_START" },
            { label: "Hifz", next: "HIFZ_START" }
        ]
    };

    const SHARED_STEPS = {
        // --- QAIDA BRANCH ---
        QAIDA_START: {
            q: "What specific exercise/chapters was the student on last month?",
            options: ["Alif to Zoa", "Huroof-e-Muqatta'at", "Noorani Qaida exercises", "Custom exercises", "Beginner basics", "Advanced exercises"],
            next: "QAIDA_COMPLETION"
        },
        QAIDA_COMPLETION: {
            q: "Did they complete any exercises/chapters this month?",
            options: [
                { label: "Yes", next: "QAIDA_SATISFACTION" },
                { label: "No", next: "QAIDA_REASON_NO_COMPLETION" }
            ]
        },
        QAIDA_SATISFACTION: {
            q: "Are you satisfied with their completion quality?",
            options: [
                { label: "Yes, fully satisfied", next: "TAJWEED_CHECK" },
                { label: "No, needs improvement", next: "QAIDA_ISSUE_TYPE" }
            ]
        },
        QAIDA_ISSUE_TYPE: {
            q: "What was the main concern regarding the completion?",
            options: [
                { label: "Weak Understanding", next: "QAIDA_STRATEGY" },
                { label: "Lack of Interest", next: "QAIDA_STRATEGY" },
                { label: "Special Needs/Learning Pace", next: "QAIDA_STRATEGY" }
            ]
        },
        QAIDA_STRATEGY: {
            q: "What strategy will you apply next month?",
            options: [
                { label: "Reinforce/Try Harder", next: "TAJWEED_CHECK" },
                { label: "Assign more exercises", next: "TAJWEED_CHECK" },
                { label: "Custom remedial exercises", next: "TAJWEED_CHECK" }
            ]
        },
        QAIDA_REASON_NO_COMPLETION: {
            q: "Why was no exercise completed this month?",
            options: ["Student absence", "Lack of practice", "Difficulty level", "Health issues", "Family issues", "Lost interest", "Teacher availability"],
            next: "TAJWEED_CHECK"
        },

        // --- TAJWEED MULTI-SELECT ---
        TAJWEED_CHECK: { q: "Which rules are they currently applying correctly?", isMulti: true, options: TAJWEED_RULES, next: "TAJWEED_NEW" },
        TAJWEED_NEW: { q: "Which new rules are they currently learning?", isMulti: true, options: TAJWEED_RULES, next: "COMMON_PUNCTUALITY" },

        // --- NAZRA BRANCH ---
        NAZRA_START: { q: "How is the student's reading fluency evolving?", options: ["Significant improvement", "Steady/Consistent", "Fluency is declining"], next: "TAJWEED_CHECK" },

        // --- HIFZ BRANCH ---
        HIFZ_START: { q: "How is the quality of their old memorization (Daur/Manzil)?", options: ["Very Strong", "Steady", "Weak/Needs more Daur"], next: "HIFZ_SABAQ_SPEED" },
        HIFZ_SABAQ_SPEED: { q: "How is the speed and quality of new Sabaq?", options: ["Quick learner", "Average speed", "Struggles to memorize"], next: "HIFZ_STRATEGY" },
        HIFZ_STRATEGY: {
            q: "What is their Sabaq memorization strategy?",
            options: [
                { label: "Reading together with teacher", next: "HIFZ_SELF_RELIANCE" },
                { label: "Reading along", next: "HIFZ_SELF_RELIANCE" },
                { label: "Memorizing independently at home", next: "HIFZ_SELF_RELIANCE" }
            ]
        },
        HIFZ_SELF_RELIANCE: { q: "Can they memorize on their own or do they need special care?", options: ["Independent", "Needs constant supervision", "Requires special care"], next: "COMMON_PUNCTUALITY" },

        // --- COMMON ACADEMIC/BEHAVIOR ---
        COMMON_PUNCTUALITY: {
            q: "Are they regular and punctual?",
            options: [
                { label: "Yes, very regular", next: "COMMON_BEHAVIOR" },
                { label: "No, frequent absences", next: "ABSENCE_REASON" }
            ]
        },
        ABSENCE_REASON: {
            q: "What is the primary reason for irregularities?",
            options: ["Family commitments", "Health issues", "Transportation problems", "Loss of interest", "Academic pressure", "Financial issues", "Time management", "Technical issues"],
            next: "COMMON_BEHAVIOR"
        },
        COMMON_BEHAVIOR: { q: "How is their general conduct and engagement?", options: ["Excellent", "Polite but distracted", "Irrelevant talkative", "Lacks interest"], next: "COMMON_HANDLING" },
        COMMON_HANDLING: {
            q: "How easy is it to handle them during class?",
            options: [
                { label: "Easy", next: "ADDITIONAL_LESSON" },
                { label: "Tricky/Difficult", next: "HANDLING_WHY" }
            ]
        },
        HANDLING_WHY: {
            q: "Why is handling difficult?",
            options: ["Too talkative", "Lacks focus", "Hyperactive", "Doesn't listen", "Easily distracted", "Refuses to cooperate", "Slow learner", "Emotional issues"],
            next: "ADDITIONAL_LESSON"
        },
        ADDITIONAL_LESSON: {
            q: "Do they take additional lessons? How is their engagement?",
            options: ["Yes, very engaged", "Yes, moderately engaged", "Yes, but not engaged", "No additional lessons", "Parents arrange private tutor", "Self-study at home"],
            next: "FINAL_NOTES"
        },
        FINAL_NOTES: {
            q: "Any other issues or management notes?",
            options: ["No major issues", "Needs parental support", "Requires special attention", "Progressing well", "Consider track change", "Schedule adjustment needed", "No concerns"],
            isFinal: true
        }
    };

    let chatHistory = [];
    let currentPath = chatFlow;
    let selectedMulti = [];
    let previouslySelectedRules = []; // Store previously selected Tajweed rules

    const injectStyles = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            #ai-sidebar { font-family: 'Inter', system-ui, sans-serif; background: #ffffff; box-shadow: -10px 0 40px rgba(0,0,0,0.1); border-left: 1px solid #e5e7eb; }
            .chat-container { flex-grow: 1; overflow-y: auto; padding: 25px 20px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
            .bubble { max-width: 85%; padding: 14px 18px; border-radius: 20px; font-size: 14px; animation: slideUp 0.3s ease; line-height: 1.5; }
            .assistant-bubble { background: #f9fafb; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid #f3f4f6; }
            .user-bubble { background: ${PRIMARY_COLOR}; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
            .chip { background: #fff; border: 1.5px solid #d1d5db; color: #374151; padding: 8px 16px; border-radius: 99px; cursor: pointer; font-size: 13px; transition: 0.2s; font-weight: 500; }
            .chip.selected { background: ${PRIMARY_COLOR}; color: white; border-color: ${PRIMARY_COLOR}; }
            .chip:hover:not(.selected) { border-color: ${PRIMARY_COLOR}; color: ${PRIMARY_COLOR}; background: #eff6ff; }
            .footer-dock { width: 100%; background: #ffffff; border-top: 1px solid #f3f4f6; padding: 16px; }
            .input-wrapper { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 4px; transition: all 0.2s ease; }
            .input-wrapper:focus-within { border-color: ${PRIMARY_COLOR}; box-shadow: 0 0 0 3px rgba(30, 77, 183, 0.1); }
            .input-box { flex: 1; display: flex; align-items: center; }
            .input-box input { border: none; background: transparent; padding: 12px 16px; flex: 1; font-size: 14px; outline: none; color: #1e293b; }
            .input-box input::placeholder { color: #94a3b8; }
            #send-btn { background: ${PRIMARY_COLOR}; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; min-width: 40px; height: 40px; }
            #send-btn:hover { background: #1e40af; transform: translateY(-1px); }
            #send-btn:active { transform: translateY(0); }
            #final-btn { display: none; width: 100%; padding: 18px; border: none; border-radius: 12px; font-weight: 700; color: white; cursor: pointer; background: ${PRIMARY_COLOR}; align-items: center; justify-content: center; gap: 10px; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    };

    const initSidebar = () => {
        if (document.getElementById('ai-sidebar')) return;
        injectStyles();
        document.body.style.marginRight = SIDEBAR_WIDTH;
        const sidebar = document.createElement('div');
        sidebar.id = 'ai-sidebar';
        sidebar.style.cssText = `position: fixed; top: 0; right: 0; width: ${SIDEBAR_WIDTH}; height: 100vh; z-index: 9999; display: flex; flex-direction: column;`;
        sidebar.innerHTML = `
            <div id="chat-box" class="chat-container"></div>
            <div class="footer-dock">
                <div id="chips-area" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;"></div>
                <div id="input-wrapper" class="input-wrapper">
                    <div class="input-box">
                        <input type="text" id="user-text" placeholder="Type your answer...">
                    </div>
                    <button id="send-btn">
                        <i class="fa-solid fa-paper-plane" style="font-size: 12px;"></i>
                    </button>
                </div>
                <button id="final-btn"><i class="fa-solid fa-copy"></i> <span>Copy Management Report</span></button>
            </div>
        `;
        document.body.appendChild(sidebar);
        document.getElementById('send-btn').onclick = () => {
            const inputField = document.getElementById('user-text');
            if (currentPath.isMulti && selectedMulti.length > 0) {
                handleInput(selectedMulti.join(", "));
                selectedMulti = [];
            } else if (!currentPath.isMulti && inputField.value.trim()) {
                handleInput(inputField.value);
            }
        };
        document.getElementById('user-text').onkeypress = (e) => {
            if(e.key === 'Enter') {
                if (currentPath.isMulti && selectedMulti.length > 0) {
                    handleInput(selectedMulti.join(", "));
                    selectedMulti = [];
                } else if (!currentPath.isMulti) {
                    handleInput(e.target.value);
                }
            }
        };
        ask();
    };

    function ask() {
        const box = document.getElementById('chat-box');
        const chips = document.getElementById('chips-area');
        const bubble = document.createElement('div');
        bubble.className = 'bubble assistant-bubble';
        bubble.innerText = currentPath.q;
        box.appendChild(bubble);

        chips.innerHTML = '';
        selectedMulti = []; // Clear previous selections
        document.getElementById('user-text').value = ''; // Clear input field
        document.getElementById('user-text').placeholder = currentPath.isMulti ? 'Select options or type answer...' : 'Type answer...';

        // For TAJWEED_NEW, exclude previously selected rules
        let availableOptions = currentPath.options || [];
        if (currentPath.q === "Which new rules are they currently learning?" && previouslySelectedRules.length > 0) {
            availableOptions = TAJWEED_RULES.filter(rule => !previouslySelectedRules.includes(rule));
        }

        availableOptions.forEach(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const el = document.createElement('div');
            el.className = 'chip';
            el.innerText = label;
            el.onclick = () => {
                if (currentPath.isMulti) {
                    el.classList.toggle('selected');
                    if (el.classList.contains('selected')) selectedMulti.push(label);
                    else selectedMulti = selectedMulti.filter(s => s !== label);

                    // Auto-fill textbox with selected options
                    const inputField = document.getElementById('user-text');
                    if (selectedMulti.length > 0) {
                        inputField.value = selectedMulti.join(", ");
                    } else {
                        inputField.value = '';
                    }
                } else {
                    handleInput(label, opt.next);
                }
            };
            chips.appendChild(el);
        });

        // Handle case where all rules are already selected
        if (currentPath.q === "Which new rules are they currently learning?" && availableOptions.length === 0) {
            const noOptionsMsg = document.createElement('div');
            noOptionsMsg.className = 'chip';
            noOptionsMsg.style.background = '#f3f4f6';
            noOptionsMsg.style.color = '#6b7280';
            noOptionsMsg.style.cursor = 'default';
            noOptionsMsg.innerText = 'All rules already selected';
            chips.appendChild(noOptionsMsg);

            // Auto-advance after a short delay
            setTimeout(() => {
                handleInput('No new rules - all previously covered');
            }, 2000);
        }

        box.scrollTop = box.scrollHeight;
    }

    function handleInput(val, nextOverride) {
        if (!val.trim()) return;
        const box = document.getElementById('chat-box');
        chatHistory.push({ q: currentPath.q, a: val });

        // Store selected Tajweed rules for filtering next question
        if (currentPath.q === "Which rules are they currently applying correctly?" && currentPath.isMulti) {
            previouslySelectedRules = val.split(', ').map(rule => rule.trim()).filter(rule => rule);
        }

        const bubble = document.createElement('div');
        bubble.className = 'bubble user-bubble';
        bubble.innerText = val;
        box.appendChild(bubble);
        document.getElementById('user-text').value = '';

        // Clear multi-selection state
        selectedMulti = [];

        let next = nextOverride || currentPath.next;
        if (next) {
            currentPath = typeof next === 'string' ? SHARED_STEPS[next] : next;
            ask();
        } else {
            finalizeUI();
        }
        box.scrollTop = box.scrollHeight;
    }

    function finalizeUI() {
        document.getElementById('chips-area').style.display = 'none';
        document.getElementById('input-wrapper').style.display = 'none';
        const btn = document.getElementById('final-btn');
        btn.style.display = 'flex';

        btn.onclick = () => {
            // Extract table data for basic info
            const rows = document.querySelectorAll('.table tbody tr');
            let historyText = "HISTORICAL PROGRESS (Last 6 Months):\n";

            // Get only table rows with proper data
            const allRows = Array.from(rows).filter((row) => {
                const cols = row.querySelectorAll('td');
                return cols.length >= 7; // Table has 8 columns but we need at least 7
            });

            // Take first 6 rows from top (latest data is on top) and reverse to show oldest to latest
            const recentRows = allRows.slice(0, 6).reverse();

            recentRows.forEach((row) => {
                const cols = row.querySelectorAll('td');
                const month = cols[2].innerText.trim(); // Month column is at index 2

                // Get remarks and note from remarks column (column 5)
                const remarkSpan = cols[5].querySelector('span');
                const remarks = remarkSpan ? remarkSpan.innerText.trim() : "No remarks";

                // Get note from tooltip content
                let note = "No note";
                if (remarkSpan) {
                    // Get the complete HTML of the span element
                    const spanHTML = remarkSpan.outerHTML;

                    // Look for data-bs-original-title attribute (where the actual tooltip content is stored)
                    const originalTitleMatch = spanHTML.match(/data-bs-original-title="([^"]+)"/);
                    if (originalTitleMatch) {
                        let tooltipContent = originalTitleMatch[1];

                        // Decode HTML entities (&lt; → <, &gt; → >, &amp; → &)
                        tooltipContent = tooltipContent
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&');

                        // Extract text from tooltip HTML content - look for the specific class pattern
                        const noteMatch = tooltipContent.match(/<span class='tooltip-text'>(.*?)<\/span>/);
                        if (noteMatch) {
                            note = noteMatch[1].trim();
                        } else {
                            // Fallback: remove HTML tags and trim
                            note = tooltipContent.replace(/<[^>]*>?/gm, '').trim();
                        }
                    }

                    // Fallback: try title attribute if data-bs-original-title doesn't work
                    if (note === "No note") {
                        const titleMatch = spanHTML.match(/title="([^"]+)"/);
                        if (titleMatch && titleMatch[1]) {
                            let tooltipContent = titleMatch[1];

                            // Decode HTML entities
                            tooltipContent = tooltipContent
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&amp;/g, '&');

                            // Extract text from tooltip HTML content
                            const noteMatch = tooltipContent.match(/<span class='tooltip-text'>(.*?)<\/span>/);
                            if (noteMatch) {
                                note = noteMatch[1].trim();
                            } else {
                                // Fallback: remove HTML tags and trim
                                note = tooltipContent.replace(/<[^>]*>?/gm, '').trim();
                            }
                        }
                    }
                }

                // Get attendance from taken-total column (column 6)
                const att = cols[6].innerText.replace(/\s+/g, ' ').trim();
                // Replace " - " with "/" for attendance format
                const formattedAtt = att.replace(' - ', '/');
                historyText += `${month}: Remarks: ${remarks} | Note: ${note} | Attendance: ${formattedAtt}\n`;
            });

            // Extract detailed performance data from JavaScript arrays
            let performanceData = "\n\nDETAILED PERFORMANCE METRICS (Last 6 Months):\n";

            // Try to access the JavaScript variables from the page
            try {
                // Get the last 6 months with actual data (excluding current and previous month)
                if (typeof months !== 'undefined' && typeof tajweed !== 'undefined') {
                    // Get all historical data excluding last 2 months (current month and previous month being reported)
                    const allHistoricalMonths = months.slice(0, -2);
                    const allHistoricalTajweed = tajweed.slice(0, -2);
                    const allHistoricalReading = reading.slice(0, -2);
                    const allHistoricalBehaviour = behaviour.slice(0, -2);
                    const allHistoricalPunctuality = punctuality.slice(0, -2);
                    const allHistoricalTaken = taken.slice(0, -2);
                    const allHistoricalTotal = total.slice(0, -2);
                    const allHistoricalRemarks = remarks.slice(0, -2);

                    // Filter to get only months with actual data (non-zero values)
                    const filteredMonths = [];
                    const filteredTajweed = [];
                    const filteredReading = [];
                    const filteredBehaviour = [];
                    const filteredPunctuality = [];
                    const filteredTaken = [];
                    const filteredTotal = [];
                    const filteredRemarks = [];

                    for (let i = 0; i < allHistoricalMonths.length; i++) {
                        const tajweedScore = allHistoricalTajweed[i] || 0;
                        const readingScore = allHistoricalReading[i] || 0;
                        const behaviourScore = allHistoricalBehaviour[i] || 0;
                        const punctualityScore = allHistoricalPunctuality[i] || 0;

                        // Include only months with actual data (non-zero values)
                        if (tajweedScore > 0 || readingScore > 0 || behaviourScore > 0 || punctualityScore > 0) {
                            filteredMonths.push(allHistoricalMonths[i]);
                            filteredTajweed.push(tajweedScore);
                            filteredReading.push(readingScore);
                            filteredBehaviour.push(behaviourScore);
                            filteredPunctuality.push(punctualityScore);
                            filteredTaken.push(allHistoricalTaken[i] || 0);
                            filteredTotal.push(allHistoricalTotal[i] || 0);
                            filteredRemarks.push(allHistoricalRemarks[i] || 4);
                        }
                    }

                    // Take the last 6 months with actual data
                    const historicalMonths = filteredMonths.slice(-6);
                    const historicalTajweed = filteredTajweed.slice(-6);
                    const historicalReading = filteredReading.slice(-6);
                    const historicalBehaviour = filteredBehaviour.slice(-6);
                    const historicalPunctuality = filteredPunctuality.slice(-6);
                    const historicalTaken = filteredTaken.slice(-6);
                    const historicalTotal = filteredTotal.slice(-6);
                    const historicalRemarks = filteredRemarks.slice(-6);

                    performanceData += "\nPerformance Scores (1-5 scale):\n";
                    for (let i = 0; i < historicalMonths.length; i++) {
                        const month = historicalMonths[i];
                        const tajweedScore = historicalTajweed[i];
                        const readingScore = historicalReading[i];
                        const behaviourScore = historicalBehaviour[i];
                        const punctualityScore = historicalPunctuality[i];
                        const attendance = `${historicalTaken[i]}/${historicalTotal[i]}`;
                        const remarkCode = historicalRemarks[i];
                        const remarkText = remarkLabels[remarkCode] || 'Unknown';

                        performanceData += `${month}: Tajweed(${tajweedScore}) Reading(${readingScore}) Behaviour(${behaviourScore}) Punctuality(${punctualityScore})\n`;
                    }

                    // Calculate averages and trends
                    const validTajweed = historicalTajweed.filter(s => s > 0);
                    const validReading = historicalReading.filter(s => s > 0);
                    const validBehaviour = historicalBehaviour.filter(s => s > 0);
                    const validPunctuality = historicalPunctuality.filter(s => s > 0);

                    if (validTajweed.length > 0) {
                        const avgTajweed = (validTajweed.reduce((a, b) => a + b, 0) / validTajweed.length).toFixed(1);
                        const avgReading = (validReading.reduce((a, b) => a + b, 0) / validReading.length).toFixed(1);
                        const avgBehaviour = (validBehaviour.reduce((a, b) => a + b, 0) / validBehaviour.length).toFixed(1);
                        const avgPunctuality = (validPunctuality.reduce((a, b) => a + b, 0) / validPunctuality.length).toFixed(1);

                        performanceData += `\nAverage Scores: Tajweed(${avgTajweed}) Reading(${avgReading}) Behaviour(${avgBehaviour}) Punctuality(${avgPunctuality})\n`;
                    }
                } else {
                    performanceData += "Detailed performance data not available\n";
                }
            } catch (error) {
                performanceData += "Detailed performance data could not be extracted\n";
            }

            const currentData = chatHistory.map(h => `- ${h.q}: ${h.a}`).join("\n");
            const prompt = `Act as a Senior Education Manager. Write a 3-4 line report in simple Pakistani English (professional & concise).

${historyText}${performanceData}

CURRENT OBSERVATIONS:
${currentData}

Focus on whether they are improving, steady, or declining based on history vs current, considering both qualitative notes and quantitative performance metrics.`;

            navigator.clipboard.writeText(prompt);
            btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Report Prompt Copied</span>`;
            btn.style.background = SUCCESS_COLOR;
        };
    }

if (document.readyState === 'complete') initSidebar();
else window.addEventListener('load', initSidebar);
})();
