let selectedCard = null;
let selectedEntity = null;
let latestGameState = null;
let selectedAttacker = null;
let selectedTarget = null;
let currentSessionId = null;
let currentPlayer = null;
let pollingInterval = null;
let availablePlanets = {};
let selectedPlanets = new Set();
let homePlanet = null;
let isJoiningPlayer = false;
let currentPlanetIndex = 0;
let planetOrder = [];
let currentDisplayedPlanet = null;
let lastPlanetFeatures = {};
let planetNavigationInitialized = false;

// DOM elements for start screen
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startGameBtn = document.getElementById("startGame");
const joinGameBtn = document.getElementById("joinGameBtn");
const settingsBtn = document.getElementById("settingsBtn");
const joinDialog = document.getElementById("join-dialog");
const sessionInput = document.getElementById("sessionInput");
const joinGameSubmitBtn = document.getElementById("joinGame");
const cancelJoinBtn = document.getElementById("cancelJoin");
const startConsoleLog = document.getElementById("startConsoleLog");

// DOM elements for planet selection
const planetSelectionScreen = document.getElementById("planet-selection-screen");
const planetsContainer = document.getElementById("planets-container");
const startSessionBtn = document.getElementById("startSessionBtn");
const backToMainBtn = document.getElementById("backToMainBtn");
const selectedCountSpan = document.getElementById("selected-count");
const homePlanetNameSpan = document.getElementById("home-planet-name");

// DOM elements
const gameBoard = document.getElementById("game-board");
const player1HandElement = document.getElementById("player1-hand");
const player2HandElement = document.getElementById("player2-hand");
const player1UpgradeDeck = document.getElementById("player1-upgrade-deck");
const player2UpgradeDeck = document.getElementById("player2-upgrade-deck");
const player1Graveyard = document.getElementById("player1-graveyard");
const player2Graveyard = document.getElementById("player2-graveyard");
const statusDisplay = document.getElementById("status-display");
const advanceButton = document.getElementById("advance-button");
const API_BASE = "https://card-battler-server-386329199229.europe-central2.run.app"; // Change to your Cloud Run URL later

document.getElementById("startGame").addEventListener("click", async () => {
  isJoiningPlayer = false;
  try {
    const res = await fetch(`${API_BASE}/getplanets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsession: true })
    });

    const data = await res.json();
    
    if (data.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error: ${data.error}</div>`;
      return;
    }

    availablePlanets = data.planets;
    showPlanetSelectionScreen();
  } catch (error) {
    console.error("Failed to fetch planets:", error);
    startConsoleLog.innerHTML += `<div class="error-message">Failed to load planets</div>`;
  }
});

// Various functions for the planet selection screen
function showPlanetSelectionScreen() {
  startScreen.classList.add("hidden");
  planetSelectionScreen.classList.remove("hidden");
  renderPlanets();
}

function renderPlanets() {
  planetsContainer.innerHTML = "";
  
  Object.entries(availablePlanets).forEach(([planetName, planetData]) => {
    const planetCard = document.createElement("div");
    planetCard.className = "planet-card";
    planetCard.dataset.planetName = planetName;
    
    planetCard.innerHTML = `
      <img src="${planetData.background_image}" alt="${planetName}" class="planet-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
      <div class="planet-overlay">
        <div class="planet-name">${planetName}</div>
        <div class="planet-info">${planetData.width}×${planetData.height}</div>
      </div>
      <div class="planet-controls">
        <button class="home-planet-btn" title="Set as Home Planet">🏠</button>
      </div>
    `;
    
    // Planet selection
    planetCard.addEventListener("click", (e) => {
      if (e.target.classList.contains("home-planet-btn")) return;
      togglePlanetSelection(planetName);
    });
    
    // Home planet selection
    planetCard.querySelector(".home-planet-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      setHomePlanet(planetName);
    });
    
    planetsContainer.appendChild(planetCard);
  });
}

function togglePlanetSelection(planetName) {
  const planetCard = document.querySelector(`[data-planet-name="${planetName}"]`);
  
  if (selectedPlanets.has(planetName)) {
    selectedPlanets.delete(planetName);
    planetCard.classList.remove("selected");
    
    // If this was the home planet, clear it
    if (homePlanet === planetName) {
      homePlanet = null;
      planetCard.classList.remove("home-planet");
      updateSelectionStatus();
    }
  } else {
    selectedPlanets.add(planetName);
    planetCard.classList.add("selected");
  }
  
  updateSelectionStatus();
}

function setHomePlanet(planetName) {
  // First ensure the planet is selected
  if (!selectedPlanets.has(planetName)) {
    togglePlanetSelection(planetName);
  }
  
  // Clear previous home planet
  if (homePlanet) {
    const oldHomeCard = document.querySelector(`[data-planet-name="${homePlanet}"]`);
    if (oldHomeCard) oldHomeCard.classList.remove("home-planet");
  }
  
  // Set new home planet
  homePlanet = planetName;
  const planetCard = document.querySelector(`[data-planet-name="${planetName}"]`);
  planetCard.classList.add("home-planet");
  
  updateSelectionStatus();
}

function updateSelectionStatus() {
  selectedCountSpan.textContent = selectedPlanets.size;
  homePlanetNameSpan.textContent = homePlanet || "None";
  
  // Enable/disable start button
  const canStart = selectedPlanets.size >= 2 && homePlanet;
  if (canStart) {
    startSessionBtn.classList.remove("disabled");
  } else {
    startSessionBtn.classList.add("disabled");
  }
}

// Back button
backToMainBtn.addEventListener("click", () => {
  planetSelectionScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  
  // Reset selections
  selectedPlanets.clear();
  homePlanet = null;
  availablePlanets = {};
  isJoiningPlayer = false;  // Add this line
});

// Start session button - now handles both starting and joining
startSessionBtn.addEventListener("click", async () => {
  if (startSessionBtn.classList.contains("disabled")) return;
  
  try {
    let res, data;
    
    // Determine if we're starting a new session or joining an existing one
    if (isJoiningPlayer) {
      // Joining an existing session
      res = await fetch(`${API_BASE}/joinsession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionid: currentSessionId,
          home_planet: homePlanet
        })
      });
    } else {
      // Starting a new session (existing logic)
      res = await fetch(`${API_BASE}/newmpsession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_planet: homePlanet,
          planets_to_play_with: Array.from(selectedPlanets)
        })
      });
    }

    data = await res.json();
    
    if (data.error) {
      alert(`Error ${currentSessionId ? 'joining' : 'creating'} session: ` + data.error);
      return;
    }
    
    currentSessionId = data.sessionid;

    if (!isJoiningPlayer) {
      // New session created
      currentPlayer = "player1";
    } else {
      // Joined existing session
      currentPlayer = "player2";
    }

    // Update console if available
    if (data.console?.[currentPlayer]) {
      const messages = data.console[currentPlayer];
      startConsoleLog.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
    }

    document.getElementById("playerInfo").textContent =
      `You are ${currentPlayer}. Session ID: ${currentSessionId}`;
    
    // Handle screen transitions
    if (isJoiningPlayer) {
      // Joining players always go to game screen after successful join
      switchToGameScreen();
    } else if (currentPlayer === "player1" && data.players?.player2) {
      // Starting player goes to game when player2 exists
      switchToGameScreen();
    } else {
      // Starting player waiting for player2
      planetSelectionScreen.classList.add("hidden");
      startScreen.classList.remove("hidden");
    }
    
    updateGameStateAndRender(data);
    setupPolling();
    
  } catch (error) {
    console.error(`Failed to ${currentSessionId ? 'join' : 'create'} session:`, error);
    alert(`Failed to ${currentSessionId ? 'join' : 'create'} session`);
  }
});


// Event listener for Join Game button on start screen
joinGameBtn.addEventListener("click", () => {
  isJoiningPlayer = true;  // Add this line
  joinDialog.classList.remove("hidden");
});

// Cancel Join Game
cancelJoinBtn.addEventListener("click", () => {
  joinDialog.classList.add("hidden");
  isJoiningPlayer = false;  // Add this line
});
// Modified join game functionality - now fetches planets first
document.getElementById("joinGame").addEventListener("click", async () => {
  const input = document.getElementById("sessionInput").value.trim();

  try {
    const res = await fetch(`${API_BASE}/getplanets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        startsession: false,
        sessionid: input || null
      })
    });

    const data = await res.json();
    
    if (data.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error: ${data.error}</div>`;
      return;
    }

    // Store the session ID from input for later use
    currentSessionId = input || null;
    availablePlanets = data.planets;
    const takenHomePlanets = data.home_planets_taken || [];
    
    // Show planet selection screen for joining player
    showJoiningPlayerPlanetSelection(takenHomePlanets);
    
    // Hide join dialog
    joinDialog.classList.add("hidden");
    
  } catch (error) {
    console.error("Failed to fetch planets for joining:", error);
    startConsoleLog.innerHTML += `<div class="error-message">Failed to load planets</div>`;
  }
});

// Various functions for the planet selection screen for the joining player
function showJoiningPlayerPlanetSelection(takenHomePlanets) {
  startScreen.classList.add("hidden");
  planetSelectionScreen.classList.remove("hidden");
  
  // Clear previous selections
  selectedPlanets.clear();
  homePlanet = null;
  
  // Mark all available planets as selected (joining player can't change this)
  Object.keys(availablePlanets).forEach(planetName => {
    selectedPlanets.add(planetName);
  });
  
  renderJoiningPlayerPlanets(takenHomePlanets);
  updateJoiningPlayerSelectionStatus();
}

function renderJoiningPlayerPlanets(takenHomePlanets) {
  planetsContainer.innerHTML = "";
  
  Object.entries(availablePlanets).forEach(([planetName, planetData]) => {
    const planetCard = document.createElement("div");
    planetCard.className = "planet-card selected"; // Always selected for joining player
    planetCard.dataset.planetName = planetName;
    
    const isTaken = takenHomePlanets.includes(planetName);
    
    planetCard.innerHTML = `
      <img src="${planetData.background_image}" alt="${planetName}" class="planet-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
      <div class="planet-overlay">
        <div class="planet-name">${planetName}</div>
        <div class="planet-info">${planetData.width}×${planetData.height}</div>
        ${isTaken ? '<div class="taken-indicator">TAKEN</div>' : ''}
      </div>
      <div class="planet-controls">
        <button class="home-planet-btn ${isTaken ? 'disabled' : ''}" title="${isTaken ? 'Already taken' : 'Set as Home Planet'}" ${isTaken ? 'disabled' : ''}>🏠</button>
      </div>
    `;
    
    // Home planet selection (only for non-taken planets)
    if (!isTaken) {
      planetCard.querySelector(".home-planet-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        setJoiningPlayerHomePlanet(planetName);
      });
    }
    
    planetsContainer.appendChild(planetCard);
  });
}

function setJoiningPlayerHomePlanet(planetName) {
  // Clear previous home planet
  if (homePlanet) {
    const oldHomeCard = document.querySelector(`[data-planet-name="${homePlanet}"]`);
    if (oldHomeCard) oldHomeCard.classList.remove("home-planet");
  }
  
  // Set new home planet
  homePlanet = planetName;
  const planetCard = document.querySelector(`[data-planet-name="${planetName}"]`);
  planetCard.classList.add("home-planet");
  
  updateJoiningPlayerSelectionStatus();
}

function updateJoiningPlayerSelectionStatus() {
  selectedCountSpan.textContent = selectedPlanets.size;
  homePlanetNameSpan.textContent = homePlanet || "None";
  
  // Enable/disable join button - only need home planet selection
  const canJoin = homePlanet !== null;
  if (canJoin) {
    startSessionBtn.classList.remove("disabled");
  } else {
    startSessionBtn.classList.add("disabled");
  }
}

// Function to switch from start screen to game screen
function switchToGameScreen() {
  startScreen.classList.add("hidden");
  planetSelectionScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  
  // Force the body/document to recalculate widths
  document.body.style.width = '100%';
  document.body.style.maxWidth = 'none';
  
  // Force layout recalculation
  requestAnimationFrame(() => {
    // Trigger reflow
    gameScreen.offsetWidth;
    
    // Dispatch resize event to trigger any responsive calculations
    window.dispatchEvent(new Event('resize'));
    
    // Re-render current state with proper sizing
    if (latestGameState) {
      updateGameStateAndRender(latestGameState);
    }
  });

  if (latestGameState) {
    initializePlanetNavigation();
  }
}







// Function to calculate planet order based on current player
function calculatePlanetOrder() {
  if (!latestGameState || !latestGameState.planets || !currentPlayer) {
    return [];
  }
  
  const allPlanets = Object.keys(latestGameState.planets);
  const currentPlayerHomePlanet = latestGameState.players[currentPlayer]?.home_planet;
  
  // Get enemy home planets
  const enemyHomePlanets = [];
  Object.keys(latestGameState.players).forEach(playerKey => {
    if (playerKey !== currentPlayer) {
      const enemyHome = latestGameState.players[playerKey]?.home_planet;
      if (enemyHome) {
        enemyHomePlanets.push(enemyHome);
      }
    }
  });
  
  // Sort enemy home planets alphabetically
  enemyHomePlanets.sort();
  
  // Get other planets (not home planets)
  const homePlanets = new Set([currentPlayerHomePlanet, ...enemyHomePlanets]);
  const otherPlanets = allPlanets.filter(planet => !homePlanets.has(planet));
  otherPlanets.sort(); // Sort alphabetically
  
  // Build the order: current player home -> other planets -> enemy home planets
  const order = [];
  
  if (currentPlayerHomePlanet) {
    order.push(currentPlayerHomePlanet);
  }
  
  order.push(...otherPlanets);
  order.push(...enemyHomePlanets);
  
  return order;
}

// Function to update planet display
function updatePlanetDisplay() {
  if (planetOrder.length === 0) {
    return;
  }
  
  const planetName = planetOrder[currentPlanetIndex];
  currentDisplayedPlanet = planetName;
  
  // Update planet name display
  const planetNameElement = document.getElementById("current-planet-name");
  if (planetNameElement) {
    planetNameElement.textContent = planetName;
    
    // Remove previous classes
    planetNameElement.classList.remove("home-planet", "enemy-home");
    
    // Add appropriate class
    const currentPlayerHome = latestGameState.players[currentPlayer]?.home_planet;
    if (planetName === currentPlayerHome) {
      planetNameElement.classList.add("home-planet");
    } else {
      // Check if it's an enemy home planet
      const isEnemyHome = Object.keys(latestGameState.players).some(playerKey => {
        return playerKey !== currentPlayer && 
               latestGameState.players[playerKey]?.home_planet === planetName;
      });
      
      if (isEnemyHome) {
        planetNameElement.classList.add("enemy-home");
      }
    }
  }
  
  // Update the game board to show this planet's layout
  updateGameBoardForPlanet(planetName);
}

// Function to update game board for a specific planet
function updateGameBoardForPlanet(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    console.error("Planet not found:", planetName);
    return;
  }
  
  const planet = latestGameState.planets[planetName];
  const boardWidth = planet.width;
  const boardHeight = planet.height;
  
  // Clear and recreate the board with planet-specific dimensions
  createGridTiles(gameBoard, boardWidth, boardHeight, planetName); // Pass planetName
  
  // Re-render the current game state on this planet
  if (latestGameState.players) {
    renderBoardForPlanet(latestGameState.players, planetName);
  }
}

// Modified version of renderBoard that only shows entities on the specified planet
function renderBoardForPlanet(players, planetName) {
  // First, clear all tiles but preserve feature icons
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    // Remove cards but keep feature icons
    const cards = tile.querySelectorAll('.card');
    cards.forEach(card => card.remove());
    
    // Reset tile classes except base 'tile' class
    const classList = Array.from(tile.classList);
    classList.forEach(cls => {
      if (cls !== 'tile') {
        tile.classList.remove(cls);
      }
    });
  });

  // Render cards on board for this planet only
  ["player1", "player2"].forEach(player => {
    if (!players[player]?.cardsonboard) return;
    
    players[player].cardsonboard.forEach(card => {
      // Only render cards that belong to this planet
      if (card.planet !== planetName) {
        return;
      }
      
      const { x, y } = card.position;
      const tile = document.querySelector(`#game-board .tile[data-x='${x}'][data-y='${y}'][data-planet='${planetName}']`);

      if (tile) {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card", "card-on-board");

        const img = document.createElement("img");
        img.src = card.image;
        img.alt = card.cardtype;

        const info = document.createElement("div");
        info.classList.add("card-info");
        info.textContent = `🏃${card.movement} ⚔️${card.melee} 🏹${card.ranged} 💥${card.blast} 🛡️${card.armor} ❤️${card.health} 🧠${card.courage}`;

        cardElement.appendChild(img);
        cardElement.appendChild(info);

        if (card.sick_this_turn) {
          const sickOverlay = document.createElement("div");
          sickOverlay.classList.add("sick-overlay");
          sickOverlay.innerHTML = "🌀";
          cardElement.appendChild(sickOverlay);
        }

        cardElement.dataset.entityid = card.entityid;
        cardElement.dataset.owner = card.owner;
        cardElement.dataset.planet = card.planet;

        tile.appendChild(cardElement);

        // Update feature icons to small size when card is present
        const featureContainer = tile.querySelector('.feature-icons-large');
        if (featureContainer) {
          featureContainer.className = 'feature-icons-small';
        }

        // Add interaction handlers (same as before)
        if (card.owner === currentPlayer) {
          cardElement.style.cursor = "pointer";

          if (latestGameState.stage === "movement" && !card.moved_this_turn) {
            cardElement.classList.add("selectabletomove");
          }

          if (latestGameState.stage === "prebattle" && !card.has_attacked_this_stage) {
            cardElement.classList.add("selectabletoattack");
          }

          cardElement.addEventListener("click", (e) => {
            e.stopPropagation();
            
            if (latestGameState.stage === "movement") {
              if (card.moved_this_turn) return;
              selectedEntity = card;
              highlightSelectedCard(card.entityid);
              highlightMovementTiles(card);
            }

            if (latestGameState.stage === "prebattle") {
              if (card.owner !== currentPlayer || card.has_attacked_this_stage) return;
              selectedAttacker = card;
              highlightSelectedCard(card.entityid);
            }
          });
        }
      }
    });
  });
  
  // Reset feature icons to large size for empty tiles
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    const hasCard = tile.querySelector('.card');
    const featureContainer = tile.querySelector('.feature-icons-large, .feature-icons-small');
    
    if (featureContainer && !hasCard) {
      featureContainer.className = 'feature-icons-large';
    }
  });
  
  // Re-attach placement listeners for card placement phase
  if (latestGameState.stage === "cardplacement") {
    document.querySelectorAll("#game-board .tile").forEach(tile => {
      attachPlacementListener(tile);
    });
  }
}

// Function to cycle planets
function cyclePlanet(direction) {
  if (planetOrder.length === 0) {
    return;
  }
  
  if (direction === 'left') {
    currentPlanetIndex = (currentPlanetIndex - 1 + planetOrder.length) % planetOrder.length;
  } else if (direction === 'right') {
    currentPlanetIndex = (currentPlanetIndex + 1) % planetOrder.length;
  }
  
  updatePlanetDisplay();
}

// Function to initialize planet navigation
function initializePlanetNavigation() {
  if (!latestGameState || !currentPlayer) {
    return;
  }
  
  const newPlanetOrder = calculatePlanetOrder();
  const currentlyDisplayedPlanet = currentDisplayedPlanet;
  
  // Only reset if the planet order has actually changed
  const orderChanged = JSON.stringify(planetOrder) !== JSON.stringify(newPlanetOrder);
  
  planetOrder = newPlanetOrder;
  
  // If this is the first initialization or the order changed, reset to home planet
  if (!currentlyDisplayedPlanet || orderChanged) {
    currentPlanetIndex = 0;
  } else {
    // Try to preserve the currently displayed planet
    const preservedIndex = planetOrder.indexOf(currentlyDisplayedPlanet);
    if (preservedIndex !== -1) {
      currentPlanetIndex = preservedIndex;
    } else {
      // If the current planet is no longer available, go to home planet
      currentPlanetIndex = 0;
    }
  }
  
  // Enable/disable arrows based on whether there are multiple planets
  const leftArrow = document.getElementById("planet-left-arrow");
  const rightArrow = document.getElementById("planet-right-arrow");
  
  if (planetOrder.length <= 1) {
    leftArrow.disabled = true;
    rightArrow.disabled = true;
  } else {
    leftArrow.disabled = false;
    rightArrow.disabled = false;
  }
  
  updatePlanetDisplay();
}










// Create board tiles
function createGridTiles(container, columns, rows, planetName = null) {
  container.innerHTML = "";
  
  // Update CSS grid template to match the dimensions
  container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      
      // Store planet information on the tile
      if (planetName) {
        tile.dataset.planet = planetName;
        
        // Add feature icons if this is a game board tile
        if (container.id === "game-board") {
          const features = getPlanetFeatures(planetName, x, y);
          if (features.length > 0) {
            const iconsContainer = createFeatureIcons(features, false);
            tile.appendChild(iconsContainer);
          }
        }
      }
      
      container.appendChild(tile);

      // Only hook battlefield tiles (not hand/upgrade decks)
      if (container.id === "game-board") {
        attachPlacementListener(tile);
      }
    }
  }
}


// Get deployment zones for a planet
function getDeploymentZones(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return [];
  }
  return latestGameState.planets[planetName].deployment_zones || [];
}

// Get landing zones for a planet
function getLandingZones(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return [];
  }
  return latestGameState.planets[planetName].landing_zones || [];
}

// Check if a position is valid for placement
function isValidPlacementPosition(planetName, x, y, player) {
  if (!latestGameState || !latestGameState.players[player]) {
    return { valid: false, reason: "Game state not available" };
  }

  const playerHome = latestGameState.players[player].home_planet;
  const isHomePlanet = (planetName === playerHome);
  
  const deploymentZones = getDeploymentZones(planetName);
  const landingZones = getLandingZones(planetName);
  
  // Check if position is in deployment zones
  const isInDeployment = deploymentZones.some(zone => zone.x === x && zone.y === y);
  
  // Check if position is in landing zones
  const isInLanding = landingZones.some(zone => zone.x === x && zone.y === y);
  
  if (isHomePlanet) {
    // On home planet: only deployment zones allowed
    if (isInDeployment) {
      return { valid: true, reason: "Valid deployment zone on home planet" };
    } else {
      return { valid: false, reason: "On your home planet, you can only place cards in deployment zones" };
    }
  } else {
    // On non-home planet: only landing zones allowed
    if (isInLanding) {
      return { valid: true, reason: "Valid landing zone on non-home planet" };
    } else if (isInDeployment) {
      return { valid: false, reason: "Deployment zones are only for the home planet owner" };
    } else {
      return { valid: false, reason: "You can only place cards in landing zones on non-home planets" };
    }
  }
}


// Modified attachPlacementListener function
function attachPlacementListener(tile) {
  const newTile = tile.cloneNode(false);
  while (tile.firstChild) {
    newTile.appendChild(tile.firstChild);
  }
  tile.replaceWith(newTile);
  
  newTile.addEventListener("click", async (e) => {
    if (e.target.closest('.card')) return;
    
    if (!selectedCard) return;
    if (!latestGameState || latestGameState.stage !== "cardplacement") return;

    const x = parseInt(newTile.dataset.x);
    const y = parseInt(newTile.dataset.y);
    const tilePlanet = newTile.dataset.planet;

    if (!tilePlanet) {
      console.error("No planet information found on tile");
      return;
    }

    // Use new deployment/landing zone validation
    const validation = isValidPlacementPosition(tilePlanet, x, y, currentPlayer);
    
    if (!validation.valid) {
      newTile.classList.add("invalid-placement");
      setTimeout(() => newTile.classList.remove("invalid-placement"), 600);
      console.log("Invalid placement:", validation.reason);
      return;
    }

    const res = await fetch(`${API_BASE}/placecardfromhand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        entityid: selectedCard.entityid,
        position: { x, y },
        planet: tilePlanet
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

    updateGameStateAndRender(data);
  });
}

createGridTiles(gameBoard, 5, 5)
createGridTiles(player1UpgradeDeck, 5, 3);
createGridTiles(player2UpgradeDeck, 5, 3);

function findCardById(list, id) {
  return list.find(c => c.entityid === id);
}

function updateConsole(messages) {
  if (!messages) return;
  
  const gameLog = document.getElementById("consoleLog");
  const startLog = document.getElementById("startConsoleLog");
  
  const playerMessages = messages[currentPlayer] || [];
  
  // Update the appropriate console based on which screen is active
  if (gameScreen.classList.contains("hidden")) {
    startLog.innerHTML = playerMessages.map(m => `<div>${m}</div>`).join("");
  } else {
    gameLog.innerHTML = playerMessages.map(m => `<div>${m}</div>`).join("");
  }
}

// Core function to setup polling based on active player
function setupPolling() {
  // Clear any existing polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  // Check if we're in the waiting room stage
  const isWaitingRoom = latestGameState && latestGameState.stage === "waitingroom";
  
  // Set up polling if:
  // 1. We're in the waiting room stage (regardless of active player), OR
  // 2. We're not the active player (existing behavior)
  if (isWaitingRoom || !latestGameState || latestGameState.playerturn !== currentPlayer) {
    pollingInterval = setInterval(pollGameState, 3000);
    console.log(`Setting up polling: ${isWaitingRoom ? "waiting room" : "inactive player"}`);
  } else {
    console.log("No polling for active player in gameplay stage");
  }
}

// Function to poll game state - now it also checks for player2 joining
async function pollGameState() {
  if (!currentSessionId || !currentPlayer) return;

  try {
    const res = await fetch(`${API_BASE}/gamestate?sessionid=${currentSessionId}&player=${currentPlayer}`);
    const data = await res.json();
    
    if (data.error) {
      console.error("Poll error:", data.error);
      return;
    }
    
    // Check if player2 has joined (for player1 in waiting room)
    if (currentPlayer === "player1" && 
        startScreen.classList.contains("hidden") === false &&
        data.players && data.players.player2) {
      // Player 2 has joined, switch to game screen
      switchToGameScreen();
    }
    
    // Compare with latest state to see if we need to update anything
    updateGameStateAndRender(data);
    
    // If the turn has changed, adjust polling accordingly
    if (latestGameState && 
        latestGameState.playerturn !== data.playerturn) {
      setupPolling();
    }
  } catch (err) {
    console.error("Polling error:", err);
  }
}

// Function to handle game state updates more intelligently
function updateGameStateAndRender(newState) {
  if (!newState) return;
  
  // Update console log messages if changed
  if (newState.console) {
    updateConsole(newState.console);
  }

  // Store the old board state to detect health changes
  const oldBoardState = latestGameState ? {
    player1: latestGameState.players.player1?.cardsonboard || [],
    player2: latestGameState.players.player2?.cardsonboard || []
  } : { player1: [], player2: [] };

  // Check if planet features have changed for the current displayed planet
  const featuresChanged = currentDisplayedPlanet ? havePlanetFeaturesChanged(currentDisplayedPlanet) : false;

  // Determine what needs updating by comparing with previous state
  const handChanged = didHandChange(latestGameState, newState);
  const boardChanged = didBoardChange(latestGameState, newState) || featuresChanged;
  const statusChanged = didStatusChange(latestGameState, newState);
  const graveyardChanged = didGraveyardChange(latestGameState, newState);
  const gameOverChanged = latestGameState?.gameover !== newState.gameover;
  
  // Update latestGameState after comparison but before rendering
  latestGameState = newState;
  
  // Only update what's changed
  if (statusChanged) {
    updateGameStatus(newState);
  }
  
  if (handChanged) {
    renderHand(newState.players[currentPlayer].hand, currentPlayer);
  }
  
  if (boardChanged) {
    if (featuresChanged && currentDisplayedPlanet) {
      // If features changed, recreate the entire board for the current planet
      updateGameBoardForPlanet(currentDisplayedPlanet);
    } else {
      // Normal board update
      renderBoard(newState.players);
    }
    
    // After rendering the board, check for health changes and apply damage animations
    animateDamagedCards(oldBoardState, newState.players);
  }
  
  // Update graveyards if changed
  if (graveyardChanged) {
    ["player1", "player2"].forEach(player => {
      if (newState.players[player]?.graveyard) {
        renderGraveyard(newState.players[player].graveyard, player);
      }
    });
  }
  
  // Check for game over status
  if (newState.gameover === true) {
    displayGameOverMessage(newState);
    advanceButton.classList.add("disabled");
  } else if (gameOverChanged) {
    hideGameOverMessage();
  }
  
  // Restore selections and highlights if necessary
  if (selectedCard) {
    highlightSelectedCard(selectedCard.entityid);
    highlightEligibleTiles();
  }
  
  if (selectedEntity) {
    highlightSelectedCard(selectedEntity.entityid);
    
    if (latestGameState.stage === "movement" && !selectedEntity.moved_this_turn) {
      highlightMovementTiles(selectedEntity);
    }
  }
  
  // Initialize planet navigation if needed
  if (newState && currentPlayer && !planetNavigationInitialized) {
    initializePlanetNavigation();
    planetNavigationInitialized = true;
  } else if (newState && currentPlayer && planetNavigationInitialized) {
    updatePlanetDisplay();
  }
}

// Helper functions to determine what's changed in the game state
function didHandChange(oldState, newState) {
  if (!oldState) return true;
  
  const oldHand = oldState.players[currentPlayer]?.hand || [];
  const newHand = newState.players[currentPlayer]?.hand || [];
  
  if (oldHand.length !== newHand.length) return true;
  
  // Simple check - just compare entity IDs
  const oldIds = oldHand.map(card => card.entityid).sort();
  const newIds = newHand.map(card => card.entityid).sort();
  
  return !oldIds.every((id, index) => id === newIds[index]);
}

function didBoardChange(oldState, newState) {
  if (!oldState) return true;
  
  const oldBoard = {
    player1: oldState.players.player1?.cardsonboard || [],
    player2: oldState.players.player2?.cardsonboard || []
  };
  
  const newBoard = {
    player1: newState.players.player1?.cardsonboard || [],
    player2: newState.players.player2?.cardsonboard || []
  };
  
  // Check if number of cards changed
  if (oldBoard.player1.length !== newBoard.player1.length ||
      oldBoard.player2.length !== newBoard.player2.length) {
    return true;
  }
  
  // Check if any card moved or changed stats
  for (const player of ['player1', 'player2']) {
    for (const oldCard of oldBoard[player]) {
      const newCard = newBoard[player].find(c => c.entityid === oldCard.entityid);
      
      // Card was removed
      if (!newCard) return true;
      
      // Check position changed
      if (oldCard.position.x !== newCard.position.x || 
          oldCard.position.y !== newCard.position.y) {
        return true;
      }
      
      // Check if stats changed
      if (oldCard.health !== newCard.health || 
          oldCard.armor !== newCard.armor || 
          oldCard.moved_this_turn !== newCard.moved_this_turn ||
          oldCard.sick_this_turn !== newCard.sick_this_turn ||
          oldCard.has_attacked_this_stage !== newCard.has_attacked_this_stage) {
        return true;
      }
      
      // Check if attack targets changed
      if (JSON.stringify(oldCard.valid_target_melee) !== JSON.stringify(newCard.valid_target_melee) ||
          JSON.stringify(oldCard.valid_target_ranged) !== JSON.stringify(newCard.valid_target_ranged) ||
          JSON.stringify(oldCard.valid_target_blast) !== JSON.stringify(newCard.valid_target_blast)) {
        return true;
      }
    }
  }
  
  return false;
}

function didStatusChange(oldState, newState) {
  if (!oldState) return true;
  
  // Basic state changes that are always relevant
  const basicStateChanged = oldState.round !== newState.round || 
                            oldState.playerturn !== newState.playerturn ||
                            oldState.gameover !== newState.gameover ||
                            oldState.winner !== newState.winner || 
                            oldState.stage !== newState.stage;

  
  // If we're in waiting room, only check basic state changes
  if (newState.stage === "waitingroom") {
    return basicStateChanged;
  }
  
  // In other stages, check player health and armor as well
  // First check if player1 properties changed
  const player1Changed = oldState.players.player1?.health !== newState.players.player1?.health ||
                         oldState.players.player1?.armor !== newState.players.player1?.armor;
  
  // Then check player2 properties if player2 exists in both states
  const player2Exists = oldState.players.player2 && newState.players.player2;
  const player2Changed = player2Exists && (
                         oldState.players.player2.health !== newState.players.player2.health ||
                         oldState.players.player2.armor !== newState.players.player2.armor);
  
  return basicStateChanged || player1Changed || player2Changed;
}

// Function to check if graveyards have changed
function didGraveyardChange(oldState, newState) {
  if (!oldState) return true;
  
  // Check player1 graveyard
  const oldGraveyard1 = oldState.players.player1?.graveyard || [];
  const newGraveyard1 = newState.players.player1?.graveyard || [];
  
  // Check player2 graveyard
  const oldGraveyard2 = oldState.players.player2?.graveyard || [];
  const newGraveyard2 = newState.players.player2?.graveyard || [];
  
  // Compare length first (quick check)
  if (oldGraveyard1.length !== newGraveyard1.length || 
      oldGraveyard2.length !== newGraveyard2.length) {
    return true;
  }
  
  // Compare entity IDs (more efficient than comparing entire objects)
  const oldIds1 = oldGraveyard1.map(entity => entity.entityid).sort();
  const newIds1 = newGraveyard1.map(entity => entity.entityid).sort();
  const oldIds2 = oldGraveyard2.map(entity => entity.entityid).sort();
  const newIds2 = newGraveyard2.map(entity => entity.entityid).sort();
  
  // Check if any element differs
  for (let i = 0; i < oldIds1.length; i++) {
    if (oldIds1[i] !== newIds1[i]) return true;
  }
  
  for (let i = 0; i < oldIds2.length; i++) {
    if (oldIds2[i] !== newIds2[i]) return true;
  }
  
  return false;
}


// Helper function to get feature icons for a position
function getPlanetFeatures(planetName, x, y) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return [];
  }
  
  const planet = latestGameState.planets[planetName];
  const features = [];
  
  // Check each feature type
  if (planet.mines && planet.mines.some(f => f.x === x && f.y === y)) {
    features.push('mine');
  }
  if (planet.ruined_mines && planet.ruined_mines.some(f => f.x === x && f.y === y)) {
    features.push('ruined_mine');
  }
  if (planet.oil_wells && planet.oil_wells.some(f => f.x === x && f.y === y)) {
    features.push('oil_well');
  }
  if (planet.refineries && planet.refineries.some(f => f.x === x && f.y === y)) {
    features.push('refinery');
  }
  if (planet.cities && planet.cities.some(f => f.x === x && f.y === y)) {
    features.push('city');
  }
  if (planet.ruined_cities && planet.ruined_cities.some(f => f.x === x && f.y === y)) {
    features.push('ruined_city');
  }
  if (planet.fortresses && planet.fortresses.some(f => f.x === x && f.y === y)) {
    features.push('fortress');
  }
  if (planet.craters && planet.craters.some(f => f.x === x && f.y === y)) {
    features.push('crater');
  }
  
  return features;
}

// Helper function to create feature icons
function createFeatureIcons(features, hasCard = false) {
  const iconsContainer = document.createElement('div');
  iconsContainer.className = hasCard ? 'feature-icons-small' : 'feature-icons-large';
  
  features.forEach((feature, index) => {
    const icon = document.createElement('img');
    icon.src = `Icons/${feature}.png`;
    icon.alt = feature;
    icon.className = 'feature-icon';
    icon.style.zIndex = 10 + index; // Stack icons properly
    
    // Handle missing images gracefully
    icon.onerror = function() {
      console.warn(`Feature icon not found: Icons/${feature}.png`);
      this.style.display = 'none';
    };
    
    iconsContainer.appendChild(icon);
  });
  
  return iconsContainer;
}

// Helper function to check if planet features have changed
function havePlanetFeaturesChanged(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return false;
  }
  
  const planet = latestGameState.planets[planetName];
  const currentFeatures = {
    mines: planet.mines || [],
    ruined_mines: planet.ruined_mines || [],
    oil_wells: planet.oil_wells || [],
    refineries: planet.refineries || [],
    cities: planet.cities || [],
    ruined_cities: planet.ruined_cities || [],
    fortresses: planet.fortresses || [],
    craters: planet.craters || []
  };
  
  const lastFeatures = lastPlanetFeatures[planetName];
  if (!lastFeatures) {
    lastPlanetFeatures[planetName] = JSON.parse(JSON.stringify(currentFeatures));
    return true;
  }
  
  // Deep comparison
  const changed = JSON.stringify(currentFeatures) !== JSON.stringify(lastFeatures);
  if (changed) {
    lastPlanetFeatures[planetName] = JSON.parse(JSON.stringify(currentFeatures));
  }
  
  return changed;
}

// Function to render graveyard for a player
function renderGraveyard(graveyardEntities, player) {
  const graveyardContainer = player === "player1" ? player1Graveyard : player2Graveyard;
  
  // Clear the current graveyard display
  graveyardContainer.innerHTML = "";
  
  // If there are no cards in the graveyard, display a placeholder
  if (!graveyardEntities || graveyardEntities.length === 0) {
    const emptyText = document.createElement("div");
    emptyText.className = "empty-graveyard";
    emptyText.textContent = "Empty";
    graveyardContainer.appendChild(emptyText);
    return;
  }
  
  // Group entities by cardtype for stacking
  const cardTypeGroups = {};
  graveyardEntities.forEach(entity => {
    const cardType = entity.cardtype;
    if (!cardTypeGroups[cardType]) {
      cardTypeGroups[cardType] = [];
    }
    cardTypeGroups[cardType].push(entity);
  });
  
  // Create a card element for each unique card type
  let index = 0;
  Object.entries(cardTypeGroups).forEach(([cardType, entities]) => {
    const cardContainer = document.createElement("div");
    cardContainer.classList.add("graveyard-card");
    cardContainer.dataset.cardtype = cardType;
    cardContainer.dataset.entityid = entities[0].entityid; // Store the first entity ID for reference
    
    // If there are multiple of the same card type, add a count badge
    if (entities.length > 1) {
      const countBadge = document.createElement("div");
      countBadge.className = "card-count-badge";
      countBadge.textContent = entities.length;
      cardContainer.appendChild(countBadge);
    }
    
    // Create the card image using the entity's image path
    const cardImage = document.createElement("img");
    cardImage.src = entities[0].image; // Use the actual image path from the entity
    cardImage.alt = cardType;
    cardImage.loading = "lazy"; // For performance
    
    cardContainer.appendChild(cardImage);
    
    // Store entity data for tooltips and interactions
    cardContainer.dataset.entities = JSON.stringify(entities.map(e => e.entityid));
    
    // Add tooltip with card name and count
    cardContainer.title = `${cardType} (${entities.length})`;
    
    // Position cards with slight overlap
    cardContainer.style.zIndex = index + 1;
    cardContainer.style.marginTop = index > 0 ? "-80px" : "0";
    
    graveyardContainer.appendChild(cardContainer);
    index++;
  });
}

// Function to display game over message
function displayGameOverMessage(gameState) {
  // Create or get the overlay
  let overlay = document.getElementById("game-over-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "game-over-overlay";
    document.body.appendChild(overlay);
  }
  
  // Determine the message based on winner and current player
  let message = "Game Over";
  
  if (gameState.winner === "neutral") {
    message = "Draw";
  } else if (gameState.winner === currentPlayer) {
    message = "Victory!";
  } else {
    message = "Defeat";
  }
  
  // Set the overlay content and display it
  overlay.textContent = message;
  overlay.classList.add("active");
  
  // Apply the appropriate class based on the message
  overlay.classList.remove("victory", "defeat", "draw");
  if (message === "Victory!") {
    overlay.classList.add("victory");
  } else if (message === "Defeat") {
    overlay.classList.add("defeat");
  } else if (message === "Draw") {
    overlay.classList.add("draw");
  }
}

// Function to hide game over message
function hideGameOverMessage() {
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) {
    overlay.classList.remove("active");
  }
}


// Function to check which cards have taken damage and apply animations
function animateDamagedCards(oldBoardState, newPlayers) {
  // Process each player's cards
  for (const player of ['player1', 'player2']) {
    const oldCards = oldBoardState[player];
    const newCards = newPlayers[player]?.cardsonboard || [];
    
    // Check each card in the new state to see if its health decreased
    newCards.forEach(newCard => {
      const oldCard = oldCards.find(card => card.entityid === newCard.entityid);
      
      // If the card existed before and has less health now
      if (oldCard && newCard.health < oldCard.health) {
        // Find the card element on the board
        const cardElement = document.querySelector(`[data-entityid="${newCard.entityid}"]`);
        if (cardElement) {
          // Create a damage overlay if it doesn't exist
          let damageOverlay = cardElement.querySelector('.damage-overlay');
          if (!damageOverlay) {
            damageOverlay = document.createElement('div');
            damageOverlay.className = 'damage-overlay';
            cardElement.appendChild(damageOverlay);
          }
          
          // Remove any existing animation classes
          cardElement.classList.remove('damage-animation');
          
          // Force a reflow to ensure the animation plays again
          void cardElement.offsetWidth;
          
          // Add the animation class
          cardElement.classList.add('damage-animation');
          
          // Calculate damage amount
          const damageAmount = oldCard.health - newCard.health;
          
          // Create and display a damage number
          const damageNumber = document.createElement('div');
          damageNumber.className = 'damage-number';
          damageNumber.textContent = `-${damageAmount}`;
          cardElement.appendChild(damageNumber);
          
          // Remove the number after animation completes
          setTimeout(() => {
            if (damageNumber.parentNode) {
              damageNumber.parentNode.removeChild(damageNumber);
            }
          }, 1000);
        }
      }
    });
    
    // Check for cards that were completely removed (died)
    oldCards.forEach(oldCard => {
      const stillExists = newCards.some(card => card.entityid === oldCard.entityid);
      
      if (!stillExists) {
        // Find the last known position
        const { x, y } = oldCard.position;
        const tile = document.querySelector(`#game-board .tile[data-x='${x}'][data-y='${y}']`);
        
        if (tile) {
          // Create a clone of the card for the death animation
          const cardClone = document.createElement('div');
          cardClone.className = 'card card-on-board death-animation';
          
          // Clone the card image and info
          const img = document.createElement('img');
          img.src = oldCard.image;
          img.alt = oldCard.cardtype;
          
          const info = document.createElement('div');
          info.className = 'card-info';
          info.textContent = `🏃${oldCard.movement} ⚔️${oldCard.melee} 🏹${oldCard.ranged} 💥${oldCard.blast} 🛡️${oldCard.armor} ❤️${oldCard.health} 🧠${oldCard.courage}`;
          
          cardClone.appendChild(img);
          cardClone.appendChild(info);
          
          // Position the clone in the same place
          cardClone.style.position = 'absolute';
          cardClone.style.top = '0';
          cardClone.style.left = '0';
          cardClone.style.width = '100%';
          cardClone.style.height = '100%';
          
          tile.appendChild(cardClone);
          
          // Remove the clone after the animation completes
          setTimeout(() => {
            if (cardClone.parentNode) {
              cardClone.parentNode.removeChild(cardClone);
            }
          }, 2000); // Match the 2s animation duration
        }
      }
    });
  }
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

  // Update game state after action
  updateGameStateAndRender(data);
}

function highlightSelectedCard(entityid) {
  document.querySelectorAll(".card").forEach(el => {
    if (el.dataset.entityid === entityid) {
      el.classList.add("selected");
      if (latestGameState && latestGameState.stage === "movement") {
        el.classList.remove("selectabletomove");
      }
    } else {
      el.classList.remove("selected");

      if (latestGameState && latestGameState.stage === "movement") {
        if (el.dataset.owner === currentPlayer) {
          const cardData = findCardById(latestGameState.players[currentPlayer].cardsonboard, el.dataset.entityid);
          if (cardData && !cardData.moved_this_turn) {
            el.classList.add("selectabletomove");
          } else {
            el.classList.remove("selectabletomove");
          }
        }
      }
    }
  });
}

function highlightEligibleTiles() {
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    tile.classList.remove("eligible-placement", "invalid-placement");

    if (!selectedCard) return;
    if (!latestGameState || latestGameState.stage !== "cardplacement") return;
    
    const x = parseInt(tile.dataset.x);
    const y = parseInt(tile.dataset.y);
    const tilePlanet = tile.dataset.planet;
    
    if (!tilePlanet) return;
    
    // Use new deployment/landing zone validation
    const validation = isValidPlacementPosition(tilePlanet, x, y, currentPlayer);
    
    if (validation.valid) {
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

  const p1 = gamestate.players.player1;
  const p2 = gamestate.players.player2;

  if (p1) {
    document.getElementById("player1-health").textContent = p1.health;
    document.getElementById("player1-armor").textContent = p1.armor ?? 0;
  }

  if (p2) {
    document.getElementById("player2-health").textContent = p2.health;
    document.getElementById("player2-armor").textContent = p2.armor ?? 0;
  }
  
  // Adjust polling based on whose turn it is
  setupPolling();
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

  // Update game state after action
  updateGameStateAndRender(data);

  // If we're advancing to prebattle, immediately poll again to ensure attack targets are populated
  if (data.stage === "prebattle") {
    console.log("Advanced to prebattle stage, fetching fresh data with attack targets...");
    setTimeout(pollGameState, 500); // Poll after a brief delay to ensure server has calculated targets
  }
});

// This function can be simplified since we're managing movement tiles differently
function clearTileListenersAndClasses() {
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    tile.classList.remove("eligible-placement", "invalid-placement", "selected", "movement-tile");
    
    // Only remove movement-related listeners
    if (tile.getAttribute('data-has-move-listener') === 'true') {
      const newTile = tile.cloneNode(false); // shallow clone
      while (tile.firstChild) {
        newTile.appendChild(tile.firstChild); // preserve children
      }
      tile.replaceWith(newTile);
      newTile.removeAttribute('data-has-move-listener');
    }
  });
}

function renderBoard(players) {
  // First, clear all tiles
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    // Keep the tile element but remove its content
    tile.innerHTML = "";
    
    // Remove all classes except the base 'tile' class
    const classList = Array.from(tile.classList);
    classList.forEach(cls => {
      if (cls !== 'tile') {
        tile.classList.remove(cls);
      }
    });
  });

  // Render cards on board
  ["player1", "player2"].forEach(player => {
    if (!players[player]?.cardsonboard) return;
    
    players[player].cardsonboard.forEach(card => {
      const { x, y } = card.position;
      const tile = document.querySelector(`#game-board .tile[data-x='${x}'][data-y='${y}']`);

      if (tile) {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card", "card-on-board");

        const img = document.createElement("img");
        img.src = card.image;
        img.alt = card.cardtype;

        const info = document.createElement("div");
        info.classList.add("card-info");
        info.textContent = `🏃${card.movement} ⚔️${card.melee} 🏹${card.ranged} 💥${card.blast} 🛡️${card.armor} ❤️${card.health} 🧠${card.courage}`;

        cardElement.appendChild(img);
        cardElement.appendChild(info);

        if (card.sick_this_turn) {
          const sickOverlay = document.createElement("div");
          sickOverlay.classList.add("sick-overlay");
          sickOverlay.innerHTML = "🌀"; // Use an emoji or insert an <img> here for custom spiral
          cardElement.appendChild(sickOverlay);
        }

        cardElement.dataset.entityid = card.entityid;
        cardElement.dataset.owner = card.owner;

        tile.appendChild(cardElement);

        if (card.owner === currentPlayer) {
          cardElement.style.cursor = "pointer";

          if (latestGameState.stage === "movement" && !card.moved_this_turn) {
            cardElement.classList.add("selectabletomove");
          }

          if (latestGameState.stage === "prebattle" && !card.has_attacked_this_stage) {
            cardElement.classList.add("selectabletoattack");
          }

          // Add card selection listener
          cardElement.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent tile click event
            
            console.log("Card clicked:", card.entityid);
            
            // If we're in movement phase, handle card selection
            if (latestGameState.stage === "movement") {
              // Only allow selection of own cards that haven't moved
              if (card.moved_this_turn) {
                console.log("Card has already moved this turn");
                return;
              }
              
              // Update selected entity
              selectedEntity = card;
              
              // Highlight the selected card
              highlightSelectedCard(card.entityid);
              
              // Update movement tiles
              highlightMovementTiles(card);
            }

            if (latestGameState.stage === "prebattle") {
              // Only allow selection of own cards that haven't moved
              if (card.owner !== currentPlayer) {
                console.log("Card not yours");
                return;
              }

              if (card.has_attacked_this_stage) {
                console.log("Card has already attacked this turn");
                return;
              }

              // Update selected entity
              selectedAttacker = card;
              console.log("selectedAttacker:", selectedAttacker);
              
              // Highlight the selected card
              highlightSelectedCard(card.entityid);
            }
          });
        }
      }
    });
  });
  
  // Re-attach placement listeners for card placement phase
  if (latestGameState.stage === "cardplacement") {
    document.querySelectorAll("#game-board .tile").forEach(tile => {
      attachPlacementListener(tile);
    });
  }
}

function highlightMovementTiles(card) {
  // Clear any previous movement highlights
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    tile.classList.remove("eligible-placement", "invalid-placement", "movement-tile");
    
    const oldMoveListener = tile.getAttribute('data-has-move-listener');
    if (oldMoveListener === 'true') {
      const newTile = tile.cloneNode(false);
      while (tile.firstChild) {
        newTile.appendChild(tile.firstChild);
      }
      tile.replaceWith(newTile);
    }
  });

  // Get the card's current planet
  const cardPlanet = card.planet;
  if (!cardPlanet) {
    console.error("Card has no planet assigned:", card);
    return;
  }

  // Ensure we're only showing movement for the currently displayed planet
  if (cardPlanet !== currentDisplayedPlanet) {
    console.log(`Card is on ${cardPlanet} but displaying ${currentDisplayedPlanet} - no movement shown`);
    return;
  }

  // Get current planet dimensions for boundary checking
  const planet = latestGameState.planets[cardPlanet];
  if (!planet) {
    console.error("Planet data not found for:", cardPlanet);
    return;
  }

  const boardWidth = planet.width;
  const boardHeight = planet.height;

  // Only highlight tiles that belong to the same planet as the card
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    const tilePlanet = tile.dataset.planet;
    
    // Skip tiles that don't belong to the same planet
    if (tilePlanet !== cardPlanet) {
      return;
    }

    const tileX = parseInt(tile.dataset.x);
    const tileY = parseInt(tile.dataset.y);

    // Check if tile is within planet boundaries
    if (tileX >= boardWidth || tileY >= boardHeight || tileX < 0 || tileY < 0) {
      return;
    }

    const dx = Math.abs(card.position.x - tileX);
    const dy = Math.abs(card.position.y - tileY);
    const distance = Math.max(dx, dy);

    // Check if position is occupied by another card on the same planet
    const occupied = Array.from(document.querySelectorAll("#game-board .card")).some(c => {
      const parent = c.parentElement;
      const occupiedPlanet = parent.dataset.planet;
      return (
        parseInt(parent.dataset.x) === tileX &&
        parseInt(parent.dataset.y) === tileY &&
        occupiedPlanet === cardPlanet && // Only check same planet
        c.dataset.entityid !== card.entityid
      );
    });

    if (distance > 0 && distance <= card.movement && !occupied) {
      tile.classList.add("eligible-placement", "movement-tile");
      tile.setAttribute('data-has-move-listener', 'true');

      tile.addEventListener("click", async function handleMoveClick() {
        document.querySelectorAll("#game-board .tile").forEach(t => {
          t.classList.remove("eligible-placement", "movement-tile");
          t.removeAttribute('data-has-move-listener');
        });
        
        const res = await fetch(`${API_BASE}/moveentity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionid: currentSessionId,
            player: currentPlayer,
            entityid: card.entityid,
            destination: { x: tileX, y: tileY }
          })
        });

        const data = await res.json();
        if (data.error) {
          console.error("Move failed:", data.error);
          return;
        }

        selectedEntity = null;
        updateGameStateAndRender(data);
      });
    }
  });
}

function getEntityFromElement(cardEl, players) {
  const entityId = cardEl.dataset.entityid;
  let allEntities = [];
  
  if (players.player1 && players.player1.cardsonboard) {
    allEntities = allEntities.concat(players.player1.cardsonboard);
  }
  
  if (players.player2 && players.player2.cardsonboard) {
    allEntities = allEntities.concat(players.player2.cardsonboard);
  }
  
  return allEntities.find(e => e.entityid === entityId);
}

function getEntityById(entityId, players) {
  for (const player of Object.values(players)) {
    if (!player.cardsonboard) continue;
    const match = player.cardsonboard.find(card => card.entityid === entityId);
    if (match) return match;
  }
  return null;
}

function showAttackMenu(x, y, attackTypes) {
  const menu = document.getElementById('attack-menu');
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';

  document.querySelectorAll('.attack-btn').forEach(btn => {
    const type = btn.dataset.type;
    btn.style.display = attackTypes.includes(type) ? 'inline-block' : 'none';
  });
}

function setupGlobalClickListener() {
  // Remove any existing listener first to avoid duplicates
  document.removeEventListener('click', handleGlobalClick);
  document.addEventListener('click', handleGlobalClick);
}

function handleGlobalClick(e) {
  const attackMenu = document.getElementById('attack-menu');
  if (attackMenu.style.display === 'block') {
    // If clicking outside the attack menu and not on an attack button
    if (!e.target.closest('#attack-menu') && !e.target.classList.contains('attack-btn')) {
      hideAttackMenu();
      // Only clear selections if clicking outside a card
      if (!e.target.closest('.card-on-board')) {
        clearSelections();
      }
    }
  }
}

function hideAttackMenu() {
  const menu = document.getElementById('attack-menu');
  menu.style.display = 'none';
}

function clearSelections() {
  selectedAttacker = null;
  selectedTarget = null;
  document.querySelectorAll('.card-on-board').forEach(el => el.classList.remove('selected'));
  hideAttackMenu();
}



document.addEventListener('contextmenu', (e) => {
  console.log("contextmenu event listener is active");
  e.preventDefault();
  const cardEl = e.target.closest('.card-on-board');

  if (!cardEl || !selectedAttacker || !latestGameState || !latestGameState.players) {
    return;
  }

  const targetEntity = getEntityFromElement(cardEl, latestGameState.players);

  if (!targetEntity || targetEntity.owner === currentPlayer) {
    return;
  }

  // Check if attacker and target are on the same planet
  const attackerPlanet = selectedAttacker.planet;
  const targetPlanet = targetEntity.planet;
  
  if (!attackerPlanet || !targetPlanet || attackerPlanet !== targetPlanet) {
    console.log("Cannot attack - entities on different planets");
    return;
  }

  // Also ensure we're viewing the planet where the attack is happening
  if (attackerPlanet !== currentDisplayedPlanet) {
    console.log("Cannot attack - not viewing the correct planet");
    return;
  }

  const attacker = selectedAttacker;
  const targetId = targetEntity.entityid;

  const validTypes = [];
  if (attacker.valid_target_melee && attacker.valid_target_melee.includes(targetId)) validTypes.push('melee');
  if (attacker.valid_target_ranged && attacker.valid_target_ranged.includes(targetId)) validTypes.push('ranged');
  if (attacker.valid_target_blast && attacker.valid_target_blast.includes(targetId)) validTypes.push('blast');

  if (validTypes.length === 0) {
    return;
  }

  selectedTarget = targetEntity;
  cardEl.classList.add('selected');
  showAttackMenu(e.pageX, e.pageY, validTypes);
});

function designateAttack(attackerId, targetId, attackType) {
  const attacker = getEntityById(attackerId, latestGameState.players);
  const target = getEntityById(targetId, latestGameState.players);
  
  if (!attacker || !target) {
    console.error("Attacker or target not found");
    return;
  }

  // Verify both entities are on the same planet
  if (attacker.planet !== target.planet) {
    console.error("Cannot attack across planets");
    alert("Cannot attack targets on different planets!");
    return;
  }

  const payload = {
    sessionid: currentSessionId,
    player: currentPlayer,
    attacker_col: attacker.position.x,
    attacker_row: attacker.position.y,
    target_col: target.position.x,
    target_row: target.position.y,
    attack_type: attackType
  };

  fetch(`${API_BASE}/designate_attack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success || !data.error) {
      console.log("Attack designated successfully");
      pollGameState();
    } else {
      console.error("Attack designation failed:", data.error);
      alert("Error: " + data.error);
    }
  })
  .catch(err => {
    console.error("Network or server error:", err);
    alert("An error occurred while sending the attack.");
  });
}

// Handle attack button click
document.querySelectorAll('.attack-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!selectedAttacker || !selectedTarget) return;

    const attackType = btn.dataset.type;
    designateAttack(selectedAttacker.entityid, selectedTarget.entityid, attackType);

    clearSelections();
  });
});

function setupGraveyardInteraction() {
  // Add event listeners to both graveyards
  document.querySelectorAll('#player1-graveyard, #player2-graveyard').forEach(graveyard => {
    graveyard.addEventListener('click', (e) => {
      const cardElement = e.target.closest('.graveyard-card');
      if (!cardElement) return;
      
      // Show a detailed view of the card and its group
      try {
        const entityIds = JSON.parse(cardElement.dataset.entities);
        const player = graveyard.id.includes('player1') ? 'player1' : 'player2';
        displayGraveyardCardDetails(entityIds, player);
      } catch (err) {
        console.error("Error parsing entity data:", err);
      }
    });
  });
}

// Display a detailed view of cards from the graveyard
function displayGraveyardCardDetails(entityIds, player) {
  if (!latestGameState || !latestGameState.players[player]?.graveyard) return;
  
  // Find all matching entities in the graveyard
  const entities = latestGameState.players[player].graveyard.filter(entity => 
    entityIds.includes(entity.entityid)
  );
  
  if (entities.length === 0) return;
  
  // Log information about the card(s)
  console.log(`Viewing ${entities.length} ${entities[0].cardtype} cards in ${player}'s graveyard`);
  
  // Example of how you might implement a modal preview for the group:
  // const modal = document.createElement('div');
  // modal.className = 'graveyard-modal';
  // 
  // const cardDetails = entities.map(entity => `
  //   <div class="graveyard-card-detail">
  //     <img src="${entity.image}" alt="${entity.cardtype}">
  //     <div class="card-stats">
  //       <p>🏃${entity.movement} ⚔️${entity.melee} 🏹${entity.ranged} 💥${entity.blast}</p>
  //       <p>🛡️${entity.armor} ❤️${entity.health} 🧠${entity.courage}</p>
  //       <p>ID: ${entity.entityid.substring(0, 8)}...</p>
  //     </div>
  //   </div>
  // `).join('');
  // 
  // modal.innerHTML = `
  //   <div class="modal-content">
  //     <span class="close-button">&times;</span>
  //     <h2>${entities[0].cardtype} (${entities.length})</h2>
  //     <div class="cards-container">
  //       ${cardDetails}
  //     </div>
  //     <button class="resurrect-button">Resurrect Selected</button>
  //   </div>
  // `;
  // 
  // document.body.appendChild(modal);
  // 
  // // Add close functionality
  // modal.querySelector('.close-button').addEventListener('click', () => {
  //   document.body.removeChild(modal);
  // });
  // 
  // // In the future, you could add resurrection mechanics here
  // modal.querySelector('.resurrect-button').addEventListener('click', () => {
  //   // Send request to resurrect the card(s)
  //   console.log("Resurrection requested for:", entityIds);
  //   document.body.removeChild(modal);
  // });
}

// Function to properly initialize the graveyard at game start
function initializeGraveyards() {
  // Set up empty graveyards for both players
  renderGraveyard([], "player1");
  renderGraveyard([], "player2");
  
  // Add interaction handlers
  setupGraveyardInteraction();
}

// Call this function when the game starts
document.addEventListener('DOMContentLoaded', () => {
  console.log("Game client initialized");
  setupGlobalClickListener();
  initializeGraveyards();
});


// Event listeners for planet navigation
document.getElementById("planet-left-arrow").addEventListener("click", () => {
  cyclePlanet('left');
});

document.getElementById("planet-right-arrow").addEventListener("click", () => {
  cyclePlanet('right');
});
