async function fetchPicks() {
  const res = await fetch('data/picks.json');
  return await res.json();
}

async function fetchLiveScoresAndProps() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbw7e11zGyZ-kOAvjuQXjQgO2Tc2rAiKEU8Gl31FpMGCTbocK4iqd53PFC4U19_5LOkW/exec");
  const data = await res.json();
  
  const result = {
    golferScores: {},
    teamPropScores: {}
  };
  
  data.forEach(row => {
    const name = (row["PLAYER"] || row["Name"] || "").trim();
    if (!name) return;
    
    if (row["TeamEntry"] === true || row["isTeam"] === true) {
      result.teamPropScores[name] = parseInt(row["Props"] || "0") || 0;
      return;
    }
    
    const position = row["POS"] || row["Position"] || "-";
    const scoreDisplay = row["SCORE"] || row["RelativeScore"] || "E";
    const totalDisplay = row["TOT"] || row["Total"] || "0";
    
    const r1Display = row["R1"] || "-";
    const r2Display = row["R2"] || "-";
    const r3Display = row["R3"] || "-";
    const r4Display = row["R4"] || "-";
    
    let r1Value = parseInt(row["R1"]) || null;
    let r2Value = parseInt(row["R2"]) || null;
    let r3Value = parseInt(row["R3"]) || null;
    let r4Value = parseInt(row["R4"]) || null;
    
    const hasSpecialStatus = typeof scoreDisplay === 'string' && 
                          (scoreDisplay === "CUT" || 
                           scoreDisplay === "WD" || 
                           scoreDisplay === "DQ" ||
                           scoreDisplay === "DNS");
    
    if (hasSpecialStatus) {
      if (r1Value === null) r1Value = 80;
      if (r2Value === null) r2Value = 80;
      if (r3Value === null) r3Value = 80;
      if (r4Value === null) r4Value = 80;
    }
    
    let calculatedTotal = 0;
    if (r1Value !== null) calculatedTotal += r1Value;
    if (r2Value !== null) calculatedTotal += r2Value;
    if (r3Value !== null) calculatedTotal += r3Value;
    if (r4Value !== null) calculatedTotal += r4Value;
    
    let relativeScoreValue = 0;
    if (scoreDisplay === "E") {
      relativeScoreValue = 0;
    } else if (typeof scoreDisplay === 'string' && (scoreDisplay.startsWith("+") || scoreDisplay.startsWith("-"))) {
      relativeScoreValue = parseInt(scoreDisplay);
    } else if (!isNaN(parseInt(scoreDisplay))) {
      relativeScoreValue = parseInt(scoreDisplay);
    } else if (hasSpecialStatus) {
      relativeScoreValue = 100;
    }
    
    result.golferScores[name] = {
      position: position,
      scoreDisplay: scoreDisplay,
      totalDisplay: totalDisplay,
      r1Display: r1Display,
      r2Display: r2Display,
      r3Display: r3Display,
      r4Display: r4Display,
      hasSpecialStatus: hasSpecialStatus,
      totalStrokes: calculatedTotal,
      relativeScore: relativeScoreValue,
      r1: r1Value,
      r2: r2Value,
      r3: r3Value,
      r4: r4Value
    };
  });
  
  return result;
}

function getTop6Scores(picks, golferScores) {
  const playerScores = picks.map(player => {
    const playerName = player.trim();
    const scoreData = golferScores[playerName] || { 
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
      r4: null
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
      r4: scoreData.r4
    };
  });
  
  playerScores.sort((a, b) => {
    if (a.hasSpecialStatus === b.hasSpecialStatus) {
      return a.relativeScore - b.relativeScore;
    }
    return a.hasSpecialStatus ? 1 : -1;
  });
  
  return playerScores.slice(0, 6);
}

function calculateTotalStrokes(picks, golferScores) {
  const top6 = getTop6Scores(picks, golferScores);
  return top6.reduce((total, player) => total + player.totalStrokes, 0);
}

function calculateRelativeScore(picks, golferScores) {
  const top6 = getTop6Scores(picks, golferScores);
  return top6.reduce((total, player) => total + player.relativeScore, 0);
}

function getTeamPropScore(teamName, teamPropScores) {
  return teamPropScores[teamName] || 0;
}

function calculateAdjustedScore(picks, golferScores, teamName, teamPropScores) {
  const relativeScore = calculateRelativeScore(picks, golferScores);
  const propScore = getTeamPropScore(teamName, teamPropScores);
  return relativeScore - propScore;
}

function calculateTotalPropScore(teamName, teamPropScores) {
  return teamPropScores[teamName] || 0;
}

function formatRelativeScore(score) {
  if (score === null || score === undefined || isNaN(score)) return '';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : score;
}

function renderLeaderboard(entries, scoresData) {
  const container = document.getElementById('leaderboard');
  container.innerHTML = '';
  
  const { golferScores, teamPropScores } = scoresData;
  
  const mastersHeader = document.createElement('div');
  mastersHeader.className = 'masters-header';
  mastersHeader.innerHTML = 
    `<h2>2025 Masters Pool</h2>
    <p>Scoring based on each team's top 6 players (props subtracted)</p>`;
  container.appendChild(mastersHeader);

  const propsLink = document.createElement('div');
  propsLink.className = 'props-link';
  propsLink.innerHTML = `<a href="props.html" style="color:#006400;font-weight:bold;text-decoration:none;">View Prop Picks</a>`;
  container.appendChild(propsLink);

  entries.sort((a, b) => {
    const scoreA = calculateAdjustedScore(a.picks, golferScores, a.name, teamPropScores);
    const scoreB = calculateAdjustedScore(b.picks, golferScores, b.name, teamPropScores);
    
    if (scoreA === scoreB) {
      return calculateTotalStrokes(a.picks, golferScores) - calculateTotalStrokes(b.picks, golferScores);
    }
    
    return scoreA - scoreB;
  });
  
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  
  const leaderboardTable = document.createElement('table');
  leaderboardTable.className = 'main-leaderboard';
  
  leaderboardTable.innerHTML = 
    `<thead>
      <tr class="header-row">
        <th class="pos-column">POS</th>
        <th class="player-column">TEAM</th>
        <th class="total-column">GOLFER SCORE</th>
        <th class="props-column">PROPS</th>
        <th class="adjusted-column">NET TOTAL</th>
        <th class="score-column">SCORE TO PAR</th>
      </tr>
    </thead>`;

  const tableBody = document.createElement('tbody');
  
  entries.forEach((entry, index) => {
    const top6Players = getTop6Scores(entry.picks, golferScores);
    const totalStrokes = calculateTotalStrokes(entry.picks, golferScores);
    const relativeScore = calculateRelativeScore(entry.picks, golferScores);
    const formattedRelative = formatRelativeScore(relativeScore);
    const propScore = calculateTotalPropScore(entry.name, teamPropScores);
    const adjustedScore = calculateAdjustedScore(entry.picks, golferScores, entry.name, teamPropScores);
    const formattedAdjusted = formatRelativeScore(adjustedScore);
    
    const teamRow = document.createElement('tr');
    teamRow.className = 'team-row';
    teamRow.dataset.team = `team-${index}`;
    teamRow.innerHTML = 
      `<td class="pos-column">${index + 1}</td>
      <td class="player-column">
        <div class="player-info">
          <span class="player-name">${entry.name}</span>
        </div>
      </td>
      <td class="total-column">${formattedRelative}</td>
      <td class="props-column">${propScore}</td>
      <td class="adjusted-column">${formattedAdjusted}</td>
      <td class="score-column">${totalStrokes}</td>`;
    tableBody.appendChild(teamRow);
    
    const golfersContainer = document.createElement('tr');
    golfersContainer.className = 'golfers-container';
    golfersContainer.id = `team-${index}-golfers`;
    golfersContainer.style.display = 'none';
    
    const golfersCell = document.createElement('td');
    golfersCell.colSpan = 6;
    
    const golfersTable = document.createElement('table');
    golfersTable.className = 'golfers-table';
    
    const golfersHeader = document.createElement('tr');
    golfersHeader.className = 'golfers-header-row';
    golfersHeader.innerHTML = 
      `<th class="pos-column">POS</th>
      <th class="player-column">NAME</th>
      <th class="score-column">SCORE</th>
      <th class="score-column">R1</th>
      <th class="score-column">R2</th>
      <th class="score-column">R3</th>
      <th class="score-column">R4</th>`;
    
    golfersTable.appendChild(golfersHeader);
    
    top6Players.forEach(player => {
      const golferRow = document.createElement('tr');
      golferRow.className = 'golfer-row';
      golferRow.innerHTML = 
        `<td class="pos-column">${player.position}</td>
        <td class="player-column">${player.playerName}</td>
        <td class="score-column">${player.scoreDisplay}</td>
        <td class="score-column">${player.r1Display}</td>
        <td class="score-column">${player.r2Display}</td>
        <td class="score-column">${player.r3Display}</td>
        <td class="score-column">${player.r4Display}</td>`;
      golfersTable.appendChild(golferRow);
    });
    
    golfersCell.appendChild(golfersTable);
    golfersContainer.appendChild(golfersCell);
    tableBody.appendChild(golfersContainer);
  });
  
  leaderboardTable.appendChild(tableBody);
  tableContainer.appendChild(leaderboardTable);
  container.appendChild(tableContainer);
}
