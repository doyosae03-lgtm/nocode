const MODES = {
  focus: {
    label: "집중할 시간",
    completeMessage: "집중 세션을 완료했어요!",
    next: "short"
  },
  short: {
    label: "잠깐 쉬어가요",
    completeMessage: "짧은 휴식이 끝났어요.",
    next: "focus"
  },
  long: {
    label: "충분히 쉬어가요",
    completeMessage: "긴 휴식이 끝났어요.",
    next: "focus"
  }
};

const DEFAULT_SETTINGS = {
  focus: 25,
  short: 5,
  long: 15,
  dailyGoal: 8,
  autoStart: false,
  sound: true
};

const tips = [
  "시작하기 전에 휴대폰을 뒤집어 두고, 이번 세션의 목표를 하나만 정해 보세요.",
  "어려운 문제에서 막혔다면 표시만 해 두고 다음 문제로 넘어가 보세요.",
  "휴식 시간에는 화면보다 스트레칭이나 물 마시기를 추천해요.",
  "집중 세션마다 구체적인 목표를 하나만 정하면 시작이 쉬워집니다.",
  "공부가 잘 안 될 때는 완벽하게 하려 하지 말고 5분만 시작해 보세요."
];

const elements = {
  body: document.body,
  timerCard: document.querySelector("#timerCard"),
  timerDisplay: document.querySelector("#timerDisplay"),
  statusLabel: document.querySelector("#statusLabel"),
  subjectInput: document.querySelector("#subjectInput"),
  subjectPreview: document.querySelector("#subjectPreview"),
  progressRing: document.querySelector("#progressRing"),
  startButton: document.querySelector("#startButton"),
  startText: document.querySelector("#startText"),
  startIcon: document.querySelector("#startIcon"),
  resetButton: document.querySelector("#resetButton"),
  skipButton: document.querySelector("#skipButton"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  completedCount: document.querySelector("#completedCount"),
  sessionDots: document.querySelector("#sessionDots"),
  goalProgress: document.querySelector("#goalProgress"),
  goalValue: document.querySelector("#goalValue"),
  goalBarFill: document.querySelector("#goalBarFill"),
  focusTip: document.querySelector("#focusTip"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsModal: document.querySelector("#settingsModal"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  clearSessionsButton: document.querySelector("#clearSessionsButton"),
  focusMinutes: document.querySelector("#focusMinutes"),
  shortMinutes: document.querySelector("#shortMinutes"),
  longMinutes: document.querySelector("#longMinutes"),
  dailyGoal: document.querySelector("#dailyGoal"),
  autoStartToggle: document.querySelector("#autoStartToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  toast: document.querySelector("#toast")
};

const circumference = 2 * Math.PI * 124;
elements.progressRing.style.strokeDasharray = circumference;

let settings = loadSettings();
let currentMode = "focus";
let totalSeconds = getModeSeconds(currentMode);
let remainingSeconds = totalSeconds;
let isRunning = false;
let endTime = null;
let timerInterval = null;
let toastTimer = null;

let todayData = loadTodayData();

initialize();

function initialize() {
  applySettingsToInputs();
  updateModeUI();
  updateTimerUI();
  updateTodayUI();

  elements.subjectInput.value =
    localStorage.getItem("studyFlowSubject") || "";

  updateSubjectPreview();
  elements.focusTip.textContent =
    tips[Math.floor(Math.random() * tips.length)];

  elements.startButton.addEventListener("click", toggleTimer);
  elements.resetButton.addEventListener("click", resetTimer);
  elements.skipButton.addEventListener("click", skipTimer);
  elements.subjectInput.addEventListener("input", handleSubjectInput);
  elements.settingsButton.addEventListener("click", openSettings);
  elements.closeSettingsButton.addEventListener("click", closeSettings);
  elements.saveSettingsButton.addEventListener("click", saveSettings);
  elements.clearSessionsButton.addEventListener("click", clearTodaySessions);

  elements.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });

  elements.settingsModal.addEventListener("click", (event) => {
    if (event.target === elements.settingsModal) {
      closeSettings();
    }
  });

  document.addEventListener("keydown", handleKeyboard);
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

function getModeSeconds(mode) {
  return settings[mode] * 60;
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (isRunning) return;

  isRunning = true;
  endTime = Date.now() + remainingSeconds * 1000;

  updateStartButton();
  elements.timerCard.classList.add("running");

  timerInterval = window.setInterval(updateCountdown, 250);
}

function pauseTimer() {
  if (!isRunning) return;

  syncRemainingTime();
  isRunning = false;
  endTime = null;
  clearInterval(timerInterval);
  timerInterval = null;

  updateStartButton();
  elements.timerCard.classList.remove("running");
  updateTimerUI();
}

function resetTimer() {
  stopInterval();
  totalSeconds = getModeSeconds(currentMode);
  remainingSeconds = totalSeconds;
  updateStartButton();
  updateTimerUI();
  showToast("타이머를 초기화했어요.");
}

function updateCountdown() {
  syncRemainingTime();

  if (remainingSeconds <= 0) {
    finishTimer();
    return;
  }

  updateTimerUI();
}

function syncRemainingTime() {
  if (!isRunning || !endTime) return;

  remainingSeconds = Math.max(
    0,
    Math.ceil((endTime - Date.now()) / 1000)
  );
}

function finishTimer() {
  const finishedMode = currentMode;

  stopInterval();
  remainingSeconds = 0;
  updateTimerUI();

  if (settings.sound) {
    playCompletionSound();
  }

  if (finishedMode === "focus") {
    todayData.completed += 1;
    saveTodayData();
    updateTodayUI();

    currentMode =
      todayData.completed % 4 === 0 ? "long" : "short";
  } else {
    currentMode = "focus";
  }

  showToast(MODES[finishedMode].completeMessage);

  window.setTimeout(() => {
    totalSeconds = getModeSeconds(currentMode);
    remainingSeconds = totalSeconds;
    updateModeUI();
    updateTimerUI();

    if (settings.autoStart) {
      startTimer();
    }
  }, 900);
}

function skipTimer() {
  const nextMode =
    currentMode === "focus"
      ? todayData.completed > 0 && todayData.completed % 4 === 0
        ? "long"
        : "short"
      : "focus";

  switchMode(nextMode);
  showToast("다음 타이머로 이동했어요.");
}

function switchMode(mode) {
  if (!MODES[mode]) return;

  stopInterval();
  currentMode = mode;
  totalSeconds = getModeSeconds(mode);
  remainingSeconds = totalSeconds;

  updateModeUI();
  updateStartButton();
  updateTimerUI();
}

function stopInterval() {
  isRunning = false;
  endTime = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  elements.timerCard.classList.remove("running");
}

function updateTimerUI() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime =
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;

  elements.timerDisplay.textContent = formattedTime;

  const progress =
    totalSeconds === 0 ? 0 : remainingSeconds / totalSeconds;

  elements.progressRing.style.strokeDashoffset =
    circumference * (1 - progress);

  const modeName =
    currentMode === "focus"
      ? "집중"
      : currentMode === "short"
        ? "짧은 휴식"
        : "긴 휴식";

  document.title = isRunning
    ? `${formattedTime} · ${modeName}`
    : `Study Flow · ${modeName}`;
}

function updateModeUI() {
  elements.body.dataset.mode = currentMode;
  elements.statusLabel.textContent = MODES[currentMode].label;

  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === currentMode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

function updateStartButton() {
  elements.startText.textContent = isRunning ? "일시정지" : "시작";
  elements.startIcon.textContent = isRunning ? "Ⅱ" : "▶";
  elements.startButton.setAttribute(
    "aria-label",
    isRunning ? "타이머 일시정지" : "타이머 시작"
  );
}

function handleSubjectInput() {
  localStorage.setItem(
    "studyFlowSubject",
    elements.subjectInput.value.trim()
  );

  updateSubjectPreview();
}

function updateSubjectPreview() {
  elements.subjectPreview.textContent =
    elements.subjectInput.value.trim() || "과목을 입력해 보세요";
}

function updateTodayUI() {
  const completed = todayData.completed;
  const goal = settings.dailyGoal;

  elements.completedCount.textContent = completed;
  elements.goalProgress.textContent = completed;
  elements.goalValue.textContent = goal;
  elements.goalBarFill.style.width =
    `${Math.min((completed / goal) * 100, 100)}%`;

  elements.sessionDots.innerHTML = "";

  const visibleDots = Math.max(goal, completed, 4);

  for (let index = 0; index < visibleDots; index += 1) {
    const dot = document.createElement("span");
    dot.className =
      index < completed
        ? "session-dot completed"
        : "session-dot";

    dot.setAttribute(
      "aria-label",
      index < completed
        ? `${index + 1}번째 세션 완료`
        : `${index + 1}번째 세션 미완료`
    );

    elements.sessionDots.appendChild(dot);
  }
}

function openSettings() {
  applySettingsToInputs();
  elements.settingsModal.hidden = false;
  elements.closeSettingsButton.focus();
}

function closeSettings() {
  elements.settingsModal.hidden = true;
  elements.settingsButton.focus();
}

function applySettingsToInputs() {
  elements.focusMinutes.value = settings.focus;
  elements.shortMinutes.value = settings.short;
  elements.longMinutes.value = settings.long;
  elements.dailyGoal.value = settings.dailyGoal;
  elements.autoStartToggle.checked = settings.autoStart;
  elements.soundToggle.checked = settings.sound;
}

function saveSettings() {
  settings = {
    focus: clampNumber(elements.focusMinutes.value, 1, 90),
    short: clampNumber(elements.shortMinutes.value, 1, 30),
    long: clampNumber(elements.longMinutes.value, 1, 60),
    dailyGoal: clampNumber(elements.dailyGoal.value, 1, 20),
    autoStart: elements.autoStartToggle.checked,
    sound: elements.soundToggle.checked
  };

  localStorage.setItem(
    "studyFlowSettings",
    JSON.stringify(settings)
  );

  stopInterval();
  totalSeconds = getModeSeconds(currentMode);
  remainingSeconds = totalSeconds;

  updateStartButton();
  updateTimerUI();
  updateTodayUI();
  closeSettings();
  showToast("설정을 저장했어요.");
}

function clearTodaySessions() {
  if (todayData.completed === 0) {
    showToast("초기화할 기록이 없어요.");
    return;
  }

  const shouldClear = window.confirm(
    "오늘 완료한 집중 세션 기록을 초기화할까요?"
  );

  if (!shouldClear) return;

  todayData.completed = 0;
  saveTodayData();
  updateTodayUI();
  showToast("오늘의 기록을 초기화했어요.");
}

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("studyFlowSettings")
    );

    return {
      ...DEFAULT_SETTINGS,
      ...saved
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadTodayData() {
  const today = getTodayKey();

  try {
    const saved = JSON.parse(
      localStorage.getItem("studyFlowToday")
    );

    if (saved && saved.date === today) {
      return saved;
    }
  } catch {
    // 저장된 데이터가 손상된 경우 새 기록을 사용합니다.
  }

  const freshData = {
    date: today,
    completed: 0
  };

  localStorage.setItem(
    "studyFlowToday",
    JSON.stringify(freshData)
  );

  return freshData;
}

function saveTodayData() {
  localStorage.setItem(
    "studyFlowToday",
    JSON.stringify(todayData)
  );
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function clampNumber(value, minimum, maximum) {
  const number = Number.parseInt(value, 10);

  if (Number.isNaN(number)) {
    return minimum;
  }

  return Math.min(Math.max(number, minimum), maximum);
}

function handleKeyboard(event) {
  const isTyping =
    event.target.tagName === "INPUT" ||
    event.target.tagName === "TEXTAREA";

  if (
    event.code === "Space" &&
    !isTyping &&
    elements.settingsModal.hidden
  ) {
    event.preventDefault();
    toggleTimer();
  }

  if (
    event.key === "Escape" &&
    !elements.settingsModal.hidden
  ) {
    closeSettings();
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible" && isRunning) {
    updateCountdown();
  }
}

function showToast(message) {
  clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2400);
}

function playCompletionSound() {
  const AudioContext =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return;

  const context = new AudioContext();
  const now = context.currentTime;
  const notes = [523.25, 659.25, 783.99];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + index * 0.16;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.16, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startAt + 0.35
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + 0.36);
  });

  window.setTimeout(() => context.close(), 1000);
}