let availableFactions = {};
let factionsTaken = {};
let selectedFaction = null;
let selectedCommander = null;
let commanderUpgradeDecks = {};
let expandedCommander = null;
let planetsData = {};
let deckContents = {};
let expandedDeck = null;
let selectedDeck = null;
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
let selectedUpgradeCard = null;
let availableEffects = [];
let targetingMode = false;
let currentEffect = null;
let areaTargeting = false;
let areaSize = { x: 1, y: 1 };
let currentAreaEffect = null;
let tokenLibrary = {};
let planetTransferMode = false;
let selectedEntitiesForTransfer = [];
let sourcePlanetForTransfer = null;
let currentEffectMenuEntity = null;


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
const player2HandElement = document.getElementById("player2-hand"); // Keep for compatibility
const player1UpgradeDeck = document.getElementById("player1-upgrade-deck");
const player2UpgradeDeck = document.getElementById("player2-upgrade-deck"); // Keep for compatibility
const player1Graveyard = document.getElementById("player1-graveyard");
const player2Graveyard = document.getElementById("player2-graveyard"); // Keep for compatibility
const statusDisplay = document.getElementById("status-display");
const advanceButton = document.getElementById("advance-button");
const API_BASE = "http://127.0.0.1:8000"; // Change to your Cloud Run URL later

document.getElementById("startGame").addEventListener("click", () => {
  isJoiningPlayer = false; // Reset this flag
  showGameTypeMenu();
});

// New navigation functions
function showGameTypeMenu() {
  document.getElementById("main-menu").classList.add("hidden");
  document.getElementById("game-type-menu").classList.remove("hidden");
}

function showMainMenu() {
  document.querySelectorAll(".menu-section").forEach(section => section.classList.add("hidden"));
  document.getElementById("main-menu").classList.remove("hidden");
  
  // Reset joining player state when going back to main menu
  isJoiningPlayer = false;
  currentSessionId = null;
}

function showMultiplayerMenu() {
  document.getElementById("game-type-menu").classList.add("hidden");
  document.getElementById("multiplayer-menu").classList.remove("hidden");
}

function showFactionSelection() {
  document.getElementById("main-menu").classList.add("hidden");
  document.getElementById("multiplayer-menu").classList.add("hidden");
  document.getElementById("faction-selection-menu").classList.remove("hidden");
  loadFactions();
}

function showFactionDetails(faction) {
  selectedFaction = faction;
  document.getElementById("faction-selection-menu").classList.add("hidden");
  document.getElementById("faction-details-menu").classList.remove("hidden");
  populateFactionDetails(faction);
}

// Add function to load and display trait information
async function loadTraitsLibrary() {
  try {
    const res = await fetch(`${API_BASE}/traits_library`);
    const traitsData = await res.json();
    return traitsData;
  } catch (error) {
    console.error("Failed to load traits library:", error);
    return {};
  }
}

// Navigation event listeners
document.getElementById("backToMainMenuBtn").addEventListener("click", showMainMenu);
document.getElementById("multiplayerBtn").addEventListener("click", showMultiplayerMenu);
document.getElementById("backToGameTypeBtn").addEventListener("click", showGameTypeMenu);
document.getElementById("customMatchBtn").addEventListener("click", () => {
  isJoiningPlayer = false; // Ensure this is false for new games
  showFactionSelection();
});
document.getElementById("backToMultiplayerBtn").addEventListener("click", () => {
  document.getElementById("faction-selection-menu").classList.add("hidden");
  
  if (isJoiningPlayer) {
    // For joining players, go back to start screen and reset
    isJoiningPlayer = false;
    showMainMenu();
  } else {
    // For starting players, go back to multiplayer menu
    showMultiplayerMenu();
  }
});

document.getElementById("backToFactionSelection").addEventListener("click", () => {
  document.getElementById("faction-details-menu").classList.add("hidden");
  
  if (isJoiningPlayer) {
    // For joining players, go back to faction selection (not start screen)
    document.getElementById("faction-selection-menu").classList.remove("hidden");
  } else {
    // For starting players, normal flow
    document.getElementById("faction-selection-menu").classList.remove("hidden");
  }
});

async function loadFactions() {
  try {
    const requestBody = {
      startsession: !isJoiningPlayer,
      sessionid: isJoiningPlayer ? currentSessionId : null
    };
    
    const res = await fetch(`${API_BASE}/getfactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    
    const data = await res.json();
    
    if (data.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error loading factions: ${data.error}</div>`;
      return;
    }
    
    // Add debug logging
    console.log("Factions data received:", data);
    
    availableFactions = data.factions;
    planetsData = data.planets;
    
    // Store taken factions info for joining players
    if (!requestBody.startsession) {
      factionsTaken = data.factions_taken || {};
      
      // If we found a session ID when searching, store it
      if (data.sessionid && !currentSessionId) {
        currentSessionId = data.sessionid;
      }
      
      console.log("Factions taken in session:", factionsTaken);
    } else {
      factionsTaken = {};
    }
    
    renderFactions();
  } catch (error) {
    console.error("Failed to load factions:", error);
    startConsoleLog.innerHTML += `<div class="error-message">Failed to load factions</div>`;
  }
}

function renderFactions() {
  const container = document.getElementById("factions-container");
  container.innerHTML = "";
  
  availableFactions.forEach(faction => {
    const factionCard = document.createElement("div");
    factionCard.className = "faction-card";
    factionCard.dataset.factionName = faction.name;
    
    // Check if faction is taken
    const isTaken = factionsTaken[faction.name];
    if (isTaken) {
      factionCard.classList.add("faction-taken");
    }
    
    factionCard.innerHTML = `
      <img src="${faction.faction_image}" alt="${faction.name}" class="faction-image" 
           onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzQ1NDc1YSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
      <img src="${faction.logo}" alt="${faction.name} logo" class="faction-logo"
           onerror="this.style.display='none'">
      <div class="faction-overlay">
        <div class="faction-name">${faction.name}</div>
        <div class="faction-info">Home: ${faction.home_planet}</div>
        ${isTaken ? `<div class="faction-taken-indicator">Taken by ${isTaken.player}</div>` : ''}
      </div>
    `;
    
    // Only add click handler if faction is not taken
    if (!isTaken) {
      factionCard.addEventListener("click", () => {
        showFactionDetails(faction);
      });
    } else {
      factionCard.style.cursor = 'not-allowed';
      factionCard.title = `This faction is already taken by ${isTaken.player}`;
    }
    
    container.appendChild(factionCard);
  });
}

async function populateFactionDetails(faction) {
  // Set faction name
  document.getElementById("selected-faction-name").textContent = faction.name;
  
  // Set home planet info with expandable preview
  const homePlanetName = faction.home_planet;
  const planetData = planetsData.find(planet => planet.name === homePlanetName);
  
  // Find the existing home planet container and preserve the header
  const homePlanetContainer = document.querySelector('.faction-home-planet');
  
  // Create the expandable content without overwriting the h3 header
  homePlanetContainer.innerHTML = `
    <h3>Home Planet</h3>
    <div class="faction-home-planet-display">
      <img id="faction-planet-image" src="" alt="${homePlanetName}">
      <div class="planet-details">
        <div id="faction-planet-name">${homePlanetName}</div>
        <div class="planet-size-info" id="planet-size-info">Loading...</div>
      </div>
      <div class="planet-expand-indicator">▼</div>
    </div>
    <div class="planet-board-preview">
      <div class="planet-board-header">
        <div class="planet-board-title">Planet Layout</div>
        <div class="planet-board-info" id="planet-features-info">Click to explore</div>
      </div>
      <div class="planet-preview-board" id="planet-preview-board-${homePlanetName}">
        <div class="upgrade-deck-loading">Loading planet layout...</div>
      </div>
    </div>
  `;
  
  // Set up planet image and data
  if (planetData && planetData.background_image) {
    document.getElementById("faction-planet-image").src = planetData.background_image;
    document.getElementById("planet-size-info").textContent = `Size: ${planetData.width}×${planetData.height}`;
    
    // Add click handler for expansion
    homePlanetContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      handlePlanetClick(homePlanetContainer, homePlanetName, planetData);
    });
    
    document.getElementById("faction-planet-image").onerror = function() {
      console.warn(`Planet image not found: ${planetData.background_image}`);
      this.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMzUiIGZpbGw9IiM2Yzc4ODYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPiR7aG9tZVBsYW5ldE5hbWV9PC90ZXh0Pjwvc3ZnPg==";
    };
  } else {
    // Fallback if planet data not found
    console.warn(`Planet data not found for: ${homePlanetName}`);
    document.getElementById("faction-planet-image").src = `data:image/svg+xml;base64,${btoa(`
      <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="35" fill="#6c7886"/>
        <text x="50%" y="45%" fill="white" font-size="8" text-anchor="middle" dy=".3em">${homePlanetName}</text>
        <text x="50%" y="65%" fill="white" font-size="6" text-anchor="middle" dy=".3em">(No Image)</text>
      </svg>
    `)}`;
    document.getElementById("planet-size-info").textContent = "Planet data not available";
  }
  
  // Reset expansion state
  expandedPlanet = null;
  
  // Populate commanders with expandable upgrade deck display
  const commandersContainer = document.getElementById("commanders-container");
  commandersContainer.innerHTML = "";
  
  faction.commander.forEach(commander => {
    const commanderCard = document.createElement("div");
    commanderCard.className = "commander-card";
    commanderCard.dataset.commanderName = commander.name;
    commanderCard.dataset.upgradeDeck = commander.upgrade_deck;
    
    commanderCard.innerHTML = `
      <div class="commander-header">
        <img src="${commander.image}" alt="${commander.name}" class="commander-image"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNTg1YjcwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DbWRyPC90ZXh0Pjwvc3ZnPg=='">
        <div class="commander-info">
          <div class="commander-name">${commander.name}</div>
          <div class="commander-stats">
            <div class="commander-stat">
              <div class="commander-stat-icon health">
                <div class="commander-stat-number">${commander.health}</div>
              </div>
              <div class="commander-stat-label">Health</div>
            </div>
            <div class="commander-stat">
              <div class="commander-stat-icon armor">
                <div class="commander-stat-number">${commander.armor}</div>
              </div>
              <div class="commander-stat-label">Armor</div>
            </div>
          </div>
        </div>
      </div>
      <div class="commander-expand-indicator">▼</div>
      <div class="commander-upgrade-deck">
        <div class="upgrade-deck-header">
          <div class="upgrade-deck-title">Upgrade Deck</div>
          <div class="upgrade-deck-count" id="deck-count-${commander.name}">Loading...</div>
        </div>
        <div class="upgrade-categories-container" id="upgrade-grid-${commander.name}">
          <div class="upgrade-deck-loading">Loading upgrade cards...</div>
        </div>
      </div>
    `;
    
    commanderCard.addEventListener("click", async (e) => {
      e.stopPropagation();
      await handleCommanderClick(commanderCard, commander);
    });
    
    commandersContainer.appendChild(commanderCard);
  });
  

  if (faction.traits && faction.traits.length > 0) {
    const traitsContainer = document.createElement("div");
    traitsContainer.className = "faction-traits-container";
    traitsContainer.innerHTML = `
      <h3>Traits</h3>
      <div class="faction-traits-list" id="faction-traits-${faction.name}">
        Loading traits...
      </div>
    `;
    
    // Insert after commanders but before decks
    const commandersContainer = document.getElementById("commanders-container");
    commandersContainer.parentNode.insertBefore(traitsContainer, commandersContainer.nextSibling);
    
    // Load and display trait details using the new function
    await updateTraitsDisplay(faction, null);
  } else {
    // Still create the container even if no faction traits, in case commander has traits
    const traitsContainer = document.createElement("div");
    traitsContainer.className = "faction-traits-container";
    traitsContainer.innerHTML = `
      <h3>Traits</h3>
      <div class="faction-traits-list" id="faction-traits-${faction.name}">
        <div class="no-traits">No faction traits</div>
      </div>
    `;
    
    // Insert after commanders but before decks
    const commandersContainer = document.getElementById("commanders-container");
    commandersContainer.parentNode.insertBefore(traitsContainer, commandersContainer.nextSibling);
  }

  // Populate decks with expandable content
  const decksContainer = document.getElementById("decks-container");
  decksContainer.innerHTML = "";
  
  faction.decks.forEach((deckFile, index) => {
    const deckCard = document.createElement("div");
    deckCard.className = "deck-card";
    deckCard.dataset.deckFile = deckFile;
    
    // Extract deck name from filename
    const deckName = deckFile.replace('deck_', '').replace('.json', '').replace(/_/g, ' ');
    
    deckCard.innerHTML = `
      <div class="deck-header">
        <div class="deck-info-container">
          <div class="deck-name">Deck ${index + 1}</div>
          <div class="deck-info">${deckName}</div>
        </div>
        <div class="deck-card-count" id="deck-count-${deckFile}">Loading...</div>
      </div>
      <div class="deck-expand-indicator">▼</div>
      <div class="deck-contents">
        <div class="deck-contents-header">
          <div class="deck-contents-title">Deck Contents</div>
          <div class="deck-contents-info" id="deck-info-${deckFile}">Click to explore</div>
        </div>
        <div class="deck-cards-container" id="deck-cards-${deckFile}">
          <div class="deck-contents-loading">Loading deck cards...</div>
        </div>
      </div>
    `;
    
    deckCard.addEventListener("click", async (e) => {
      e.stopPropagation();
      await handleDeckClick(deckCard, deckFile, faction.name);
    });
    
    decksContainer.appendChild(deckCard);
  });
  
  // Reset selections
  selectedCommander = null;
  selectedDeck = null;
  expandedCommander = null;
  expandedDeck = null;
  updateContinueButton();
}


async function displayFactionTraits(traitNames, containerId) {
  const traitsLibrary = await loadTraitsLibrary();
  const container = document.getElementById(containerId);
  
  if (!container) return;
  
  container.innerHTML = "";
  
  traitNames.forEach(traitName => {
    const traitData = traitsLibrary[traitName];
    if (traitData) {
      const traitElement = document.createElement("div");
      traitElement.className = "trait-display";
      traitElement.innerHTML = `
        <div class="trait-name">${traitData.name}</div>
        <div class="trait-description">${traitData.description}</div>
      `;
      container.appendChild(traitElement);
    }
  });
}


// Handle planet expansion
function handlePlanetClick(planetContainer, planetName, planetData) {
  if (expandedPlanet === planetName) {
    // Collapse if already expanded
    planetContainer.classList.remove("expanded");
    expandedPlanet = null;
  } else {
    // Expand this planet
    planetContainer.classList.add("expanded");
    expandedPlanet = planetName;
    
    // Render the planet board
    renderPlanetPreview(planetName, planetData);
  }
}

// Render planet preview using existing functions
function renderPlanetPreview(planetName, planetData) {
  const boardContainer = document.getElementById(`planet-preview-board-${planetName}`);
  if (!boardContainer || !planetData) return;
  
  const boardWidth = planetData.width;
  const boardHeight = planetData.height;
  
  // Update info
  const featuresInfo = document.getElementById("planet-features-info");
  if (featuresInfo) {
    const totalFeatures = (planetData.mines?.length || 0) + 
                          (planetData.caves?.length || 0) + 
                          (planetData.ruined_caves?.length || 0) + 
                          (planetData.refineries?.length || 0) + 
                          (planetData.oil_wells?.length || 0) + 
                          (planetData.cities?.length || 0) + 
                          (planetData.ruined_cities?.length || 0) + 
                         (planetData.fortresses?.length || 0) + 
                         (planetData.deployment_zones?.length || 0) + 
                         (planetData.landing_zones?.length || 0) + 
                         (planetData.craters?.length || 0) + 
                         (planetData.digestion_pools?.length || 0) + 
                         (planetData.biomass?.length || 0);
    featuresInfo.textContent = `${totalFeatures} terrain features`;
  }
  
  // Clear and set up the grid
  boardContainer.innerHTML = "";
  boardContainer.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
  boardContainer.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
  
  // Create tiles using adapted existing logic
  createPlanetPreviewTiles(boardContainer, boardWidth, boardHeight, planetName, planetData);
}

// Create planet preview tiles (adapted from existing createGridTiles)
function createPlanetPreviewTiles(container, columns, rows, planetName, planetData) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const tile = document.createElement("div");
      tile.className = "planet-preview-tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      tile.dataset.planet = planetName;
      
      // Add feature icons using existing getPlanetFeatures logic
      const features = getPlanetFeaturesForPreview(planetName, x, y, planetData);
      if (features.length > 0) {
        const iconsContainer = createFeatureIconsForPreview(features);
        tile.appendChild(iconsContainer);
      }
      
      // Highlight special zones
      if (isDeploymentZone(planetData, x, y)) {
        tile.classList.add("deployment-zone");
      } else if (isLandingZone(planetData, x, y)) {
        tile.classList.add("landing-zone");
      }
      
      container.appendChild(tile);
    }
  }
}

// Adapted version of getPlanetFeatures for preview
function getPlanetFeaturesForPreview(planetName, x, y, planetData) {
  const features = [];
  
  // Check each feature type using the provided planet data
  if (planetData.mines && planetData.mines.some(f => f.x === x && f.y === y)) {
    features.push('mine');
  }
  if (planetData.caves && planetData.caves.some(f => f.x === x && f.y === y)) {
    features.push('cave');
  }
  if (planetData.ruined_caves && planetData.ruined_caves.some(f => f.x === x && f.y === y)) {
    features.push('ruined_cave');
  }
  if (planetData.oil_wells && planetData.oil_wells.some(f => f.x === x && f.y === y)) {
    features.push('oil_well');
  }
  if (planetData.refineries && planetData.refineries.some(f => f.x === x && f.y === y)) {
    features.push('refinery');
  }
  if (planetData.cities && planetData.cities.some(f => f.x === x && f.y === y)) {
    features.push('city');
  }
  if (planetData.ruined_cities && planetData.ruined_cities.some(f => f.x === x && f.y === y)) {
    features.push('ruined_city');
  }
  if (planetData.fortresses && planetData.fortresses.some(f => f.x === x && f.y === y)) {
    features.push('fortress');
  }
  if (planetData.craters && planetData.craters.some(f => f.x === x && f.y === y)) {
    features.push('crater');
  }
  if (planetData.deployment_zones && planetData.deployment_zones.some(f => f.x === x && f.y === y)) {
    features.push('deployment_zone');
  }
  if (planetData.landing_zones && planetData.landing_zones.some(f => f.x === x && f.y === y)) {
    features.push('landing_zone');
  }
  if (planetData.digestion_pools && planetData.digestion_pools.some(f => f.x === x && f.y === y)) {
    features.push('digestion_pool');
  }
  if (planetData.biomass && planetData.biomass.some(f => f.x === x && f.y === y)) {
    features.push('biomass');
  }
  
  return features;
}

// Adapted version of createFeatureIcons for preview
function createFeatureIconsForPreview(features) {
  const iconsContainer = document.createElement('div');
  iconsContainer.className = 'feature-icons-large';
  
  features.forEach((feature, index) => {
    const icon = document.createElement('img');
    icon.src = `Icons/${feature}.png`;
    icon.alt = feature;
    icon.className = 'feature-icon';
    icon.style.zIndex = 10 + index;
    
    // Handle missing images gracefully
    icon.onerror = function() {
      console.warn(`Feature icon not found: Icons/${feature}.png`);
      this.style.display = 'none';
    };
    
    iconsContainer.appendChild(icon);
  });
  
  return iconsContainer;
}

// Helper functions for zone detection
function isDeploymentZone(planetData, x, y) {
  return planetData.deployment_zones && 
         planetData.deployment_zones.some(zone => zone.x === x && zone.y === y);
}

function isLandingZone(planetData, x, y) {
  return planetData.landing_zones && 
         planetData.landing_zones.some(zone => zone.x === x && zone.y === y);
}

// Handle commander card clicks with expansion and selection
async function handleCommanderClick(commanderCard, commander) {
  const commanderName = commander.name;
  const upgradeDeckFile = commander.upgrade_deck;
  
  // Handle selection
  document.querySelectorAll(".commander-card").forEach(card => card.classList.remove("selected"));
  commanderCard.classList.add("selected");
  selectedCommander = commander;
  updateContinueButton();
  
  // NEW: Update traits display when commander is selected
  if (selectedFaction) {
    await updateTraitsDisplay(selectedFaction, commander);
  }
  
  // Handle expansion
  if (expandedCommander === commanderName) {
    // Collapse if already expanded
    commanderCard.classList.remove("expanded");
    expandedCommander = null;
  } else {
    // Collapse any other expanded commander
    document.querySelectorAll(".commander-card").forEach(card => card.classList.remove("expanded"));
    
    // Expand this commander
    commanderCard.classList.add("expanded");
    expandedCommander = commanderName;
    
    // Load upgrade deck if not already cached
    if (!commanderUpgradeDecks[upgradeDeckFile]) {
      await loadCommanderUpgradeDeck(commanderName, upgradeDeckFile);
    } else {
      // Use cached data
      displayCommanderUpgradeDeck(commanderName, commanderUpgradeDecks[upgradeDeckFile]);
    }
  }
}


async function updateTraitsDisplay(faction, selectedCommander = null) {
  const traitsContainer = document.querySelector('.faction-traits-container');
  if (!traitsContainer) return;
  
  const traitsListContainer = traitsContainer.querySelector('.faction-traits-list');
  if (!traitsListContainer) return;
  
  const traitsLibrary = await loadTraitsLibrary();
  traitsListContainer.innerHTML = "";
  
  // Display faction traits
  if (faction.traits && faction.traits.length > 0) {
    const factionTraitsSection = document.createElement("div");
    factionTraitsSection.className = "traits-section faction-traits-section";
    factionTraitsSection.innerHTML = `<div class="traits-section-header">Faction Traits</div>`;
    
    faction.traits.forEach(traitName => {
      const traitData = traitsLibrary[traitName];
      if (traitData) {
        const traitElement = document.createElement("div");
        traitElement.className = "trait-display faction-trait";
        traitElement.innerHTML = `
          <div class="trait-name">${traitData.name}</div>
          <div class="trait-description">${traitData.description}</div>
        `;
        factionTraitsSection.appendChild(traitElement);
      }
    });
    
    traitsListContainer.appendChild(factionTraitsSection);
  }
  
  // Display commander traits if a commander is selected
  if (selectedCommander && selectedCommander.traits && selectedCommander.traits.length > 0) {
    const commanderTraitsSection = document.createElement("div");
    commanderTraitsSection.className = "traits-section commander-traits-section";
    commanderTraitsSection.innerHTML = `<div class="traits-section-header">Commander Traits (${selectedCommander.name})</div>`;
    
    selectedCommander.traits.forEach(traitName => {
      const traitData = traitsLibrary[traitName];
      if (traitData) {
        const traitElement = document.createElement("div");
        traitElement.className = "trait-display commander-trait";
        traitElement.innerHTML = `
          <div class="trait-name">${traitData.name}</div>
          <div class="trait-description">${traitData.description}</div>
        `;
        commanderTraitsSection.appendChild(traitElement);
      }
    });
    
    traitsListContainer.appendChild(commanderTraitsSection);
  }
  
  // If no traits at all, show placeholder
  if (traitsListContainer.children.length === 0) {
    traitsListContainer.innerHTML = '<div class="no-traits">No special traits</div>';
  }
}

// Load commander upgrade deck from server
async function loadCommanderUpgradeDeck(commanderName, upgradeDeckFile) {
  try {
    const res = await fetch(`${API_BASE}/getcommanderdeck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upgradeDeckFile)
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error("Failed to load upgrade deck:", data.error);
      displayUpgradeDeckError(commanderName, data.error);
      return;
    }
    
    // Cache the data
    commanderUpgradeDecks[upgradeDeckFile] = data;
    
    // Display the deck
    displayCommanderUpgradeDeck(commanderName, data);
    
  } catch (error) {
    console.error("Network error loading upgrade deck:", error);
    displayUpgradeDeckError(commanderName, "Network error");
  }
}

// Display the commander's upgrade deck organized by category and level
function displayCommanderUpgradeDeck(commanderName, deckData) {
  const countElement = document.getElementById(`deck-count-${commanderName}`);
  const gridElement = document.getElementById(`upgrade-grid-${commanderName}`);
  
  if (!countElement || !gridElement) return;
  
  // Update count
  countElement.textContent = `${deckData.total_cards} cards`;
  
  // Clear loading message
  gridElement.innerHTML = "";
  gridElement.className = "upgrade-categories-container";
  
  // Organize cards by category and level
  const organizedCards = organizeUpgradeCards(deckData.upgrade_deck);
  
  // Create category containers
  Object.keys(organizedCards).sort().forEach(category => {
    const categoryData = organizedCards[category];
    const categoryContainer = createCategoryContainer(category, categoryData);
    gridElement.appendChild(categoryContainer);
  });
}

// Organize upgrade cards by category and level
function organizeUpgradeCards(cards) {
  const organized = {};
  
  // Count card occurrences and organize by category/level
  const cardCounts = {};
  cards.forEach(card => {
    if (card.error) return;
    
    const key = `${card.category}_${card.level}_${card.name}`;
    if (!cardCounts[key]) {
      cardCounts[key] = { card: card, count: 0 };
    }
    cardCounts[key].count++;
  });
  
  // Organize into structure
  Object.values(cardCounts).forEach(({ card, count }) => {
    const category = card.category || 'unknown';
    const level = card.level || 1;
    
    if (!organized[category]) {
      organized[category] = {};
    }
    
    if (!organized[category][level]) {
      organized[category][level] = [];
    }
    
    organized[category][level].push({ ...card, count });
  });
  
  // Sort cards within each level alphabetically
  Object.keys(organized).forEach(category => {
    Object.keys(organized[category]).forEach(level => {
      organized[category][level].sort((a, b) => a.name.localeCompare(b.name));
    });
  });
  
  return organized;
}

// Create a category container with level-based grid
function createCategoryContainer(category, categoryData) {
  const categoryContainer = document.createElement("div");
  categoryContainer.className = `upgrade-category ${category}`;
  
  // Calculate total cards in this category
  const totalCards = Object.values(categoryData).reduce((sum, levelCards) => {
    return sum + levelCards.reduce((levelSum, card) => levelSum + card.count, 0);
  }, 0);
  
  // Category header
  const categoryHeader = document.createElement("div");
  categoryHeader.className = "upgrade-category-header";
  categoryHeader.innerHTML = `
    <div class="upgrade-category-title">${formatCategoryName(category)}</div>
    <div class="upgrade-category-count">${totalCards} cards</div>
  `;
  
  // Level grid
  const levelGrid = document.createElement("div");
  levelGrid.className = "upgrade-level-grid";
  
  // Get all levels present in this category and sort them
  const levels = Object.keys(categoryData).map(Number).sort((a, b) => a - b);
  
  // Create columns for each level
  levels.forEach(level => {
    const levelColumn = document.createElement("div");
    levelColumn.className = "upgrade-level-column";
    
    // Level header
    const levelHeader = document.createElement("div");
    levelHeader.className = "upgrade-level-header";
    levelHeader.textContent = `Level ${level}`;
    levelColumn.appendChild(levelHeader);
    
    // Cards in this level
    categoryData[level].forEach(card => {
      const cardElement = createUpgradeCardElement(card);
      levelColumn.appendChild(cardElement);
    });
    
    levelGrid.appendChild(levelColumn);
  });
  
  categoryContainer.appendChild(categoryHeader);
  categoryContainer.appendChild(levelGrid);
  
  return categoryContainer;
}

// Create individual upgrade card element - streamlined version
function createUpgradeCardElement(card) {
  const cardElement = document.createElement("div");
  cardElement.className = `upgrade-card-item level-${card.level}`;
  cardElement.setAttribute('data-card-name', formatCardName(card.name));
  
  // Build cost display with individual cost items
  const costs = [];
  if (card.costbiomass > 0) {
    costs.push(`<div class="upgrade-cost-item">
      <div class="upgrade-cost-icon biomass"></div>
      <span class="upgrade-cost-number">${card.costbiomass}</span>
    </div>`);
  }
  if (card.costplasteel > 0) {
    costs.push(`<div class="upgrade-cost-item">
      <div class="upgrade-cost-icon plasteel"></div>
      <span class="upgrade-cost-number">${card.costplasteel}</span>
    </div>`);
  }
  if (card.costpromethium > 0) {
    costs.push(`<div class="upgrade-cost-item">
      <div class="upgrade-cost-icon promethium"></div>
      <span class="upgrade-cost-number">${card.costpromethium}</span>
    </div>`);
  }
  
  cardElement.innerHTML = `
    <img src="${card.image}" alt="${card.name}" class="upgrade-card-image"
         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNDU0NzVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VcGdyYWRlPC90ZXh0Pjwvc3ZnPg=='">
    <div class="upgrade-card-cost">${costs.join('')}</div>
    ${card.count > 1 ? `<div class="upgrade-card-count-badge">${card.count}</div>` : ''}
  `;
  
  // Add hover tooltip with keywords if available
  if (card.keywords && card.keywords.length > 0) {
    cardElement.title = `${formatCardName(card.name)} - Keywords: ${card.keywords.join(', ')}`;
  } else {
    cardElement.title = formatCardName(card.name);
  }
  
  return cardElement;
}

// Enhanced format category name function
function formatCategoryName(category) {
  if (category === 'unknown') {
    return 'Unknown';
  }
  return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Update the existing formatCardName function to handle level suffixes
function formatCardName(cardName) {
  // Remove level suffixes (like "2", "3") from the end of card names
  const cleanName = cardName.replace(/\d+$/, '');
  return cleanName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Display error message for upgrade deck
function displayUpgradeDeckError(commanderName, errorMessage) {
  const countElement = document.getElementById(`deck-count-${commanderName}`);
  const gridElement = document.getElementById(`upgrade-grid-${commanderName}`);
  
  if (countElement) countElement.textContent = "Error";
  if (gridElement) {
    gridElement.innerHTML = `<div class="upgrade-deck-loading" style="color: #f38ba8;">Error: ${errorMessage}</div>`;
  }
}

// Handle deck expansion and selection
async function handleDeckClick(deckCard, deckFile, factionName) {
  // Handle selection
  document.querySelectorAll(".deck-card").forEach(card => card.classList.remove("selected"));
  deckCard.classList.add("selected");
  selectedDeck = deckFile;
  updateContinueButton();
  
  // Handle expansion
  if (expandedDeck === deckFile) {
    // Collapse if already expanded
    deckCard.classList.remove("expanded");
    expandedDeck = null;
  } else {
    // Collapse any other expanded deck
    document.querySelectorAll(".deck-card").forEach(card => card.classList.remove("expanded"));
    
    // Expand this deck
    deckCard.classList.add("expanded");
    expandedDeck = deckFile;
    
    // Load deck contents if not already cached
    if (!deckContents[deckFile]) {
      await loadDeckContents(deckFile, factionName);
    } else {
      // Use cached data
      displayDeckContents(deckFile, deckContents[deckFile]);
    }
  }
}

// Load deck contents from server
async function loadDeckContents(deckFile, factionName) {
  try {
    // We'll need to add a new backend endpoint for this
    const res = await fetch(`${API_BASE}/getdeckcontents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck_file: deckFile })
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error("Failed to load deck contents:", data.error);
      displayDeckError(deckFile, data.error);
      return;
    }
    
    // Cache the data
    deckContents[deckFile] = data;
    
    // Display the deck
    displayDeckContents(deckFile, data);
    
  } catch (error) {
    console.error("Network error loading deck:", error);
    displayDeckError(deckFile, "Network error");
  }
}

// Display deck contents with card stacking
function displayDeckContents(deckFile, deckData) {
  const countElement = document.getElementById(`deck-count-${deckFile}`);
  const infoElement = document.getElementById(`deck-info-${deckFile}`);
  const containerElement = document.getElementById(`deck-cards-${deckFile}`);
  
  if (!countElement || !containerElement) return;
  
  // Update count and info
  countElement.textContent = `${deckData.total_cards} cards`;
  if (infoElement) {
    const uniqueCards = Object.keys(deckData.organized_cards).length;
    infoElement.textContent = `${uniqueCards} unique cards`;
  }
  
  // Clear loading message
  containerElement.innerHTML = "";
  
  // Create card stacks
  Object.entries(deckData.organized_cards).forEach(([cardName, cardData]) => {
    const cardStack = createDeckCardStack(cardName, cardData);
    containerElement.appendChild(cardStack);
  });
}

// Create a card stack with stacking effect for duplicates
function createDeckCardStack(cardName, cardData) {
  const stack = document.createElement("div");
  stack.className = `deck-card-stack ${cardData.count > 1 ? 'has-duplicates' : ''}`;
  stack.setAttribute('data-card-name', formatCardName(cardName));
  
  // Create multiple images for stacking effect (max 4 for visual purposes)
  const imagesToShow = Math.min(cardData.count, 4);
  for (let i = 0; i < imagesToShow; i++) {
    const cardImage = document.createElement("img");
    cardImage.src = cardData.card.image;
    cardImage.alt = cardName;
    cardImage.className = "deck-card-image";
    cardImage.onerror = function() {
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0NTQ3NWEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DYXJkPC90ZXh0Pjwvc3ZnPg==';
    };
    
    stack.appendChild(cardImage);
  }
  
  // Add stats overlay to the top card
  const statsOverlay = document.createElement("div");
  statsOverlay.className = "deck-card-stats";
  statsOverlay.textContent = `🏃${cardData.card.movement} ⚔️${cardData.card.melee} 🏹${cardData.card.ranged} 💥${cardData.card.blast} 🛡️${cardData.card.armor} ❤️${cardData.card.health} 🧠${cardData.card.courage}`;
  stack.appendChild(statsOverlay);
  
  // Add count badge if more than 1
  if (cardData.count > 1) {
    const countBadge = document.createElement("div");
    countBadge.className = "deck-card-stack-count";
    countBadge.textContent = cardData.count;
    stack.appendChild(countBadge);
  }
  
  // Add hover tooltip with full stats
  if (cardData.card) {
    const card = cardData.card;
    stack.title = `${formatCardName(cardName)} (${cardData.count}x)\n` +
                  `Movement: ${card.movement}, Melee: ${card.melee}, Ranged: ${card.ranged}, Blast: ${card.blast}\n` +
                  `Health: ${card.health}, Armor: ${card.armor}, Courage: ${card.courage}`;
  }
  
  return stack;
}

// Display error for deck loading
function displayDeckError(deckFile, errorMessage) {
  const countElement = document.getElementById(`deck-count-${deckFile}`);
  const containerElement = document.getElementById(`deck-cards-${deckFile}`);
  
  if (countElement) countElement.textContent = "Error";
  if (containerElement) {
    containerElement.innerHTML = `<div class="deck-contents-loading" style="color: #f38ba8;">Error: ${errorMessage}</div>`;
  }
}

function updateContinueButton() {
  if (isJoiningPlayer) {
    updateJoiningPlayerContinueButton();
  } else {
    const continueBtn = document.getElementById("proceedToPlanetSelection");
    if (selectedCommander && selectedDeck) {
      continueBtn.disabled = false;
      continueBtn.classList.remove("disabled");
      continueBtn.textContent = "Continue";
    } else {
      continueBtn.disabled = true;
      continueBtn.classList.add("disabled");
      continueBtn.textContent = "Continue";
    }
  }
}

document.getElementById("proceedToPlanetSelection").addEventListener("click", async () => {
  if (!selectedFaction || !selectedCommander || !selectedDeck) {
    alert("Please select a faction, commander, and deck first");
    return;
  }
  
  // Store selections for later use
  console.log("Selected:", {
    faction: selectedFaction.name,
    commander: selectedCommander.name,
    deck: selectedDeck,
    joiningPlayer: isJoiningPlayer,
    sessionId: currentSessionId
  });
  
  if (isJoiningPlayer) {
    // For joining players, go directly to join the session (no planet selection)
    await joinSessionWithFactionData();
  } else {
    // For starting players, proceed to planet selection
    showPlanetSelectionWithFaction();
  }
});

// New function to join session with faction data
async function joinSessionWithFactionData() {
  try {
    // Set home planet from faction selection
    homePlanet = selectedFaction.home_planet;
    
    const requestBody = {
      sessionid: currentSessionId, // Will be null for "join any session"
      game_type: "multiplayer",
      faction: selectedFaction.name,
      home_planet: homePlanet,
      commander: selectedCommander.name,
      deck: selectedDeck
    };

    console.log("Joining session with faction data:", requestBody);

    const res = await fetch(`${API_BASE}/joinsession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    
    if (data.error) {
      alert("Error joining session: " + data.error);
      startConsoleLog.innerHTML += `<div class="error-message">Join error: ${data.error}</div>`;
      return;
    }
    
    currentSessionId = data.sessionid;
    
    // Determine which player we are based on the response
    if (data.players) {
      const playerKeys = Object.keys(data.players);
      if (playerKeys.length === 1) {
        // We're the first player
        currentPlayer = playerKeys[0];
      } else if (playerKeys.length === 2) {
        // Find which player has our faction/commander
        for (const [playerKey, playerData] of Object.entries(data.players)) {
          if (playerData.faction === selectedFaction.name && 
              playerData.commander === selectedCommander.name) {
            currentPlayer = playerKey;
            break;
          }
        }
        // Fallback - assume we're player2 if we can't determine
        if (!currentPlayer) {
          currentPlayer = "player2";
        }
      }
    } else {
      currentPlayer = "player2"; // Default fallback
    }
    
    console.log("Joined as:", currentPlayer, "in session:", currentSessionId);
    
    // Update console if available
    if (data.console?.[currentPlayer]) {
      const messages = data.console[currentPlayer];
      startConsoleLog.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
    }
    
    // Go directly to game screen
    switchToGameScreen();
    updateGameStateAndRender(data);
    setupPolling();
    
  } catch (error) {
    console.error("Failed to join session:", error);
    alert("Failed to join session: " + error.message);
    startConsoleLog.innerHTML += `<div class="error-message">Network error: ${error.message}</div>`;
  }
}

// Quick Join button handler
document.getElementById("quickJoinGame").addEventListener("click", async () => {
  const sessionInput = document.getElementById("sessionInput").value.trim();
  
  try {
    console.log("=== QUICK JOIN CLICKED ===");
    
    // First, load factions and check what's taken
    const factionsRequest = {
      startsession: false,
      sessionid: sessionInput || null
    };
    
    const factionsRes = await fetch(`${API_BASE}/getfactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factionsRequest)
    });
    
    const factionsData = await factionsRes.json();
    
    if (factionsData.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error: ${factionsData.error}</div>`;
      return;
    }
    
    // Store session ID if we found one
    if (factionsData.sessionid && !sessionInput) {
      currentSessionId = factionsData.sessionid;
    } else if (sessionInput) {
      currentSessionId = sessionInput;
    }
    
    const factionsTaken = factionsData.factions_taken || {};
    
    // Find available faction (prefer Tyranids, then alphabetical)
    let selectedFactionName = "Tyranids";
    
    if (factionsTaken["Tyranids"]) {
      // Tyranids taken, find first available faction alphabetically
      const availableFactions = factionsData.factions
        .filter(faction => !factionsTaken[faction.name])
        .sort((a, b) => a.name.localeCompare(b.name));
      
      if (availableFactions.length === 0) {
        startConsoleLog.innerHTML += `<div class="error-message">No factions available in this session</div>`;
        return;
      }
      
      selectedFactionName = availableFactions[0].name;
      startConsoleLog.innerHTML += `<div style="color: #fab387;">Tyranids taken, selecting ${selectedFactionName} instead</div>`;
    }
    
    // Find the selected faction data
    const selectedFaction = factionsData.factions.find(faction => faction.name === selectedFactionName);
    if (!selectedFaction) {
      startConsoleLog.innerHTML += `<div class="error-message">${selectedFactionName} faction not found</div>`;
      return;
    }
    
    // Get faction details
    const homePlanet = selectedFaction.home_planet;
    const commanders = selectedFaction.commander.sort((a, b) => a.name.localeCompare(b.name));
    const firstCommander = commanders[0];
    const decks = selectedFaction.decks.sort((a, b) => a.localeCompare(b));
    const firstDeck = decks[0];
    
    // Create quick join request
    const quickJoinRequest = {
      sessionid: currentSessionId,
      game_type: "multiplayer",
      faction: selectedFactionName,
      home_planet: homePlanet,
      commander: firstCommander.name,
      deck: firstDeck
    };
    
    console.log("Quick joining with:", quickJoinRequest);
    startConsoleLog.innerHTML += `<div style="color: #fab387; font-weight: bold;">⚡ Quick Join: ${selectedFactionName}</div>`;
    startConsoleLog.innerHTML += `<div>Commander: ${firstCommander.name} | Home: ${homePlanet}</div>`;
    
    // Continue with the rest of the existing Quick Join logic...
    const res = await fetch(`${API_BASE}/joinsession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickJoinRequest)
    });

    const data = await res.json();
    
    if (data.error) {
      alert("Error with Quick Join: " + data.error);
      startConsoleLog.innerHTML += `<div class="error-message">Quick Join error: ${data.error}</div>`;
      return;
    }
    
    // Set up game state
    currentSessionId = data.sessionid;
    isJoiningPlayer = true;
    
    // Determine which player we are
    if (data.players) {
      const playerKeys = Object.keys(data.players);
      if (playerKeys.length === 1) {
        currentPlayer = playerKeys[0];
      } else if (playerKeys.length === 2) {
        // Find which player has our faction/commander
        for (const [playerKey, playerData] of Object.entries(data.players)) {
          if (playerData.faction === "Tyranids" && 
              playerData.commander === firstCommander.name) {
            currentPlayer = playerKey;
            break;
          }
        }
        if (!currentPlayer) {
          currentPlayer = "player2"; // Fallback
        }
      }
    } else {
      currentPlayer = "player2"; // Default fallback
    }
    
    // Store the faction data for later use
    selectedCommander = firstCommander;
    selectedDeck = firstDeck;
    
    console.log("Quick joined as:", currentPlayer, "in session:", currentSessionId);
    
    // Update console
    if (data.console?.[currentPlayer]) {
      const messages = data.console[currentPlayer];
      startConsoleLog.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
    }
    
    // Add Quick Join success message
    startConsoleLog.innerHTML += `<div style="color: #a6e3a1; font-weight: bold;">✅ Quick Join Successful!</div>`;
    startConsoleLog.innerHTML += `<div>Playing as: Tyranids | Session: ${currentSessionId}</div>`;
    
    // Hide join dialog
    joinDialog.classList.add("hidden");
    
    // Go directly to game screen or wait for game to start
    if (data.players && Object.keys(data.players).length === 2) {
      switchToGameScreen();
    }
    
    // Start polling and update game state
    updateGameStateAndRender(data);
    setupPolling();
    
  } catch (error) {
    console.error("Failed to Quick Join:", error);
    alert("Failed to Quick Join: " + error.message);
    startConsoleLog.innerHTML += `<div class="error-message">Network error: ${error.message}</div>`;
  }
});

async function showPlanetSelectionWithFaction() {
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
    
    // Pre-select the home planet from faction selection
    selectedPlanets.clear();
    if (selectedFaction && selectedFaction.home_planet) {
      selectedPlanets.add(selectedFaction.home_planet);
      homePlanet = selectedFaction.home_planet;
    }
    
    // Hide faction details and show planet selection
    document.getElementById("faction-details-menu").classList.add("hidden");
    showPlanetSelectionScreen();
  } catch (error) {
    console.error("Failed to fetch planets:", error);
    startConsoleLog.innerHTML += `<div class="error-message">Failed to load planets</div>`;
  }
}

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
    
    // Check if this is the pre-selected home planet
    const isHomePlanet = (planetName === homePlanet);
    const isSelected = selectedPlanets.has(planetName);
    
    // Add appropriate classes
    if (isSelected) {
      planetCard.classList.add("selected");
    }
    if (isHomePlanet) {
      planetCard.classList.add("home-planet", "locked-home");
    }
    
    planetCard.innerHTML = `
      <img src="${planetData.background_image}" alt="${planetName}" class="planet-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
      <div class="planet-overlay">
        <div class="planet-name">${planetName}</div>
        <div class="planet-info">${planetData.width}×${planetData.height}</div>
        ${isHomePlanet ? '<div class="home-planet-indicator">HOME PLANET</div>' : ''}
      </div>
    `;
    
    // Add click handler only for non-home planets
    if (!isHomePlanet) {
      planetCard.addEventListener("click", (e) => {
        togglePlanetSelection(planetName);
      });
    } else {
      // Add a disabled cursor and tooltip for home planet
      planetCard.style.cursor = 'not-allowed';
      planetCard.title = 'This is your home planet (selected during faction choice)';
    }
    
    planetsContainer.appendChild(planetCard);
  });
}

function togglePlanetSelection(planetName) {
  // Prevent deselection of home planet
  if (planetName === homePlanet) {
    return;
  }
  
  const planetCard = document.querySelector(`[data-planet-name="${planetName}"]`);
  
  if (selectedPlanets.has(planetName)) {
    selectedPlanets.delete(planetName);
    planetCard.classList.remove("selected");
  } else {
    selectedPlanets.add(planetName);
    planetCard.classList.add("selected");
  }
  
  updateSelectionStatus();
}

function updateSelectionStatus() {
  selectedCountSpan.textContent = selectedPlanets.size;
  homePlanetNameSpan.textContent = homePlanet || "None";
  
  // Enable/disable start button - home planet is always set from faction selection
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

// Update the startSessionBtn event listener to send faction data
startSessionBtn.addEventListener("click", async () => {
  if (startSessionBtn.classList.contains("disabled")) return;
  
  try {
    let res, data;
    
      // Starting a new session with full faction data
      if (!selectedFaction || !selectedCommander || !selectedDeck) {
        alert("Please complete faction selection first");
        return;
      }
      
      res = await fetch(`${API_BASE}/newmpsession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: "multiplayer",
          planets_to_play_with: Array.from(selectedPlanets),
          faction: selectedFaction.name,
          home_planet: homePlanet,
          commander: selectedCommander.name,
          deck: selectedDeck
        })
      });


    data = await res.json();
    
    if (data.error) {
      alert(`Error ${currentSessionId ? 'joining' : 'creating'} session: ` + data.error);
      return;
    }
    
    currentSessionId = data.sessionid;

    if (!isJoiningPlayer) {
      currentPlayer = "player1";
    } else {
      currentPlayer = "player2";
    }

    // Update console if available
    if (data.console?.[currentPlayer]) {
      const messages = data.console[currentPlayer];
      startConsoleLog.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
    }
    
    // Handle screen transitions
    if (isJoiningPlayer) {
      switchToGameScreen();
    } else if (currentPlayer === "player1" && data.players?.player2) {
      switchToGameScreen();
    } else {
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

// Quick Match button handler
document.getElementById("quickMatchBtn").addEventListener("click", async () => {
  try {
    // First, load factions to get Space Marines data with correct POST format
    const factionsRes = await fetch(`${API_BASE}/getfactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startsession: true,  // We're starting a new session
        sessionid: null      // No session ID since we're creating one
      })
    });
    
    const factionsData = await factionsRes.json();
    
    if (factionsData.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error loading factions: ${factionsData.error}</div>`;
      return;
    }
    
    // Find Space Marines faction
    const spaceMarinesFaction = factionsData.factions.find(faction => faction.name === "Space Marines");
    if (!spaceMarinesFaction) {
      startConsoleLog.innerHTML += `<div class="error-message">Space Marines faction not found</div>`;
      return;
    }
    
    // Get Space Marines home planet
    const homePlanet = spaceMarinesFaction.home_planet;
    
    // Get first commander alphabetically
    const commanders = spaceMarinesFaction.commander.sort((a, b) => a.name.localeCompare(b.name));
    const firstCommander = commanders[0];
    
    // Get first deck alphabetically
    const decks = spaceMarinesFaction.decks.sort((a, b) => a.localeCompare(b));
    const firstDeck = decks[0];
    
    // Get all available planets using the correct POST format
    const planetsRes = await fetch(`${API_BASE}/getplanets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsession: true })
    });
    
    const planetsData = await planetsRes.json();
    if (planetsData.error) {
      startConsoleLog.innerHTML += `<div class="error-message">Error loading planets: ${planetsData.error}</div>`;
      return;
    }
    
    const allPlanetNames = Object.keys(planetsData.planets);
    
    // Create quick match session
    const quickMatchRequest = {
      game_type: "multiplayer",
      planets_to_play_with: allPlanetNames,
      faction: "Space Marines",
      home_planet: homePlanet,
      commander: firstCommander.name,
      deck: firstDeck
    };
    
    console.log("Creating Quick Match session:", quickMatchRequest);
    startConsoleLog.innerHTML += `<div>Creating Quick Match session with Space Marines...</div>`;
    
    const res = await fetch(`${API_BASE}/newmpsession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickMatchRequest)
    });

    const data = await res.json();
    
    if (data.error) {
      alert("Error creating Quick Match: " + data.error);
      startConsoleLog.innerHTML += `<div class="error-message">Quick Match error: ${data.error}</div>`;
      return;
    }
    
    // Set up game state
    currentSessionId = data.sessionid;
    currentPlayer = "player1";
    isJoiningPlayer = false;
    
    // Store the faction data for later use
    selectedFaction = spaceMarinesFaction;
    selectedCommander = firstCommander;
    selectedDeck = firstDeck;
    
    // Update console
    if (data.console?.[currentPlayer]) {
      const messages = data.console[currentPlayer];
      startConsoleLog.innerHTML = messages.map(m => `<div>${m}</div>`).join("");
    }
    
    // Add Quick Match identifier to console
    startConsoleLog.innerHTML += `<div style="color: #89b4fa; font-weight: bold;">⚡ Quick Match Created!</div>`;
    startConsoleLog.innerHTML += `<div>Faction: Space Marines | Commander: ${firstCommander.name}</div>`;
    startConsoleLog.innerHTML += `<div>Session ID: ${currentSessionId}</div>`;
    startConsoleLog.innerHTML += `<div>Waiting for opponent to join...</div>`;
    
    // Start polling and update game state
    updateGameStateAndRender(data);
    setupPolling();
    
    // Stay on start screen until player2 joins
    // The existing polling logic will automatically switch to game screen when player2 joins
    
  } catch (error) {
    console.error("Failed to create Quick Match:", error);
    alert("Failed to create Quick Match: " + error.message);
    startConsoleLog.innerHTML += `<div class="error-message">Network error: ${error.message}</div>`;
  }
});


// Update the Join Game button on start screen
joinGameBtn.addEventListener("click", () => {
  isJoiningPlayer = true;
  joinDialog.classList.remove("hidden");
});

// Cancel Join Game
cancelJoinBtn.addEventListener("click", () => {
  joinDialog.classList.add("hidden");
  isJoiningPlayer = false;
});

// join game functionality
document.getElementById("joinGame").addEventListener("click", async () => {
  const input = document.getElementById("sessionInput").value.trim();
  
  try {
    // Store the session ID and set joining context
    currentSessionId = input || null;
    isJoiningPlayer = true;
    
    // Hide join dialog and show faction selection for joining player
    joinDialog.classList.add("hidden");
    showFactionSelection(); // This will now call loadFactions() with isJoiningPlayer = true
    
  } catch (error) {
    console.error("Error in join game:", error);
    startConsoleLog.innerHTML += `<div class="error-message">Failed to load game data: ${error.message}</div>`;
  }
});

// Update continue button for joining player
function updateJoiningPlayerContinueButton() {
  const continueBtn = document.getElementById("proceedToPlanetSelection");
  if (selectedCommander && selectedDeck) {
    continueBtn.disabled = false;
    continueBtn.classList.remove("disabled");
    // Update button text for joining player
    continueBtn.textContent = "Join Game";
  } else {
    continueBtn.disabled = true;
    continueBtn.classList.add("disabled");
    continueBtn.textContent = "Join Game";
  }
}


// Function to switch from start screen to game screen
function switchToGameScreen() {
  startScreen.classList.add("hidden");
  planetSelectionScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  
  // Load token library
  loadTokenLibrary();
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
    // Force recalculation of everything when entering game screen
    initializePlanetNavigation();
    createPlanetPreviews();
    updatePlanetPreviewTiles();
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
  
  // Get all home planets (current player + enemies)
  const allHomePlanets = new Set([currentPlayerHomePlanet, ...enemyHomePlanets]);
  
  // Get other planets (not any home planets) and sort alphabetically
  const otherPlanets = allPlanets
    .filter(planet => !allHomePlanets.has(planet))
    .sort(); // Sort alphabetically
  
  // Build the order: current player home -> other planets (alphabetical) -> enemy home planets (alphabetical)
  const order = [];
  
  // 1. Current player's home planet first
  if (currentPlayerHomePlanet) {
    order.push(currentPlayerHomePlanet);
  }
  
  // 2. All other planets (not home planets) in alphabetical order
  order.push(...otherPlanets);
  
  // 3. Enemy home planets in alphabetical order
  order.push(...enemyHomePlanets);
  
  return order;
}


// Function to update only the planet preview highlighting (fast update)
function updatePlanetPreviewHighlight() {
  // Remove current planet highlighting from all previews
  document.querySelectorAll(".planet-preview").forEach(preview => {
    preview.classList.remove("current-planet");
  });
  
  // Add highlighting to currently displayed planet
  if (currentDisplayedPlanet) {
    const currentPreview = document.querySelector(`.planet-preview[data-planet-name="${currentDisplayedPlanet}"]`);
    if (currentPreview) {
      currentPreview.classList.add("current-planet");
    }
  }
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

  updatePlanetPreviewHighlight();
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

// Add function to load token library
async function loadTokenLibrary() {
  try {
    const res = await fetch(`${API_BASE}/token_library`);
    const data = await res.json();
    tokenLibrary = data;
    console.log("Token library loaded:", tokenLibrary);
  } catch (error) {
    console.error("Failed to load token library:", error);
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

  // Update city population displays
  updateCityPopulationDisplays();
  // Update biomass amount displays
  updateBiomassAmountDisplays();

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

        // Add token icons if entity has tokens
        const tokenIcons = createTokenIcons(card);
        if (tokenIcons) {
          cardElement.appendChild(tokenIcons);
        }

        // Add sick overlay if needed
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

        // Add cost display to cards on board
        const costs = [];
        if (card.costbiomass > 0) {
          costs.push(`<div class="board-cost-item">
            <div class="board-cost-icon biomass"></div>
            <span class="board-cost-number">${card.costbiomass}</span>
          </div>`);
        }
        if (card.costplasteel > 0) {
          costs.push(`<div class="board-cost-item">
            <div class="board-cost-icon plasteel"></div>
            <span class="board-cost-number">${card.costplasteel}</span>
          </div>`);
        }
        if (card.costpromethium > 0) {
          costs.push(`<div class="board-cost-item">
            <div class="board-cost-icon promethium"></div>
            <span class="board-cost-number">${card.costpromethium}</span>
          </div>`);
        }

        if (costs.length > 0) {
          const costContainer = document.createElement("div");
          costContainer.className = "board-card-cost";
          costContainer.innerHTML = costs.join('');
          cardElement.appendChild(costContainer);
        }

        // Update feature icons to small size when card is present
        const featureContainer = tile.querySelector('.feature-icons-large');
        if (featureContainer) {
          featureContainer.className = 'feature-icons-small';
        }

        // Add interaction handlers - but only for current player's cards
        if (card.owner === currentPlayer) {
          cardElement.style.cursor = "pointer";

          if (latestGameState.stage === "movement" && !card.moved_this_turn) {
            cardElement.classList.add("selectabletomove");
          }

          if (latestGameState.stage === "prebattle" && !card.has_attacked_this_stage) {
            cardElement.classList.add("selectabletoattack");
          }

          cardElement.addEventListener("click", async (e) => {
            e.stopPropagation();
            
            // Check if this entity has effects eligible for the current stage
            const eligibleEffects = getBoardEntityEligibleEffects(card);
            
            // Determine available actions based on stage
            const availableActions = [];
            
            if (latestGameState.stage === "movement" && !card.moved_this_turn) {
              availableActions.push({
                type: "movement",
                name: "Move",
                description: "Move this unit"
              });
            }
            
            if (latestGameState.stage === "prebattle" && !card.has_attacked_this_stage) {
              availableActions.push({
                type: "attack",
                name: "Attack",
                description: "Designate attack target"
              });
            }
            
            // Add eligible effects as actions
            eligibleEffects.forEach(effect => {
              availableActions.push({
                type: "effect",
                name: effect.name,
                description: getEffectDescription(effect),
                effect: effect
              });
            });
            
            if (availableActions.length === 0) {
              return; // No actions available
            } else if (availableActions.length === 1 && latestGameState.stage === "movement") {
              // Only one action available, execute it directly
              await executeBoardEntityAction(card, availableActions[0], e);
            } else if (availableActions.length === 1 && latestGameState.stage === "prebattle") {
              // Only one action available, execute it directly
              await executeBoardEntityAction(card, availableActions[0], e);
            } else {
              // show selection menu
              showBoardEntityActionMenu(card, availableActions, e);
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


function getBoardEntityEligibleEffects(entity) {
  if (!entity.effects || entity.effects.length === 0) {
    return [];
  }
  
  const eligibleEffects = [];
  
  for (const effect of entity.effects) {
    if (isEffectEligibleWithConsumption(effect, entity)) {
      eligibleEffects.push(effect);
    }
  }
  
  return eligibleEffects;
}

async function executeBoardEntityAction(entity, action, clickEvent) {
  if (action.type === "movement") {
    selectedEntity = entity;
    highlightSelectedCard(entity.entityid);
    highlightMovementTiles(entity);
  } else if (action.type === "attack") {
    selectedAttacker = entity;
    highlightSelectedCard(entity.entityid);
  } else if (action.type === "effect") {
    await initiateEffectTargeting(entity, action.effect);
  }
}

function showBoardEntityActionMenu(entity, actions, clickEvent) {
  const menu = document.getElementById('effect-menu');
  const menuItems = document.getElementById('effect-menu-items');
  
  // Update header
  const header = menu.querySelector('.effect-menu-header');
  header.textContent = `${entity.cardtype} Actions`;
  
  // Store the entity for later use
  currentEffectMenuEntity = entity;
  
  // Clear previous items
  menuItems.innerHTML = '';
  
  // Create menu items for each action
  actions.forEach(action => {
    const menuItem = createBoardEntityActionMenuItem(entity, action);
    menuItems.appendChild(menuItem);
  });
  
  // Position the menu near the clicked card
  const rect = clickEvent.target.getBoundingClientRect();
  menu.style.left = `${rect.right + 10}px`;
  menu.style.top = `${rect.top}px`;
  
  // Ensure menu stays within viewport
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (menuRect.right > viewportWidth) {
    menu.style.left = `${rect.left - menuRect.width - 10}px`;
  }
  
  if (menuRect.bottom > viewportHeight) {
    menu.style.top = `${rect.bottom - menuRect.height}px`;
  }
  
  // Show the menu
  menu.style.display = 'block';
  
  // Add global click listener to close menu
  setTimeout(() => {
    document.addEventListener('click', handleEffectMenuGlobalClick);
  }, 10);
}

function createBoardEntityActionMenuItem(entity, action) {
  const menuItem = document.createElement('div');
  menuItem.className = 'effect-menu-item';
  
  // Check if player can afford this action (for effects)
  let canAfford = true;
  if (action.type === "effect") {
    canAfford = canPlayerAffordEffect(action.effect);
    if (!canAfford) {
      menuItem.classList.add('disabled');
    }
  }
  
  // Action name
  const actionName = document.createElement('div');
  actionName.className = 'effect-name';
  actionName.textContent = action.name;
  
  // Action description
  const actionDescription = document.createElement('div');
  actionDescription.className = 'effect-description';
  actionDescription.textContent = action.description;
  
  menuItem.appendChild(actionName);
  if (action.description) {
    menuItem.appendChild(actionDescription);
  }
  
  // Add cost display for effects
  if (action.type === "effect" && action.effect.cost) {
    const effectCost = createEffectCostDisplay(action.effect);
    if (effectCost) {
      menuItem.appendChild(effectCost);
    }
  }
  
  // Add click handler
  if (canAfford) {
    menuItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      hideEffectSelectionMenu();
      await executeBoardEntityAction(entity, action, e);
    });
  }
  
  return menuItem;
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
  
  // If we're in destination targeting mode, re-setup the targeting on the new planet
  if (planetTransferMode && window.sourceSelection) {
    setTimeout(() => {
      setupDestinationAreaTargeting();
    }, 100); // Small delay to ensure planet display is updated
  }
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
  
  // If this is the first initialization or the order changed significantly
  if (!currentlyDisplayedPlanet || orderChanged) {
    // Always start with the player's home planet (first in the order)
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

// Function to create dynamic planet previews
function createPlanetPreviews() {
  if (!latestGameState || !latestGameState.planets || !currentPlayer) {
    return;
  }
  
  const container = document.getElementById("planet-previews-container");
  if (!container) return;
  
  // Clear existing previews
  container.innerHTML = "";
  
  // Use the same planet order as the cycling system
  const orderedPlanets = calculatePlanetOrder();
  
  // Create previews for each planet in the correct order
  orderedPlanets.forEach(planetName => {
    const planetData = latestGameState.planets[planetName];
    if (planetData) {
      const planetPreview = createSinglePlanetPreview(planetName, planetData);
      container.appendChild(planetPreview);
    }
  });
}

// Function to create a single planet preview
function createSinglePlanetPreview(planetName, planetData) {
  const planetPreview = document.createElement("div");
  planetPreview.className = "planet-preview";
  planetPreview.dataset.planetName = planetName;
  
  // Create title
  const title = document.createElement("div");
  title.className = "planet-preview-title";
  title.textContent = planetName;
  
  // Add styling for home planets
  if (latestGameState && latestGameState.players) {
    Object.values(latestGameState.players).forEach(player => {
      if (player.home_planet === planetName) {
        if (player.name === currentPlayer) {
          title.classList.add("home-planet-title");
          planetPreview.classList.add("own-home");
        } else {
          title.classList.add("enemy-home-title");
          planetPreview.classList.add("enemy-home");
        }
      }
    });
  }
  
  // Create grid based on actual planet dimensions
  const grid = document.createElement("div");
  grid.className = "planet-preview-grid";
  grid.style.gridTemplateColumns = `repeat(${planetData.width}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${planetData.height}, 1fr)`;
  
  // Create tiles for the grid
  for (let y = 0; y < planetData.height; y++) {
    for (let x = 0; x < planetData.width; x++) {
      const tile = document.createElement("div");
      tile.className = "preview-tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      tile.dataset.planet = planetName;
      grid.appendChild(tile);
    }
  }
  
  planetPreview.appendChild(title);
  planetPreview.appendChild(grid);
  
  // Add click handler to switch to this planet
  planetPreview.addEventListener("click", () => {
    switchToPlanet(planetName);
  });
  
  return planetPreview;
}

// Function to switch to a specific planet
function switchToPlanet(planetName) {
  if (!planetOrder.includes(planetName)) return;
  
  currentPlanetIndex = planetOrder.indexOf(planetName);
  updatePlanetDisplay();
  
  // If we're in destination targeting mode, re-setup the targeting on the new planet
  if (planetTransferMode && window.sourceSelection) {
    setTimeout(() => {
      setupDestinationAreaTargeting();
    }, 100); // Small delay to ensure planet display is updated
  }
}
// Function to update planet preview tiles with unit positions
function updatePlanetPreviewTiles() {
  if (!latestGameState || !latestGameState.players) return;
  
  // Clear all preview tiles first
  document.querySelectorAll(".preview-tile").forEach(tile => {
    tile.className = "preview-tile";
  });
  
  // Add units to preview tiles
  Object.values(latestGameState.players).forEach(player => {
    if (!player.cardsonboard) return;
    
    player.cardsonboard.forEach(card => {
      const tile = document.querySelector(
        `.preview-tile[data-x="${card.position.x}"][data-y="${card.position.y}"][data-planet="${card.planet}"]`
      );
      
      if (tile) {
        if (card.owner === currentPlayer) {
          tile.classList.add("own-unit");
        } else {
          tile.classList.add("enemy-unit");
        }
      }
    });
  });
  
  // Update highlighting
  updatePlanetPreviewHighlight();
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
          const features = getPlanetFeaturesWithPopulation(planetName, x, y);
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

// dynamic grid sizing
// Function to render upgrade deck in the game screen - using faction selection logic
function renderUpgradeDeck(upgradeDeckEntities, playerName) {
  // Only render for current player
  if (playerName !== currentPlayer) return;
  
  const upgradeContainer = document.getElementById("player1-upgrade-deck");
  if (!upgradeContainer) return;
  
  // Clear existing content
  upgradeContainer.innerHTML = "";
  
  if (!upgradeDeckEntities || upgradeDeckEntities.length === 0) {
    upgradeContainer.innerHTML = '<div class="no-upgrades">No upgrade cards available</div>';
    return;
  }
  
  console.log("Rendering upgrade deck with", upgradeDeckEntities.length, "cards");
  console.log("Unique categories found:", [...new Set(upgradeDeckEntities.map(e => e.category || 'unknown'))]);
  
  // Use the SAME organize function as faction selection
  const organizedUpgrades = organizeUpgradeCardsForGameDynamic(upgradeDeckEntities);
  
  // Get all unique categories and sort them alphabetically (same as faction selection)
  const categories = Object.keys(organizedUpgrades).sort();
  console.log("Categories to render:", categories);
  
  // Create category containers dynamically (same as faction selection)
  categories.forEach(category => {
    const categoryData = organizedUpgrades[category];
    const categoryContainer = createGameUpgradeCategoryContainer(category, categoryData);
    upgradeContainer.appendChild(categoryContainer);
  });
}

// Function to organize upgrade cards by category and level for game display - fully dynamic
function organizeUpgradeCardsForGameDynamic(upgradeDeckEntities) {
  const organized = {};
  
  // Count card occurrences and organize by category/level (same logic as faction selection)
  const cardCounts = {};
  upgradeDeckEntities.forEach(entity => {
    const key = `${entity.category}_${entity.level}_${entity.cardtype}`;
    if (!cardCounts[key]) {
      cardCounts[key] = { entity: entity, count: 0 };
    }
    cardCounts[key].count++;
  });
  
  // Organize into structure (same logic as faction selection)
  Object.values(cardCounts).forEach(({ entity, count }) => {
    const category = entity.category || 'unknown';
    const level = entity.level || 1;
    
    if (!organized[category]) {
      organized[category] = {};
    }
    
    if (!organized[category][level]) {
      organized[category][level] = [];
    }
    
    // Add the entity with count info
    const entityWithCount = { ...entity, count };
    organized[category][level].push(entityWithCount);
  });
  
  // Sort cards within each level alphabetically (same as faction selection)
  Object.keys(organized).forEach(category => {
    Object.keys(organized[category]).forEach(level => {
      organized[category][level].sort((a, b) => a.cardtype.localeCompare(b.cardtype));
    });
  });
  
  return organized;
}

// Function to create category container for game upgrade display - fully dynamic
function createGameUpgradeCategoryContainer(category, categoryData) {
  const categoryContainer = document.createElement("div");
  categoryContainer.className = "game-upgrade-category";
  categoryContainer.setAttribute('data-category', category); // For CSS styling
  
  // Add CSS variable for dynamic category colors
  categoryContainer.style.setProperty('--category-color', getCategoryColor(category));
  
  // Calculate total cards in this category
  const totalCards = Object.values(categoryData).reduce((sum, levelCards) => {
    return sum + levelCards.reduce((levelSum, card) => levelSum + (card.count || 1), 0);
  }, 0);
  
  // Category header (same structure as faction selection)
  const categoryHeader = document.createElement("div");
  categoryHeader.className = "game-upgrade-category-header";
  categoryHeader.innerHTML = `
    <div class="game-upgrade-category-title">${formatCategoryName(category)}</div>
    <div class="game-upgrade-category-count">${totalCards} cards</div>
  `;
  
  // Level grid (same structure as faction selection)
  const levelGrid = document.createElement("div");
  levelGrid.className = "game-upgrade-level-grid";
  
  // Get all levels present and sort them numerically
  const levels = Object.keys(categoryData).map(Number).sort((a, b) => a - b);
  
  // Create columns for each level
  levels.forEach(level => {
    const levelColumn = document.createElement("div");
    levelColumn.className = "game-upgrade-level-column";
    
    // Level header (you can re-enable this if you want)
    const levelHeader = document.createElement("div");
    levelHeader.className = "game-upgrade-level-header";
    levelHeader.textContent = `Lv${level}`;
    levelColumn.appendChild(levelHeader);
    
    // Cards in this level
    categoryData[level].forEach(entity => {
      const cardElement = createGameUpgradeCardElement(entity);
      levelColumn.appendChild(cardElement);
    });
    
    levelGrid.appendChild(levelColumn);
  });
  
  categoryContainer.appendChild(categoryHeader);
  categoryContainer.appendChild(levelGrid);
  
  return categoryContainer;
}

// Helper function to get category colors
function getCategoryColor(category) {
  const colorMap = {
    'gear': '#f9e2af',
    'bombardment': '#f38ba8',
    'movement': '#a6e3a1',
    'resources': '#94e2d5',
    'unknown': '#6c7086'
  };
  return colorMap[category] || '#89b4fa'; // Default color for new categories
}

// Add category count display to header
function createGameUpgradeCategoryHeader(category, totalCards) {
  const categoryHeader = document.createElement("div");
  categoryHeader.className = "game-upgrade-category-header";
  categoryHeader.innerHTML = `
    <div class="game-upgrade-category-title">${formatCategoryName(category)}</div>
    <div class="game-upgrade-category-count">${totalCards} cards</div>
  `;
  return categoryHeader;
}

// Function to get level from entity data (unchanged)
function getUpgradeLevelFromEntity(entity) {
  return entity.level || 1; // Default to level 1 if level property is missing
}

// Function to create individual upgrade card element for game display
function createGameUpgradeCardElement(entity) {
  const cardElement = document.createElement("div");
  cardElement.className = `game-upgrade-card level-${getUpgradeLevelFromEntity(entity)}`;
  cardElement.setAttribute('data-entity-id', entity.entityid);
  cardElement.setAttribute('data-card-name', formatCardName(entity.cardtype));
  
  // Build cost display (existing code)
  const costs = [];
  if (entity.costbiomass > 0) {
    costs.push(`<div class="game-upgrade-cost-item">
      <div class="upgrade-cost-icon biomass"></div>
      <span class="upgrade-cost-number">${entity.costbiomass}</span>
    </div>`);
  }
  if (entity.costplasteel > 0) {
    costs.push(`<div class="game-upgrade-cost-item">
      <div class="upgrade-cost-icon plasteel"></div>
      <span class="upgrade-cost-number">${entity.costplasteel}</span>
    </div>`);
  }
  if (entity.costpromethium > 0) {
    costs.push(`<div class="game-upgrade-cost-item">
      <div class="upgrade-cost-icon promethium"></div>
      <span class="upgrade-cost-number">${entity.costpromethium}</span>
    </div>`);
  }
  
  cardElement.innerHTML = `
    <img src="${entity.image}" alt="${entity.cardtype}" class="game-upgrade-card-image"
         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjNDU0NzVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VcGdyYWRlPC90ZXh0Pjwvc3ZnPg=='">
    <div class="game-upgrade-card-cost">${costs.join('')}</div>
  `;
  
  // Add hover tooltip
  if (entity.keywords && entity.keywords.length > 0) {
    cardElement.title = `${formatCardName(entity.cardtype)} - Keywords: ${entity.keywords.join(', ')}`;
  } else {
    cardElement.title = formatCardName(entity.cardtype);
  }
  
  // Enhanced click handler for effects
  cardElement.addEventListener('click', async () => {
    await handleUpgradeCardClick(entity);
  });
  
  return cardElement;
}


// Update the handleUpgradeCardClick function to pass entity to eligibility check
async function handleUpgradeCardClick(entity) {
  console.log(`Clicked upgrade card: ${entity.cardtype} (${entity.entityid})`);
  
  // Exit any current targeting mode
  exitTargetingMode();
  
  // Check if this card has any effects
  if (!entity.effects || entity.effects.length === 0) {
    console.log("Card has no effects");
    return;
  }
  
  // Get effect data from card library
  const effectData = await getCardEffectData(entity.cardtype);
  if (!effectData || !effectData.effects || effectData.effects.length === 0) {
    console.log("No effect data found for card");
    return;
  }
  
  // Check eligibility for each effect - NOW PASSING ENTITY
  const eligibleEffects = checkEffectsEligibility(effectData.effects, entity);
  
  if (eligibleEffects.length === 0) {
    console.log("No effects are currently eligible");
    return;
  }
  
  // Show effect selection menu for multiple effects
  showEffectSelectionMenu(entity, eligibleEffects, event);

}

async function getCardEffectData(cardtype) {
  // Since the effect data is already in the upgrade card entities in the gamestate,
  // we can extract it from there
  if (!latestGameState || !latestGameState.players[currentPlayer]?.upgradedeck) {
    return null;
  }
  
  // Find the upgrade card entity with this cardtype
  const upgradeCard = latestGameState.players[currentPlayer].upgradedeck.find(
    entity => entity.cardtype === cardtype
  );
  
  if (!upgradeCard) {
    return null;
  }
  
  // Return the effects data
  return {
    effects: upgradeCard.effects || []
  };
}

function checkEffectsEligibility(effects, entity) {
  const eligible = [];
  
  for (const effect of effects) {
    if (isEffectEligibleWithConsumption(effect, entity)) {
      eligible.push(effect);
    }
  }
  
  return eligible;
}

function isEffectEligible(effect) {
  if (!latestGameState) return false;
  
  const eligibility = effect.eligibility || {};
  
  // Check stage
  const stages = eligibility.stages || [];
  if (!stages.includes("any") && !stages.includes(latestGameState.stage)) {
    return false;
  }
  
  // Check rounds
  const rounds = eligibility.rounds || [];
  if (!rounds.includes("any") && !rounds.includes(latestGameState.round.toString())) {
    return false;
  }
  
  // Check player turn
  const playerTurns = eligibility.player_turns || [];
  if (playerTurns.includes("own") && latestGameState.playerturn !== currentPlayer) {
    return false;
  }
  
  return true;
}

async function initiateEffectTargeting(initiatorEntity, effect) {
  selectedUpgradeCard = initiatorEntity;
  currentEffect = effect;
  targetingMode = true;
  
  // Store the entity for board entity actions as well
  currentEffectMenuEntity = initiatorEntity;
  
  console.log(`Initiating targeting for effect: ${effect.name}`);
  
  // Check targeting type
  const targeting = effect.targeting || {};
  const targetTypes = targeting.target_types || [];
  
  // Handle "self" targeting - skip entity selection phase
  if (targetTypes.includes("self")) {
    console.log("Self-targeting detected - skipping entity selection phase");
    
    // Check if this is a planet transfer effect
    const isPlanetTransfer = effect.stats && effect.stats.some(stat => 
      stat.destination === "planet" || stat.destination === "same_planet"
    );
    
    if (isPlanetTransfer) {
      planetTransferMode = true;
      currentAreaEffect = effect; // CRITICAL FIX: Set currentAreaEffect for self-targeting
      areaTargeting = true; // Also set area targeting mode
      areaSize = { x: targeting.x || 1, y: targeting.y || 1 }; // Set area size
      
      console.log("Self-targeting planet transfer effect - going directly to destination selection");
      
      // For self-targeting, we use the initiator entity as both source and target
      const sourceX = initiatorEntity.position ? initiatorEntity.position.x : 0;
      const sourceY = initiatorEntity.position ? initiatorEntity.position.y : 0;
      const sourcePlanet = initiatorEntity.planet || currentDisplayedPlanet;
      
      // Store the source selection (the initiator entity itself)
      window.sourceSelection = { 
        x: sourceX, 
        y: sourceY,
        planet: sourcePlanet
      };
      
      // Store source planet for the transfer request
      sourcePlanetForTransfer = sourcePlanet;
      
      // For same_planet destination, ensure we stay on the same planet
      const destination = effect.stats.find(stat => stat.destination)?.destination;
      if (destination === "same_planet") {
        // Force the current planet to be the destination planet
        currentDisplayedPlanet = sourcePlanet;
        // Switch to the source planet if not already viewing it
        switchToPlanet(sourcePlanet);
      }
      
      // Set up destination area targeting immediately
      setupDestinationAreaTargeting();
      
      // Change cursor to crosshairs
      document.body.style.cursor = 'crosshair';
      
      return; // Exit early since we're going directly to destination selection
    }
  }
  
  // Check if this is a planet transfer effect (for non-self targeting)
  const isPlanetTransfer = effect.stats && effect.stats.some(stat => stat.destination === "planet");
  
  if (isPlanetTransfer && !targetTypes.includes("self")) {
    planetTransferMode = true;
    console.log("Planet transfer effect detected - starting entity selection phase");
  }
  
  // Rest of the existing logic for non-self targeting...
  if (effect.type === "terrain_feature_change") {
    // Handle terrain feature change targeting (area-based)
    areaTargeting = true;
    areaSize = { x: targeting.x || 1, y: targeting.y || 1 };
    currentAreaEffect = effect;
    
    // Change cursor to crosshairs
    document.body.style.cursor = 'crosshair';
    
    // Set up area targeting for terrain changes
    setupTerrainFeatureAreaTargeting();
    
  } else if (effect.type === "keyword_change") {
    // Handle keyword change targeting
    areaTargeting = false;
    
    // Change cursor to crosshairs
    document.body.style.cursor = 'crosshair';
    
    // Highlight eligible targets for keyword change
    highlightEligibleTargetsForKeywordChange(effect);
    
  } else if (targetTypes.includes("entities_in_area") || targetTypes.includes("area")) {
    areaTargeting = true;
    areaSize = { x: targeting.x || 1, y: targeting.y || 1 };
    currentAreaEffect = effect;
    
    // Change cursor to crosshairs
    document.body.style.cursor = 'crosshair';
    
    // Set up area targeting
    setupAreaTargeting();
  } else {
    areaTargeting = false;
    
    // Change cursor to crosshairs
    document.body.style.cursor = 'crosshair';
    
    // Highlight eligible targets
    highlightEligibleTargets(effect);
  }
  
  // Add escape key listener to cancel targeting
  document.addEventListener('keydown', handleTargetingEscape);
}


function setupTerrainFeatureAreaTargeting() {
  // Remove previous area highlights
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.remove('area-target', 'area-preview', 'terrain-target', 'terrain-invalid');
  });
  
  // Add mouseover listeners to tiles for terrain area preview
  document.querySelectorAll('#game-board .tile').forEach(tile => {
    tile.addEventListener('mouseenter', showTerrainAreaPreview);
    tile.addEventListener('mouseleave', hideTerrainAreaPreview);
    tile.addEventListener('click', handleTerrainAreaTargetClick);
    tile.setAttribute('data-has-targeting-listeners', 'true');
  });
}

function showTerrainAreaPreview(e) {
  if (!areaTargeting || !currentAreaEffect) return;
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const startX = parseInt(tile.dataset.x);
  const startY = parseInt(tile.dataset.y);
  const planetName = tile.dataset.planet;
  
  // Clear previous previews
  document.querySelectorAll('.terrain-preview').forEach(t => t.classList.remove('terrain-preview'));
  document.querySelectorAll('.terrain-preview-invalid').forEach(t => t.classList.remove('terrain-preview-invalid'));
  document.querySelectorAll('.terrain-preview-prerequisite-fail').forEach(t => t.classList.remove('terrain-preview-prerequisite-fail'));
  document.querySelectorAll('.terrain-preview-out-of-range').forEach(t => t.classList.remove('terrain-preview-out-of-range'));
  
  // Validate if this area meets the terrain change requirements
  const isValidArea = validateTerrainChangeArea(startX, startY, planetName, currentAreaEffect);
  
  // Validate prerequisites
  const targetPosition = { x: startX, y: startY };
  const prerequisiteResult = validateTargetAreaPrerequisites(currentAreaEffect, targetPosition, planetName);
  
  // NEW: Validate range
  const rangeResult = validateTerrainChangeRange(selectedUpgradeCard || currentEffectMenuEntity, startX, startY, currentAreaEffect);
  
  // Show area preview with appropriate styling
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        if (!rangeResult.valid) {
          targetTile.classList.add('terrain-preview-out-of-range');
        } else if (!isValidArea) {
          targetTile.classList.add('terrain-preview-invalid');
        } else if (!prerequisiteResult.valid) {
          targetTile.classList.add('terrain-preview-prerequisite-fail');
        } else {
          targetTile.classList.add('terrain-preview');
        }
      }
    }
  }
}

function hideTerrainAreaPreview(e) {
  if (!areaTargeting) return;
  
  // Remove area preview when mouse leaves
  setTimeout(() => {
    const hoveredTile = document.querySelector('.tile:hover');
    if (!hoveredTile) {
      document.querySelectorAll('.terrain-preview').forEach(t => t.classList.remove('terrain-preview'));
      document.querySelectorAll('.terrain-preview-invalid').forEach(t => t.classList.remove('terrain-preview-invalid'));
    }
  }, 10);
}

async function handleTerrainAreaTargetClick(e) {
  if (!areaTargeting || !selectedUpgradeCard || !currentAreaEffect) return;
  
  e.stopPropagation();
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const targetX = parseInt(tile.dataset.x);
  const targetY = parseInt(tile.dataset.y);
  const planetName = tile.dataset.planet;
  
  // NEW: Validate range first
  const rangeResult = validateTerrainChangeRange(selectedUpgradeCard || currentEffectMenuEntity, targetX, targetY, currentAreaEffect);
  
  if (!rangeResult.valid) {
    console.log("Terrain change out of range:", rangeResult.reason);
    // Show error message to user
    if (latestGameState) {
      latestGameState.console = latestGameState.console || {};
      latestGameState.console[currentPlayer] = latestGameState.console[currentPlayer] || [];
      latestGameState.console[currentPlayer].push(rangeResult.reason);
      updateConsole(latestGameState.console);
    }
    return;
  }
  
  // Validate the area before applying
  if (!validateTerrainChangeArea(targetX, targetY, planetName, currentAreaEffect)) {
      console.log("Invalid terrain change area");
      return;
  }
  
  // Validate prerequisites
  const targetPosition = { x: targetX, y: targetY };
  const prerequisiteResult = validateTargetAreaPrerequisitesWithTargeting(
      currentAreaEffect, targetPosition, planetName, currentAreaEffect.targeting
  );
  
  if (!prerequisiteResult.valid) {
      // Show error message to user
      if (latestGameState) {
          latestGameState.console = latestGameState.console || {};
          latestGameState.console[currentPlayer] = latestGameState.console[currentPlayer] || [];
          latestGameState.console[currentPlayer].push(`Prerequisite not met: ${prerequisiteResult.reason}`);
          updateConsole(latestGameState.console);
      }
      console.log("Prerequisite validation failed:", prerequisiteResult.reason);
      return;
  }
  
  console.log(`Terrain change target selected at: ${targetX}, ${targetY} on ${planetName}`);
  
  // Apply the terrain feature change effect
  await applyTerrainFeatureChangeEffect(selectedUpgradeCard || currentEffectMenuEntity, currentAreaEffect, { x: targetX, y: targetY }, planetName);
  exitTargetingMode();
}


function validateTargetAreaPrerequisitesWithTargeting(effect, targetPosition, targetPlanet, targeting) {
  if (!effect.requires || !effect.requires.length) {
      return { valid: true, reason: "" };
  }
  
  // Check each prerequisite
  for (const prerequisite of effect.requires) {
      if (prerequisite.prerequisite_type === "entity_in_target_area") {
          const result = checkEntityInTargetAreaPrerequisiteWithTargeting(
              prerequisite, targetPosition, targetPlanet, targeting
          );
          if (!result.valid) {
              return result;
          }
      }
      // Other prerequisite types are handled on the backend
  }
  
  return { valid: true, reason: "" };
}


function checkEntityInTargetAreaPrerequisiteWithTargeting(prerequisite, targetPosition, targetPlanet, targeting) {
  const minNumber = prerequisite.min_number_of_entities || 1;
  const requiredKeywordsAll = prerequisite.required_keywords_all || [];
  const requiredKeywordsAny = prerequisite.required_keywords_any || [];
  const requiredNames = prerequisite.required_name || [];
  
  if (!targetPosition || !targetPlanet || !targeting) {
      return { valid: false, reason: "Invalid target area information" };
  }
  
  // Get area dimensions from targeting
  const areaWidth = targeting.x || 1;
  const areaHeight = targeting.y || 1;
  const startX = targetPosition.x;
  const startY = targetPosition.y;
  
  // Get all player's entities on the target planet
  const playerEntities = [];
  if (latestGameState && latestGameState.players[currentPlayer] && latestGameState.players[currentPlayer].cardsonboard) {
      for (const entity of latestGameState.players[currentPlayer].cardsonboard) {
          if (entity.planet === targetPlanet) {
              playerEntities.push(entity);
          }
      }
  }
  
  // Find entities in the target area that match criteria
  const matchingEntities = [];
  for (const entity of playerEntities) {
      const entityX = entity.position.x;
      const entityY = entity.position.y;
      
      // Check if entity is within the target area
      if (startX <= entityX && entityX < startX + areaWidth &&
          startY <= entityY && entityY < startY + areaHeight) {
          
          // Check if entity meets the prerequisite criteria
          if (entityMeetsPrerequisiteCriteria(entity, requiredKeywordsAll, requiredKeywordsAny, requiredNames)) {
              matchingEntities.push(entity);
          }
      }
  }
  
  // Check if we have enough matching entities
  if (matchingEntities.length >= minNumber) {
      return { valid: true, reason: "" };
  } else {
      // Build descriptive error message
      const criteriaParts = [];
      if (requiredKeywordsAll.length > 0) {
          criteriaParts.push(`keywords: ${requiredKeywordsAll.join(', ')}`);
      }
      if (requiredKeywordsAny.length > 0) {
          criteriaParts.push(`any of keywords: ${requiredKeywordsAny.join(', ')}`);
      }
      if (requiredNames.length > 0) {
          criteriaParts.push(`name: ${requiredNames.join(', ')}`);
      }
      
      const criteriaText = criteriaParts.join(' and ');
      const foundCount = matchingEntities.length;
      
      return { 
          valid: false, 
          reason: `Requires ${minNumber} unit(s) with ${criteriaText} in target area (found ${foundCount})` 
      };
  }
}

function validateTerrainChangeArea(startX, startY, planetName, effect) {
  if (!latestGameState || !latestGameState.planets[planetName]) return false;
  
  const targeting = effect.targeting || {};
  const planet = latestGameState.planets[planetName];
  
  // Collect all features present in the entire target area
  const allAreaFeatures = new Set();
  
  // Check each position in the area
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const checkX = startX + dx;
      const checkY = startY + dy;
      
      // Check if position is within planet boundaries
      if (checkX < 0 || checkX >= planet.width || checkY < 0 || checkY >= planet.height) {
        return false;
      }
      
      // Get current terrain features at this position and add to area set
      const positionFeatures = getPlanetFeatures(planetName, checkX, checkY);
      positionFeatures.forEach(feature => allAreaFeatures.add(feature));
      
      // Check "cannot have any" restrictions per position (these should apply to each tile)
      const areaCanNotHaveAny = targeting.area_can_not_have_any || [];
      if (areaCanNotHaveAny.length > 0) {
        const hasForbidden = areaCanNotHaveAny.some(feature => positionFeatures.includes(feature));
        if (hasForbidden) return false;
      }
    }
  }
  
  // Convert Set back to array for compatibility with existing logic
  const areaFeaturesArray = Array.from(allAreaFeatures);
  
  // Now check area-wide requirements against all features in the area
  const areaMustHaveAny = targeting.area_must_have_any || [];
  const areaMustHaveAll = targeting.area_must_have_all || [];
  
  // Check "must have any" requirements (at least one feature type should be present somewhere in area)
  if (areaMustHaveAny.length > 0) {
    const hasAnyRequired = areaMustHaveAny.some(feature => areaFeaturesArray.includes(feature));
    if (!hasAnyRequired) {
      console.log(`Area validation failed: must have any of [${areaMustHaveAny.join(', ')}], but area contains [${areaFeaturesArray.join(', ')}]`);
      return false;
    }
  }
  
  // Check "must have all" requirements (all required feature types should be present somewhere in area)
  if (areaMustHaveAll.length > 0) {
    const hasAllRequired = areaMustHaveAll.every(feature => areaFeaturesArray.includes(feature));
    if (!hasAllRequired) {
      console.log(`Area validation failed: must have all of [${areaMustHaveAll.join(', ')}], but area contains [${areaFeaturesArray.join(', ')}]`);
      return false;
    }
  }

  
  // Handle upgrade-specific validation
  if (effect.stats && effect.stats[0] && effect.stats[0].terrain_features_to_upgrade) {
    const featuresToUpgrade = effect.stats[0].terrain_features_to_upgrade;
    const featuresToAdd = effect.stats[0].terrain_features_to_add || [];
    const featuresToRemove = effect.stats[0].terrain_features_to_remove || [];
    
    // Check if there are any upgradeable features in the area
    const hasUpgradeableFeatures = featuresToUpgrade.some(feature => 
      areaFeaturesArray.includes(feature)
    );
    
    // If this is purely an upgrade effect (no add/remove), require upgradeable features
    if (featuresToUpgrade.length > 0 && featuresToAdd.length === 0 && featuresToRemove.length === 0) {
      if (!hasUpgradeableFeatures) {
        console.log(`Upgrade validation failed: no upgradeable features [${featuresToUpgrade.join(', ')}] found in area containing [${areaFeaturesArray.join(', ')}]`);
        return false;
      }
    }
  }
  
  // Handle population change effects - require cities in the area
  if (effect.stats && effect.stats[0] && effect.stats[0].population_change !== undefined && effect.stats[0].population_change !== 0) {
    const hasCities = areaFeaturesArray.includes('city');
    
    if (!hasCities) {
      console.log(`Population change validation failed: no cities found in area containing [${areaFeaturesArray.join(', ')}]`);
      return false;
    }
  }
  
  return true;
}

async function applyTerrainFeatureChangeEffect(initiator, effect, position, planetName) {
  try {
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        initiator_entityid: initiator.entityid,
        effect_name: effect.name,
        target_position: position,
        target_planet: planetName
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Terrain feature change failed:", data.error);
      alert("Effect failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying terrain feature change:", error);
    alert("Failed to apply effect: " + error.message);
  }
}

function validateTerrainChangeRange(initiatorEntity, targetX, targetY, effect) {
  if (!effect.stats) return { valid: true, reason: "" };
  
  // Check if any stat has a range parameter
  let terrainRange = null;
  for (const stat of effect.stats) {
    if (stat.range !== undefined) {
      terrainRange = stat.range;
      break;
    }
  }
  
  // If no range specified, allow anywhere
  if (terrainRange === null) {
    return { valid: true, reason: "" };
  }
  
  // For upgrade cards (not on board), no range restriction
  if (initiatorEntity.container !== "board") {
    return { valid: true, reason: "" };
  }
  
  // Validate range from initiator position
  const initiatorX = initiatorEntity.position.x;
  const initiatorY = initiatorEntity.position.y;
  
  // Calculate distance (Chebyshev distance)
  const distance = Math.max(Math.abs(initiatorX - targetX), Math.abs(initiatorY - targetY));
  
  if (distance > terrainRange) {
    return { valid: false, reason: `Target area is outside range (${terrainRange})` };
  }
  
  return { valid: true, reason: "" };
}

function highlightEligibleTargets(effect) {
  const targeting = effect.targeting || {};
  const targetTypes = targeting.target_types || [];
  
  if (targetTypes.includes("entity")) {
    highlightEligibleEntities(effect);
  }
  
  // Add tile targeting later for tile-based effects
}

function highlightEligibleEntities(effect) {
  // Clear previous highlights
  document.querySelectorAll('.card-on-board').forEach(card => {
    card.classList.remove('eligible-target', 'invalid-target', 'own-unit', 'enemy-unit');
  });
  
  // Get all entities on the currently displayed planet
  const allEntities = getAllEntitiesOnCurrentPlanet();
  
  allEntities.forEach(entity => {
    const cardElement = document.querySelector(`[data-entityid="${entity.entityid}"]`);
    if (cardElement && isValidTarget(entity, effect)) {
      cardElement.classList.add('eligible-target');
      
      // Add visual distinction between own and enemy units
      if (entity.owner === currentPlayer) {
        cardElement.classList.add('own-unit');
      } else {
        cardElement.classList.add('enemy-unit');
      }
      
      // Add click handler for targeting
      cardElement.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleTargetSelection(entity);
      }, { once: true });
    } else if (cardElement) {
      // Optional: Show invalid targets with different styling
      cardElement.classList.add('invalid-target');
    }
  });
}

function getAllEntitiesOnCurrentPlanet() {
  const entities = [];
  
  if (latestGameState && latestGameState.players) {
    for (const player of Object.values(latestGameState.players)) {
      if (player.cardsonboard) {
        for (const entity of player.cardsonboard) {
          if (entity.planet === currentDisplayedPlanet) {
            entities.push(entity);
          }
        }
      }
    }
  }
  
  return entities;
}

function isValidTarget(entity, effect) {
  const targeting = effect.targeting || {};
  
  // Check required keywords
  const requiredKeywords = targeting.required_keywords || [];
  for (const keyword of requiredKeywords) {
    if (!entity.keywords.includes(keyword)) {
      return false;
    }
  }
  
  // Check forbidden keywords
  const forbiddenKeywords = targeting.forbidden_keywords || [];
  for (const keyword of forbiddenKeywords) {
    if (entity.keywords.includes(keyword)) {
      return false;
    }
  }
  
  // NEW: Check target ownership
  const targetOwners = targeting.target_owner || ["own"]; // Default to "own" for backward compatibility
  if (!isValidTargetOwner(entity.owner, currentPlayer, targetOwners)) {
    return false;
  }
  
  return true;
}

// NEW: Helper function to check target ownership on frontend
function isValidTargetOwner(targetOwner, currentPlayer, allowedOwners) {
  if (!allowedOwners || allowedOwners.length === 0) {
    return true; // No ownership restrictions
  }
  
  for (const allowedOwner of allowedOwners) {
    if (allowedOwner === "own" && targetOwner === currentPlayer) {
      return true;
    } else if (allowedOwner === "enemy" && targetOwner !== currentPlayer && targetOwner !== "neutral") {
      return true;
    } else if (allowedOwner === "neutral" && targetOwner === "neutral") {
      return true;
    }
  }
  
  return false;
}

async function handleTargetSelection(target) {
  if (!selectedUpgradeCard || !currentEffect) {
    console.error("No upgrade card or effect selected");
    return;
  }
  
  console.log(`Target selected: ${target.cardtype} (${target.entityid})`);
  
  // Apply the effect
  await applyEffect(selectedUpgradeCard, currentEffect, target);
  
  // Exit targeting mode
  exitTargetingMode();
}

async function applyEffect(initiator, effect, target) {
  try {
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        initiator_entityid: initiator.entityid,
        effect_name: effect.name,
        target_entityid: target.entityid
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Effect application failed:", data.error);
      alert("Effect failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying effect:", error);
    alert("Failed to apply effect: " + error.message);
  }
}




function setupAreaTargeting() {
  // Remove previous area highlights
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.remove('area-target', 'area-preview');
  });
  
  // Add mouseover listeners to tiles for area preview
  document.querySelectorAll('#game-board .tile').forEach(tile => {
    tile.addEventListener('mouseenter', showAreaPreview);
    tile.addEventListener('mouseleave', hideAreaPreview);
    tile.addEventListener('click', handleAreaTargetClick);
    tile.setAttribute('data-has-targeting-listeners', 'true'); // MARK THE TILE
  });
  
  // NEW: Also add listeners to cards for area targeting
  document.querySelectorAll('#game-board .card-on-board').forEach(card => {
    card.addEventListener('mouseenter', showAreaPreviewFromCard);
    card.addEventListener('mouseleave', hideAreaPreview);
    card.addEventListener('click', handleAreaTargetClickFromCard);
  });
}

function showAreaPreview(e) {
  if (!areaTargeting) return;
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const startX = parseInt(tile.dataset.x);
  const startY = parseInt(tile.dataset.y);
  const planetName = tile.dataset.planet;
  
  // Clear previous previews
  document.querySelectorAll('.area-preview').forEach(t => t.classList.remove('area-preview'));
  
  // Check range if we have an initiator with range requirements
  let inRange = true;
  if (selectedUpgradeCard && currentAreaEffect && currentAreaEffect.stats) {
    const displacementStat = currentAreaEffect.stats[0];
    if (displacementStat && displacementStat.range) {
      const range = displacementStat.range;
      
      // Find the initiator's position
      let initiatorX, initiatorY;
      if (selectedUpgradeCard.container === "board") {
        // Board entity
        initiatorX = selectedUpgradeCard.position.x;
        initiatorY = selectedUpgradeCard.position.y;
      } else {
        // Upgrade card - no range restriction
        inRange = true;
      }
      
      if (initiatorX !== undefined && initiatorY !== undefined) {
        const distance = Math.max(Math.abs(initiatorX - startX), Math.abs(initiatorY - startY));
        inRange = distance <= range;
      }
    }
  }
  
  // Show area preview with appropriate styling
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        if (inRange) {
          targetTile.classList.add('area-preview');
        } else {
          targetTile.classList.add('area-preview-out-of-range');
        }
      }
    }
  }
}

function showAreaPreviewFromCard(e) {
  if (!areaTargeting) return;
  
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  // Get the card's position to determine which tile it's on
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players); // USE EXISTING FUNCTION
  
  if (!entity) return;
  
  const startX = entity.position.x;
  const startY = entity.position.y;
  const planetName = entity.planet;
  
  // Clear previous previews
  document.querySelectorAll('.area-preview').forEach(t => t.classList.remove('area-preview'));
  
  // Show area preview
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        targetTile.classList.add('area-preview');
      }
    }
  }
}

function hideAreaPreview(e) {
  if (!areaTargeting) return;
  
  // Remove area preview when mouse leaves
  setTimeout(() => {
    const hoveredTile = document.querySelector('.tile:hover');
    if (!hoveredTile) {
      document.querySelectorAll('.area-preview').forEach(t => t.classList.remove('area-preview'));
    }
  }, 10);
}

async function handleAreaTargetClick(e) {
  if (!areaTargeting || !selectedUpgradeCard || !currentAreaEffect) return;
  
  e.stopPropagation();
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  // Check if this tile is out of range
  if (tile.classList.contains('area-preview-out-of-range')) {
    return; // Don't allow targeting out-of-range areas
  }
  
  const targetX = parseInt(tile.dataset.x);
  const targetY = parseInt(tile.dataset.y);
  
  console.log(`Area target selected at: ${targetX}, ${targetY}`);
  
  if (planetTransferMode) {
    await startDestinationSelection(targetX, targetY);
  } else {
    await applyAreaEffect(selectedUpgradeCard, currentAreaEffect, { x: targetX, y: targetY });
    exitTargetingMode();
  }
}

async function handleAreaTargetClickFromCard(e) {
  if (!areaTargeting || !selectedUpgradeCard || !currentAreaEffect) return;
  
  e.stopPropagation();
  
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  // Get the card's position to determine which tile it's on
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players);
  
  if (!entity) return;
  
  const targetX = entity.position.x;
  const targetY = entity.position.y;
  
  console.log(`Area target selected from card at: ${targetX}, ${targetY}`);
  
  if (planetTransferMode) {
    // Stage 1 complete - now select destination
    await startDestinationSelection(targetX, targetY);
  } else {
    // Apply the area effect normally
    await applyAreaEffect(selectedUpgradeCard, currentAreaEffect, { x: targetX, y: targetY });
    exitTargetingMode();
  }
}




async function applyAreaEffect(initiator, effect, position) {
  try {
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        initiator_entityid: initiator.entityid,
        effect_name: effect.name,
        target_position: position,
        target_planet: currentDisplayedPlanet  // ADD THIS LINE
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Effect application failed:", data.error);
      alert("Effect failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying effect:", error);
    alert("Failed to apply effect: " + error.message);
  }
}

async function startDestinationSelection(sourceX, sourceY) {
  console.log("Starting destination selection phase");
  
  // Store the source selection WITH the source planet
  window.sourceSelection = { 
    x: sourceX, 
    y: sourceY,
    planet: currentDisplayedPlanet  // ADD THIS LINE
  };
  
  // Store source planet for the transfer request
  sourcePlanetForTransfer = currentDisplayedPlanet;  // ADD THIS LINE
  
  // Clear area targeting setup
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.remove('area-target', 'area-preview');
    tile.removeEventListener('mouseenter', showAreaPreview);
    tile.removeEventListener('mouseleave', hideAreaPreview);
    tile.removeEventListener('click', handleAreaTargetClick);
  });
  
  document.querySelectorAll('#game-board .card-on-board').forEach(card => {
    card.removeEventListener('mouseenter', showAreaPreviewFromCard);
    card.removeEventListener('mouseleave', hideAreaPreview);
    card.removeEventListener('click', handleAreaTargetClickFromCard);
  });
  
  // Set up destination area targeting (same size as source area)
  setupDestinationAreaTargeting();
}

function setupDestinationAreaTargeting() {
  console.log("Setting up destination area targeting");
  
  // Add mouseover listeners to tiles for area preview (same as source)
  document.querySelectorAll('#game-board .tile').forEach(tile => {
    tile.addEventListener('mouseenter', showDestinationAreaPreview);
    tile.addEventListener('mouseleave', hideDestinationAreaPreview);
    tile.addEventListener('click', handleDestinationAreaClick);
    tile.setAttribute('data-has-targeting-listeners', 'true'); // MARK THE TILE
  });
  
  // Also add listeners to cards for area targeting
  document.querySelectorAll('#game-board .card-on-board').forEach(card => {
    card.addEventListener('mouseenter', showDestinationAreaPreviewFromCard);
    card.addEventListener('mouseleave', hideDestinationAreaPreview);
    card.addEventListener('click', handleDestinationAreaClickFromCard);
  });
  
  // Update cursor
  document.body.style.cursor = 'crosshair';
}

function showDestinationAreaPreview(e) {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const startX = parseInt(tile.dataset.x);
  const startY = parseInt(tile.dataset.y);
  const planetName = tile.dataset.planet;
  
  // Clear previous previews
  document.querySelectorAll('.destination-area-preview').forEach(t => t.classList.remove('destination-area-preview'));
  
  // Show area preview using the same size as source area
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        targetTile.classList.add('destination-area-preview');
      }
    }
  }
}

function showDestinationAreaPreviewFromCard(e) {
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players);
  
  if (!entity) return;
  
  const startX = entity.position.x;
  const startY = entity.position.y;
  const planetName = entity.planet;
  
  // Clear previous previews
  document.querySelectorAll('.destination-area-preview').forEach(t => t.classList.remove('destination-area-preview'));
  
  // Show area preview
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        targetTile.classList.add('destination-area-preview');
      }
    }
  }
}

function hideDestinationAreaPreview(e) {
  setTimeout(() => {
    const hoveredTile = document.querySelector('.tile:hover');
    const hoveredCard = document.querySelector('.card-on-board:hover');
    if (!hoveredTile && !hoveredCard) {
      document.querySelectorAll('.destination-area-preview').forEach(t => t.classList.remove('destination-area-preview'));
    }
  }, 10);
}


async function handleDestinationAreaClick(e) {
  e.stopPropagation();
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const destX = parseInt(tile.dataset.x);
  const destY = parseInt(tile.dataset.y);
  const destPlanet = tile.dataset.planet;
  
  console.log(`Destination area selected at: ${destX}, ${destY} on ${destPlanet}`);
  
  await completePlanetTransfer(destX, destY, destPlanet);
}

async function handleDestinationAreaClickFromCard(e) {
  e.stopPropagation();
  
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players);
  
  if (!entity) return;
  
  const destX = entity.position.x;
  const destY = entity.position.y;
  const destPlanet = entity.planet;
  
  console.log(`Destination area selected from card at: ${destX}, ${destY} on ${destPlanet}`);
  
  await completePlanetTransfer(destX, destY, destPlanet);
}

async function completePlanetTransfer(destX, destY, destPlanet) {
  // Fix: Check for either selectedUpgradeCard OR currentEffectMenuEntity for board entities
  const initiatorEntity = selectedUpgradeCard || currentEffectMenuEntity;
  
  if (!window.sourceSelection || !initiatorEntity || !currentAreaEffect) {
    console.error("Missing required data for planet transfer:", {
      sourceSelection: !!window.sourceSelection,
      initiatorEntity: !!initiatorEntity,
      currentAreaEffect: !!currentAreaEffect,
      selectedUpgradeCard: !!selectedUpgradeCard,
      currentEffectMenuEntity: !!currentEffectMenuEntity
    });
    return;
  }
  
  // Check if this is a same_planet effect
  const destination = currentAreaEffect.stats.find(stat => stat.destination)?.destination;
  
  if (destination === "same_planet") {
    // For same_planet effects, ensure destination planet matches source planet
    const sourcePlanet = window.sourceSelection.planet;
    if (destPlanet !== sourcePlanet) {
      console.error(`Same planet effect requires destination on ${sourcePlanet}, but got ${destPlanet}`);
      return;
    }
    
    // Apply the same planet transfer effect
    await applySamePlanetTransferEffect(
      initiatorEntity,  // Use the resolved initiator entity
      currentAreaEffect, 
      window.sourceSelection,
      { x: destX, y: destY }
    );
  } else {
    // Regular planet transfer
    await applyPlanetTransferEffect(
      initiatorEntity,  // Use the resolved initiator entity
      currentAreaEffect, 
      window.sourceSelection,
      { x: destX, y: destY },
      destPlanet
    );
  }
  
  // Clean up
  delete window.sourceSelection;
  exitTargetingMode();
}

async function applySamePlanetTransferEffect(initiator, effect, sourcePos, destPos) {
  try {
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        initiator_entityid: initiator.entityid,
        effect_name: effect.name,
        target_position: sourcePos,
        target_planet: sourcePos.planet, // Source and destination planet are the same
        destination_position: destPos,
        destination_planet: sourcePos.planet // Same planet
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Same planet transfer failed:", data.error);
      alert("Same planet transfer failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying same planet transfer:", error);
    alert("Failed to apply same planet transfer: " + error.message);
  }
}


function setupDestinationAreaTargeting() {
  console.log("Setting up destination area targeting");
  
  // Add mouseover listeners to tiles for area preview (same as source)
  document.querySelectorAll('#game-board .tile').forEach(tile => {
    tile.addEventListener('mouseenter', showDestinationAreaPreviewWithRange);
    tile.addEventListener('mouseleave', hideDestinationAreaPreview);
    tile.addEventListener('click', handleDestinationAreaClickWithRange);
    tile.setAttribute('data-has-targeting-listeners', 'true'); // MARK THE TILE
  });
  
  // Also add listeners to cards for area targeting
  document.querySelectorAll('#game-board .card-on-board').forEach(card => {
    card.addEventListener('mouseenter', showDestinationAreaPreviewFromCardWithRange);
    card.addEventListener('mouseleave', hideDestinationAreaPreview);
    card.addEventListener('click', handleDestinationAreaClickFromCardWithRange);
  });
  
  // Update cursor
  document.body.style.cursor = 'crosshair';
}


function showDestinationAreaPreviewWithRange(e) {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const startX = parseInt(tile.dataset.x);
  const startY = parseInt(tile.dataset.y);
  const planetName = tile.dataset.planet;
  
  // Clear previous previews
  document.querySelectorAll('.destination-area-preview').forEach(t => t.classList.remove('destination-area-preview'));
  document.querySelectorAll('.destination-area-preview-out-of-range').forEach(t => t.classList.remove('destination-area-preview-out-of-range'));
  
  // Check range for same_planet effects
  let inRange = true;
  if (currentAreaEffect && window.sourceSelection) {
    const destination = currentAreaEffect.stats.find(stat => stat.destination)?.destination;
    const moveRange = currentAreaEffect.stats.find(stat => stat.range)?.range;
    
    if (destination === "same_planet" && moveRange !== undefined) {
      const sourceX = window.sourceSelection.x;
      const sourceY = window.sourceSelection.y;
      const distance = Math.max(Math.abs(sourceX - startX), Math.abs(sourceY - startY));
      inRange = distance <= moveRange;
    }
  }
  
  // Show area preview with appropriate styling
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        if (inRange) {
          targetTile.classList.add('destination-area-preview');
        } else {
          targetTile.classList.add('destination-area-preview-out-of-range');
        }
      }
    }
  }
}

function showDestinationAreaPreviewFromCardWithRange(e) {
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players);
  
  if (!entity) return;
  
  const startX = entity.position.x;
  const startY = entity.position.y;
  const planetName = entity.planet;
  
  // Clear previous previews
  document.querySelectorAll('.destination-area-preview').forEach(t => t.classList.remove('destination-area-preview'));
  document.querySelectorAll('.destination-area-preview-out-of-range').forEach(t => t.classList.remove('destination-area-preview-out-of-range'));
  
  // Check range for same_planet effects
  let inRange = true;
  if (currentAreaEffect && window.sourceSelection) {
    const destination = currentAreaEffect.stats.find(stat => stat.destination)?.destination;
    const moveRange = currentAreaEffect.stats.find(stat => stat.range)?.range;
    
    if (destination === "same_planet" && moveRange !== undefined) {
      const sourceX = window.sourceSelection.x;
      const sourceY = window.sourceSelection.y;
      const distance = Math.max(Math.abs(sourceX - startX), Math.abs(sourceY - startY));
      inRange = distance <= moveRange;
    }
  }
  
  // Show area preview
  for (let dy = 0; dy < areaSize.y; dy++) {
    for (let dx = 0; dx < areaSize.x; dx++) {
      const targetX = startX + dx;
      const targetY = startY + dy;
      
      const targetTile = document.querySelector(
        `#game-board .tile[data-x='${targetX}'][data-y='${targetY}'][data-planet='${planetName}']`
      );
      
      if (targetTile) {
        if (inRange) {
          targetTile.classList.add('destination-area-preview');
        } else {
          targetTile.classList.add('destination-area-preview-out-of-range');
        }
      }
    }
  }
}

async function handleDestinationAreaClickWithRange(e) {
  e.stopPropagation();
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  // Don't allow clicking on out-of-range tiles
  if (tile.classList.contains('destination-area-preview-out-of-range')) {
    return;
  }
  
  const destX = parseInt(tile.dataset.x);
  const destY = parseInt(tile.dataset.y);
  const destPlanet = tile.dataset.planet;
  
  console.log(`Destination area selected at: ${destX}, ${destY} on ${destPlanet}`);
  
  await completePlanetTransfer(destX, destY, destPlanet);
}

async function handleDestinationAreaClickFromCardWithRange(e) {
  e.stopPropagation();
  
  const card = e.target.closest('.card-on-board');
  if (!card) return;
  
  const entityId = card.dataset.entityid;
  const entity = getEntityById(entityId, latestGameState.players);
  
  if (!entity) return;
  
  const destX = entity.position.x;
  const destY = entity.position.y;
  const destPlanet = entity.planet;
  
  console.log(`Destination area selected from card at: ${destX}, ${destY} on ${destPlanet}`);
  
  await completePlanetTransfer(destX, destY, destPlanet);
}


async function handleDestinationClick(e) {
  e.stopPropagation();
  
  const tile = e.target.closest('.tile');
  if (!tile) return;
  
  const destX = parseInt(tile.dataset.x);
  const destY = parseInt(tile.dataset.y);
  const destPlanet = tile.dataset.planet;
  
  console.log(`Destination selected: ${destX}, ${destY} on ${destPlanet}`);
  
  if (!window.sourceSelection || !selectedUpgradeCard || !currentAreaEffect) {
    console.error("Missing required data for planet transfer");
    return;
  }
  
  // Apply the planet transfer effect
  await applyPlanetTransferEffect(
    selectedUpgradeCard, 
    currentAreaEffect, 
    window.sourceSelection,
    { x: destX, y: destY },
    destPlanet
  );
  
  // Clean up
  delete window.sourceSelection;
  exitTargetingMode();
}

async function applyPlanetTransferEffect(initiator, effect, sourcePos, destPos, destPlanet) {
  try {
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionid: currentSessionId,
        player: currentPlayer,
        initiator_entityid: initiator.entityid,
        effect_name: effect.name,
        target_position: sourcePos,
        target_planet: sourcePlanetForTransfer || currentDisplayedPlanet,
        destination_position: destPos,
        destination_planet: destPlanet
      })
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Planet transfer failed:", data.error);
      alert("Planet transfer failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying planet transfer:", error);
    alert("Failed to apply planet transfer: " + error.message);
  }
}



// Check if a position is valid for placement
function isValidPlacementPosition(planetName, x, y, player, entity = null) {
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
  
  // Check if entity has deep_strike keyword
  const hasDeepStrike = entity && entity.keywords && entity.keywords.includes('deep_strike');
  
  if (isHomePlanet) {
    // On home planet with deep_strike: special rules apply
    if (hasDeepStrike) {
      // Deep strike on home planet: can deploy anywhere EXCEPT landing zones and adjacent to landing zones
      if (isInLanding) {
        return { valid: false, reason: "Deep strike cannot be used in landing zones on home planet" };
      } else if (isAdjacentToLandingZone(planetName, x, y)) {
        return { valid: false, reason: "Deep strike cannot be used adjacent to landing zones on home planet" };
      } else {
        return { valid: true, reason: "Valid home planet deep strike position" };
      }
    } else {
      // Normal units on home planet: only deployment zones allowed
      if (isInDeployment) {
        return { valid: true, reason: "Valid deployment zone on home planet" };
      } else {
        return { valid: false, reason: "On your home planet, you can only place cards in deployment zones" };
      }
    }
  } else {
    // On non-home planet: existing rules
    if (isInLanding) {
      return { valid: true, reason: "Valid landing zone on non-home planet" };
    } else if (isInDeployment) {
      return { valid: false, reason: "Deployment zones are only for the home planet owner" };
    } else if (hasDeepStrike) {
      // Deep strike on non-home planet: can deploy anywhere except deployment zones and adjacent to deployment zones
      if (isAdjacentToDeploymentZone(planetName, x, y)) {
        return { valid: false, reason: "Deep strike cannot be used adjacent to deployment zones" };
      } else {
        return { valid: true, reason: "Valid deep strike position" };
      }
    } else {
      return { valid: false, reason: "You can only place cards in landing zones on non-home planets" };
    }
  }
}

function isAdjacentToLandingZone(planetName, x, y) {
  const landingZones = getLandingZones(planetName);
  
  // Check all 8 adjacent positions (including diagonals)
  const adjacentOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  for (const [dx, dy] of adjacentOffsets) {
    const adjX = x + dx;
    const adjY = y + dy;
    
    // Check if this adjacent position is a landing zone
    if (landingZones.some(zone => zone.x === adjX && zone.y === adjY)) {
      return true;
    }
  }
  
  return false;
}

function isAdjacentToDeploymentZone(planetName, x, y) {
  const deploymentZones = getDeploymentZones(planetName);
  
  // Check all 8 adjacent positions (including diagonals)
  const adjacentOffsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  for (const [dx, dy] of adjacentOffsets) {
    const adjX = x + dx;
    const adjY = y + dy;
    
    // Check if this adjacent position is a deployment zone
    if (deploymentZones.some(zone => zone.x === adjX && zone.y === adjY)) {
      return true;
    }
  }
  
  return false;
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

    // NEW: Use enhanced validation that considers deep_strike and passes selectedCard
    const validation = isValidPlacementPosition(tilePlanet, x, y, currentPlayer, selectedCard);
    
    if (!validation.valid) {
      newTile.classList.add("invalid-placement");
      setTimeout(() => newTile.classList.remove("invalid-placement"), 600);
      console.log("Invalid placement:", validation.reason);
      return;
    }

    // Check if position is occupied by any entity on this planet
    const allBoardCards = [];
    for (const p of Object.values(latestGameState.players)) {
      allBoardCards.push(...(p.cardsonboard || []));
    }
    
    if (get_entity_at_position(allBoardCards, x, y, tilePlanet)) {
      newTile.classList.add("invalid-placement");
      setTimeout(() => newTile.classList.remove("invalid-placement"), 600);
      console.log("That tile is already occupied.");
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

function get_entity_at_position(entities, x, y, planet = null) {
  for (const entity of entities) {
    if (entity.position.x === x && entity.position.y === y) {
      if (planet === null || entity.planet === planet) {
        return entity;
      }
    }
  }
  return null;
}

function findCardById(list, id) {
  return list.find(c => c.entityid === id);
}

function checkInitiatorPropertyPrerequisite(prerequisite, initiatorEntity) {
  /**
   * Check if initiator_property prerequisite is met on the frontend
   * @param {Object} prerequisite - The prerequisite object with property_name and property_value
   * @param {Object} initiatorEntity - The entity initiating the effect
   * @returns {Object} {valid: boolean, reason: string}
   */
  const propertyName = prerequisite.property_name;
  const propertyValue = prerequisite.property_value;
  
  if (!propertyName || propertyValue === undefined || propertyValue === null) {
    return {
      valid: false,
      reason: "Invalid initiator_property prerequisite: missing property_name or property_value"
    };
  }
  
  // Check if the initiator entity has the required property
  if (!initiatorEntity.hasOwnProperty(propertyName)) {
    return {
      valid: false,
      reason: `Initiator entity does not have property '${propertyName}'`
    };
  }
  
  const actualValue = initiatorEntity[propertyName];
  
  // Convert property_value to the appropriate type based on actual_value
  const expectedValue = convertPrerequisiteValue(propertyValue, actualValue);
  
  // Check if the values match
  if (actualValue === expectedValue) {
    return { valid: true, reason: "" };
  } else {
    return {
      valid: false,
      reason: `Initiator property '${propertyName}' is ${actualValue}, but requires ${expectedValue}`
    };
  }
}

function convertPrerequisiteValue(propertyValue, actualValue) {
  /**
   * Convert property_value string to the appropriate type based on actual_value
   * @param {string} propertyValue - The string value from the prerequisite
   * @param {*} actualValue - The actual value from the entity property
   * @returns {*} The converted value
   */
  
  // If actual_value is boolean, convert string to boolean
  if (typeof actualValue === 'boolean') {
    if (typeof propertyValue === 'string') {
      if (propertyValue.toLowerCase() === "true") {
        return true;
      } else if (propertyValue.toLowerCase() === "false") {
        return false;
      }
    }
    // If it's already a boolean, return as-is
    return propertyValue;
  }
  
  // If actual_value is number, try to convert to number
  else if (typeof actualValue === 'number') {
    if (typeof propertyValue === 'string') {
      const numValue = Number(propertyValue);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }
    return propertyValue;
  }
  
  // For strings and other types, return as string
  else {
    return String(propertyValue);
  }
}

function checkEffectPrerequisitesFrontend(effect, initiatorEntity) {
  /**
   * Check all prerequisites for an effect on the frontend
   * @param {Object} effect - The effect object
   * @param {Object} initiatorEntity - The entity initiating the effect
   * @returns {Object} {valid: boolean, reason: string}
   */
  
  // Get prerequisites from the effect
  const requires = effect.requires || [];
  
  if (requires.length === 0) {
    return { valid: true, reason: "" };
  }
  
  // Check each prerequisite
  for (const prerequisite of requires) {
    const prerequisiteType = prerequisite.prerequisite_type;
    
    if (prerequisiteType === "initiator_property") {
      const result = checkInitiatorPropertyPrerequisite(prerequisite, initiatorEntity);
      if (!result.valid) {
        return result;
      }
    }
    // Note: Other prerequisite types (entity_on_board, entity_on_same_planet, entity_in_target_area) 
    // are more complex and require game state context, so they're better handled on the backend
    // We could add them here in the future if needed
  }
  
  return { valid: true, reason: "" };
}

// Update the existing isEffectEligibleWithConsumption function
function isEffectEligibleWithConsumption(effect, entity) {
  if (!latestGameState) return false;
  
  // First check the existing eligibility
  const basicEligibility = isEffectEligible(effect);
  if (!basicEligibility) return false;
  
  // NEW: Check initiator property prerequisites
  const prerequisiteResult = checkEffectPrerequisitesFrontend(effect, entity);
  if (!prerequisiteResult.valid) {
    console.log(`Effect ${effect.name} prerequisite failed:`, prerequisiteResult.reason);
    return false;
  }
  
  // Check consumption rules (existing code)
  const consumption = effect.consumption;
  
  if (consumption === "once_per_turn_per_initiating_entity") {
    // Check if this entity has used this effect this turn
    const entityId = entity.entityid;
    const effectName = effect.name;
    const currentTurnId = `${latestGameState.playerturn}_${latestGameState.round}`;
    
    if (latestGameState.effect_usage_tracking && 
        latestGameState.effect_usage_tracking[entityId] && 
        latestGameState.effect_usage_tracking[entityId][effectName] === currentTurnId) {
      return false; // Already used this turn
    }
  } else if (consumption === "once_per_battle") {
    // Check if this entity has used this effect this battle
    const entityId = entity.entityid;
    const effectName = effect.name;
    
    if (latestGameState.battle_effect_usage_tracking && 
        latestGameState.battle_effect_usage_tracking[entityId] && 
        latestGameState.battle_effect_usage_tracking[entityId].includes(effectName)) {
      return false; // Already used this battle
    }
  } else if (consumption === "once_per_battle_per_initiating_entity") {
    // Check if this specific entity has used this effect this battle
    const entityId = entity.entityid;
    const effectName = effect.name;
    
    if (latestGameState.battle_effect_usage_tracking && 
        latestGameState.battle_effect_usage_tracking[entityId] && 
        latestGameState.battle_effect_usage_tracking[entityId].includes(effectName)) {
      return false; // Already used this battle by this entity
    }
  }
  
  return true;
}


function highlightEligibleTargetsForKeywordChange(effect) {
  // Clear previous highlights
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('eligible-target', 'invalid-target', 'own-unit', 'enemy-unit');
  });
  
  const targeting = effect.targeting || {};
  const locations = targeting.locations || [];
  
  // Get entities in specified locations
  const eligibleEntities = getEntitiesInLocations(locations);
  
  eligibleEntities.forEach(entity => {
    if (isValidKeywordChangeTarget(entity, effect)) {
      const cardElement = document.querySelector(`[data-entityid="${entity.entityid}"]`);
      if (cardElement) {
        cardElement.classList.add('eligible-target');
        
        // Add visual distinction between own and enemy units
        if (entity.owner === currentPlayer) {
          cardElement.classList.add('own-unit');
        } else {
          cardElement.classList.add('enemy-unit');
        }
        
        // Add click handler for targeting with once: true to prevent multiple handlers
        cardElement.addEventListener('click', async (e) => {
          e.stopPropagation();
          await handleKeywordChangeTargetSelection(entity);
        }, { once: true });
      }
    } else {
      const cardElement = document.querySelector(`[data-entityid="${entity.entityid}"]`);
      if (cardElement) {
        cardElement.classList.add('invalid-target');
      }
    }
  });
}

function getEntitiesInLocations(locations) {
  const entities = [];
  
  if (!latestGameState || !latestGameState.players[currentPlayer]) {
    return entities;
  }
  
  const player = latestGameState.players[currentPlayer];
  
  for (const location of locations) {
    if (location === "hand") {
      entities.push(...(player.hand || []));
    } else if (location === "board" || location === "currentDisplayedPlanet") {
      // For board entities, only include those on the current displayed planet
      const boardEntities = player.cardsonboard || [];
      entities.push(...boardEntities.filter(e => e.planet === currentDisplayedPlanet));
    } else if (location === "graveyard") {
      entities.push(...(player.graveyard || []));
    } else if (location === "upgradedeck") {
      entities.push(...(player.upgradedeck || []));
    }
  }
  
  return entities;
}

function isValidKeywordChangeTarget(entity, effect) {
  const targeting = effect.targeting || {};
  
  // Check required keywords
  const requiredKeywords = targeting.required_keywords || [];
  for (const keyword of requiredKeywords) {
    if (!entity.keywords.includes(keyword)) {
      return false;
    }
  }
  
  // Check forbidden keywords
  const forbiddenKeywords = targeting.forbidden_keywords || [];
  for (const keyword of forbiddenKeywords) {
    if (entity.keywords.includes(keyword)) {
      return false;
    }
  }
  
  // Check target ownership
  const targetOwners = targeting.target_owner || ["own"];
  if (!isValidTargetOwner(entity.owner, currentPlayer, targetOwners)) {
    return false;
  }
  
  return true;
}

async function handleKeywordChangeTargetSelection(target) {
  if (!selectedUpgradeCard || !currentEffect) {
    console.error("No upgrade card or effect selected");
    return;
  }
  
  console.log(`Keyword change target selected: ${target.cardtype} (${target.entityid})`);
  
  // Apply the keyword change effect
  await applyKeywordChangeEffect(selectedUpgradeCard, currentEffect, target);
  
  // Exit targeting mode (this should clean up highlights and cursor)
  exitTargetingMode();
}

async function applyKeywordChangeEffect(initiator, effect, target) {
  try {
    const requestBody = {
      sessionid: currentSessionId,
      player: currentPlayer,
      initiator_entityid: initiator.entityid,
      effect_name: effect.name,
      target_entityid: target.entityid
    };
    
    // Add location context if targeting hand
    const targeting = effect.targeting || {};
    const locations = targeting.locations || [];
    if (locations.includes("hand")) {
      // No special handling needed, backend will find the entity
    }
    
    const res = await fetch(`${API_BASE}/apply_effect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    
    if (data.error) {
      console.error("Keyword change effect failed:", data.error);
      alert("Effect failed: " + data.error);
      return;
    }

    // Update game state
    updateGameStateAndRender(data);
    
  } catch (error) {
    console.error("Network error applying keyword change effect:", error);
    alert("Failed to apply effect: " + error.message);
  }
}

// Add this function to validate target area prerequisites on the frontend:

function validateTargetAreaPrerequisites(effect, targetPosition, targetPlanet) {
  if (!effect.requires || !effect.requires.length) {
    return { valid: true, reason: "" };
  }
  
  // Check each prerequisite
  for (const prerequisite of effect.requires) {
    if (prerequisite.prerequisite_type === "entity_in_target_area") {
      const result = checkEntityInTargetAreaPrerequisite(prerequisite, targetPosition, targetPlanet, effect.targeting);
      if (!result.valid) {
        return result;
      }
    }
    // Other prerequisite types are handled on the backend
  }
  
  return { valid: true, reason: "" };
}

function checkEntityInTargetAreaPrerequisite(prerequisite, targetPosition, targetPlanet, targeting) {
  const minNumber = prerequisite.min_number_of_entities || 1;
  const requiredKeywordsAll = prerequisite.required_keywords_all || [];
  const requiredKeywordsAny = prerequisite.required_keywords_any || [];
  const requiredNames = prerequisite.required_name || [];
  
  if (!targetPosition || !targetPlanet || !targeting) {
    return { valid: false, reason: "Invalid target area information" };
  }
  
  // Get area dimensions
  const areaWidth = targeting.x || 1;
  const areaHeight = targeting.y || 1;
  const startX = targetPosition.x;
  const startY = targetPosition.y;
  
  // Get all player's entities on the target planet
  const playerEntities = [];
  if (latestGameState && latestGameState.players[currentPlayer] && latestGameState.players[currentPlayer].cardsonboard) {
    for (const entity of latestGameState.players[currentPlayer].cardsonboard) {
      if (entity.planet === targetPlanet) {
        playerEntities.push(entity);
      }
    }
  }
  
  // Find entities in the target area that match criteria
  const matchingEntities = [];
  for (const entity of playerEntities) {
    const entityX = entity.position.x;
    const entityY = entity.position.y;
    
    // Check if entity is within the target area
    if (startX <= entityX && entityX < startX + areaWidth &&
        startY <= entityY && entityY < startY + areaHeight) {
      
      // Check if entity meets the prerequisite criteria
      if (entityMeetsPrerequisiteCriteria(entity, requiredKeywordsAll, requiredKeywordsAny, requiredNames)) {
        matchingEntities.push(entity);
      }
    }
  }
  
  // Check if we have enough matching entities
  if (matchingEntities.length >= minNumber) {
    return { valid: true, reason: "" };
  } else {
    // Build descriptive error message
    const criteriaParts = [];
    if (requiredKeywordsAll.length > 0) {
      criteriaParts.push(`keywords: ${requiredKeywordsAll.join(', ')}`);
    }
    if (requiredKeywordsAny.length > 0) {
      criteriaParts.push(`any of keywords: ${requiredKeywordsAny.join(', ')}`);
    }
    if (requiredNames.length > 0) {
      criteriaParts.push(`name: ${requiredNames.join(', ')}`);
    }
    
    const criteriaText = criteriaParts.join(' and ');
    const foundCount = matchingEntities.length;
    
    return { 
      valid: false, 
      reason: `Requires ${minNumber} unit(s) with ${criteriaText} in target area (found ${foundCount})` 
    };
  }
}

function entityMeetsPrerequisiteCriteria(entity, requiredKeywordsAll, requiredKeywordsAny, requiredNames) {
  // Check required names
  if (requiredNames.length > 0 && !requiredNames.includes(entity.cardtype)) {
    return false;
  }
  
  // Check required keywords (all)
  if (requiredKeywordsAll.length > 0) {
    for (const keyword of requiredKeywordsAll) {
      if (!entity.keywords.includes(keyword)) {
        return false;
      }
    }
  }
  
  // Check required keywords (any)
  if (requiredKeywordsAny.length > 0) {
    const hasAnyKeyword = requiredKeywordsAny.some(keyword => entity.keywords.includes(keyword));
    if (!hasAnyKeyword) {
      return false;
    }
  }
  
  return true;
}

function showEffectSelectionMenu(entity, eligibleEffects, clickEvent) {
  const menu = document.getElementById('effect-menu');
  const menuItems = document.getElementById('effect-menu-items');
  
  // Store the entity for later use
  currentEffectMenuEntity = entity;
  
  // Clear previous items
  menuItems.innerHTML = '';
  
  // Create menu items for each eligible effect
  eligibleEffects.forEach(effect => {
    const menuItem = createEffectMenuItem(entity, effect);
    menuItems.appendChild(menuItem);
  });
  
  // Position the menu near the clicked card
  const rect = clickEvent.target.getBoundingClientRect();
  menu.style.left = `${rect.right + 10}px`;
  menu.style.top = `${rect.top}px`;
  
  // Ensure menu stays within viewport
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (menuRect.right > viewportWidth) {
    menu.style.left = `${rect.left - menuRect.width - 10}px`;
  }
  
  if (menuRect.bottom > viewportHeight) {
    menu.style.top = `${rect.bottom - menuRect.height}px`;
  }
  
  // Show the menu
  menu.style.display = 'block';
  
  // Add global click listener to close menu
  setTimeout(() => {
    document.addEventListener('click', handleEffectMenuGlobalClick);
  }, 10);
}

function createEffectMenuItem(entity, effect) {
  const menuItem = document.createElement('div');
  menuItem.className = 'effect-menu-item';
  
  // Check if player can afford this effect
  const canAfford = canPlayerAffordEffect(effect);
  
  // Check consumption eligibility
  const consumptionEligible = isEffectEligibleWithConsumption(effect, entity);
  
  // NEW: Get specific prerequisite failure reason for better user feedback
  let prerequisiteFailureReason = "";
  if (!consumptionEligible) {
    const prerequisiteResult = checkEffectPrerequisitesFrontend(effect, entity);
    if (!prerequisiteResult.valid) {
      prerequisiteFailureReason = prerequisiteResult.reason;
    }
  }
  
  if (!canAfford || !consumptionEligible) {
    menuItem.classList.add('disabled');
  }
  
  // Effect name
  const effectName = document.createElement('div');
  effectName.className = 'effect-name';
  effectName.textContent = effect.name;
  
  // Effect cost
  const effectCost = createEffectCostDisplay(effect);
  
  // Effect description with consumption info
  const effectDescription = document.createElement('div');
  effectDescription.className = 'effect-description';
  effectDescription.textContent = getEffectDescription(effect);
  
  // Add prerequisite/consumption status indicator if not eligible
  if (!consumptionEligible) {
    const statusElement = document.createElement('div');
    statusElement.className = 'effect-consumption-status';
    
    // Show prerequisite failure reason if available, otherwise show consumption status
    if (prerequisiteFailureReason) {
      statusElement.textContent = prerequisiteFailureReason;
    } else if (effect.consumption === "once_per_turn_per_initiating_entity") {
      statusElement.textContent = "Already used this turn";
    } else if (effect.consumption === "once_per_battle") {
      statusElement.textContent = "Already used this battle";
    } else if (effect.consumption === "once_per_battle_per_initiating_entity") {
      statusElement.textContent = "Already used this battle";
    }
    
    statusElement.style.color = '#f38ba8';
    statusElement.style.fontSize = '0.8em';
    statusElement.style.fontStyle = 'italic';
    
    menuItem.appendChild(statusElement);
  }
  
  menuItem.appendChild(effectName);
  if (effectCost) {
    menuItem.appendChild(effectCost);
  }
  if (effectDescription.textContent) {
    menuItem.appendChild(effectDescription);
  }
  
  // Add click handler (only if eligible)
  if (canAfford && consumptionEligible) {
    menuItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      hideEffectSelectionMenu();
      await initiateEffectTargeting(entity, effect);
    });
  }
  
  return menuItem;
}

function createEffectCostDisplay(effect) {
  const cost = effect.cost;
  if (!cost || (cost.biomass === 0 && cost.plasteel === 0 && cost.promethium === 0)) {
    return null;
  }
  
  const costContainer = document.createElement('div');
  costContainer.className = 'effect-cost';
  
  if (cost.biomass > 0) {
    const costItem = document.createElement('div');
    costItem.className = 'effect-cost-item';
    costItem.innerHTML = `
      <div class="effect-cost-icon biomass"></div>
      <span class="effect-cost-number">${cost.biomass}</span>
    `;
    costContainer.appendChild(costItem);
  }
  
  if (cost.plasteel > 0) {
    const costItem = document.createElement('div');
    costItem.className = 'effect-cost-item';
    costItem.innerHTML = `
      <div class="effect-cost-icon plasteel"></div>
      <span class="effect-cost-number">${cost.plasteel}</span>
    `;
    costContainer.appendChild(costItem);
  }
  
  if (cost.promethium > 0) {
    const costItem = document.createElement('div');
    costItem.className = 'effect-cost-item';
    costItem.innerHTML = `
      <div class="effect-cost-icon promethium"></div>
      <span class="effect-cost-number">${cost.promethium}</span>
    `;
    costContainer.appendChild(costItem);
  }
  
  return costContainer;
}

function canPlayerAffordEffect(effect) {
  if (!effect.cost || !latestGameState || !latestGameState.players[currentPlayer]) {
    return true;
  }
  
  const player = latestGameState.players[currentPlayer];
  const cost = effect.cost;
  
  return (
    player.biomass >= (cost.biomass || 0) &&
    player.plasteel >= (cost.plasteel || 0) &&
    player.promethium >= (cost.promethium || 0)
  );
}


function hideEffectSelectionMenu() {
  const menu = document.getElementById('effect-menu');
  menu.style.display = 'none';
  currentEffectMenuEntity = null;
  
  // Remove global click listener
  document.removeEventListener('click', handleEffectMenuGlobalClick);
}

function handleEffectMenuGlobalClick(e) {
  const menu = document.getElementById('effect-menu');
  
  // If clicking outside the menu, close it
  if (!menu.contains(e.target)) {
    hideEffectSelectionMenu();
  }
}

// Enhanced getEffectDescription function for app.js
// This function should replace the existing one in app.js

function getEffectDescription(effect) {
  let baseDescription = "";
  
  switch (effect.type) {
    case "terrain_feature_change":
      if (effect.stats && effect.stats[0]) {
        const featuresToAdd = effect.stats[0].terrain_features_to_add || [];
        const featuresToRemove = effect.stats[0].terrain_features_to_remove || [];
        const featuresToUpgrade = effect.stats[0].terrain_features_to_upgrade || [];
        const populationChange = effect.stats[0].population_change;
        
        const actions = [];
        if (featuresToAdd.length > 0) {
          actions.push(`add ${featuresToAdd.join(', ')}`);
        }
        if (featuresToRemove.length > 0) {
          actions.push(`remove ${featuresToRemove.join(', ')}`);
        }
        if (featuresToUpgrade.length > 0) {
          actions.push(`upgrade ${featuresToUpgrade.join(', ')}`);
        }
        
        // Add population change description with ruin warning
        if (populationChange !== undefined && populationChange !== 0) {
          if (populationChange > 0) {
            actions.push(`increase city population by ${populationChange}`);
          } else {
            actions.push(`decrease city population by ${Math.abs(populationChange)}`);
            // NEW: Add warning about city ruin for significant population reduction
            if (Math.abs(populationChange) >= 3) {
              actions.push(`(may ruin cities)`);
            }
          }
        }
        
        if (actions.length > 0) {
          baseDescription = `Modify terrain: ${actions.join(' and ')}`;
        } else {
          baseDescription = "Modify terrain features";
        }
        
        // Add summoning information if present
        if (effect.card_to_summon) {
          baseDescription += `, then summon ${effect.card_to_summon}`;
        }
      } else {
        baseDescription = "Modify terrain features";
      }
      break;
    case "keyword_change":
      if (effect.stats && effect.stats[0]) {
        const keyword = effect.stats[0].keyword;
        const action = effect.stats[0].add_or_remove || "add";
        
        if (action === "add") {
          baseDescription = `Add ${keyword} keyword`;
        } else if (action === "remove") {
          baseDescription = `Remove ${keyword} keyword`;
        } else {
          baseDescription = `Modify ${keyword} keyword`;
        }
        
        // Add location context
        const targeting = effect.targeting || {};
        const locations = targeting.locations || [];
        if (locations.includes("hand")) {
          baseDescription += " (targets in hand)";
        } else if (locations.includes("board") || locations.includes("currentDisplayedPlanet")) {
          baseDescription += " (targets on board)";
        }
      } else {
        baseDescription = "Modify keywords";
      }
      break;
    case "move_to":
      if (effect.stats && effect.stats[0] && effect.stats[0].destination === "planet") {
        baseDescription = "Transfer units to another location";
      } else if (effect.stats && effect.stats[0] && effect.stats[0].destination === "hand") {
        baseDescription = "Return units to hand";
      } else {
        baseDescription = "Move units";
      }
      break;
    case "move_to_and_rejuvenate":
      if (effect.stats && effect.stats[0] && effect.stats[0].destination === "planet") {
        baseDescription = "Transfer and restore units to another location";
      } else if (effect.stats && effect.stats[0] && effect.stats[0].destination === "hand") {
        baseDescription = "Return and restore units to hand";
      } else {
        baseDescription = "Move and restore units";
      }
      break;
    case "displacement":
      if (effect.stats && effect.stats[0]) {
        const displacementType = effect.stats[0].stat_type;
        const value = effect.stats[0].value || 1;
        const range = effect.stats[0].range;
        const damageType = effect.stats[0].damage_type;
        const damageValue = effect.stats[0].damage_value;
        const cardToSummon = effect.card_to_summon;
        
        // NEW: Check for terrain changes
        const terrainFeaturesToAdd = effect.stats[0].terrain_features_to_add || [];
        const terrainFeaturesToRemove = effect.stats[0].terrain_features_to_remove || [];
        
        const targeting = effect.targeting || {};
        const targetTypes = targeting.target_types || [];
        const isAreaTarget = targetTypes.includes("area");
        
        // Build base displacement description
        if (displacementType === "push") {
          baseDescription = isAreaTarget ? "Push units away from area" : `Push enemies ${value} tile(s) away`;
        } else if (displacementType === "pull") {
          baseDescription = isAreaTarget ? "Pull units toward initiator from area" : `Pull enemies ${value} tile(s) closer`;
        } else if (displacementType === "scatter") {
          baseDescription = isAreaTarget ? "Scatter units from target area" : "Scatter enemies to random adjacent positions";
        }
        
        if (range && range > 0) {
          baseDescription += ` (range ${range})`;
        }
        
        // Add damage information if present
        if (damageType && damageValue) {
          baseDescription = `Deal ${damageValue} ${damageType} damage to area, then ${baseDescription.toLowerCase()}`;
        }
        
        // NEW: Add terrain change information
        if (terrainFeaturesToAdd.length > 0 || terrainFeaturesToRemove.length > 0) {
          const terrainActions = [];
          if (terrainFeaturesToAdd.length > 0) {
            terrainActions.push(`add ${terrainFeaturesToAdd.join(', ')}`);
          }
          if (terrainFeaturesToRemove.length > 0) {
            terrainActions.push(`remove ${terrainFeaturesToRemove.join(', ')}`);
          }
          
          if (terrainActions.length > 0) {
            baseDescription += `, then ${terrainActions.join(' and ')} terrain`;
          }
        }
        
        // Add summon information if present
        if (cardToSummon) {
          baseDescription += `, then summon ${cardToSummon}`;
        }
      } else {
        baseDescription = "Displace enemy units";
      }
      break;
    case "instant_damage":
      if (effect.stats && effect.stats[0]) {
        const damageType = effect.stats[0].damage_type;
        const damageValue = effect.stats[0].damage_value;
        
        // NEW: Check for terrain changes in instant damage
        const terrainFeaturesToAdd = effect.stats[0].terrain_features_to_add || [];
        const terrainFeaturesToRemove = effect.stats[0].terrain_features_to_remove || [];
        
        if (damageType && damageValue) {
          baseDescription = `Deal ${damageValue} ${damageType} damage`;
          
          // NEW: Add terrain change information
          if (terrainFeaturesToAdd.length > 0 || terrainFeaturesToRemove.length > 0) {
            const terrainActions = [];
            if (terrainFeaturesToAdd.length > 0) {
              terrainActions.push(`add ${terrainFeaturesToAdd.join(', ')}`);
            }
            if (terrainFeaturesToRemove.length > 0) {
              terrainActions.push(`remove ${terrainFeaturesToRemove.join(', ')}`);
            }
            
            if (terrainActions.length > 0) {
              baseDescription += `, then ${terrainActions.join(' and ')} terrain`;
            }
          }
        }
      } else {
        baseDescription = "Deal damage to targets";
      }
      break;
    case "instant_card_stat_change":
      baseDescription = "Modify unit statistics";
      break;
    case "apply_tokens":
      baseDescription = "Apply status effects";
      break;
    case "summon":
      baseDescription = "Create new units";
      break;
    default:
      baseDescription = "";
      break;
  }
  
  // Add consumption information
  if (effect.consumption === "once_per_turn_per_initiating_entity") {
    baseDescription += " (Once per turn)";
  } else if (effect.consumption === "once_per_battle") {
    baseDescription += " (Once per battle)";
  } else if (effect.consumption === "once_per_battle_per_initiating_entity") {
    baseDescription += " (Once per battle per unit)";
  } else if (effect.consumption === "single_use") {
    baseDescription += " (Single use)";
  }
  
  return baseDescription;
}


function exitTargetingMode() {
  targetingMode = false;
  areaTargeting = false;
  planetTransferMode = false;
  selectedUpgradeCard = null;
  currentEffect = null;
  currentAreaEffect = null;
  currentEffectMenuEntity = null;
  sourcePlanetForTransfer = null;
  
  // Hide effect menu if it's open
  hideEffectSelectionMenu();
  
  // Reset cursor
  document.body.style.cursor = 'default';
  
  // Clear highlights from ALL cards (not just board entities)
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('eligible-target', 'invalid-target', 'own-unit', 'enemy-unit');
  });
  
  // Also clear highlights from board entities specifically
  document.querySelectorAll('.card-on-board').forEach(card => {
    card.classList.remove('eligible-target', 'invalid-target', 'own-unit', 'enemy-unit');
  });
  
  // Clean up tile classes and ONLY targeting-specific event listeners
  document.querySelectorAll('.tile').forEach(tile => {
    tile.classList.remove(
      'area-target', 
      'area-preview', 
      'destination-selectable', 
      'destination-area-preview',
      'terrain-preview',  // ADD TERRAIN CLEANUP
      'terrain-preview-invalid'  // ADD TERRAIN CLEANUP
    );
    
    // Remove only targeting-specific event listeners by checking data attributes
    if (tile.hasAttribute('data-has-targeting-listeners')) {
      // Only clone/replace tiles that had targeting listeners
      const newTile = tile.cloneNode(true);
      tile.parentNode.replaceChild(newTile, tile);
      newTile.removeAttribute('data-has-targeting-listeners');
      
      // Re-attach placement listeners if needed
      if (latestGameState && latestGameState.stage === "cardplacement") {
        attachPlacementListener(newTile);
      }
    }
  });
  
  // Re-render the board to restore all board entity click handlers
  if (latestGameState && currentDisplayedPlanet) {
    renderBoardForPlanet(latestGameState.players, currentDisplayedPlanet);
  }
  
  // IMPORTANT: Re-render the hand to restore normal click handlers
  if (latestGameState && latestGameState.players[currentPlayer]) {
    renderHand(latestGameState.players[currentPlayer].hand, currentPlayer);
  }
  
  // Remove escape key listener
  document.removeEventListener('keydown', handleTargetingEscape);
  
  // Clean up any stored selections
  delete window.sourceSelection;
}

function handleTargetingEscape(e) {
  if (e.key === 'Escape') {
    exitTargetingMode();
  }
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

  // Check if players have changed (important for planet order)
  const playersChanged = didPlayersChange(latestGameState, newState);

  // Determine what needs updating by comparing with previous state
  const handChanged = didHandChange(latestGameState, newState);
  const boardChanged = didBoardChange(latestGameState, newState) || featuresChanged;
  const statusChanged = didStatusChange(latestGameState, newState);
  const graveyardChanged = didGraveyardChange(latestGameState, newState);
  const gameOverChanged = latestGameState?.gameover !== newState.gameover;
  const upgradeDeckChanged = didUpgradeDeckChange(latestGameState, newState);
  
  // NEW: Check if keywords in hand have changed (for deep_strike icon updates)
  const handKeywordsChanged = didHandKeywordsChange(latestGameState, newState);
  
  // Update latestGameState after comparison but before rendering
  latestGameState = newState;
  
  // If players changed, force recalculation of planet order and previews
  if (playersChanged && currentPlayer) {
    console.log("Players changed, recalculating planet order");
    initializePlanetNavigation();
    createPlanetPreviews();
    updatePlanetPreviewTiles();
  }
  
  // Only update what's changed
  if (statusChanged) {
    updateGameStatus(newState);
  }
  
  // Force hand re-render if hand changed OR keywords changed OR stage changed to cardplacement
  if (handChanged || handKeywordsChanged || 
      (latestGameState.stage === "cardplacement" && 
       (!latestGameState.previousStage || latestGameState.previousStage !== "cardplacement"))) {
    console.log("Re-rendering hand due to changes");
    renderHand(newState.players[currentPlayer].hand, currentPlayer);
  }
  
  if (boardChanged) {
    if (featuresChanged && currentDisplayedPlanet) {
      // If features changed, recreate the entire board for the current planet
      updateGameBoardForPlanet(currentDisplayedPlanet);
    } else {
      // Normal board update
      renderBoardForPlanet(newState.players, currentDisplayedPlanet);
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

  if (upgradeDeckChanged) {
    renderUpgradeDeck(newState.players[currentPlayer].upgradedeck, currentPlayer);
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
  
  // Initialize planet navigation if needed (but only if players didn't change - we handled that above)
  if (newState && currentPlayer && !planetNavigationInitialized) {
    initializePlanetNavigation();
    planetNavigationInitialized = true;
    createPlanetPreviews();
    updatePlanetPreviewTiles();
  } else if (newState && currentPlayer && planetNavigationInitialized && !playersChanged) {
    updatePlanetDisplay();
    updatePlanetPreviewTiles();
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

// New helper function to detect hand keyword changes
function didHandKeywordsChange(oldState, newState) {
  if (!oldState || !currentPlayer) return false;
  
  const oldHand = oldState.players[currentPlayer]?.hand || [];
  const newHand = newState.players[currentPlayer]?.hand || [];
  
  // Quick check - if lengths are different, something changed
  if (oldHand.length !== newHand.length) return true;
  
  // Check if keywords changed for any card in hand
  for (let i = 0; i < oldHand.length; i++) {
    const oldCard = oldHand[i];
    const newCard = newHand[i];
    
    if (!oldCard || !newCard || oldCard.entityid !== newCard.entityid) {
      return true; // Card order changed
    }
    
    // Compare keywords
    const oldKeywords = JSON.stringify(oldCard.keywords?.sort() || []);
    const newKeywords = JSON.stringify(newCard.keywords?.sort() || []);
    
    if (oldKeywords !== newKeywords) {
      console.log(`Keywords changed for ${newCard.cardtype}: ${oldKeywords} -> ${newKeywords}`);
      return true;
    }
  }
  
  return false;
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
  
  // Check if any card moved, changed stats, or tokens changed
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
      
      // Check if tokens changed
      if (JSON.stringify(oldCard.tokens || []) !== JSON.stringify(newCard.tokens || [])) {
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
  
  // Enhanced resource change detection for all players
  let resourcesChanged = false;
  
  // Check current player's resources
  const oldCurrentPlayer = oldState.players[currentPlayer];
  const newCurrentPlayer = newState.players[currentPlayer];
  
  if (oldCurrentPlayer && newCurrentPlayer) {
    resourcesChanged = resourcesChanged || 
                      oldCurrentPlayer.health !== newCurrentPlayer.health ||
                      oldCurrentPlayer.armor !== newCurrentPlayer.armor ||
                      oldCurrentPlayer.biomass !== newCurrentPlayer.biomass ||
                      oldCurrentPlayer.plasteel !== newCurrentPlayer.plasteel ||
                      oldCurrentPlayer.promethium !== newCurrentPlayer.promethium;
  }
  
  // Check other player's resources (for enemy display)
  const otherPlayer = currentPlayer === "player1" ? "player2" : "player1";
  const oldOtherPlayer = oldState.players[otherPlayer];
  const newOtherPlayer = newState.players[otherPlayer];
  
  if (oldOtherPlayer && newOtherPlayer) {
    resourcesChanged = resourcesChanged ||
                      oldOtherPlayer.health !== newOtherPlayer.health ||
                      oldOtherPlayer.armor !== newOtherPlayer.armor ||
                      oldOtherPlayer.biomass !== newOtherPlayer.biomass ||
                      oldOtherPlayer.plasteel !== newOtherPlayer.plasteel ||
                      oldOtherPlayer.promethium !== newOtherPlayer.promethium;
  }
  
  return basicStateChanged || resourcesChanged;
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
  
  // Compare entity IDs
  const oldIds1 = oldGraveyard1.map(entity => entity.entityid).sort();
  const newIds1 = newGraveyard1.map(entity => entity.entityid).sort();
  const oldIds2 = oldGraveyard2.map(entity => entity.entityid).sort();
  const newIds2 = newGraveyard2.map(entity => entity.entityid).sort();
  
  for (let i = 0; i < oldIds1.length; i++) {
    if (oldIds1[i] !== newIds1[i]) return true;
  }
  
  for (let i = 0; i < oldIds2.length; i++) {
    if (oldIds2[i] !== newIds2[i]) return true;
  }
  
  return false;
}

// Function to check if the players in the game have changed
function didPlayersChange(oldState, newState) {
  if (!oldState || !newState) return true;
  
  const oldPlayerCount = Object.keys(oldState.players || {}).length;
  const newPlayerCount = Object.keys(newState.players || {}).length;
  
  // Player count changed
  if (oldPlayerCount !== newPlayerCount) return true;
  
  // Check if any player's home planet changed
  for (const playerKey in newState.players) {
    const oldPlayer = oldState.players?.[playerKey];
    const newPlayer = newState.players[playerKey];
    
    if (oldPlayer?.home_planet !== newPlayer?.home_planet) {
      return true;
    }
  }
  
  return false;
}


// Helper function to get feature icons for a position
function getPlanetFeatures(planetName, x, y) {
  const featuresWithData = getPlanetFeaturesWithPopulation(planetName, x, y);
  // Return just the feature types for backward compatibility
  return featuresWithData.map(f => f.type);
}

function getPlanetFeaturesWithPopulation(planetName, x, y) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return [];
  }
  
  const planet = latestGameState.planets[planetName];
  const features = [];
  
  // Check each feature type
  if (planet.mines && planet.mines.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'mine' });
  }
  if (planet.caves && planet.caves.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'cave' });
  }
  if (planet.ruined_caves && planet.ruined_caves.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'ruined_cave' });
  }
  if (planet.oil_wells && planet.oil_wells.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'oil_well' });
  }
  if (planet.refineries && planet.refineries.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'refinery' });
  }
  
  // Enhanced city handling with population
  if (planet.cities) {
    const city = planet.cities.find(f => f.x === x && f.y === y);
    if (city) {
      features.push({ 
        type: 'city', 
        population: city.population || 0 
      });
    }
  }
  
  if (planet.ruined_cities && planet.ruined_cities.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'ruined_city' });
  }
  if (planet.fortresses && planet.fortresses.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'fortress' });
  }
  if (planet.craters && planet.craters.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'crater' });
  }
  if (planet.deployment_zones && planet.deployment_zones.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'deployment_zone' });
  }
  if (planet.landing_zones && planet.landing_zones.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'landing_zone' });
  }
  if (planet.digestion_pools && planet.digestion_pools.some(f => f.x === x && f.y === y)) {
    features.push({ type: 'digestion_pool' });
  }

  // Enhanced biomass handling with amount
  if (planet.biomass) {
    const biomass = planet.biomass.find(f => f.x === x && f.y === y);
    if (biomass) {
      features.push({ 
        type: 'biomass', 
        amount: biomass.amount || 0 
      });
    }
  }
  
  return features;
}


// Function to update city population displays when game state changes
function updateCityPopulationDisplays() {
  if (!latestGameState || !currentDisplayedPlanet) return;
  
  const planet = latestGameState.planets[currentDisplayedPlanet];
  if (!planet || !planet.cities) return;
  
  // Update population overlays for all cities on the current planet
  planet.cities.forEach(city => {
    const tile = document.querySelector(
      `#game-board .tile[data-x='${city.x}'][data-y='${city.y}'][data-planet='${currentDisplayedPlanet}']`
    );
    
    if (tile) {
      const populationOverlay = tile.querySelector('.city-population-overlay');
      if (populationOverlay) {
        populationOverlay.textContent = city.population || 0;
      }
    }
  });
}

function updateBiomassAmountDisplays() {
  if (!latestGameState || !currentDisplayedPlanet) return;
  
  const planet = latestGameState.planets[currentDisplayedPlanet];
  if (!planet || !planet.biomass) return;
  
  // Update biomass amount overlays for all biomass on the current planet
  planet.biomass.forEach(biomass => {
    const tile = document.querySelector(
      `#game-board .tile[data-x='${biomass.x}'][data-y='${biomass.y}'][data-planet='${currentDisplayedPlanet}']`
    );
    
    if (tile) {
      const biomassAmountOverlay = tile.querySelector('.biomass-amount-overlay');
      if (biomassAmountOverlay) {
        biomassAmountOverlay.textContent = biomass.amount || 0;
      }
    }
  });
}

// Helper function to create feature icons
function createFeatureIcons(features, hasCard = false) {
  const iconsContainer = document.createElement('div');
  iconsContainer.className = hasCard ? 'feature-icons-small' : 'feature-icons-large';
  
  features.forEach((feature, index) => {
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'feature-icon-wrapper';
    iconWrapper.style.position = 'relative';
    
    const icon = document.createElement('img');
    icon.src = `Icons/${feature.type}.png`;
    icon.alt = feature.type;
    icon.className = 'feature-icon';
    icon.style.zIndex = 10 + index; // Stack icons properly
    
    // Handle missing images gracefully
    icon.onerror = function() {
      console.warn(`Feature icon not found: Icons/${feature.type}.png`);
      this.style.display = 'none';
    };
    
    iconWrapper.appendChild(icon);
    
    // Add population overlay for cities
    if (feature.type === 'city' && feature.population !== undefined) {
      const populationOverlay = document.createElement('div');
      populationOverlay.className = 'city-population-overlay';
      populationOverlay.textContent = feature.population;
      iconWrapper.appendChild(populationOverlay);
    }

    // Add biomass amount overlay for cities
    if (feature.type === 'biomass' && feature.amount !== undefined) {
      const biomassAmountOverlay = document.createElement('div');
      biomassAmountOverlay.className = 'biomass-amount-overlay';
      biomassAmountOverlay.textContent = feature.amount;
      iconWrapper.appendChild(biomassAmountOverlay);
    }    
    
    iconsContainer.appendChild(iconWrapper);
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
    caves: planet.caves || [],
    ruined_caves: planet.ruined_caves || [],
    oil_wells: planet.oil_wells || [],
    refineries: planet.refineries || [],
    cities: planet.cities || [],
    ruined_cities: planet.ruined_cities || [],
    fortresses: planet.fortresses || [],
    craters: planet.craters || [],
    deployment_zones: planet.deployment_zones || [],
    landing_zones: planet.landing_zones || [],
    digestion_pools: planet.digestion_pools || [],
    biomass: planet.biomass || []
  };
  
  const lastFeatures = lastPlanetFeatures[planetName];
  if (!lastFeatures) {
    lastPlanetFeatures[planetName] = JSON.parse(JSON.stringify(currentFeatures));
    return true;
  }
  
  // Check if features changed OR if city populations changed
  const featuresChanged = JSON.stringify(currentFeatures) !== JSON.stringify(lastFeatures);
  const populationsChanged = haveCityPopulationsChanged(planetName);
  const biomassAmountChanged = haveBiomassAmountChanged(planetName);
  
  const changed = featuresChanged || populationsChanged || biomassAmountChanged;
  
  if (changed) {
    lastPlanetFeatures[planetName] = JSON.parse(JSON.stringify(currentFeatures));
  }
  
  return changed;
}

function haveCityPopulationsChanged(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return false;
  }
  
  const planet = latestGameState.planets[planetName];
  const currentCityData = {};
  
  if (planet.cities) {
    planet.cities.forEach(city => {
      const key = `${city.x}-${city.y}`;
      currentCityData[key] = city.population || 0;
    });
  }
  
  const lastCityData = lastPlanetFeatures[`${planetName}_cities`];
  if (!lastCityData) {
    lastPlanetFeatures[`${planetName}_cities`] = { ...currentCityData };
    return true;
  }
  
  // Check if any city populations changed
  const changed = JSON.stringify(currentCityData) !== JSON.stringify(lastCityData);
  if (changed) {
    lastPlanetFeatures[`${planetName}_cities`] = { ...currentCityData };
  }
  
  return changed;
}

function haveBiomassAmountChanged(planetName) {
  if (!latestGameState || !latestGameState.planets || !latestGameState.planets[planetName]) {
    return false;
  }
  
  const planet = latestGameState.planets[planetName];
  const currentBiomassData = {};
  
  if (planet.biomass) {
    planet.biomass.forEach(biomass => {
      const key = `${biomass.x}-${biomass.y}`;
      currentBiomassData[key] = biomass.amount || 0;
    });
  }
  
  const lastBiomassData = lastPlanetFeatures[`${planetName}_biomass`];
  if (!lastBiomassData) {
    lastPlanetFeatures[`${planetName}_biomass`] = { ...currentBiomassData };
    return true;
  }
  
  // Check if any biomass amount changed
  const changed = JSON.stringify(currentBiomassData) !== JSON.stringify(lastBiomassData);
  if (changed) {
    lastPlanetFeatures[`${planetName}_biomass`] = { ...currentBiomassData };
  }
  
  return changed;
}

// Function to render graveyard for a player
function renderGraveyard(graveyardEntities, player) {
  // In the new layout, we just update the count, not render individual cards
  const isCurrentPlayer = (player === currentPlayer);
  
  if (isCurrentPlayer) {
    // Update player's own graveyard count
    const graveyardEl = document.getElementById("player1-graveyard");
    if (graveyardEl) {
      const countEl = graveyardEl.querySelector(".deck-count");
      if (countEl) {
        countEl.textContent = graveyardEntities ? graveyardEntities.length : 0;
      }
    }
  } else {
    // Update enemy graveyard count
    const enemyGraveyardEl = document.getElementById("enemy-graveyard");
    if (enemyGraveyardEl) {
      const countEl = enemyGraveyardEl.querySelector(".enemy-deck-count");
      if (countEl) {
        countEl.textContent = graveyardEntities ? graveyardEntities.length : 0;
      }
    }
  }
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

function didUpgradeDeckChange(oldState, newState) {
  if (!oldState) return true;
  
  const oldUpgradeDeck = oldState.players[currentPlayer]?.upgradedeck || [];
  const newUpgradeDeck = newState.players[currentPlayer]?.upgradedeck || [];
  
  if (oldUpgradeDeck.length !== newUpgradeDeck.length) return true;
  
  // Simple check - compare entity IDs
  const oldIds = oldUpgradeDeck.map(card => card.entityid).sort();
  const newIds = newUpgradeDeck.map(card => card.entityid).sort();
  
  return !oldIds.every((id, index) => id === newIds[index]);
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

// Add this after your existing DOM event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log("Game client initialized");
  setupGlobalClickListener();
  initializeGraveyards();
  
  // Add click handler for draw deck
  const playerDrawDeck = document.getElementById("player-draw-deck");
  if (playerDrawDeck) {
    playerDrawDeck.addEventListener("click", async () => {
      if (!currentSessionId || !currentPlayer) return;
      
      // Call the existing drawfromdeck function
      try {
        const res = await fetch(`${API_BASE}/drawfromdeck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionid: currentSessionId, 
            player: currentPlayer 
          })
        });

        const data = await res.json();
        if (data.error) {
          console.error("Draw failed:", data.error);
          return;
        }

        // Update game state after drawing
        updateGameStateAndRender(data);
      } catch (error) {
        console.error("Failed to draw card:", error);
      }
    });
  }
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
    tile.classList.remove("eligible-placement", "invalid-placement", "deep-strike-placement", "home-deep-strike-placement");

    if (!selectedCard) return;
    if (!latestGameState || latestGameState.stage !== "cardplacement") return;
    
    const x = parseInt(tile.dataset.x);
    const y = parseInt(tile.dataset.y);
    const tilePlanet = tile.dataset.planet;
    
    if (!tilePlanet) return;
    
    // Use enhanced validation that considers deep_strike and passes selectedCard
    const validation = isValidPlacementPosition(tilePlanet, x, y, currentPlayer, selectedCard);
    
    if (validation.valid) {
      tile.classList.add("eligible-placement");
      
      // Add special styling for different types of deep strike positions
      if (validation.reason === "Valid deep strike position") {
        tile.classList.add("deep-strike-placement");
      } else if (validation.reason === "Valid home planet deep strike position") {
        tile.classList.add("home-deep-strike-placement");
      }
    }
  });
}

function renderHand(hand, player) {
  // Only render hand for current player
  if (player !== currentPlayer) return;
  
  const handContainer = document.getElementById("player1-hand");
  if (!handContainer) return;
  
  // Clear all slots first
  const slots = handContainer.querySelectorAll(".hand-slot");
  slots.forEach((slot, index) => {
    // Remove existing content and event listeners
    slot.innerHTML = "";
    slot.className = "hand-slot";
    slot.removeAttribute("data-entityid");
    
    if (index < hand.length) {
      const card = hand[index];
      
      // DEBUG: Log card info and keywords
      console.log(`Rendering hand card: ${card.cardtype}, keywords:`, card.keywords, `container: ${card.container}`);
      
      // Create card image
      const cardImage = document.createElement("img");
      cardImage.src = card.image;
      cardImage.alt = card.cardtype;
      cardImage.style.width = "100%";
      cardImage.style.height = "100%";
      cardImage.style.objectFit = "cover";
      cardImage.style.borderRadius = "4px";
      
      slot.appendChild(cardImage);
      slot.dataset.entityid = card.entityid;
      slot.classList.add("card");
      
      // Add card info overlay
      const info = document.createElement("div");
      info.classList.add("card-info");
      info.textContent = `🏃${card.movement} ⚔️${card.melee} 🏹${card.ranged} 💥${card.blast} 🛡️${card.armor} ❤️${card.health} 🧠${card.courage}`;
      slot.appendChild(info);
      
      // IMPORTANT: Add token icons if card has tokens OR keywords
      const tokenIcons = createTokenIcons(card);
      if (tokenIcons) {
        console.log(`Adding token icons to ${card.cardtype}:`, tokenIcons);
        slot.appendChild(tokenIcons);
      } else {
        console.log(`No token icons for ${card.cardtype}`);
      }

      // Add cost display to cards in hand
      const costs = [];
      if (card.costbiomass > 0) {
        costs.push(`<div class="hand-cost-item">
          <div class="hand-cost-icon biomass"></div>
          <span class="hand-cost-number">${card.costbiomass}</span>
        </div>`);
      }
      if (card.costplasteel > 0) {
        costs.push(`<div class="hand-cost-item">
          <div class="hand-cost-icon plasteel"></div>
          <span class="hand-cost-number">${card.costplasteel}</span>
        </div>`);
      }
      if (card.costpromethium > 0) {
        costs.push(`<div class="hand-cost-item">
          <div class="hand-cost-icon promethium"></div>
          <span class="hand-cost-number">${card.costpromethium}</span>
        </div>`);
      }
      
      if (costs.length > 0) {
        const costContainer = document.createElement("div");
        costContainer.className = "hand-card-cost";
        costContainer.innerHTML = costs.join('');
        slot.appendChild(costContainer);
      }
      
      // Add click handler
      slot.addEventListener("click", () => {
        selectedCard = card;
        highlightSelectedCard(card.entityid);
        highlightEligibleTiles();
      });
    } else {
      slot.textContent = "Empty";
      slot.style.display = "flex";
      slot.style.alignItems = "center";
      slot.style.justifyContent = "center";
      slot.style.color = "#a6adc8";
      slot.style.fontSize = "0.8em";
    }
  });
}

function updateGameStatus(gamestate) {
  const roundBox = document.getElementById("round-indicator");
  const turnBox = document.getElementById("turn-indicator");
  const stageBox = document.getElementById("stage-indicator");

  // Update round
  if (roundBox) roundBox.textContent = `Round: ${gamestate.round}`;

  // Update player turn
  const turnPlayer = gamestate.playerturn;
  if (turnBox) {
    turnBox.textContent = `${turnPlayer === "player1" ? "Player 1" : "Player 2"}'s Turn`;
    turnBox.className = `status-box ${turnPlayer === "player1" ? "blue" : "red"}`;
  }

  // Update stage
  const stage = gamestate.stage;
  if (stageBox) {
    stageBox.textContent = `Stage: ${stage}`;
    stageBox.className = `status-box stage-${stage}`;
  }

  // Enable or disable the advance button
  if (advanceButton) {
    if (turnPlayer === currentPlayer && stage !== "waitingroom") {
      advanceButton.classList.remove("disabled");
    } else {
      advanceButton.classList.add("disabled");
    }
  }

  // Update player health and armor in the new layout
  const p1 = gamestate.players.player1;
  const p2 = gamestate.players.player2;

  if (p1) {
    const playerHealthEl = document.getElementById("player-health");
    const playerArmorEl = document.getElementById("player-armor");
    const playerBiomassEl = document.getElementById("player-biomass");
    const playerPlasteelEl = document.getElementById("player-plasteel");
    const playerPromethiumEl = document.getElementById("player-promethium");
    
    if (currentPlayer === "player1") {
      if (playerHealthEl) playerHealthEl.textContent = p1.health;
      if (playerArmorEl) playerArmorEl.textContent = p1.armor ?? 0;
      if (playerBiomassEl) playerBiomassEl.textContent = p1.biomass ?? 1;
      if (playerPlasteelEl) playerPlasteelEl.textContent = p1.plasteel ?? 1;
      if (playerPromethiumEl) playerPromethiumEl.textContent = p1.promethium ?? 0;
    }
    
    // Update enemy info if current player is player2
    if (currentPlayer === "player2") {
      updateEnemyResources(p1);
    }
  }

  if (p2) {
    if (currentPlayer === "player2") {
      const playerHealthEl = document.getElementById("player-health");
      const playerArmorEl = document.getElementById("player-armor");
      const playerBiomassEl = document.getElementById("player-biomass");
      const playerPlasteelEl = document.getElementById("player-plasteel");
      const playerPromethiumEl = document.getElementById("player-promethium");
      
      if (playerHealthEl) playerHealthEl.textContent = p2.health;
      if (playerArmorEl) playerArmorEl.textContent = p2.armor ?? 0;
      if (playerBiomassEl) playerBiomassEl.textContent = p2.biomass ?? 1;
      if (playerPlasteelEl) playerPlasteelEl.textContent = p2.plasteel ?? 1;
      if (playerPromethiumEl) playerPromethiumEl.textContent = p2.promethium ?? 0;
    }
    
    // Update enemy info if current player is player1
    if (currentPlayer === "player1") {
      updateEnemyResources(p2);
    }
    
    // Update enemy deck counts
    updateEnemyDeckCounts(p2);
  }
  
  // Update player deck counts
  updatePlayerDeckCounts(gamestate.players[currentPlayer]);
  
  const currentPlayerData = gamestate.players[currentPlayer];
  if (currentPlayerData && currentPlayerData.traits && currentPlayerData.traits.length > 0) {
    updatePlayerTraitsDisplay(currentPlayerData.traits);
  }
  // Adjust polling based on whose turn it is
  setupPolling();
}

function updatePlayerTraitsDisplay(playerTraits) {
  // Find or create traits display element
  let traitsDisplay = document.getElementById("player-traits-display");
  if (!traitsDisplay) {
    traitsDisplay = document.createElement("div");
    traitsDisplay.id = "player-traits-display";
    traitsDisplay.className = "player-traits";
    
    // Insert into player info area
    const playerInfo = document.querySelector(".player-info");
    if (playerInfo) {
      playerInfo.appendChild(traitsDisplay);
    }
  }
  
  // Display active traits
  if (playerTraits.length > 0) {
    traitsDisplay.innerHTML = `
      <div class="traits-header">Active Traits:</div>
      <div class="traits-list">${playerTraits.join(", ")}</div>
    `;
    traitsDisplay.style.display = "block";
  } else {
    traitsDisplay.style.display = "none";
  }
}

function updatePlayerDeckCounts(player) {
  if (!player) return;
  
  const drawDeckEl = document.getElementById("player-draw-deck");
  const discardEl = document.getElementById("player-discard-pile");
  const graveyardEl = document.getElementById("player1-graveyard");
  const trashEl = document.getElementById("player-trash-pile");
  
  if (drawDeckEl) {
    const countEl = drawDeckEl.querySelector(".deck-count");
    if (countEl) countEl.textContent = player.deck ? player.deck.length : 0;
  }
  
  if (discardEl) {
    const countEl = discardEl.querySelector(".deck-count");
    if (countEl) countEl.textContent = player.discard ? player.discard.length : 0;
  }
  
  if (graveyardEl) {
    const countEl = graveyardEl.querySelector(".deck-count");
    if (countEl) countEl.textContent = player.graveyard ? player.graveyard.length : 0;
  }
  
  if (trashEl) {
    const countEl = trashEl.querySelector(".deck-count");
    if (countEl) countEl.textContent = player.trash ? player.trash.length : 0;
  }
}

function updateEnemyDeckCounts(enemyPlayer) {
  if (!enemyPlayer) return;
  
  const handEl = document.getElementById("enemy-hand");
  const drawDeckEl = document.getElementById("enemy-draw-deck");
  const discardEl = document.getElementById("enemy-discard-pile");
  const graveyardEl = document.getElementById("enemy-graveyard");
  const trashEl = document.getElementById("enemy-trash-pile");
  
  if (handEl) {
    const countEl = handEl.querySelector(".enemy-deck-count");
    if (countEl) countEl.textContent = enemyPlayer.hand ? enemyPlayer.hand.length : 0;
  }
  
  if (drawDeckEl) {
    const countEl = drawDeckEl.querySelector(".enemy-deck-count");
    if (countEl) countEl.textContent = enemyPlayer.deck ? enemyPlayer.deck.length : 0;
  }
  
  if (discardEl) {
    const countEl = discardEl.querySelector(".enemy-deck-count");
    if (countEl) countEl.textContent = enemyPlayer.discard ? enemyPlayer.discard.length : 0;
  }
  
  if (graveyardEl) {
    const countEl = graveyardEl.querySelector(".enemy-deck-count");
    if (countEl) countEl.textContent = enemyPlayer.graveyard ? enemyPlayer.graveyard.length : 0;
  }
  
  if (trashEl) {
    const countEl = trashEl.querySelector(".enemy-deck-count");
    if (countEl) countEl.textContent = 0; // Not implemented yet
  }
}

function updateEnemyResources(enemyPlayer) {
  if (!enemyPlayer) return;
  
  const enemyHealthEl = document.getElementById("enemy-health");
  const enemyArmorEl = document.getElementById("enemy-armor");
  const enemyBiomassEl = document.getElementById("enemy-biomass");
  const enemyPlasteelEl = document.getElementById("enemy-plasteel");
  const enemyPromethiumEl = document.getElementById("enemy-promethium");
  
  if (enemyHealthEl) enemyHealthEl.textContent = enemyPlayer.health ?? 20;
  if (enemyArmorEl) enemyArmorEl.textContent = enemyPlayer.armor ?? 0;
  if (enemyBiomassEl) enemyBiomassEl.textContent = enemyPlayer.biomass ?? 1;
  if (enemyPlasteelEl) enemyPlasteelEl.textContent = enemyPlayer.plasteel ?? 1;
  if (enemyPromethiumEl) enemyPromethiumEl.textContent = enemyPlayer.promethium ?? 0;
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

function highlightMovementTiles(card) {
  // Clear any previous movement highlights
  document.querySelectorAll("#game-board .tile").forEach(tile => {
    tile.classList.remove("eligible-placement", "invalid-placement", "movement-tile", "cave-movement-tile");
    
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
  
  // Check if this unit has cave dwelling ability
  const hasCaveDwelling = hasCaveDwellingAbility(card);
  const cavePositions = hasCaveDwelling ? getCavePositionsOnCurrentPlanet() : [];
  console.log(`cavePositions: ${cavePositions}`)

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

    // Calculate distance (considering cave dwelling ability)
    let distance;
    if (hasCaveDwelling) {
      distance = calculateCaveDwellingDistance(card, tileX, tileY);
    } else {
      const dx = Math.abs(card.position.x - tileX);
      const dy = Math.abs(card.position.y - tileY);
      distance = Math.max(dx, dy);
    }

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
      
      // NEW: Add special styling for cave dwelling movements
      if (hasCaveDwelling && isCaveAdjacentMovement(card, tileX, tileY)) {
        tile.classList.add("cave-movement-tile");
      }
      
      tile.setAttribute('data-has-move-listener', 'true');

      tile.addEventListener("click", async function handleMoveClick() {
        document.querySelectorAll("#game-board .tile").forEach(t => {
          t.classList.remove("eligible-placement", "movement-tile", "cave-movement-tile");
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

function hasCaveDwellingAbility(entity) {
  if (!latestGameState || !latestGameState.players[currentPlayer]) {
    return false;
  }
  
  const playerTraits = latestGameState.players[currentPlayer].traits || [];

  // Must have Cave dwellers trait
  if (!playerTraits.includes("Cave dwellers")) {
    return false;
  }
  
  // Must have burrow keyword
  if (!entity.keywords || !entity.keywords.includes("burrow")) {
    return false;
  }
  
  // Must be on a cave tile
  if (!entity.on_cave) {
    return false;
  }
  
  return true;
}

function getCavePositionsOnCurrentPlanet() {
  if (!latestGameState || !currentDisplayedPlanet || !latestGameState.planets[currentDisplayedPlanet]) {
    return [];
  }
  
  const planet = latestGameState.planets[currentDisplayedPlanet];
  if (!planet.caves) {
    return [];
  }
  
  return planet.caves.map(cave => ({ x: cave.x, y: cave.y }));
}

function isCaveAdjacentMovement(entity, destX, destY) {
  if (!entity.planet || entity.planet !== currentDisplayedPlanet) {
    return false;
  }
  
  const cavePositions = getCavePositionsOnCurrentPlanet();
  
  // Check if destination has a cave
  const destHasCave = cavePositions.some(cave => cave.x === destX && cave.y === destY);
  if (!destHasCave) {
    return false;
  }
  
  // Check if current position has a cave (should be true if we got here)
  const currentHasCave = cavePositions.some(cave => 
    cave.x === entity.position.x && cave.y === entity.position.y
  );
  
  return currentHasCave && destHasCave;
}

function calculateCaveDwellingDistance(entity, destX, destY) {
  const currentX = entity.position.x;
  const currentY = entity.position.y;
  
  // Check if this is a cave-to-cave movement
  if (isCaveAdjacentMovement(entity, destX, destY)) {
    return 1; // All cave-to-cave movements cost 1 movement point
  }
  
  // Otherwise use normal distance calculation
  const dx = Math.abs(currentX - destX);
  const dy = Math.abs(currentY - destY);
  return Math.max(dx, dy);
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
  
  // Don't interfere with targeting if clicking on planet navigation elements
  if (planetTransferMode && window.sourceSelection) {
    // Allow clicks on planet navigation without canceling targeting
    if (e.target.closest('.planet-preview') || 
        e.target.closest('.planet-arrow') ||
        e.target.closest('.planet-info-display')) {
      return; // Don't cancel targeting
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
  // Add event listeners to both player and enemy graveyards
  const playerGraveyard = document.getElementById('player1-graveyard');
  const enemyGraveyard = document.getElementById('enemy-graveyard');
  
  if (playerGraveyard) {
    playerGraveyard.addEventListener('click', (e) => {
      // Show player's own graveyard
      if (latestGameState && latestGameState.players[currentPlayer]?.graveyard) {
        displayGraveyardModal(latestGameState.players[currentPlayer].graveyard, "Your Graveyard");
      }
    });
  }
  
  if (enemyGraveyard) {
    enemyGraveyard.addEventListener('click', (e) => {
      // Show enemy graveyard
      const enemyPlayer = currentPlayer === "player1" ? "player2" : "player1";
      if (latestGameState && latestGameState.players[enemyPlayer]?.graveyard) {
        displayGraveyardModal(latestGameState.players[enemyPlayer].graveyard, "Enemy Graveyard");
      }
    });
  }
}

function displayGraveyardModal(graveyardCards, title) {
  // Simple alert for now - you can enhance this later
  if (graveyardCards.length === 0) {
    alert(`${title} is empty.`);
  } else {
    const cardNames = graveyardCards.map(card => card.cardtype).join(", ");
    alert(`${title} (${graveyardCards.length} cards): ${cardNames}`);
  }
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

// Event listeners for planet navigation (should already be in your code)
document.getElementById("planet-left-arrow").addEventListener("click", () => {
  cyclePlanet('left'); // This calls updatePlanetDisplay()
});

document.getElementById("planet-right-arrow").addEventListener("click", () => {
  cyclePlanet('right'); // This calls updatePlanetDisplay()
});


// Token creation
function createTokenIcons(entity) {
  const tokenContainer = document.createElement('div');
  tokenContainer.className = 'token-icons-container';
  tokenContainer.dataset.entityId = entity.entityid;
  
  let hasIcons = false;

  // Add regular token icons
  if (entity.tokens && entity.tokens.length > 0) {
    entity.tokens.forEach(tokenDict => {
      Object.entries(tokenDict).forEach(([tokenName, tokenCount]) => {
        if (tokenCount > 0) {
          const tokenIcon = document.createElement('div');
          tokenIcon.className = 'token-icon-wrapper';
          
          const icon = document.createElement('img');
          icon.src = tokenLibrary[tokenName]?.image || `Icons/${tokenName}.png`;
          icon.alt = tokenName;
          icon.className = 'token-icon';
          icon.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM4OWI0ZmEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjwvdGV4dD48L3N2Zz4=';
          };
          
          const countBadge = document.createElement('div');
          countBadge.className = 'token-count-badge';
          countBadge.textContent = tokenCount;
          
          tokenIcon.appendChild(icon);
          tokenIcon.appendChild(countBadge);
          tokenContainer.appendChild(tokenIcon);
          hasIcons = true;
        }
      });
    });
  }

  // NEW: Add deep_strike keyword icon during cardplacement stage
  if (latestGameState && latestGameState.stage === "cardplacement" && 
      entity.container === "hand" && 
      entity.keywords && entity.keywords.includes('deep_strike')) {
    
    const deepStrikeIcon = document.createElement('div');
    deepStrikeIcon.className = 'token-icon-wrapper';
    
    const icon = document.createElement('img');
    icon.src = 'Icons/deep_strike.png';
    icon.alt = 'deep_strike';
    icon.className = 'token-icon';
    icon.title = 'Deep Strike - Can be deployed anywhere except near deployment zones';
    
    icon.onerror = function() {
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmMzhhOGEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRTPC90ZXh0Pjwvc3ZnPg==';
    };
    
    deepStrikeIcon.appendChild(icon);
    tokenContainer.appendChild(deepStrikeIcon);
    hasIcons = true;
  }
  
  return hasIcons ? tokenContainer : null;
}

