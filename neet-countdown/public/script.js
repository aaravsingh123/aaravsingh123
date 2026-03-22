const dayEl = document.getElementById('days');
const hourEl = document.getElementById('hours');
const minuteEl = document.getElementById('minutes');
const secondEl = document.getElementById('seconds');
const statusEl = document.getElementById('status');
const examDateEl = document.getElementById('exam-date');

let targetDate = null;
let timerInterval = null;

const formatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

function animateValueChange(element, value) {
  if (element.textContent === value) {
    return;
  }

  element.classList.add('flip');
  setTimeout(() => {
    element.textContent = value;
    element.classList.remove('flip');
  }, 120);
}

function pad(num) {
  return String(num).padStart(2, '0');
}

function updateCountdown() {
  if (!targetDate) {
    return;
  }

  const now = new Date().getTime();
  const distance = targetDate.getTime() - now;

  if (distance <= 0) {
    animateValueChange(dayEl, '00');
    animateValueChange(hourEl, '00');
    animateValueChange(minuteEl, '00');
    animateValueChange(secondEl, '00');
    statusEl.textContent = 'Best of luck for your NEET exam!';
    clearInterval(timerInterval);
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  animateValueChange(dayEl, String(days));
  animateValueChange(hourEl, pad(hours));
  animateValueChange(minuteEl, pad(minutes));
  animateValueChange(secondEl, pad(seconds));
}

async function fetchNeetDate() {
  try {
    const response = await fetch('/api/neet-date');

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const parsedDate = new Date(`${payload.date}T00:00:00+05:30`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Received invalid date from server');
    }

    targetDate = parsedDate;
    examDateEl.textContent = `Exam Date: ${formatter.format(targetDate)} (${payload.date})`;

    const sourceText = payload.source === 'fallback-default'
      ? 'fallback date (default)'
      : payload.source;
    statusEl.textContent = `Date source: ${sourceText}. Live timer updates every second.`;

    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);
  } catch (error) {
    statusEl.textContent = `Unable to load exam date: ${error.message}`;
    console.error('Failed to load NEET date:', error);
  }
}

fetchNeetDate();
