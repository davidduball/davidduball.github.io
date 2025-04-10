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
    <h1>2025 Masters Pool</h1>
  `;
  container.appendChild(mastersHeader);
  
  // Sort entries by score
  entries.sort((a, b) => calculateTotalScore(a.picks, liveScores) - calculateTotalScore(b.picks, liveScores));
  
  // Create filter options (similar to the Masters site)
  const filterOptions = document.createElement('div');
  filterOptions.className = 'filter-options';
  filterOptions.innerHTML = `
    <div class="filter-container">
      <button class="filter-btn">Traditional</button>
      <button class="filter-btn">All Players</button>
    </div>
    <div class="time-info">All times in EDT</div>
  `;
  container.appendChild(filterOptions);
  
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
      <th class="thru-column">THRU</th>
      <th class="today-column">TODAY</th>
      <th class="round-column">R1</th>
      <th class="round-column">R2</th>
      <th class="round-column">R3</th>
      <th class="round-column">R4</th>
      <th class="total-column">TOTAL</th>
      <th class="action-column"></th>
      <th class="action-column"></th>
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
      <td class="thru-column"></td>
      <td class="today-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="total-column">${formattedScore}</td>
      <td class="action-column"><button class="track-btn">🏁</button></td>
      <td class="action-column"><button class="fav-btn">★</button></td>
    `;
    tableBody.appendChild(teamRow);
    
    // Create collapsible container for golfers
    const golfersContainer = document.createElement('tr');
    golfersContainer.className = 'golfers-container';
    golfersContainer.id = `team-${index}-golfers`;
    golfersContainer.style.display = 'none';
    
    const golfersCell = document.createElement('td');
    golfersCell.colSpan = 12;
    
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
            <img src="https://via.placeholder.com/30" class="player-img" alt="${player}">
            <span class="player-name">${player}</span>
          </div>
        </td>
        <td class="total-column">${formatScore(data?.total)}</td>
        <td class="thru-column"></td>
        <td class="today-column"></td>
        <td class="round-column">${data?.r1 || ''}</td>
        <td class="round-column">${data?.r2 || ''}</td>
        <td class="round-column">${data?.r3 || ''}</td>
        <td class="round-column">${data?.r4 || ''}</td>
        <td class="total-column">${formatScore(data?.total)}</td>
        <td class="action-column"><button class="track-btn">🏁</button></td>
        <td class="action-column"><button class="fav-btn">★</button></td>
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
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
    
    body {
      font-family: 'Playfair Display', Georgia, serif;
      margin: 0;
      padding: 20px;
      background-color: #fafafa;
      color: #333;
    }
    
    #leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .masters-header {
      text-align: left;
      margin-bottom: 30px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 15px;
    }
    
    .masters-header h1 {
      color: #006747;
      font-size: 32px;
      margin: 0;
      font-weight: normal;
      font-family: 'Playfair Display', Georgia, serif;
    }
    
    .filter-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .filter-container {
      display: flex;
      gap: 10px;
    }
    
    .filter-btn {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 6px 16px;
      font-family: 'Playfair Display', Georgia, serif;
      cursor: pointer;
      color: #006747;
      transition: all 0.2s;
    }
    
    .filter-btn:hover {
      border-color: #006747;
    }
    
    .time-info {
      color: #777;
      font-size: 14px;
    }
    
    .main-leaderboard {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Playfair Display', Georgia, serif;
    }
    
    .header-row {
      background-color: #006747;
      color: white;
      text-align: left;
    }
    
    .header-row th {
      padding: 15px 10px;
      font-weight: normal;
      font-size: 14px;
      text-align: center;
    }
    
    .header-row .player-column {
      text-align: left;
    }
    
    .team-row, .golfer-row {
      border-bottom: 1px solid #eee;
      transition: background-color 0.2s;
      cursor: pointer;
    }
    
    .team-row:hover, .golfer-row:hover {
      background-color: #f9f7e8; /* Very subtle yellow */
    }
    
    .team-row td, .golfer-row td {
      padding: 15px 10px;
      text-align: center;
    }
    
    .player-column {
      text-align: left !important;
      min-width: 200px;
    }
    
    .player-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .player-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }
    
    .player-name {
      font-weight: normal;
    }
    
    .team-row .player-name {
      font-weight: bold;
    }
    
    .golfers-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .golfers-container {
      background-color: #fdfcf7; /* Very light yellow/cream */
    }
    
    .pos-column {
      width: 40px;
    }
    
    .total-column, .round-column, .thru-column, .today-column {
      width: 60px;
    }
    
    .action-column {
      width: 30px;
    }
    
    .track-btn, .fav-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #bbb;
      transition: color 0.2s;
    }
    
    .track-btn:hover, .fav-btn:hover {
      color: #006747;
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
