const express = require("express");
const cookieSession = require("cookie-session");
const http = require("http");
const axios = require("axios");
const sockjs = require("sockjs");
const io = sockjs.createServer();

const broadcastConnections = {};
const broadcast = (payload) => {
  for (const id in broadcastConnections) {
    // console.log(payload.username);
    broadcastConnections[id].write(JSON.stringify(payload));
  }
};

const app = express();
const httpServer = http.createServer(app);

const port = process.env.PORT || 4100;
const backendHost = process.env.BACKEND_HOST || "http://localhost";
const scenarioManagerHost = process.env.SCENARIO_MANAGER_HOST || null;

app.use(
  cookieSession({
    name: "session",
    secret:
      process.env.SECRET ||
      "JOmroqZSynI3wt6H2VMF6ltX9DRlUEuvupyZeeXXy9M4fTV2EaSfGSmkFXCjHojH",
    maxAge: 24 * 60 * 60 * 1000 * 365 * 1000, // 1000 years
  })
);

function isLogined(req, res, next) {
  if (req.session && req.session.username) {
    return next();
  }
  res.sendStatus(403);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("front"));

app.use((req, res, next) => {
  console.log(req.path);
  console.log(new Date());
  console.log(JSON.stringify(req.body, null, "  "));
  next();
});

app.post("/auth", (req, res) => {
  res.send({ username: req.session.username });
});

app.post("/login", (req, res) => {
  if (req.body.username) {
    req.session.username = req.body.username.trim();
    // req.session.userId =
    if (req.session && req.session.username) {
      return res.sendStatus(200);
    }
  }
  res.sendStatus(403);
});

// echo-server -> browser
app.post("/speech-to-text/start", (req, res) => {
  const { timeout, username } = req.body;
  broadcast({
    action: "speech-to-text/start",
    username,
    timeout,
  });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/speech-to-text/stop", (req, res) => {
  const { username } = req.body;
  broadcast({
    action: "speech-to-text/stop",
    username,
  });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/display/image", (req, res) => {
  const { image, username } = req.body;
  broadcast({
    action: "image",
    username,
    image,
  });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/text-to-speech/start", (req, res) => {
  const { username } = req.body;
  broadcast({
    ...req.body,
    action: "text-to-speech/start",
    username,
  });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/text-to-speech/stop", (req, res) => {
  const { username } = req.body;
  broadcast({
    ...req.body,
    action: "text-to-speech/stop",
    username,
  });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/start", (req, res) => {
  const { username } = req.body;
  broadcast({ ...req.body, action: "start", username });
  res.sendStatus(200);
});

// echo-server -> browser
app.post("/exit", (req, res) => {
  const { username } = req.body;
  broadcast({ ...req.body, action: "exit", username });
  res.sendStatus(200);
});

// browser -> echo-server
app.post("/transcript", isLogined, (req, res) => {
  const { username } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/transcript`, {
      ...req.body,
      username,
    });
  res.sendStatus(200);
});

app.post("/logout", (req, res) => {
  delete req.session.username;
  res.sendStatus(200);
});

// browser -> echo-server
app.post("/init", (req, res) => {
  const { username } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/init`, {
      ...req.body,
      username,
    });
  res.sendStatus(200);
});

// browser -> echo-server
app.post("/recognition", (req, res) => {
  const { username } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/recognition`, {
      ...req.body,
      username,
    });
  res.sendStatus(200);
});

// browser -> echo-server
app.post("/ready", (req, res) => {
  const { username } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/ready`, {
      ...req.body,
      username,
    });
  res.sendStatus(200);
});

io.installHandlers(httpServer, { prefix: "/controller" });

io.on("connection", (conn) => {
  console.log("a user connected");
  broadcastConnections[conn.id] = conn;
  conn.on("disconnect", () => {
    delete broadcastConnections[conn.id];
    console.log("user disconnected");
  });
});

httpServer.listen(port, () => {
  console.log(`Scenario Manager: ${scenarioManagerHost}`);
  console.log(`browser-speech app listening at ${backendHost}:${port}`);
});
