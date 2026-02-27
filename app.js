const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const intervalInput = document.getElementById("intervalInput");
const categorySelect = document.getElementById("categorySelect");
const categoryInfo = document.getElementById("categoryInfo");
const hanziEl = document.getElementById("hanzi");
const pinyinEl = document.getElementById("pinyin");
const meaningEl = document.getElementById("meaning");

let wordBank = {};
let categories = [];
let isPlaying = false;
let timeoutId = null;
let availableVoices = [];
let currentQueue = [];
let queueIndex = 0;

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resetQueue() {
  const selectedCategory = categorySelect.value;
  currentQueue = shuffle(wordBank[selectedCategory] || []);
  queueIndex = 0;
}

function nextWord() {
  if (queueIndex >= currentQueue.length) {
    resetQueue();
  }
  const word = currentQueue[queueIndex];
  queueIndex += 1;
  return word;
}

function clearDisplay() {
  hanziEl.textContent = "...";
  pinyinEl.textContent = "";
  meaningEl.textContent = "";
}

function showWord(word) {
  hanziEl.textContent = word.hanzi;
  pinyinEl.textContent = word.pinyin;
  meaningEl.textContent = word.meaning;
}

function getChineseVoice() {
  const zhVoice = availableVoices.find((voice) =>
    voice.lang.toLowerCase().startsWith("zh")
  );
  return zhVoice || null;
}

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}

function updateCategoryInfo() {
  const selectedCategory = categorySelect.value;
  const count = (wordBank[selectedCategory] || []).length;
  categoryInfo.textContent = `カテゴリ: ${selectedCategory}（${count}語）`;
}

function playOneWord() {
  if (!isPlaying) return;

  const word = nextWord();
  if (!word) {
    stopAutoPlay();
    categoryInfo.textContent = "このカテゴリに単語がありません。";
    return;
  }

  clearDisplay();

  const utterance = new SpeechSynthesisUtterance(word.hanzi);
  utterance.lang = "zh-CN";
  utterance.rate = 0.9;

  const voice = getChineseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    showWord(word);

    if (!isPlaying) return;

    const waitSeconds = Math.max(1, Number(intervalInput.value) || 3);
    timeoutId = setTimeout(playOneWord, waitSeconds * 1000);
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function startAutoPlay() {
  if (isPlaying) return;

  isPlaying = true;
  startButton.disabled = true;
  stopButton.disabled = false;
  categorySelect.disabled = true;

  resetQueue();
  playOneWord();
}

function stopAutoPlay() {
  isPlaying = false;
  startButton.disabled = false;
  stopButton.disabled = true;
  categorySelect.disabled = false;
  clearTimeout(timeoutId);
  window.speechSynthesis.cancel();
  hanziEl.textContent = "停止中";
  pinyinEl.textContent = "";
  meaningEl.textContent = "";
}

function populateCategoryOptions() {
  categorySelect.innerHTML = "";

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }

  if (categories.length > 0) {
    categorySelect.value = categories[0];
    updateCategoryInfo();
  }
}

async function loadWordBank() {
  let data = null;

  try {
    const response = await fetch("./data/wordbank.json");
    if (!response.ok) {
      throw new Error(`単語データの読み込みに失敗しました: ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    data = window.WORD_BANK || null;
  }

  if (typeof data !== "object" || data === null) {
    throw new Error("単語データ形式が不正です。");
  }

  wordBank = data;
  categories = Object.keys(wordBank);
  if (categories.length === 0) {
    throw new Error("カテゴリが空です。");
  }
}

async function init() {
  startButton.disabled = true;
  stopButton.disabled = true;
  categorySelect.disabled = true;
  categoryInfo.textContent = "単語データ読み込み中...";

  try {
    await loadWordBank();
    populateCategoryOptions();
    startButton.disabled = false;
    categorySelect.disabled = false;
    categoryInfo.textContent = "準備完了。カテゴリを選んで開始してください。";
    updateCategoryInfo();
  } catch (error) {
    categoryInfo.textContent = `エラー: ${error.message}`;
  }
}

categorySelect.addEventListener("change", () => {
  updateCategoryInfo();
  clearDisplay();
});
startButton.addEventListener("click", startAutoPlay);
stopButton.addEventListener("click", stopAutoPlay);
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();
init();
