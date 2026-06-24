// Utility to fetch exchange rate
export async function fetchExchangeRate() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.rates?.PEN ? parseFloat(data.rates.PEN.toFixed(2)) : 3.6;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return 3.6; // Default fallback
  }
}
