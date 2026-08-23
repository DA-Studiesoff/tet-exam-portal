let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeRemaining = 3 * 60 * 60; // 3 Hours
let currentLanguage = "en";

// Update the Google Sheet links/GIDs below with your actual Secondary TET Tab IDs
const PAPER_SETS = {
  // Math & Science Stream
  "math_sci_set1": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=0",
  "math_sci_set2": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_MATH_SET2_GID",
  "math_sci_set3": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_MATH_SET3_GID",

  // Social Studies Stream
  "social_set1": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_SOCIAL_SET1_GID",
  "social_set2": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_SOCIAL_SET2_GID",
  "social_set3": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_SOCIAL_SET3_GID",

  // Language Stream
  "lang_set1": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_LANG_SET1_GID",
  "lang_set2": "https://docs.google.com/spreadsheets/d/1CdjBfrnKVQfhnZlZDd0hvefrBw9FDYELqMVLTOuDvps/export?format=csv&gid=YOUR_LANG_SET2_GID"
};

window.addEventListener("DOMContentLoaded", () => {
  fetchQuestionsFromSheet();
});

function changePaperSet() {
  userAnswers = {};
  fetchQuestionsFromSheet();
}

function getField(row, ...possibleKeys) {
  for (const key of possibleKeys) {
    const target = key.toLowerCase().replace(/[\uFEFF\u00A0_\s-]/g, '').trim();
    for (const actualKey of Object.keys(row)) {
      const cleanActual = actualKey.toLowerCase().replace(/[\uFEFF\u00A0_\s-]/g, '').trim();
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

function parseAnswerIndex(val, options = []) {
  if (!val) return 0;
  const clean = val.toString().toUpperCase().trim();
  
  if (clean === "A" || clean === "OPTION A" || clean === "OPTION 1") return 0;
  if (clean === "B" || clean === "OPTION B" || clean === "OPTION 2") return 1;
  if (clean === "C" || clean === "OPTION C" || clean === "OPTION 3") return 2;
  if (clean === "D" || clean === "OPTION D" || clean === "OPTION 4") return 3;
  
  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed) && parsed.toString() === clean) {
    return parsed > 3 ? parsed - 1 : parsed;
  }

  for (let i = 0; i < options.length; i++) {
    if (options[i] && options[i].toString().toUpperCase().trim() === clean) {
      return i;
    }
  }

  return 0;
}

function fetchQuestionsFromSheet() {
  const startBtn = document.getElementById("start-btn");
  const setDropdown = document.getElementById("paper-set-select");
  const selectedSet = setDropdown ? setDropdown.value : "math_sci_set1";
  const fetchUrl = PAPER_SETS[selectedSet] || PAPER_SETS["math_sci_set1"];

  if (fetchUrl.includes("YOUR_")) {
    alert(`Tab GID Not Configured:\n\nPlease update the Google Sheet tab GID for '${selectedSet}' inside secondary-app.js.`);
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerText = "Select Configured Paper Set";
    }
    return;
  }

  if (startBtn) {
    startBtn.disabled = true;
    startBtn.innerText = "Loading Selected Paper Set...";
  }

  Papa.parse(fetchUrl, {
    download: true,
    header: true,
    skipEmptyLines: 'greedy',
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        alert("Google Sheet returned no data.");
        return;
      }

      const detectedHeaders = Object.keys(results.data[0] || {});
      const firstHeader = detectedHeaders[0] || "";
      if (firstHeader.includes("<!DOCTYPE") || firstHeader.includes("<html") || firstHeader.includes("google")) {
        alert("PERMISSION ERROR:\n\nGoogle blocked access to the sheet. Ensure general access is set to 'Anyone with the link can view'.");
        if (startBtn) startBtn.innerText = "Permission Error";
        return;
      }

      const rawQuestions = results.data.map((row) => {
        const q_en = getField(row, "question_en", "question", "q_en", "q", "question text", "questions", "ques");
        const q_hi = getField(row, "question_hi", "q_hi", "hindi_question", "question_hindi", "hindi", "question_en", "question");

        const options_en = [
          getField(row, "optionA_en", "optionA", "option_a", "option1", "opt_a", "opta", "a"),
          getField(row, "optionB_en", "optionB", "option_b", "option2", "opt_b", "optb", "b"),
          getField(row, "optionC_en", "optionC", "option_c", "option3", "opt_c", "optc", "c"),
          getField(row, "optionD_en", "optionD", "option_d", "option4", "opt_d", "optd", "d")
        ];

        const options_hi = [
          getField(row, "optionA_hi", "optionA_en", "optionA", "option_a", "option1", "a"),
          getField(row, "optionB_hi", "optionB_en", "optionB", "option_b", "option2", "b"),
          getField(row, "optionC_hi", "optionC_en", "optionC", "option_c", "option3", "c"),
          getField(row, "optionD_hi", "optionD_en", "optionD", "option_d", "option4", "d")
        ];

        const rawAns = getField(row, "answere", "answer", "ans", "correct_answer", "correct", "right_answer", "right");

        return {
          subject: getField(row, "subject", "sub", "category", "topic", "section") || "Secondary General",
          question_en: q_en,
          question_hi: q_hi || q_en,
          options_en: options_en,
          options_hi: options_hi,
          answer: parseAnswerIndex(rawAns, options_en),
          explanation_en: getField(row, "explanation_en", "explanation", "exp", "solution") || "No explanation provided.",
          explanation_hi: getField(row, "explanation_hi", "explanation", "exp", "solution") || "कोई स्पष्टीकरण उपलब्ध नहीं है।"
        };
      });

      questions = rawQuestions.filter(q => q.question_en.length > 0 || q.question_hi.length > 0);
      questions.forEach((q, idx) => q.id = idx);

      if (questions.length === 0) {
        alert("Selected set has no valid questions.");
        if (startBtn) startBtn.innerText = "No Questions Found";
        return;
      }

      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerText = `Start Secondary Exam (${questions.length} Qs)`;
      }
    },
    error: function (err) {
      alert("Network Error fetching sheet. Check tab ID and permission settings.");
      console.error(err);
    }
  });
}

function startExam() {
  if (questions.length === 0) {
    alert("No questions available.");
    return;
  }

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("exam-screen").classList.remove("hidden");
  
  initPalette();
  loadQuestion(0);
  startTimer();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
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