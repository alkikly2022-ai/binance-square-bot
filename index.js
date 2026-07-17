const cron = require("node-cron");
const fetch = require("node-fetch");

const COINS = (process.env.COINS || "BTC,ETH,SOL")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

const SQUARE_API_KEY = process.env.SQUARE_API_KEY || "";
const TZ_NAME = process.env.TZ_NAME || "Africa/Tripoli";
const MORNING_TIME = process.env.MORNING_TIME || "0 9 * * *";
const EVENING_TIME = process.env.EVENING_TIME || "0 21 * * *";
const DRY_RUN = process.env.DRY_RUN === "true";

const BINANCE_API = "https://api.binance.com";
const SQUARE_POST_URL = "https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add";

async function getTicker24hr(symbol) {
  const res = await fetch(BINANCE_API + "/api/v3/ticker/24hr?symbol=" + symbol + "USDT");
  if (!res.ok) throw new Error("فشل جلب بيانات " + symbol + ": " + res.status);
  return res.json();
}

async function getKlines(symbol, interval, limit) {
  interval = interval || "1h";
  limit = limit || 50;
  const res = await fetch(BINANCE_API + "/api/v3/klines?symbol=" + symbol + "USDT&interval=" + interval + "&limit=" + limit);
  if (!res.ok) throw new Error("فشل جلب الشموع " + symbol + ": " + res.status);
  return res.json();
}

function calcRSI(closes, period) {
  period = period || 14;
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

async function analyzeCoin(symbol) {
  const ticker = await getTicker24hr(symbol);
  const klines = await getKlines(symbol);
  const closes = klines.map(function (k) { return parseFloat(k[4]); });
  const rsi = calcRSI(closes);

  const price = parseFloat(ticker.lastPrice);
  const changePercent = parseFloat(ticker.priceChangePercent);
  const high = parseFloat(ticker.highPrice);
  const low = parseFloat(ticker.lowPrice);

  let trend = "مستقر";
  if (changePercent > 3) trend = "صاعد بقوة";
  else if (changePercent > 0.5) trend = "صاعد";
  else if (changePercent < -3) trend = "هابط بقوة";
  else if (changePerce
