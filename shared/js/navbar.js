function toggleCapsule(forceState) {
  const container = document.getElementById('capsule-container');
  const overlay = document.getElementById('overlay');
  const isOpen = forceState !== undefined ? forceState : !container.classList.contains('open');

  container.classList.toggle('open', isOpen);
  overlay.classList.toggle('active', isOpen);
}

function updateDate() {
  const dateElem = document.getElementById('live-date');
  if (dateElem) {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateElem.innerText = now.toLocaleDateString('en-US', options);
  }
}

document.addEventListener('DOMContentLoaded', updateDate);