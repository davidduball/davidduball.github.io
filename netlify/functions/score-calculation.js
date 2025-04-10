// netlify/functions/score-calculation.js
const fetch = require('node-fetch');  // Use node-fetch to fetch the leaderboard data from an external site

exports.handler = async function(event, context) {
  const { name, team, propAnswers } = JSON.parse(event.body);  // Assuming form data is sent as JSON

  // Process the team (just an example, you may need to format this differently)
  const teamArray = team.split(',');  // Split the comma-separated golfer names into an array
  let score = 0;

  // Fetch leaderboard data (for demonstration purposes)
  const response = await fetch('https://some-golf-leaderboard-api.com/leaderboard');  // Replace with actual API
  const leaderboard = await response.json();

  // Calculate score based on the top 6 golfers (you'd adjust this based on your own scoring logic)
  for (let i = 0; i < 6; i++) {
    const golfer = teamArray[i];
    const golferData = leaderboard.find(player => player.name === golfer);
    score += golferData.score;  // Assuming score is a property in the fetched data
  }

  // Subtract prop answers (you can adjust how you calculate this based on the correct answers)
  const correctPropAnswers = 3;  // Example: 3 correct answers
  score -= correctPropAnswers;

  // Send back the calculated score (or store it, send email, etc.)
  return {
    statusCode: 200,
    body: JSON.stringify({ name, score }),
  };
};

