let selectedCard = null;

// DOM elements
const gridSize = 5;
const gameBoard = document.getElementById("game-board");
const player1HandElement = document.getElementById("player1-hand");
const player2HandElement = document.getElementById("player2-hand");
const player1UpgradeDeck = document.getElementById("player1-upgrade-deck");
const player2UpgradeDeck = document.getElementById("player2-upgrade-deck");
const player1Graveyard = document.getElementById("player1-graveyard");
const player2Graveyard = document.getElementById("player2-graveyard");
const statusDisplay = document.getElementById("status-display");
const advanceButton = document.getElementById("advance-button");

// Create board tiles
function createGridTiles(container, columns, rows) {
  container.innerHTML = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      container.appendChild(tile);

      // Only hook battlefield tiles (not hand/upgrade decks)
      if (container.id === "game-board") {
        tile.addEventListener("click", async () => {
          if (!selectedCard) return;

          const x = parseInt(tile.dataset.x);
          const y = parseInt(tile.dataset.y);

          const legal =
            (currentPlayer === "player1" && y === 4) ||
            (currentPlayer === "player2" && y === 0);

          if (!legal) {
            tile.classList.add("invalid-placement");
            setTimeout(() => tile.classList.remove("invalid-placement"), 600);
            return;
          }

          const res = await fetch(`${API_BASE}/placecardfromhand`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionid: currentSessionId,
              player: currentPlayer,
              entityid: selectedCard.entityid,
              position: { x, y }
            })
          });

          const data = await res.json();
          if (data.error) {
            console.error("Placement failed:", data.error);
            return;
          }

          selectedCard = null;
          highlightSelectedCard(null);
          document.querySelectorAll(".tile").forEach(t =>
            t.classList.remove("eligible-placement")
          );

          updateConsole(data.console);
          updateGameStatus(data);
          renderHand(data.players[currentPlayer].hand, currentPlayer);
          renderBoard(data.players); // we'll define this next
        });
      }
    }
  }
}


createGridTiles(gameBoard, gridSize, gridSize);
createGridTiles(player1HandElement, 7, 1);
createGridTiles(player2HandElement, 7, 1);
createGridTiles(player1UpgradeDeck, 7, 3);
createGridTiles(player2UpgradeDeck, 7, 3);


const API_BASE = "http://127.0.0.1:8000"; // Change to your Cloud Run URL later

let currentSessionId = null;
let currentPlayer = null;

function updateConsole(messages) {
  const log = document.getElementById("consoleLog");
  if (!messages) return;
  const playerMessages = messages[currentPlayer] || [];
  log.innerHTML = playerMessages.map(m => `<div>${m}</div>`).join("");
}

document.getElementById("startGame").addEventListener("click", async () => {
  const res = await fetch(`${API_BASE}/newmpsession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  currentSessionId = data.sessionid;
  currentPlayer = "player1";

  document.getElementById("playerInfo").textContent =
    `You are player1. Session ID: ${currentSessionId}`;
  updateConsole(data.console);
});

document.getElementById("joinGame").addEventListener("click", async () => {
  const input = document.getElementById("sessionInput").value.trim();

  const res = await fetch(`${API_BASE}/joinsession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionid: input || null }),
  });

  const data = await res.json();

  if (data.error) {
    document.getElementById("playerInfo").textContent = `Error: ${data.error}`;
    return;
  }

  currentSessionId = data.sessionid;

  // Guess player by checking which console section exists
  if (data.console?.player2) {
    currentPlayer = "player2";
  } else {
    currentPlayer = "player1";
  }

  document.getElementById("playerInfo").textContent =
    `You are ${currentPlayer}. Session ID: ${currentSessionId}`;
  updateConsole(data.console);
});

function pollGameState() {
  if (!currentSessionId || !currentPlayer) return;

  fetch(`${API_BASE}/gamestate?sessionid=${currentSessionId}&player=${currentPlayer}`)
    .then(res => res.json())
    .then(data => {
      if (data.console) updateConsole(data.console);
      updateGameStatus(data);
    })
    .catch(err => {
      console.error("Polling error:", err);
    });
}

document.getElementById("draw-player1").addEventListener("click", () => {
  if (currentPlayer !== "player1") return;
  drawfromdeck(currentPlayer);
});

document.getElementById("draw-player2").addEventListener("click", () => {
  if (currentPlayer !== "player2") return;
  drawfromdeck(currentPlayer);
});

async function drawfromdeck(player) {
  if (!currentSessionId || !player) return;

  const res = await fetch(`${API_BASE}/drawfromdeck`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionid: currentSessionId, player: player }),
  });

  const data = await res.json();
  if (!data || data.error) {
    console.error("Draw failed:", data?.error || "Unknown error");
    return;
  }

  updateConsole(data.console);
  renderHand(data.players[player].hand, player);
}


function highlightSelectedCard(entityid) {
  document.querySelectorAll(".card").forEach(el => {
    el.classList.toggle("selected", el.dataset.entityid === entityid);
  });
}

function highlightEligibleTiles() {
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    tile.classList.remove("eligible-placement", "invalid-placement");

    if (!selectedCard) return;

    const y = parseInt(tile.dataset.y);

    const valid =
      (currentPlayer === "player1" && y === 4) ||
      (currentPlayer === "player2" && y === 0);

    if (valid) {
      tile.classList.add("eligible-placement");
    }
  });
}


function renderHand(hand, player) {
  const handContainer = player === "player1" ? player1HandElement : player2HandElement;
  handContainer.innerHTML = "";

  hand.forEach(card => {
    const cardContainer = document.createElement("div");
    cardContainer.classList.add("card");
    cardContainer.dataset.entityid = card.entityid;

    const cardImage = document.createElement("img");
    cardImage.src = card.image;
    cardImage.alt = card.cardtype;

    const info = document.createElement("div");
    info.classList.add("card-info");
    info.textContent = `🏃${card.movement} ⚔️${card.melee} 🏹${card.ranged} 💥${card.blast} 🛡️${card.armor} ❤️${card.health} 🧠${card.courage}`;

    cardContainer.appendChild(cardImage);
    cardContainer.appendChild(info);

    // Selection handler
    cardContainer.addEventListener("click", () => {
      if (currentPlayer !== player) return;
      selectedCard = card;
      highlightSelectedCard(card.entityid);
      highlightEligibleTiles();
    });

    handContainer.appendChild(cardContainer);
  });
}


function updateGameStatus(gamestate) {
  const roundBox = document.getElementById("round-indicator");
  const turnBox = document.getElementById("turn-indicator");
  const stageBox = document.getElementById("stage-indicator");

  // Update round
  roundBox.textContent = `Round: ${gamestate.round}`;

  // Update player turn
  const turnPlayer = gamestate.playerturn;
  turnBox.textContent = `${turnPlayer === "player1" ? "Player 1" : "Player 2"}'s Turn`;
  turnBox.className = `status-box ${turnPlayer === "player1" ? "blue" : "red"}`;

  // Update stage
  const stage = gamestate.stage;
  stageBox.textContent = `Stage: ${stage}`;
  stageBox.className = `status-box stage-${stage}`;

  // Enable or disable the advance button
  if (turnPlayer === currentPlayer && stage !== "waitingroom") {
    advanceButton.classList.remove("disabled");
  } else {
    advanceButton.classList.add("disabled");
  }
}

advanceButton.addEventListener("click", async () => {
  if (!currentSessionId || !currentPlayer || advanceButton.classList.contains("disabled")) return;

  const res = await fetch(`${API_BASE}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionid: currentSessionId })
  });

  const data = await res.json();
  if (data.error) {
    console.error("Advance failed:", data.error);
    return;
  }

  updateConsole(data.console);
  updateGameStatus(data);
});



// Start polling every 3 seconds
setInterval(pollGameState, 3000);