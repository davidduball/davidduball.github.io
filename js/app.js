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
    const totalRaw = row["TOT"] || row["Total"] || "E";
    const r1 = parseInt(row["R1"]) || null;
    const r2 = parseInt(row["R2"]) || null;
    const r3 = parseInt(row["R3"]) || null;
    const r4 = parseInt(row["R4"]) || null;
    let total = 0;
    if (totalRaw === "E") total = 0;
    else if (!isNaN(parseInt(totalRaw))) total = parseInt(totalRaw);
    else if (totalRaw.startsWith("+") || totalRaw.startsWith("-")) total = parseInt(totalRaw);
    scoreMap[name] = {
      total,
      r1,
      r2,
      r3,
      r4
    };
  });
  return scoreMap;
}

function calculateTotalScore(picks, liveScores) {
  return picks.reduce((total, player) => {
    const score = liveScores[player.trim()]?.total ?? 0;
    return total + score;
  }, 0);
}

function formatScore(score) {
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
  
  // Sort entries by score
  entries.sort((a, b) => calculateTotalScore(a.picks, liveScores) - calculateTotalScore(b.picks, liveScores));
  
  // Add the main leaderboard table
  const leaderboardTable = document.createElement('table');
  leaderboardTable.className = 'main-leaderboard';
  
  // Create header row
  const tableHeader = document.createElement('thead');
  tableHeader.innerHTML = `
    <tr class="header-row">
      <th class="pos-column">POS</th>
      <th class="player-column">TEAM</th>
      <th class="total-column">TOTAL</th>
      <th class="round-column">R1</th>
      <th class="round-column">R2</th>
      <th class="round-column">R3</th>
      <th class="round-column">R4</th>
      <th class="total-column">TOTAL</th>
    </tr>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  // Create tbody
  const tableBody = document.createElement('tbody');
  
  entries.forEach((entry, index) => {
    const totalScore = calculateTotalScore(entry.picks, liveScores);
    const formattedScore = formatScore(totalScore);
    
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
      <td class="total-column">${formattedScore}</td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="total-column">${formattedScore}</td>
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
        <td class="total-column">${formatScore(data?.total)}</td>
        <td class="round-column">${data?.r1 || ''}</td>
        <td class="round-column">${data?.r2 || ''}</td>
        <td class="round-column">${data?.r3 || ''}</td>
        <td class="round-column">${data?.r4 || ''}</td>
        <td class="total-column">${formatScore(data?.total)}</td>
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
      } else {
        golfersElement.style.display = 'none';
      }
    });
  });
  
  leaderboardTable.appendChild(tableBody);
  container.appendChild(leaderboardTable);
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
      background-color: #fff8dc; /* Using your existing yellow background */
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
    
    .total-column {
      font-weight: bold;
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
  `;
  document.head.appendChild(styleElement);
}

async function init() {
  const picks = await fetchPicks();
  const liveScores = await fetchLiveScores();
  addMastersStyles();
  renderLeaderboard(picks, liveScores);
  
  // Add expanded class toggle for visual indicator
  document.addEventListener('click', function(e) {
    if (e.target.closest('.team-row')) {
      const teamRow = e.target.closest('.team-row');
      teamRow.classList.toggle('expanded');
    }
  });
}

window.onload = init;
