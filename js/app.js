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

  entries.sort((a, b) => calculateTotalScore(a.picks, liveScores) - calculateTotalScore(b.picks, liveScores));

  entries.forEach((entry, index) => {
    const totalScore = calculateTotalScore(entry.picks, liveScores);
    const entryEl = document.createElement('div');
    entryEl.className = 'entry';

    const header = document.createElement('div');
    header.className = 'entry-header';
    header.innerHTML = `<strong>#${index + 1}</strong> ${entry.name} — Total: ${formatScore(totalScore)}`;

    const details = document.createElement('div');
    details.className = 'entry-details';
    details.style.display = 'none';

    // Create table
    const table = document.createElement('table');
    table.className = 'leaderboard-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Player</th>
        <th>R1</th>
        <th>R2</th>
        <th>R3</th>
        <th>R4</th>
        <th>Total</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    entry.picks.forEach(player => {
      const data = liveScores[player.trim()];
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="player-name">${player}</td>
        <td>${formatScore(data?.r1)}</td>
        <td>${formatScore(data?.r2)}</td>
        <td>${formatScore(data?.r3)}</td>
        <td>${formatScore(data?.r4)}</td>
        <td class="total-score">${formatScore(data?.total)}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    details.appendChild(table);

    header.addEventListener('click', () => {
      details.style.display = details.style.display === 'none' ? 'block' : 'none';
    });

    entryEl.appendChild(header);
    entryEl.appendChild(details);
    container.appendChild(entryEl);
  });
}

async function init() {
  const picks = await fetchPicks();
  const liveScores = await fetchLiveScores();
  renderLeaderboard(picks, liveScores);
}

window.onload = init;
