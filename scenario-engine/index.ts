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

const socketIdString = sockId => {
  return robotServer !== null ? "robot" : sockId;
};

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

const CreateDoraEngine = sockId => {
  if (!robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)] = new DoraEngine({
      scenarioDir,
      backendHost,
      robotServer,
      scenarioHost,
      scenarioPort: `${port}`,
      loggerHost,
      commandDir,
    });
  }
};

// シナリオスタート
app.post("/init", async (req, res) => {
  const { username, sockId } = req.body;
  console.log(Object.keys(robotBrains));
  console.log(socketIdString(sockId));
  CreateDoraEngine(sockId);
  if (robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)].init(username, sockId);
  }
  res.sendStatus(200);
});

// リセット
app.post("/reset", async (req, res) => {
  const { username, sockId, key } = req.body;
  console.log(socketIdString(sockId));
  CreateDoraEngine(sockId);
  if (robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)].reset(username, key);
  }
  res.sendStatus(200);
});

// クローズ
app.post("/close", async (req, res) => {
  const { sockId } = req.body;
  if (!robotServer) {
    delete robotBrains[socketIdString(sockId)];
  }
  res.sendStatus(200);
});

// シナリオ継続通知
app.post("/ready", async (req, res) => {
  const { username, sockId, key } = req.body;
  if (!username) {
    res.sendStatus(200);
    return;
  }
  robotBrains[socketIdString(sockId)].ready(username, key);
  res.sendStatus(200);
});

// シナリオ継続通知
app.post("/robotReady", async (req, res) => {
  function sleep() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(0);
      }, 500);
    });
  }
  const { sockId } = req.body;
  let { username, key } = req.body;
  if (!username && req.body.payload) {
    const m = req.body.payload.match(/username:(.+)/);
    if (m) {
      username = m[1];
    }
  }
  await sleep();
  if (robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)].ready(username, key);
  }
  res.sendStatus(200);
});

// ボタンイベント通知
app.post("/button/:action", async (req, res) => {
  const { sockId } = req.body;
  const { action } = req.params;
  let { username, key } = req.body;
  if (!username && req.body.payload) {
    const m = req.body.payload.match(/username:(.+)/);
    if (m) {
      username = m[1];
    }
  }
  if (robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)].button(username, key, action);
  }
  res.sendStatus(200);
});

// 音声認識結果
app.post("/transcript", async (req, res) => {
  const { transcript, username, sockId, key } = req.body;
  if (robotBrains[socketIdString(sockId)]) {
    robotBrains[socketIdString(sockId)].think(username, key, transcript);
  }
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`backendHost: ${backendHost}`);
  console.log(`robotServer: ${robotServer}`);
  console.log(`scenarioDir: ${scenarioDir}`);
  console.log(`scenario-engine app listening at ${scenarioHost}:${port}`);
  // setInterval(() => {
  //   console.log(Object.keys(robotBrains));
  // }, 3000);
});
