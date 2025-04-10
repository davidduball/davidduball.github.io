// netlify/functions/proxy.js
export async function handler(event, context) {
  const targetUrl = "https://script.google.com/macros/s/AKfycbw7e11zGyZ-kOAvjuQXjQgO2Tc2rAiKEU8Gl3lFpMGCTbocK4iqd53PFC4U19_5LOkW/exec";

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from Google Apps Script", details: error.message })
    };
  }
}
