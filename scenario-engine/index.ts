const path = require("path");
const express = require("express");
const port = process.env.PORT || 5200;
const backendHost = process.env.BACKEND_HOST || null;
const robotServer = process.env.ROBOT_SERVER || null;
const scenarioHost = process.env.SCENARIO_HOST || "http://localhost";
const scenarioDir =
  process.env.SCENARIO_DIR || path.join(__dirname, "scenario");
const commandDir = process.env.COMMAND_DIR || path.join(__dirname, "command");
const loggerHost = process.env.LOGGER_HOST || null;

const { DoraEngine } = require("modules/DoraEngine");
const robotBrains = {} as { [index: string]: typeof DoraEngine };

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(scenarioDir, "public")));

app.use((req, res, next) => {
  console.log(req.path);
  console.log(new Date());
  console.log(JSON.stringify(req.body, null, "  "));
  next();
});

// シナリオスタート
app.post("/init", async (req, res) => {
  const { username, sockId } = req.body;
  robotBrains[sockId || "robot"] = new DoraEngine({
    scenarioDir,
    backendHost,
    robotServer,
    scenarioHost,
    scenarioPort: `${port}`,
    loggerHost,
    commandDir,
  });
  robotBrains[sockId || "robot"].init(username, sockId);
  res.sendStatus(200);
});

// シナリオ継続通知
app.post("/ready", async (req, res) => {
  const { username, sockId } = req.body;
  if (!username) {
    res.sendStatus(200);
    return;
  }
  robotBrains[sockId || "robot"].ready(username);
  res.sendStatus(200);
});

// シナリオ継続通知
app.post("/robotReady", async (req, res) => {
  const { sockId } = req.body;
  let { username } = req.body;
  if (!username && req.body.payload) {
    const m = req.body.payload.match(/username:(.+)/);
    if (m) {
      username = m[1];
    }
  }
  Object.entries(robotBrains).some(([k, v]) => v.ready(username));
  res.sendStatus(200);
});

// 音声認識結果
app.post("/transcript", async (req, res) => {
  const { transcript, username, sockId } = req.body;
  robotBrains[sockId || "robot"].think(username, transcript);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`backendHost: ${backendHost}`);
  console.log(`robotServer: ${robotServer}`);
  console.log(`scenarioDir: ${scenarioDir}`);
  console.log(`scenario-engine app listening at ${scenarioHost}:${port}`);
});
