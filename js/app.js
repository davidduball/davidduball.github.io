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
  if (score === null || score === undefined || isNaN(score)) return '--';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : score;
}

function formatRoundScore(score) {
  if (score === null || score === undefined || isNaN(score)) return '--';
  return score;
}

function renderLeaderboard(entries, liveScores) {
  const container = document.getElementById('leaderboard');
  container.innerHTML = '';
  
  // Create the Masters header
  const mastersHeader = document.createElement('div');
  mastersHeader.className = 'masters-header';
  mastersHeader.innerHTML = `
    <h1>MASTERS</h1>
    <h3>A Leaderboard for a Pool Unlike Any Other</h3>
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
      <th>#</th>
      <th>Team</th>
      <th>Golfers</th>
      <th>Round 1</th>
      <th>Round 2</th>
      <th>Round 3</th>
      <th>Round 4</th>
      <th>72 Hole Total</th>
      <th>Team Score</th>
      <th>Prop points</th>
      <th>Total Score</th>
    </tr>
  `;
  leaderboardTable.appendChild(tableHeader);
  
  // Create tbody
  const tableBody = document.createElement('tbody');
  
  entries.forEach((entry, index) => {
    const totalScore = calculateTotalScore(entry.picks, liveScores);
    // 15 is a placeholder for prop points - you'll need to implement this
    const propPoints = entry.propPoints || 15; 
    const totalWithProps = totalScore + propPoints;
    
    // Team header row
    const teamRow = document.createElement('tr');
    teamRow.className = 'team-row';
    teamRow.innerHTML = `
      <td>${index + 1}</td>
      <td class="team-name">${entry.name}</td>
      <td colspan="6"></td>
      <td>${totalScore}</td>
      <td>${propPoints}</td>
      <td>${totalWithProps}</td>
    `;
    tableBody.appendChild(teamRow);
    
    // Add rows for each golfer
    entry.picks.forEach(player => {
      const data = liveScores[player.trim()];
      const golferRow = document.createElement('tr');
      golferRow.className = 'golfer-row';
      golferRow.innerHTML = `
        <td></td>
        <td></td>
        <td class="player-name">${player}</td>
        <td>${formatRoundScore(data?.r1)}</td>
        <td>${formatRoundScore(data?.r2)}</td>
        <td>${formatRoundScore(data?.r3)}</td>
        <td>${formatRoundScore(data?.r4)}</td>
        <td class="total-score">${formatScore(data?.total)}</td>
        <td colspan="3"></td>
      `;
      tableBody.appendChild(golferRow);
    });
    
    // Add a spacer row
    const spacerRow = document.createElement('tr');
    spacerRow.className = 'spacer-row';
    spacerRow.innerHTML = `<td colspan="11"></td>`;
    tableBody.appendChild(spacerRow);
  });
  
  leaderboardTable.appendChild(tableBody);
  container.appendChild(leaderboardTable);
}

// Add this CSS to your stylesheet
function addMastersStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    
    #leaderboard {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #e6f2ef;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .masters-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 20px;
      background-color: #e6f2ef;
    }
    
    .masters-header h1 {
      color: #006442;
      font-size: 48px;
      margin: 0;
      font-weight: bold;
    }
    
    .masters-header h3 {
      color: #006442;
      font-size: 18px;
      margin: 10px 0 0;
    }
    
    .main-leaderboard {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .header-row {
      background-color: #006442;
      color: white;
      text-align: left;
    }
    
    .header-row th {
      padding: 10px;
      font-size: 14px;
    }
    
    .team-row {
      background-color: #006442;
      color: white;
      font-weight: bold;
    }
    
    .team-row td {
      padding: 10px;
    }
    
    .team-name {
      font-size: 16px;
    }
    
    .golfer-row {
      background-color: #f9d44c;
    }
    
    .golfer-row td {
      padding: 8px 10px;
      border-bottom: 1px solid #e6c33c;
    }
    
    .player-name {
      font-weight: bold;
    }
    
    .total-score {
      font-weight: bold;
    }
    
    .spacer-row {
      height: 10px;
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
