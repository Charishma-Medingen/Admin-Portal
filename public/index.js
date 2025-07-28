const loader = document.getElementById("loader");
const progressBar = document.querySelector(".progress-bar");

let progress = 0;
const interval = setInterval(() => {
  progress += Math.random() * 20; // Increment progress randomly
  progressBar.style.width = `${Math.min(progress, 100)}%`;

  if (progress >= 100) {
    clearInterval(interval);
  }
}, 500);

window.onload = () => {
  setTimeout(() => {
    if (loader) loader.style.display = "none";
  }, 500); // Small delay for a smooth transition
};
