const path = require("path");
const express = require("express");
const port = process.env.PORT || 5200;
const backendHost = process.env.BACKEND_HOST || null;
const scenarioHost = process.env.SCENARIO_HOST || "http://localhost";
const scenarioDir =
  process.env.SCENARIO_DIR || path.join(__dirname, "scenario");

const { DoraEngine } = require("modules/DoraEngine");
const robot = new DoraEngine({
  scenarioDir,
  backendHost,
  scenarioHost: `${scenarioHost}:${port}`,
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.use((req, res, next) => {
  console.log(req.path);
  console.log(JSON.stringify(req.body, null, "  "));
  next();
});

// シナリオスタート
app.post("/init", async (req, res) => {
  const username = req.body.username;
  robot.init(username);
  res.sendStatus(200);
});

// 音声認識ステータス通知
app.post("/recognition", async (req, res) => {
  res.sendStatus(200);
});

// シナリオ継続通知
app.post("/ready", async (req, res) => {
  const username = req.body.username;
  robot.ready(username);
  res.sendStatus(200);
});

// 音声認識結果
app.post("/transcript", async (req, res) => {
  const username = req.body.username;
  const { transcript } = req.body;
  robot.think(username, transcript);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`backendHost: ${backendHost}`);
  console.log(`scenarioDir: ${scenarioDir}`);
  console.log(`echo-scenario app listening at ${scenarioHost}:${port}`);
});
