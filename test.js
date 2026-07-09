// ==UserScript==
// @name         Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Test
// @author       You
// @match        https://qb.vu.edu.pk/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    const API_KEY = "AQ.Ab8RN6JaeFNdb0yKRmursmTVan8LqKZ3eZkZPzr6if6IKOPlRQ";
    const cache = new Map();
    function start() {
        if (typeof CKEDITOR === "undefined") {
            return setTimeout(start, 500);
        }
        const editor = CKEDITOR.instances.ckQuestion;
        if (!editor) {
            return setTimeout(start, 500);
        }
        if (editor.status === "ready") {
            attach(editor);
        } else {
            editor.on("instanceReady", () => attach(editor));
        }
    }
    async function askGemini(question, answers) {
        const key = question + "|" + answers.join("|");
        if (cache.has(key))
            return cache.get(key);
        const prompt = `Reply with ONLY the correct answer text.
Maximum 5 words.
No explanation.
No punctuation.
No markdown.
Question:
${question}
Options:
${answers.join("\n")}
`;
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            }
        );
        const json = await response.json();
        let answer = "No answer";
        try {
            answer = json.candidates[0].content.parts[0].text.trim();
        } catch (e) {}
        cache.set(key, answer);
        return answer;
    }
    function findBestMatch(answer, options) {
        const normalize = s => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const words = s => normalize(s).split(/\s+/).filter(Boolean);
        const normAnswer = normalize(answer);
        const normOptions = options.map(normalize);
        for (let i = 0; i < normOptions.length; i++) {
            if (normAnswer === normOptions[i]) return i;
        }
        const answerWords = words(answer);
        if (answerWords.length === 0) return -1;
        let bestIdx = 0, bestScore = -1;
        for (let i = 0; i < options.length; i++) {
            const optionWords = words(options[i]);
            let matchCount = 0;
            for (const aw of answerWords) {
                if (optionWords.includes(aw)) matchCount++;
            }
            const score = matchCount * 1000 + (optionWords.length > 0 ? (matchCount / optionWords.length) * 100 : 0);
            if (score > bestScore) { bestScore = score; bestIdx = i; }
        }
        return bestScore > 0 ? bestIdx : -1;
    }
    function attach(editor) {
        const iframe = editor.container.$.querySelector("iframe");
        const iframeDoc = iframe.contentDocument;
        const body = iframeDoc.body;
        (async () => {
            const question =
                CKEDITOR.instances.ckQuestion.document
                    .getBody()
                    .getText();
            const answers = [];
            for (let i = 1; i <= 4; i++) {
                answers.push(
                    CKEDITOR.instances["Answer" + i]
                        .document
                        .getBody()
                        .getText()
                );
            }
            try {
                const answer =
                    await askGemini(question, answers);
                body.title = answer;
                const idx = findBestMatch(answer, answers);
                if (idx >= 0) {
                    const editor = CKEDITOR.instances["Answer" + (idx + 1)];
                    const body = editor.document.getBody();
                    const text = body.getText();
                    if (!text.endsWith(".")) {
                        body.setHtml(text + ".");
                    }
                }
            } catch (err) {
                body.title = "Error";
            }
        })();
    }
    start();
})();
