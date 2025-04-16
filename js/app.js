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

    const hasSpecialStatus = typeof scoreDisplay === 'string' && ["CUT", "WD", "DQ", "DNS"].includes(scoreDisplay);

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

    const propScore = parseInt(row["PROPS"] || row["Props"] || "0") || 0;

    scoreMap[name] = {
      position,
      scoreDisplay,
      totalDisplay,
      r1Display,
      r2Display,
      r3Display,
      r4Display,
      hasSpecialStatus,
      totalStrokes: calculatedTotal,
      relativeScore: relativeScoreValue,
      r1: r1Value,
      r2: r2Value,
      r3: r3Value,
      r4: r4Value,
      propScore
    };
  });
  return scoreMap;
}

function getTop6Scores(picks, liveScores) {
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
      totalStrokes: 0,
      relativeScore: 0,
      r1: null,
      r2: null,
      r3: null,
      r4: null,
      propScore: 0
    };
    return {
      playerName,
      ...scoreData
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

function calculateTotalStrokes(picks, liveScores) {
  return getTop6Scores(picks, liveScores).reduce((total, player) => total + player.totalStrokes, 0);
}

function calculateRelativeScore(picks, liveScores) {
  return getTop6Scores(picks, liveScores).reduce((total, player) => total + player.relativeScore, 0);
}

function calculateTotalPropScore(picks, liveScores) {
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

  const mastersHeader = document.createElement('div');
  mastersHeader.className = 'masters-header';
  mastersHeader.innerHTML = `
    <h2>2025 Masters Pool</h2>
    <p>Scoring based on each team's top 6 players</p>
  `;
  container.appendChild(mastersHeader);

  const propsLink = document.createElement('div');
  propsLink.className = 'props-link';
  propsLink.innerHTML = `<a href="props.html" style="color:#006400;font-weight:bold;text-decoration:none;">View Prop Picks</a>`;
  container.appendChild(propsLink);

  entries.sort((a, b) => {
    const scoreA = calculateRelativeScore(a.picks, liveScores);
    const scoreB = calculateRelativeScore(b.picks, liveScores);
    if (scoreA === scoreB) {
      return calculateTotalStrokes(a.picks, liveScores) - calculateTotalStrokes(b.picks, liveScores);
    }
    return scoreA - scoreB;
  });

  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  const leaderboardTable = document.createElement('table');
  leaderboardTable.className = 'main-leaderboard';

  leaderboardTable.innerHTML = `
    <thead>
      <tr class="header-row">
        <th class="pos-column">POS</th>
        <th class="player-column">TEAM</th>
        <th class="score-column">SCORE</th>
        <th class="total-column">Team Total</th>
        <th class="props-column">PROPS</th>
        <th class="round-column">R1</th>
        <th class="round-column">R2</th>
        <th class="round-column">R3</th>
        <th class="round-column">R4</th>
      </tr>
    </thead>
  `;

  const tableBody = document.createElement('tbody');
  entries.forEach((entry, index) => {
    const top6Players = getTop6Scores(entry.picks, liveScores);
    const totalStrokes = calculateTotalStrokes(entry.picks, liveScores);
    const relativeScore = calculateRelativeScore(entry.picks, liveScores);
    const formattedRelative = formatRelativeScore(relativeScore);
    const propScore = calculateTotalPropScore(entry.picks, liveScores);

    const teamRow = document.createElement('tr');
    teamRow.className = 'team-row';
    teamRow.dataset.team = `team-${index}`;
    teamRow.innerHTML = `
      <td class="pos-column">${index + 1}</td>
      <td class="player-column"><div class="player-info"><span class="player-name">${entry.name}</span></div></td>
      <td class="score-column">${formattedRelative}</td>
      <td class="total-column">${totalStrokes}</td>
      <td class="props-column">${propScore}</td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
      <td class="round-column"></td>
    `;
    tableBody.appendChild(teamRow);

    const golfersContainer = document.createElement('tr');
    golfersContainer.className = 'golfers-container';
    golfersContainer.id = `team-${index}-golfers`;
    golfersContainer.style.display = 'none';

    const golfersCell = document.createElement('td');
    golfersCell.colSpan = 9;

    const golfersTable = document.createElement('table');
    golfersTable.className = 'golfers-table';

    golfersTable.innerHTML = `
      <tr class="golfers-header-row">
        <th class="pos-column">POS</th>
        <th class="player-column">PLAYER</th>
        <th class="score-column">SCORE</th>
        <th class="total-column">TOTAL</th>
        <th class="props-column">PROPS</th>
        <th class="round-column">R1</th>
        <th class="round-column">R2</th>
        <th class="round-column">R3</th>
        <th class="round-column">R4</th>
      </tr>
    `;

    entry.picks.forEach(player => {
      const playerName = player.trim();
      const data = liveScores[playerName] || {};
      const isTop6 = top6Players.some(p => p.playerName === playerName);

      const golferRow = document.createElement('tr');
      golferRow.className = `golfer-row ${isTop6 ? 'top-six' : ''} ${data.hasSpecialStatus ? 'special-status' : ''}`;
      golferRow.innerHTML = `
        <td class="pos-column">${data.position || '-'}</td>
        <td class="player-column"><div class="player-info"><span class="player-name">${playerName}</span></div></td>
        <td class="score-column">${data.scoreDisplay || 'E'}</td>
        <td class="total-column">${data.totalDisplay || '0'}</td>
        <td class="props-column">${data.propScore}</td>
        <td class="round-column">${data.r1Display || '-'}</td>
        <td class="round-column">${data.r2Display || '-'}</td>
        <td class="round-column">${data.r3Display || '-'}</td>
        <td class="round-column">${data.r4Display || '-'}</td>
      `;
      golfersTable.appendChild(golferRow);
    });

    golfersCell.appendChild(golfersTable);
    golfersContainer.appendChild(golfersCell);
    tableBody.appendChild(golfersContainer);

    teamRow.addEventListener('click', () => {
      const golfersElement = document.getElementById(`team-${index}-golfers`);
      golfersElement.style.display = golfersElement.style.display === 'none' ? 'table-row' : 'none';
      teamRow.classList.toggle('expanded');
    });
  });

  leaderboardTable.appendChild(tableBody);
  tableContainer.appendChild(leaderboardTable);
  container.appendChild(tableContainer);
}

async function init() {
  const picks = await fetchPicks();
  const liveScores = await fetchLiveScores();
  renderLeaderboard(picks, liveScores);
}

window.onload = init;
