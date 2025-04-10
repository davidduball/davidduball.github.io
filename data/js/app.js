async function fetchPicks() {
  const res = await fetch('data/picks.json');
  return await res.json();
}

async function fetchLiveScores() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbw7e11zGyZ-kOAvjuQXjQgO2Tc2rAiKEU8Gl31FpMGCTbocK4iqd53PFC4U19_5LOkW/exec");
  const data = await res.json();

  const scoreMap = {};
  data.forEach(row => {
    const name = row["PLAYER"] || row["Name"] || "";
    const raw = row["TOT"] || row["Total"] || "E";

    let score = 0;
    if (raw === "E") score = 0;
    else if (!isNaN(parseInt(raw))) score = parseInt(raw);
    else if (raw.startsWith("+") || raw.startsWith("-")) score = parseInt(raw);

    if (name) scoreMap[name.trim()] = score;
  });

  return scoreMap;
}

function calculateTotalScore(picks, liveScores) {
  return picks.reduce((total, player) => {
    const score = liveScores[player.trim()] ?? 0;
    return total + score;
  }, 0);
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
    header.innerHTML = `<strong>#${index + 1}</strong> ${entry.name} — Total: ${totalScore > 0 ? '+' + totalScore : totalScore}`;

    const details = document.createElement('div');
    details.className = 'entry-details';
    details.style.display = 'none';

    entry.picks.forEach(player => {
      const playerScore = liveScores[player.trim()];
      const scoreDisplay = playerScore === 0 ? 'E' : (playerScore > 0 ? '+' + playerScore : playerScore);
      const line = document.createElement('div');
      line.textContent = `${player}: ${scoreDisplay}`;
      details.appendChild(line);
    });

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
