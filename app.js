let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeRemaining = 3 * 60 * 60; // 3 Hours
let currentLanguage = "en"; // 'en' or 'hi'

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTliG-CGQtiEPU7VjoN6Z-HWkc_RzTO8zFBpePg9CMGQE02R6jonewba1oChyvG1n_duTQiPLRV6pIq/pub?gid=0&single=true&output=csv";

// Backup questions if sheet fetch fails (CORS / offline)
const FALLBACK_QUESTIONS = [
  {
    id: 0,
    subject: "Child Development & Pedagogy",
    question_en: "Which of the following is a primary agency of socialization for children?",
    question_hi: "निम्नलिखित में से कौन सा बच्चों के सामाजिकरण का प्राथमिक कारक है?",
    options_en: ["School", "Family", "Media", "Government"],
    options_hi: ["विद्यालय", "परिवार", "मीडिया", "सरकार"],
    answer: 1,
    explanation_en: "Family is the primary context where children learn foundational social skills.",
    explanation_hi: "परिवार वह पहला माध्यम है जहाँ बच्चा बुनियादी सामाजिक कौशल सीखता है।"
  },
  {
    id: 1,
    subject: "Mathematics",
    question_en: "What is the perimeter of a rectangle with length 12 cm and breadth 8 cm?",
    question_hi: "12 सेमी लंबाई और 8 सेमी चौड़ाई वाले आयत का परिमाप क्या है?",
    options_en: ["40 cm", "96 cm", "20 cm", "48 cm"],
    options_hi: ["40 सेमी", "96 सेमी", "20 सेमी", "48 सेमी"],
    answer: 0,
    explanation_en: "Perimeter = 2 * (12 + 8) = 40 cm.",
    explanation_hi: "परिमाप = 2 * (12 + 8) = 40 सेमी।"
  }
];

window.addEventListener("DOMContentLoaded", () => {
  fetchQuestionsFromSheet();
});

function fetchQuestionsFromSheet() {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerText = "Loading Questions...";
  }

  if (typeof Papa === 'undefined') {
    alert("PapaParse library standard CDN failed to load. Using offline questions.");
    loadFallbackData();
    return;
  }

  Papa.parse(GOOGLE_SHEET_CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        console.warn("Sheet returned empty data. Loading fallback questions.");
        loadFallbackData();
        return;
      }

      questions = results.data.map((row, index) => ({
        id: index,
        subject: row.subject || "General",
        question_en: row.question_en || row.question || "",
        question_hi: row.question_hi || row.question_en || row.question || "",
        options_en: [
          row.optionA_en || row.optionA || "",
          row.optionB_en || row.optionB || "",
          row.optionC_en || row.optionC || "",
          row.optionD_en || row.optionD || ""
        ],
        options_hi: [
          row.optionA_hi || row.optionA_en || row.optionA || "",
          row.optionB_hi || row.optionB_en || row.optionB || "",
          row.optionC_hi || row.optionC_en || row.optionC || "",
          row.optionD_hi || row.optionD_en || row.optionD || ""
        ],
        answer: parseInt(row.answere !== undefined ? row.answere : row.answer, 10) || 0,
        explanation_en: row.xplanation_en || row.explanation_en || row.explanation || "No explanation provided.",
        explanation_hi: row.explanation_hi || row.xplanation_en || row.explanation_en || row.explanation || "कोई स्पष्टीकरण उपलब्ध नहीं है।"
      }));

      enableStartButton(`Start Examination (${questions.length} Qs)`);
    },
    error: function (err) {
      console.error("CSV Fetch Error:", err);
      alert("Unable to fetch Google Sheet online due to browser security restrictions. Loading backup questions.");
      loadFallbackData();
    }
  });
}

function loadFallbackData() {
  questions = FALLBACK_QUESTIONS;
  enableStartButton("Start Examination (Offline Mode)");
}

function enableStartButton(text) {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.innerText = text;
  }
}

function startExam() {
  if (questions.length === 0) {
    alert("No questions available. Reload the page.");
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