let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeRemaining = 3 * 60 * 60; // 3 Hours
let currentLanguage = "en"; // 'en' or 'hi'

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTliG-CGQtiEPU7VjoN6Z-HWkc_RzTO8zFBpePg9CMGQE02R6jonewba1oChyvG1n_duTQiPLRV6pIq/pub?output=csv";

window.addEventListener("DOMContentLoaded", () => {
  fetchQuestionsFromSheet();
});

// Helper: Strips hidden BOM characters (\ufeff), non-breaking spaces, and case differences
function getField(row, ...possibleKeys) {
  for (const key of possibleKeys) {
    const target = key.toLowerCase().replace(/[\uFEFF\u00A0]/g, '').trim();
    for (const actualKey of Object.keys(row)) {
      const cleanActual = actualKey.toLowerCase().replace(/[\uFEFF\u00A0]/g, '').trim();
      if (cleanActual === target) {
        const val = row[actualKey];
        if (val !== undefined && val !== null && val !== "") {
          return val.toString().trim();
        }
      }
    }
  }
  return "";
}

// Helper: Converts A/B/C/D or 1/2/3/4 or 0/1/2/3 into zero-based option index
function parseAnswerIndex(val) {
  if (!val) return 0;
  const clean = val.toString().toUpperCase().trim();
  if (clean === "A" || clean === "OPTION A") return 0;
  if (clean === "B" || clean === "OPTION B") return 1;
  if (clean === "C" || clean === "OPTION C") return 2;
  if (clean === "D" || clean === "OPTION D") return 3;
  
  const parsed = parseInt(clean, 10);
  if (isNaN(parsed)) return 0;
  return parsed > 3 ? parsed - 1 : parsed;
}

function fetchQuestionsFromSheet() {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerText = "Loading Questions...";
  }

  Papa.parse(GOOGLE_SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: 'greedy', // Ignores empty or space-filled trailing rows
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        alert("Google Sheet returned no data.");
        return;
      }

      // Parse raw CSV rows
      const rawQuestions = results.data.map((row) => {
        const q_en = getField(row, "question_en", "question");
        const q_hi = getField(row, "question_hi", "question_en", "question");

        return {
          subject: getField(row, "subject") || "General",
          question_en: q_en,
          question_hi: q_hi || q_en,
          options_en: [
            getField(row, "optionA_en", "optionA"),
            getField(row, "optionB_en", "optionB"),
            getField(row, "optionC_en", "optionC"),
            getField(row, "optionD_en", "optionD")
          ],
          options_hi: [
            getField(row, "optionA_hi", "optionA_en", "optionA"),
            getField(row, "optionB_hi", "optionB_en", "optionB"),
            getField(row, "optionC_hi", "optionC_en", "optionC"),
            getField(row, "optionD_hi", "optionD_en", "optionD")
          ],
          answer: parseAnswerIndex(getField(row, "answere", "answer")),
          explanation_en: getField(row, "xplanation_en", "explanation_en", "explanation") || "No explanation provided.",
          explanation_hi: getField(row, "explanation_hi", "xplanation_en", "explanation_en", "explanation") || "कोई स्पष्टीकरण उपलब्ध नहीं है।"
        };
      });

      // Filter out empty ghost rows to keep exactly valid questions (150)
      questions = rawQuestions.filter(q => q.question_en.length > 0 || q.question_hi.length > 0);
      questions.forEach((q, idx) => q.id = idx);

      console.log(`Loaded ${questions.length} valid questions.`, questions);

      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerText = `Start Examination (${questions.length} Qs)`;
      }
    },
    error: function (err) {
      alert("Error parsing CSV data. Check console.");
      console.error(err);
    }
  });
}

function startExam() {
  if (questions.length === 0) {
    alert("No questions available. Please check sheet URL.");
    return;
  }

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("exam-screen").classList.remove("hidden");
  
  initPalette();
  loadQuestion(0);
  startTimer();
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeRemaining--;

    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    document.getElementById("timer").innerText = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      alert("Time is up! Submitting your test automatically.");
      submitExam();
    }
  }, 1000);
}

function loadQuestion(index) {
  currentQuestionIndex = index;
  const q = questions[index];

  document.getElementById("subject-tag").innerText = q.subject;
  document.getElementById("q-counter").innerText = `Question ${index + 1} of ${questions.length}`;

  document.getElementById("question-text").innerText = 
    currentLanguage === "hi" ? q.question_hi : q.question_en;

  const optionsBox = document.getElementById("options-container");
  optionsBox.innerHTML = "";

  const activeOptions = currentLanguage === "hi" ? q.options_hi : q.options_en;

  activeOptions.forEach((optionText, optIndex) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    if (userAnswers[index] === optIndex) btn.classList.add("selected");
    btn.innerText = `${String.fromCharCode(65 + optIndex)}) ${optionText}`;
    btn.onclick = () => selectOption(index, optIndex);
    optionsBox.appendChild(btn);
  });

  document.getElementById("prev-btn").disabled = (index === 0);
  document.getElementById("next-btn").disabled = (index === questions.length - 1);
  updatePalette();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "en" ? "hi" : "en";
  const langBtn = document.getElementById("lang-toggle-btn");
  if (langBtn) {
    langBtn.innerText = currentLanguage === "en" ? "Hindi / हिंदी" : "English";
  }
  if (questions.length > 0) {
    loadQuestion(currentQuestionIndex);
  }
}

function selectOption(qIndex, optIndex) {
  userAnswers[qIndex] = optIndex;
  loadQuestion(qIndex);
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) loadQuestion(currentQuestionIndex + 1);
}

function prevQuestion() {
  if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
}

function initPalette() {
  const grid = document.getElementById("palette-grid");
  grid.innerHTML = "";
  questions.forEach((_, idx) => {
    const btn = document.createElement("button");
    btn.className = "palette-btn";
    btn.id = `palette-${idx}`;
    btn.innerText = idx + 1;
    btn.onclick = () => loadQuestion(idx);
    grid.appendChild(btn);
  });
}

function updatePalette() {
  questions.forEach((_, idx) => {
    const btn = document.getElementById(`palette-${idx}`);
    if (btn) {
      btn.className = "palette-btn";
      if (userAnswers[idx] !== undefined) btn.classList.add("answered");
      if (idx === currentQuestionIndex) btn.classList.add("current");
    }
  });
}

function submitExam() {
  clearInterval(timerInterval);

  let totalScore = 0;
  const subjectScores = {};
  const mistakes = [];

  questions.forEach((q, idx) => {
    if (!subjectScores[q.subject]) {
      subjectScores[q.subject] = { correct: 0, total: 0 };
    }
    subjectScores[q.subject].total++;

    if (userAnswers[idx] === q.answer) {
      totalScore++;
      subjectScores[q.subject].correct++;
    } else {
      const activeOptions = currentLanguage === "hi" ? q.options_hi : q.options_en;
      const activeExplanation = currentLanguage === "hi" ? q.explanation_hi : q.explanation_en;
      
      mistakes.push({
        question: currentLanguage === "hi" ? q.question_hi : q.question_en,
        selected: userAnswers[idx] !== undefined ? activeOptions[userAnswers[idx]] : "Not Attempted",
        correct: activeOptions[q.answer],
        explanation: activeExplanation,
        subject: q.subject
      });
    }
  });

  document.getElementById("exam-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  document.getElementById("total-score").innerText = totalScore;
  const statusElem = document.getElementById("qualification-status");
  
  if (totalScore >= 90) {
    statusElem.innerText = "Status: QUALIFIED (General Cutoff Cleared)";
    statusElem.style.color = "#16a34a";
  } else {
    statusElem.innerText = "Status: NEEDS IMPROVEMENT (Cutoff Not Cleared)";
    statusElem.style.color = "#dc2626";
  }

  const tableBody = document.getElementById("subject-scores-body");
  tableBody.innerHTML = "";
  for (const [subject, data] of Object.entries(subjectScores)) {
    const row = document.createElement("tr");
    const pct = Math.round((data.correct / data.total) * 100);
    row.innerHTML = `
      <td>${subject}</td>
      <td>${data.correct} / ${data.total}</td>
      <td style="color: ${pct >= 60 ? '#16a34a' : '#dc2626'}; font-weight: bold;">
        ${pct}% ${pct < 60 ? '(Work Needed)' : '(Good)'}
      </td>
    `;
    tableBody.appendChild(row);
  }

  const mistakesContainer = document.getElementById("mistakes-list");
  mistakesContainer.innerHTML = "";
  if (mistakes.length === 0) {
    mistakesContainer.innerHTML = "<p>Perfect score! No mistakes made.</p>";
  } else {
    mistakes.forEach((m) => {
      const card = document.createElement("div");
      card.className = "mistake-card";
      card.innerHTML = `
        <strong>[${m.subject}]</strong>
        <p><strong>Q:</strong> ${m.question}</p>
        <p style="color: #dc2626;"><strong>Your Answer:</strong> ${m.selected}</p>
        <p style="color: #16a34a;"><strong>Correct Answer:</strong> ${m.correct}</p>
        <p><em>Explanation: ${m.explanation}</em></p>
      `;
      mistakesContainer.appendChild(card);
    });
  }
}
