async function fetchPicks() {
  const res = await fetch('data/picks.json');
  return await res.json();
}

async function fetchLiveScores() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbw7e11zGyZ-kOAvjuQXjQgO2Tc2rAiKEU8Gl31FpMGCTbocK4iqd53PFC4U19_5LOkW/exec");
  const data = await res.json();
  const scoreMap = {};
  data.forEach(row => {
    const name = (row["PLAYER"] || row["Name"] || "").trim();
    if (!name) return;
    
    // Get the raw values from the data
    const position = row["POS"] || row["Position"] || "-";
    const scoreDisplay = row["SCORE"] || row["RelativeScore"] || "E"; // For display purposes
    const totalDisplay = row["TOT"] || row["Total"] || "0"; // For display purposes
    
    // Raw round values for display
    const r1Display = row["R1"] || "-";
    const r2Display = row["R2"] || "-";
    const r3Display = row["R3"] || "-";
    const r4Display = row["R4"] || "-";
    
    // For calculation - parse rounds without adding 80 by default
    let r1Value = parseInt(row["R1"]) || null;
    let r2Value = parseInt(row["R2"]) || null;
    let r3Value = parseInt(row["R3"]) || null;
    let r4Value = parseInt(row["R4"]) || null;
    
    // Check if player has a special status like "CUT", "WD", etc.
    const hasSpecialStatus = typeof scoreDisplay === 'string' && 
                          (scoreDisplay === "CUT" || 
                           scoreDisplay === "WD" || 
                           scoreDisplay === "DQ" ||
                           scoreDisplay === "DNS");
    
    // Assign 80 for unplayed rounds ONLY if player has special status
    if (hasSpecialStatus) {
      if (r1Value === null) r1Value = 80;
      if (r2Value === null) r2Value = 80;
      if (r3Value === null) r3Value = 80;
      if (r4Value === null) r4Value = 80;
    }
    
    // Calculate total strokes for scoring purposes
    let calculatedTotal = 0;
    if (r1Value !== null) calculatedTotal += r1Value;
    if (r2Value !== null) calculatedTotal += r2Value;
    if (r3Value !== null) calculatedTotal += r3Value;
    if (r4Value !== null) calculatedTotal += r4Value;
    
    // Parse relative score for calculation purposes
    let relativeScoreValue = 0;
    if (scoreDisplay === "E") {
      relativeScoreValue = 0;
    } else if (typeof scoreDisplay === 'string' && (scoreDisplay.startsWith("+") || scoreDisplay.startsWith("-"))) {
      relativeScoreValue = parseInt(scoreDisplay);
    } else if (!isNaN(parseInt(scoreDisplay))) {
      relativeScoreValue = parseInt(scoreDisplay);
    } else if (hasSpecialStatus) {
      // For players who are CUT/WD/DQ, assign a high relative score for sorting
      relativeScoreValue = 100;
    }
    
    scoreMap[name] = {
      position: position,
      scoreDisplay: scoreDisplay,  // Original display value
      totalDisplay: totalDisplay,  // Original display value
      r1Display: r1Display,        // Original display value
      r2Display: r2Display,        // Original display value
      r3Display: r3Display,        // Original display value
      r4Display: r4Display,        // Original display value
      hasSpecialStatus: hasSpecialStatus,
      totalStrokes: calculatedTotal, // Calculated total without adding 80s by default
      relativeScore: relativeScoreValue, // Calculated value for sorting
      r1: r1Value,
      r2: r2Value,
      r3: r3Value,
      r4: r4Value,
      propScore: 0 // Adding prop score property (default to 0)
    };
  });
  return scoreMap;
}

function getTop6Scores(picks, liveScores) {
  // Map each player to their score
  const playerScores = picks.map(player => {
    const playerName = player.trim();
    const scoreData = liveScores[playerName] || { 
      position: "-", 
      scoreDisplay: "E",
      totalDisplay: "0",
      r1Display: "-",
      r2Display: "-",
      r3Display: "-",
      r4Display: "-",
      hasSpecialStatus: false,
      totalStrokes: 0, // Default to 0 instead of 320
      relativeScore: 0,
      r1: null,
      r2: null,
      r3: null,
      r4: null,
      propScore: 0
    };
    return {
      playerName,
      position: scoreData.position,
      scoreDisplay: scoreData.scoreDisplay,
      totalDisplay: scoreData.totalDisplay,
      r1Display: scoreData.r1Display,
      r2Display: scoreData.r2Display,
      r3Display: scoreData.r3Display,
      r4Display: scoreData.r4Display,
      hasSpecialStatus: scoreData.hasSpecialStatus,
      totalStrokes: scoreData.totalStrokes,
      relativeScore: scoreData.relativeScore,
      r1: scoreData.r1,
      r2: scoreData.r2,
      r3: scoreData.r3,
      r4: scoreData.r4,
      propScore: scoreData.propScore
    };
  });
  
  // Sort by valid score data first, then by totalStrokes (ascending)
  playerScores.sort((a, b) => {
    // If both have same status regarding special status, compare by totalStrokes
    if (a.hasSpecialStatus === b.hasSpecialStatus) {
      return a.totalStrokes - b.totalStrokes;
    }
    // Otherwise, players without special status come first
    return a.hasSpecialStatus ? 1 : -1;
  });
  
  // Take only top 6
  return playerScores.slice(0, 6);
}

function calculateTotalStrokes(picks, liveScores) {
  const top6 = getTop6Scores(picks, liveScores);
  return top6.reduce((total, player) => total + player.totalStrokes, 0);
}

function calculateRelativeScore(picks, liveScores) {
  const top6 = getTop6Scores(picks, liveScores);
  return top6.reduce((total, player) => total + player.relativeScore, 0);
}

function calculateTotalPropScore(picks, liveScores) {
  // Sum up prop scores for all players in the team
  return picks.reduce((total, player) => {
    const playerName = player.trim();
    const scoreData = liveScores[playerName] || { propScore: 0 };
    return total + (scoreData.propScore || 0);
  }, 0);
}

function formatRelativeScore(score) {
  if (score === null || score === undefined || isNaN(score)) return '';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : score;
}

function renderLeaderboard(entries, liveScores) {
  const container = document.getElementById('leaderboard');
  container.innerHTML = '';
  
  // Create the Masters header
  const mastersHeader = document.createElement('div');
  mastersHeader.className = 'masters-header';
  mastersHeader.innerHTML = `
    <h2>2025 Masters Pool</h2>
    <p>Scoring based on each team's top 6 players</p>
  `;
  container.appendChild(mastersHeader);
  
  // Sort entries by total strokes first (lowest first), then by relative score if tied
  entries.sort((a, b) => {
    const totalStrokesA = calculateTotalStrokes(a.picks, liveScores);
    const totalStrokesB = calculateTotalStrokes(b.picks, liveScores);
    
    if (totalStrokesA === totalStrokesB) {
      // If total strokes are equal, use relative score as tie-breaker
      const scoreA = calculateRelativeScore(a.picks, liveScores);
      const scoreB = calculateRelativeScore(b.picks, liveScores);
      return scoreA - scoreB;
    }
    
    return totalStrokesA - totalStrokesB;
  });
  
  // Add the main leaderboard table with container for scrolling on mobile
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  
  const leaderboardTable = document.createElement('table');
  leaderboardTable.className = 'main-leaderboard';
  
  // Create header row with labeled PROPS column
  const tableHeader = document.createElement('thead');
  tableHeader.innerHTML = `
    <tr class="header-row">
      <th class="pos-column">POS</th>
      <th class="player-column">TEAM</th>
      <th class="score-column">SCORE</th>
      <th class="total-column">TOTAL</th>
      <th class="props-column">PROPS</th>
      <th class="round-column">R1</th>
      <th class="round-column">R2</th>
      <th class="round-column">R3</th>
      <th class="round-column">R4</th>
    </tr>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  // Create tbody
  const tableBody = document.createElement('tbody');
  
  entries.forEach((entry, index) => {
    const top6Players = getTop6Scores(entry.picks, liveScores);
    const totalStrokes = calculateTotalStrokes(entry.picks, liveScores);
    const relativeScore = calculateRelativeScore(entry.picks, liveScores);
    const formattedRelative = formatRelativeScore(relativeScore);
    const propScore = calculateTotalPropScore(entry.picks, liveScores);
    
    // Team header row (collapsible)
    const teamRow = document.createElement('tr');
    teamRow.className = 'team-row';
    teamRow.dataset.team = `team-${index}`;
    teamRow.innerHTML = `
      <td class="pos-column">${index + 1}</td>
      <td class="player-column">
        <div class="player-info">
          <span class="player-name">${entry.name}</span>
        </div>
      </td>
      <td class="score-column">${formattedRelative}</td>
      <td class="total-column">${totalStrokes}</td>
      <td class="props-column">${propScore}</td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
    `;
    tableBody.appendChild(teamRow);
    
    // Create collapsible container for golfers
    const golfersContainer = document.createElement('tr');
    golfersContainer.className = 'golfers-container';
    golfersContainer.id = `team-${index}-golfers`;
    golfersContainer.style.display = 'none';
    
    const golfersCell = document.createElement('td');
    golfersCell.colSpan = 9; // Updated to 9 to account for PROPS column
    
    const golfersTable = document.createElement('table');
    golfersTable.className = 'golfers-table';
    
    // Table header for golfers table
    const golfersHeader = document.createElement('tr');
    golfersHeader.className = 'golfers-header-row';
    golfersHeader.innerHTML = `
      <th class="pos-column">POS</th>
      <th class="player-column">PLAYER</th>
      <th class="score-column">SCORE</th>
      <th class="total-column">TOTAL</th>
      <th class="props-column">PROPS</th>
      <th class="round-column">R1</th>
      <th class="round-column">R2</th>
      <th class="round-column">R3</th>
      <th class="round-column">R4</th>
    `;
    golfersTable.appendChild(golfersHeader);
    
    // Add rows for each golfer, indicating which ones are in the top 6
    entry.picks.forEach(player => {
      const playerName = player.trim();
      const data = liveScores[playerName] || { 
        position: "-",
        scoreDisplay: "E",
        totalDisplay: "0",
        r1Display: "-",
        r2Display: "-",
        r3Display: "-",
        r4Display: "-",
        hasSpecialStatus: false,
        totalStrokes: 0, 
        relativeScore: 0,
        r1: null,
        r2: null,
        r3: null,
        r4: null,
        propScore: 0
      };
      
      const isTop6 = top6Players.some(p => p.playerName === playerName);
      
      const golferRow = document.createElement('tr');
      golferRow.className = `golfer-row ${isTop6 ? 'top-six' : ''} ${data.hasSpecialStatus ? 'special-status' : ''}`;
      golferRow.innerHTML = `
        <td class="pos-column">${data.position}</td>
        <td class="player-column">
          <div class="player-info">
            <span class="player-name">${playerName}</span>
          </div>
        </td>
        <td class="score-column">${data.scoreDisplay}</td>
        <td class="total-column">${data.totalDisplay}</td>
        <td class="props-column">${data.propScore}</td>
        <td class="round-column">${data.r1Display}</td>
        <td class="round-column">${data.r2Display}</td>
        <td class="round-column">${data.r3Display}</td>
        <td class="round-column">${data.r4Display}</td>
      `;
      golfersTable.appendChild(golferRow);
    });
    
    golfersCell.appendChild(golfersTable);
    golfersContainer.appendChild(golfersCell);
    tableBody.appendChild(golfersContainer);
    
    // Add click event to toggle golfer visibility
    teamRow.addEventListener('click', function() {
      const golfersElement = document.getElementById(`team-${index}-golfers`);
      if (golfersElement.style.display === 'none') {
        golfersElement.style.display = 'table-row';
        this.classList.add('expanded');
      } else {
        golfersElement.style.display = 'none';
        this.classList.remove('expanded');
      }
    });
  });
  
  leaderboardTable.appendChild(tableBody);
  tableContainer.appendChild(leaderboardTable);
  container.appendChild(tableContainer);
}

// Add this CSS to your stylesheet
function addMastersStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    #leaderboard {
      background-color: #f9e79f; /* Using your existing yellow background */
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 40px;
    }
    
    .masters-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .masters-header h2 {
      color: #006400;
      font-family: "Times New Roman", serif;
      margin: 0;
    }
    
    .masters-header p {
      color: #006400;
      font-family: "Georgia", serif;
      margin-top: 5px;
    }
    
    /* Table container for mobile scrolling */
    .table-container {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch; /* For smoother scrolling on iOS */
    }
    
    .main-leaderboard {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff8dc; /* Using your subtle parchment yellow */
      font-family: 'Georgia', serif;
      font-size: 16px;
      border: 2px solid #006400;
    }
    
    .header-row, .golfers-header-row {
      background-color: #006400;
      color: white;
    }
    
    .header-row th, .golfers-header-row th {
      padding: 10px;
      font-weight: bold;
      text-align: center;
      border: 1px solid #006400;
      white-space: nowrap; /* Prevent wrapping on mobile */
    }
    
    .team-row {
      background-color: #fff;
      border-bottom: 1px solid #006400;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .team-row:hover {
      background-color: #f8f0d0; /* Slightly darker on hover */
    }
    
    .team-row td {
      padding: 10px;
      text-align: center;
      border: 1px solid #006400;
    }
    
    .player-column {
      text-align: left !important;
      min-width: 150px; /* Ensure player names have enough space */
    }
    
    .props-column {
      font-weight: normal;
      color: #006400;
    }
    
    .player-info {
      display: flex;
      align-items: center;
    }
    
    .player-name {
      text-align: left;
      font-weight: bold;
      padding-left: 10px;
    }
    
    .golfers-container {
      background-color: #fffbea; /* Very light yellow */
    }
    
    .golfers-table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff8dc;
    }
    
    .golfers-header-row {
      font-size: 14px;
    }
    
    .golfer-row {
      border-bottom: 1px solid #ddd;
    }
    
    .golfer-row td {
      padding: 8px;
      text-align: center;
      border: 1px solid #006400;
    }
    
    .golfer-row.top-six {
      background-color: #f0f8e8; /* Light green highlight for top 6 */
      font-weight: bold;
    }
    
    .golfer-row.special-status {
      color: #777; /* Gray out players with special status */
    }
    
    .golfer-row:hover {
      background-color: #f8f0d0;
    }
    
    .pos-column {
      width: 40px;
      text-align: center;
    }
    
    .score-column {
      font-weight: bold;
    }
    
    .total-column {
      font-weight: normal;
    }
    
    /* Add a subtle indicator that teams are clickable */
    .team-row .player-name::after {
      content: " ▼";
      font-size: 0.8em;
      color: #006400;
    }
    
    /* Change indicator when expanded */
    .team-row.expanded .player-name::after {
      content: " ▲";
    }
    
    /* Mobile responsiveness */
    @media screen and (max-width: 768px) {
      #leaderboard {
        padding: 10px;
      }
      
      .masters-header h2 {
        font-size: 20px;
      }
      
      .main-leaderboard, .golfers-table {
        font-size: 14px;
      }
      
      .team-row td, .golfer-row td, .header-row th {
        padding: 8px 5px;
      }
      
      /* Hide less important columns on very small screens */
      @media screen and (max-width: 480px) {
        .round-column:nth-child(n+2) {
          display: none;
        }
        
        .player-column {
          min-width: 100px;
        }
      }
    }
  `;
  document.head.appendChild(styleElement);
}

async function init() {
  const picks = await fetchPicks();
  const liveScores = await fetchLiveScores();
  addMastersStyles();
  renderLeaderboard(picks, liveScores);
}

window.onload = init;
