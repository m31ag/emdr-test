//color
const colorInput = document.getElementById("ballColor");
const colorPreview = document.getElementById("colorPreview");

let ballColor = colorInput.value;

//audio

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let hitBuffer;

fetch("classics.mp3")
    .then(r => r.arrayBuffer())
    .then(b => audioCtx.decodeAudioData(b))
    .then(buf => hitBuffer = buf);

function playFrom(time, duration = 0.2, pan = 0) {
    if (!hitBuffer) return;

    const source = audioCtx.createBufferSource();
    source.buffer = hitBuffer;

    const panNode = audioCtx.createStereoPanner();
    panNode.pan.value = pan;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    source.connect(panNode).connect(gainNode).connect(audioCtx.destination);
    source.start(0, time, duration);
}


const sounds = [
    { time: 0, dur: 1 },
    { time: 2, dur: 1 },
    { time: 4, dur: 1 },
    { time: 6, dur: 1 },
    { time: 8, dur: 1 },
    { time: 10, dur: 1 },
    { time: 12, dur: 1 },
    { time: 14, dur: 1 }
];

let currentSound = -1;

document.querySelectorAll('[data-sound]').forEach(btn => {
    btn.addEventListener('click', () => {
        document
            .querySelectorAll('[data-sound]')
            .forEach(b => b.classList.remove('active'));

        btn.classList.add('active');
        currentSound = Number(btn.dataset.sound);

        // предпрослушивание
        playFrom(sounds[currentSound].time, sounds[currentSound].dur, 0);
    });
});

function playWallHit(side) {
    const snd = sounds[currentSound];
    if (!snd) return;

    let pan = 0;
    if (side === "left") pan = -1;
    if (side === "right") pan = 1;

    playFrom(snd.time, snd.dur, pan);
}


// canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = canvas.clientWidth
canvas.height = canvas.clientHeight
const ball = {
    x: 0,
    y: 0,
    r: 80
};

// -------- СОСТОЯНИЕ --------
let mode = "stop";
let stopping = true;
let speed = Number(document.getElementById("speed").value); // стартовая скорость = 23

// для прямых
let dir = 1;

// для диагонали
let t = 0;
let tDir = 1;
let start = { x: 0, y: 0 };
let end = { x: 0, y: 0 };

// для восьмёрки
let time = 0;


function moveToCenterSmooth() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const dx = cx - ball.x;
    const dy = cy - ball.y;

    // коэффициент плавности
    ball.x += dx * 0.05;
    ball.y += dy * 0.05;

    // когда почти в центре — фиксируем
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        ball.x = cx;
        ball.y = cy;
        stopping = false;
    }
}

// -------- РЕЖИМЫ --------
function setStop() {
    mode = "stop";
    stopping = true;
}

function setHorizontal() {
    stopping = false;
    mode = "horizontal";
    ball.x = ball.r;
    ball.y = canvas.height / 2;
    dir = 1;
}

function setVertical() {
    stopping = false;
    mode = "vertical";
    ball.x = canvas.width / 2;
    ball.y = ball.r;
    dir = 1;
}

function setDiagonalLeftTop() {
    stopping = false;
    mode = "diagonal";
    t = 0;
    tDir = 1;

    start = { x: ball.r, y: ball.r };
    end = {
        x: canvas.width - ball.r,
        y: canvas.height - ball.r
    };
}

function setDiagonalRightTop() {
    stopping = false;
    mode = "diagonal";
    t = 0;
    tDir = 1;

    start = { x: canvas.width - ball.r, y: ball.r };
    end = {
        x: ball.r,
        y: canvas.height - ball.r
    };
}

function setEight() {
    stopping = false;
    mode = "eight";
    time = 0;
}

// -------- АНИМАЦИЯ --------

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === "stop") {
        if (stopping) {
            moveToCenterSmooth();
        }
    }


    if (mode === "horizontal") {
        ball.x += speed * 1.6 * dir;
        if (ball.x + ball.r >= canvas.width && dir > 0) {
            dir = -1;
            playWallHit("right");
        }

        if (ball.x - ball.r <= 0 && dir < 0) {
            dir = 1;
            playWallHit("left");
        }
    }

    if (mode === "vertical") {

        ball.y += speed * 1.6 * dir;
        if (ball.y + ball.r >= canvas.height && dir > 0) {
            dir = -1;
            playWallHit("bottom");
        }

        if (ball.y - ball.r <= 0 && dir < 0) {
            dir = 1;
            playWallHit("top");
        }
    }

    if (mode === "diagonal") {
        t += (speed / 800) * tDir;

        // пересчитываем текущие координаты
        ball.x = start.x + (end.x - start.x) * t;
        ball.y = start.y + (end.y - start.y) * t;

        // проверка удара по "стенкам"
        let hit = false;
        let pan = 0;

        if (t >= 1 && tDir > 0) {
            tDir *= -1; // меняем направление
            hit = true;
            pan = (end.x > start.x) ? 1 : -1; // движемся вправо = правое ухо
        } else if (t <= 0 && tDir < 0) {
            tDir *= -1;
            hit = true;
            pan = (end.x > start.x) ? -1 : 1; // движемся влево = левое ухо
        }

        if (hit) {
            // проигрываем выбранный звук
            const snd = sounds[currentSound];
            if (snd) playFrom(snd.time, snd.dur, pan);
        }
    }


    if (mode === "eight") {
        time += speed * 0.0035;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const a = canvas.width / 2 - ball.r;
        const b = canvas.height / 2 - ball.r;

        // лемниската
        ball.x = cx + a * Math.sin(time);
        ball.y = cy + b * Math.sin(time) * Math.cos(time);



    }

    // шарик
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();

    requestAnimationFrame(animate);
}

// -------- КОНТРОЛЛЫ --------
document.getElementById("stop").onclick = setStop;

document.getElementById("horizontal").onclick = setHorizontal;
document.getElementById("vertical").onclick = setVertical;
document.getElementById("diag1").onclick = setDiagonalLeftTop;
document.getElementById("diag2").onclick = setDiagonalRightTop;
document.getElementById("eight").onclick = setEight;

document.getElementById("speed").oninput = (e) => {
    speed = Number(e.target.value);
};

colorInput.addEventListener("input", e => {
    ballColor = e.target.value;
    colorPreview.style.background = ballColor;
});

// старт
setStop();
animate();

