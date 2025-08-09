const startBtn = document.getElementById('startBtn');
const webcamVideo = document.getElementById('webcamVideo');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const status = document.getElementById('status');
const moodCircle = document.getElementById('moodCircle');
const moodLabel = document.getElementById('moodLabel');
const yawnSound = document.getElementById('yawnSound');
const alertBeep = document.getElementById('alertBeep');
const sleepinessMeter = document.getElementById('sleepinessMeter');
const sleepinessMessage = document.getElementById('sleepinessMessage');

let yawnCount = 0;
let isYawning = false;

async function setupModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
}

async function startWebcam() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  webcamVideo.srcObject = stream;
  return new Promise(resolve => {
    webcamVideo.onloadedmetadata = () => {
      overlay.width = webcamVideo.videoWidth;
      overlay.height = webcamVideo.videoHeight;
      document.getElementById('container').style.animation = 'zoomIn 1s ease forwards';
      resolve();
    };
  });
}

function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function mouthAspectRatio(mouth) {
  const A = dist(mouth[13], mouth[19]);
  const B = dist(mouth[15], mouth[17]);
  const C = dist(mouth[12], mouth[16]);
  const D = dist(mouth[0], mouth[6]);
  return (A + B + C) / (3.0 * D);
}

function updateMoodRing(count) {
  moodCircle.classList.remove('pulse');
  if (count === 0) {
    moodCircle.style.backgroundColor = 'limegreen';
    moodCircle.style.boxShadow = '0 0 15px 3px rgba(50, 205, 50, 0.6)';
    moodLabel.textContent = 'Hyperactive Unicorn 🦄';
  } else if (count <= 3) {
    moodCircle.style.backgroundColor = '#6495ED';
    moodCircle.style.boxShadow = '0 0 15px 3px rgba(100, 149, 237, 0.7)';
    moodLabel.textContent = 'Mildly Sleepy Sloth 🦥';
  } else if (count <= 6) {
    moodCircle.style.backgroundColor = '#555555';
    moodCircle.style.boxShadow = '0 0 15px 3px rgba(85, 85, 85, 0.7)';
    moodLabel.textContent = 'Grumpy Cat 😾';
  } else {
    moodCircle.style.backgroundColor = '#8B0000';
    moodCircle.style.boxShadow = '0 0 20px 5px rgba(139, 0, 0, 0.8)';
    moodLabel.textContent = 'Zombie Overlord 🧟‍♂';
  }
  setTimeout(() => moodCircle.classList.add('pulse'), 50);
}

function updateSleepinessMeter(count) {
  let percent = Math.min((count / 10) * 100, 100);
  sleepinessMeter.style.width = percent + "%";

  if (percent < 30) {
    sleepinessMessage.textContent = "You're wide awake!";
  } else if (percent < 60) {
    sleepinessMessage.textContent = "Getting drowsy...";
  } else if (percent < 90) {
    sleepinessMessage.textContent = "Very sleepy! 😴";
  } else {
    sleepinessMessage.textContent = "Almost asleep!";
  }
}

function showSleepMessage() {
    const messageElement = document.getElementById("sleepMessage");
    messageElement.textContent = "⚠️ You look very sleepy! Please go to sleep and rest well. ⚠️";
    messageElement.classList.remove('hidden'); // show it
    setTimeout(() => {
        messageElement.classList.add('hidden'); // hide after 5 sec
    }, 5000);
}



function animateCount(targetCount) {
  let current = yawnCount;
  let start = performance.now();
  const duration = 700;
  function step(timestamp) {
    let progress = (timestamp - start) / duration;
    if (progress > 1) progress = 1;
    let displayCount = Math.floor(current + (targetCount - current) * progress);
    status.textContent = `Yawns detected: ${displayCount}`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function detectYawn() {
  const options = new faceapi.TinyFaceDetectorOptions();
  setInterval(async () => {
    if (webcamVideo.readyState < 2) return;
    const result = await faceapi.detectSingleFace(webcamVideo, options).withFaceLandmarks(true);
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    if (result) {
      const resizedResults = faceapi.resizeResults(result, {
        width: overlay.width,
        height: overlay.height,
      });
      faceapi.draw.drawDetections(overlay, resizedResults);
      faceapi.draw.drawFaceLandmarks(overlay, resizedResults);

      const mouth = resizedResults.landmarks.getMouth();
      const mar = mouthAspectRatio(mouth);
      const YAWN_THRESH = 0.6;

      if (mar > YAWN_THRESH) {
        if (!isYawning) {
          yawnCount++;
          animateCount(yawnCount);
          updateMoodRing(yawnCount);
          updateSleepinessMeter(yawnCount);

          if (yawnSound) {
            yawnSound.currentTime = 0;
            yawnSound.play().catch(() => {});
          }

          if (yawnCount > 5) {
    if (alertBeep) {
        alertBeep.currentTime = 0;
        alertBeep.play().catch(() => {});
    }
    showSleepMessage(); // ✅ This now sets and shows the big message
}

          isYawning = true;
        }
      } else {
        isYawning = false;
      }
    }
  }, 100);
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'Loading models...';
  await setupModels();
  startBtn.textContent = 'Starting webcam...';
  await startWebcam();
  startBtn.textContent = 'Detecting yawns...';
  detectYawn();
  startBtn.textContent = 'Yawn detection started';
});
