let video = null;
let canvas = null;
let ctx = null;
let scaler = 0.95;
let pieces = [];
let size = { x: 0, y: 0, width: 0, height: 0, rows: 3, cols: 3 };
let selected_piece = null;
let start_time = null;
let end_time = null;
let setDifficulty;
let restart;
let playNote;
let showMenu;
let showScores,
  getScores,
  formatScores,
  formatScoreTable,
  closeScores,
  saveScore;

let pop = new Audio("pop.mp3");
pop.volume = 0.1;

let audioCtx = null;

let keys = {
  DO: 261.6,
  RE: 293.7,
  MI: 329.6,
};

function main() {
  canvas = document.querySelector("canvas");

  ctx = canvas.getContext("2d");
  addEventListeners();

  let promise = navigator.mediaDevices.getUserMedia({ video: true });
  promise
    .then((signal) => {
      video = document.createElement("video");
      video.srcObject = signal;
      video.play();
      video.onloadeddata = () => {
        window.addEventListener("resize", handleResize);
        handleResize();
        initializePieces(size.rows, size.cols);
        updateGame();
      };
    })
    .catch((err) => {
      console.log(err);
    });

  setDifficulty = () => {
    let diff = document.getElementById("difficulty").value;
    switch (diff) {
      case "easy":
        initializePieces(3, 3);
        break;
      case "medium":
        initializePieces(5, 5);
        break;
      case "hard":
        initializePieces(8, 8);
        break;
      case "insane":
        initializePieces(15, 15);
        break;
      default:
        break;
    }
  };

  restart = () => {
    audioCtx = new AudioContext();
    start_time = new Date().getTime();
    end_time = null;
    randomizePieces();
    document.getElementById("menuItems").style.display = "none";
  };

  function updateTime() {
    let now = new Date().getTime();
    if (start_time !== null) {
      if (end_time !== null) {
        document.getElementById("time").innerHTML = formatTime(
          end_time - start_time
        );
      } else {
        document.getElementById("time").innerHTML = formatTime(
          now - start_time
        );
      }
    }
  }

  function isComplete() {
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].correct === false) {
        return false;
      }
    }
    return true;
  }

  function formatTime(ms) {
    let sec = Math.floor(ms / 1000);
    let s = sec % 60;
    let m = Math.floor((sec % 3600) / 60);
    let h = Math.floor(sec / 3600);
    let formattedTime = h.toString().padStart(2, "0");
    formattedTime += ":";
    formattedTime += m.toString().padStart(2, "0");
    formattedTime += ":";
    formattedTime += s.toString().padStart(2, "0");
    return formattedTime;
  }

  function addEventListeners() {
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onTouchEnd);
  }

  function onTouchStart(e) {
    let loc = {
      x: e.touches[0].clientX - canvas.offsetLeft,
      y: e.touches[0].clientY - canvas.offsetTop,
    };
    onMouseDown(loc);
  }

  function onTouchMove(e) {
    let loc = {
      x: e.touches[0].clientX - canvas.offsetLeft,
      y: e.touches[0].clientY - canvas.offsetTop,
    };
    onMouseMove(loc);
  }

  function onTouchEnd(e) {
    if (selected_piece != null) {
      onMouseUp();
    }
  }

  function onMouseDown(e) {
    selected_piece = getPressedPiece(e);
    if (selected_piece != null) {
      const index = pieces.indexOf(selected_piece);
      if (index > -1) {
        pieces.splice(index, 1);
        pieces.push(selected_piece);
      }
      selected_piece.offset = {
        x: e.x - selected_piece.x,
        y: e.y - selected_piece.y,
      };
      selected_piece.correct = false;
    }
  }

  function onMouseMove(e) {
    if (selected_piece != null) {
      selected_piece.x = e.x - selected_piece.offset.x;
      selected_piece.y = e.y - selected_piece.offset.y;
    }
  }

  function onMouseUp() {
    if (selected_piece) {
      if (selected_piece.isClose()) {
        selected_piece.snap();
        if (isComplete() && end_time === null) {
          let now = new Date().getTime();
          end_time = now;

          setTimeout(() => {
            playMelody();
          }, 400);
          showEndScreen();
        }
      }
    }
    selected_piece = null;
  }

  function getPressedPiece(loc) {
    for (let i = pieces.length - 1; i >= 0; i--) {
      if (
        loc.x > pieces[i].x &&
        loc.x < pieces[i].x + pieces[i].width &&
        loc.y > pieces[i].y &&
        loc.y < pieces[i].y + pieces[i].height
      ) {
        return pieces[i];
      }
    }
    return null;
  }

  function handleResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let resizer =
      scaler *
      Math.min(
        window.innerWidth / video.videoWidth,
        window.innerHeight / video.videoHeight
      );
    size.width = resizer * video.videoWidth * 0.9;
    size.height = resizer * video.videoHeight * 0.9;
    size.x = window.innerWidth / 2 - size.width / 2;
    size.y = window.innerHeight / 2 - size.height / 2;

    // Update the size of each piece
    for (let i = 0; i < pieces.length; i++) {
      pieces[i].width = size.width / size.cols;
      pieces[i].height = size.height / size.rows;
    }

    randomizePieces();
  }

  function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(video, size.x, size.y, size.width, size.height);
    ctx.globalAlpha = 1;

    for (let y = 0; y < size.rows; y++) {
      for (let x = 0; x < size.cols; x++) {
        let pieceX = size.x + (size.width * x) / size.cols;
        let pieceY = size.y + (size.height * y) / size.rows;
        let pieceWidth = size.width / size.cols;
        let pieceHeight = size.height / size.rows;
        ctx.strokeRect(pieceX, pieceY, pieceWidth, pieceHeight);
      }
    }

    for (let i = 0; i < pieces.length; i++) {
      pieces[i].draw(ctx);
    }
    updateTime();
    window.requestAnimationFrame(updateGame);
  }

  function initializePieces(rows, cols) {
    size.rows = rows;
    size.cols = cols;
    pieces = [];
    for (let y = 0; y < size.rows; y++) {
      for (let x = 0; x < size.cols; x++) {
        pieces.push(new Piece(y, x));
      }
    }
  }

  function randomizePieces() {
    for (let i = 0; i < pieces.length; i++) {
      let loc = {
        x: Math.random() * (canvas.width - pieces[i].width),
        y: Math.random() * (canvas.height - pieces[i].height),
      };
      pieces[i].x = loc.x;
      pieces[i].y = loc.y;
      pieces[i].correct = false;
    }
  }

  class Piece {
    constructor(rowIndex, colIndex) {
      this.rowIndex = rowIndex;
      this.colIndex = colIndex;
      this.x = size.x + (size.width * this.colIndex) / size.cols;
      this.y = size.y + (size.height * this.rowIndex) / size.rows;
      this.width = size.width / size.cols;
      this.height = size.height / size.rows;
      this.xCorrect = this.x;
      this.yCorrect = this.y;
      this.correct = true;
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.drawImage(
        video,
        this.colIndex * (video.videoWidth / size.cols),
        this.rowIndex * (video.videoHeight / size.rows),
        video.videoWidth / size.cols,
        video.videoHeight / size.rows,
        this.x,
        this.y,
        this.width,
        this.height
      );

      ctx.rect(this.x, this.y, this.width, this.height);
      ctx.stroke();
    }

    isClose() {
      if (
        distance(
          { x: this.x, y: this.y },
          { x: this.xCorrect, y: this.yCorrect }
        ) <
        this.width / 3
      ) {
        return true;
      }
      return false;
    }

    snap() {
      this.x = this.xCorrect;
      this.y = this.yCorrect;
      this.correct = true;
      pop.play();
    }
  }

  function distance(p1, p2) {
    return Math.sqrt(
      (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y)
    );
  }
  playNote = (key, duration) => {
    let osc = audioCtx.createOscillator();
    let node = audioCtx.createGain();
    node.gain.value = 0.1;
    osc.frequency.value = key;
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration / 1000);
    osc.connect(node);
    osc.type = "triangle";
    node.connect(audioCtx.destination);
    node.gain.setValueAtTime(0, audioCtx.currentTime);
    node.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    node.gain.linearRampToValueAtTime(
      0,
      audioCtx.currentTime + duration / 1000
    );

    setTimeout(() => {
      osc.disconnect();
    }, duration);
  };

  function playMelody() {
    playNote(keys.MI, 300);
    setTimeout(function () {
      playNote(keys.DO, 300);
    }, 300);
    setTimeout(function () {
      playNote(keys.RE, 150);
    }, 450);
    setTimeout(function () {
      playNote(keys.MI, 600);
    }, 600);
  }

  function showEndScreen() {
    const time = Math.floor((end_time - start_time) / 1000);
    document.getElementById("scoreValue").innerHTML = "Score: " + time;
    document.getElementById("endScreen").style.display = "block";
    document.getElementById("saveBtn").innerHTML = "Save";
    document.getElementById("saveBtn").disabled = false;
  }

  showMenu = () => {
    document.getElementById("endScreen").style.display = "none";
    document.getElementById("menuItems").style.display = "block";
  };

  showScores = () => {
    document.getElementById("endScreen").style.display = "none";
    document.getElementById("scoresScreen").style.display = "block";
    document.getElementById("scoresContainer").innerHTML = "Loading...";
    getScores();
  };

  getScores = () => {
    fetch("server.php").then(function (response) {
      response.json().then(function (data) {
        document.getElementById("scoresContainer").innerHTML =
          formatScores(data);
      });
    });
  };

  formatScores = (data) => {
    let html = "<table style='width:100%;text-align:center;'>";

    html += formatScoreTable(data["easy"], "Easy");
    html += formatScoreTable(data["medium"], "Medium");
    html += formatScoreTable(data["hard"], "Hard");
    html += formatScoreTable(data["insane"], "Insane");

    return html;
  };

  formatScoreTable = (data, header) => {
    let html = "<tr style='background:rgb(123,146,196);color:white'>";
    html += "<td></td><td><b>" + header + "</b></td><td><b>Time</b></td></tr>";

    for (let i = 0; i < data.length; i++) {
      html += "<tr>";
      html +=
        "<td>" +
        (i + 1) +
        ".</td><td title='" +
        data[i]["Name"] +
        "'>" +
        data[i]["Name"] +
        "</td><td>" +
        Math.floor(data[i]["Time"] / 1000) +
        "</td></tr>";
    }
    return html;
  };

  closeScores = () => {
    document.getElementById("endScreen").style.display = "block";
    document.getElementById("scoresScreen").style.display = "none";
  };

  saveScore = () => {
    const time = end_time - start_time;
    const name = document.getElementById("name").value;
    if (name == "") {
      alert("Enter your name!");
      return;
    }
    const difficulty = document.getElementById("difficulty").value;

    fetch(
      'server.php?info={"name":"' +
        name +
        '",' +
        '"time":' +
        time +
        "," +
        '"difficulty":"' +
        difficulty +
        '"}'
    ).then(function (response) {
      document.getElementById("saveBtn").innerHTML = "OK!";
    });

    document.getElementById("saveBtn").disabled = true;
  };
}
