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
    
    // Get both raw total strokes and relative score
    const totalStrokes = row["TOT"] || row["Total"] || "0";
    const relativeScore = row["SCORE"] || row["RelativeScore"] || "E";
    
    const r1 = parseInt(row["R1"]) || null;
    const r2 = parseInt(row["R2"]) || null;
    const r3 = parseInt(row["R3"]) || null;
    const r4 = parseInt(row["R4"]) || null;
    
    // Parse total strokes as integer
    let totalStrokeCount = 0;
    if (!isNaN(parseInt(totalStrokes))) {
      totalStrokeCount = parseInt(totalStrokes);
    }
    
    // Parse relative score
    let relativeScoreValue = 0;
    if (relativeScore === "E") {
      relativeScoreValue = 0;
    } else if (relativeScore.startsWith("+") || relativeScore.startsWith("-")) {
      relativeScoreValue = parseInt(relativeScore);
    } else if (!isNaN(parseInt(relativeScore))) {
      relativeScoreValue = parseInt(relativeScore);
    }
    
    scoreMap[name] = {
      totalStrokes: totalStrokeCount,
      relativeScore: relativeScoreValue,
      r1,
      r2,
      r3,
      r4
    };
  });
  return scoreMap;
}

function calculateTotalStrokes(picks, liveScores) {
  return picks.reduce((total, player) => {
    const strokes = liveScores[player.trim()]?.totalStrokes ?? 0;
    return total + strokes;
  }, 0);
}

function calculateRelativeScore(picks, liveScores) {
  return picks.reduce((total, player) => {
    const score = liveScores[player.trim()]?.relativeScore ?? 0;
    return total + score;
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
  `;
  container.appendChild(mastersHeader);
  
  // Sort entries by relative score (lowest/best scores at top)
  entries.sort((a, b) => {
    const scoreA = calculateRelativeScore(a.picks, liveScores);
    const scoreB = calculateRelativeScore(b.picks, liveScores);
    return scoreA - scoreB;
  });
  
  // Add the main leaderboard table with container for scrolling on mobile
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  
  const leaderboardTable = document.createElement('table');
  leaderboardTable.className = 'main-leaderboard';
  
  // Create header row
  const tableHeader = document.createElement('thead');
  tableHeader.innerHTML = `
    <tr class="header-row">
      <th class="pos-column">POS</th>
      <th class="player-column">TEAM</th>
      <th class="score-column">SCORE</th>
      <th class="total-column">TOTAL</th>
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
    const totalStrokes = calculateTotalStrokes(entry.picks, liveScores);
    const relativeScore = calculateRelativeScore(entry.picks, liveScores);
    const formattedRelative = formatRelativeScore(relativeScore);
    
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
    golfersCell.colSpan = 8;
    
    const golfersTable = document.createElement('table');
    golfersTable.className = 'golfers-table';
    
    // Add rows for each golfer
    entry.picks.forEach(player => {
      const data = liveScores[player.trim()];
      const golferRow = document.createElement('tr');
      golferRow.className = 'golfer-row';
      golferRow.innerHTML = `
        <td class="pos-column"></td>
        <td class="player-column">
          <div class="player-info">
            <span class="player-name">${player}</span>
          </div>
        </td>
        <td class="score-column">${formatRelativeScore(data?.relativeScore)}</td>
        <td class="total-column">${data?.totalStrokes || ''}</td>
        <td class="round-column">${data?.r1 || ''}</td>
        <td class="round-column">${data?.r2 || ''}</td>
        <td class="round-column">${data?.r3 || ''}</td>
        <td class="round-column">${data?.r4 || ''}</td>
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
    
    .header-row {
      background-color: #006400;
      color: white;
    }
    
    .header-row th {
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
    
    .golfer-row {
      border-bottom: 1px solid #ddd;
    }
    
    .golfer-row td {
      padding: 8px;
      text-align: center;
      border: 1px solid #006400;
    }
    
    .golfer-row:hover {
      background-color: #f8f0d0;
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
