const axios = require("axios").default;
const fs = require("fs");

let token = {};
try {
  token = JSON.parse(fs.readFileSync("./data/token.json", "UTF-8"));
} catch {
  if (process.env.TOKEN) token = { gclubsess: process.env.TOKEN };
  else token = {};
}

const sleepTime = 1000 * 60 * 60 * 5; // 5 hours
const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

let token_headers = {
  "authority": "gamersclub.com.br",
  "cache-control": "max-age=0",
  "sec-ch-ua": '" Not;A Brand";v="99", "Microsoft Edge";v="97", "Chromium";v="97"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "upgrade-insecure-requests": "1",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36 Edg/97.0.1072.69",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "sec-fetch-site": "none",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "sec-fetch-dest": "document",
  "accept-language": "en-US,en;q=0.9,pt;q=0.8",
  "cookie": `language=pt-br; gclubsess=${token.gclubsess}`,
};

let claim_headers = {
  "authority": "missions-api.gamersclub.com.br",
  "sec-ch-ua": '" Not;A Brand";v="99", "Microsoft Edge";v="97", "Chromium";v="97"',
  "accept": "application/json, text/plain, */*",
  "authorization": "Bearer ...",
  "x-product-session": "1",
  "sec-ch-ua-mobile": "?0",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36 Edg/97.0.1072.69",
  "sec-ch-ua-platform": '"Windows"',
  "origin": "https://gamersclub.com.br",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "referer": "https://gamersclub.com.br/",
  "accept-language": "en-US,en;q=0.9,pt;q=0.8",
  "if-none-match": 'W/"140a-yxZlDaNIijFu+eD9a+mUZQtZVMY"',
};

let token_options = {
  url: "https://gamersclub.com.br/daily-rewards",
  headers: undefined,
};

let check_options = {
  url: "https://missions-api.gamersclub.com.br/player/daily-rewards",
  headers: undefined,
};

let claim_options = {
  headers: undefined,
};

let user_token = undefined;

function UpdateSession(cookies) {
  if (!cookies) return;

  let cookiesParsed = {};
  cookies.forEach(function (cookie) {
    const data = cookie.split("; ")[0].split("=");
    if (data[0] && data[1]) {
      cookiesParsed[data[0]] = data[1];
    }
  });

  if (Object.keys(cookiesParsed).length > 0) {
    if (cookiesParsed.gclubsess && cookiesParsed.gclubsess != token.gclubsess) {
      token.gclubsess = cookiesParsed.gclubsess;

      console.log("New token: " + token.gclubsess);
      token_headers["cookie"] = `language=pt-br; gclubsess=${token.gclubsess}`;

      fs.writeFile("./data/token.json", JSON.stringify(token, null, 2), { encoding: "UTF-8" }, () => {});
    }
  }
}

async function GetBearerToken() {
  try {
    // Clear current token
    user_token = undefined;

    token_options["headers"] = token_headers;
    const response = await axios.get("https://gamersclub.com.br/daily-rewards", token_options);
    if (!response.data) return;

    let index = response.data.indexOf("token:");
    if (index < 0) throw new Error("User token not found. Please, check gclubsess token.");

    user_token = response.data.match(/token: '(.*)'/)[1];
    // console.log("User token: " + user_token);

    index = response.data.indexOf("gc:authToken");
    if (index < 0) throw new Error("Auth token not found. Please, check gclubsess token.");

    UpdateSession(response.headers["set-cookie"]);

    const bearer_token = response.data.split("'gc:authToken', '")[1].split("');")[0];
    //console.log("Token: " + bearer_token);

    claim_headers["authorization"] = `Bearer ${bearer_token}`;
    check_options["headers"] = claim_headers;
    claim_options["headers"] = claim_headers;

    return true;
  } catch (error) {
    console.error(error.message ?? error);
  }
  return false;
}

let dayly_available_name = "";
function IsDailyRewardsAvailable(data) {
  if (!data || !data.missions) return false;

  let available = false;
  data.missions[0].goals.forEach((item) => {
    if (item.dailyRewardsStatus == "current_available") {
      dayly_available_name = item.prizes[0]?.name;
      if (dayly_available_name) available = true;
    }
  });

  return available;
}

async function ClaimDailyRewards() {
  try {
    const response = await axios.post("https://gamersclub.com.br/api/missions/daily-rewards/claim", { token: user_token }, claim_options);
    if (!response.data || response.data.statusCode != 200) return;

    //console.log(response.data);
    console.log(`Claimed daily reward: ${dayly_available_name}`);
  } catch (error) {
    console.error("ClaimDailyRewards: " + (error.message ?? error));
  }
}

async function CheckDailyRewards() {
  try {
    const response = await axios.get("https://missions-api.gamersclub.com.br/player/daily-rewards", check_options);
    if (!response.data || response.data.statusCode != 200) return;

    if (IsDailyRewardsAvailable(response.data.data)) {
      console.log(`Daily rewards available: ${dayly_available_name}`);
      ClaimDailyRewards();
    }
  } catch (error) {
    console.error("CheckDailyRewards: " + (error.message ?? error));
  }
}

async function CheckDailyRewardsLoop() {
  while (true) {
    if (await GetBearerToken()) CheckDailyRewards();
    await sleep(sleepTime);
  }
}

CheckDailyRewardsLoop();
