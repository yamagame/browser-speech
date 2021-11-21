const express = require("express");
const cookieSession = require("cookie-session");
const http = require("http");
const axios = require("axios");
const sockjs = require("sockjs");
const io = sockjs.createServer();

const broadcastConnections = {};
const broadcast = payload => {
  const { sockId } = payload;
  if (broadcastConnections[sockId]) {
    broadcastConnections[sockId].write(JSON.stringify(payload));
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

app.get("/image/:image(*)", (req, res) => {
  const proxyRequestHeaders = Object.assign({}, req.headers);
  if (proxyRequestHeaders) {
    for (let key of ["host", "authorization", "cookie"]) {
      delete proxyRequestHeaders[key];
    }
  }
  const url = `${scenarioManagerHost}/${req.params.image}`;
  axios({
    method: "get",
    url,
    responseType: "stream",
    headers: proxyRequestHeaders || {},
  })
    .then(function (response) {
      response.data.pipe(res);
    })
    .catch(err => {
      res.sendStatus(err.response.status);
    });
});

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

// scenario-engine -> browser
app.post("/speech-to-text/start", (req, res) => {
  const { timeout, username, sockId } = req.body;
  broadcast({
    action: "speech-to-text/start",
    username,
    timeout,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/speech-to-text/stop", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({
    action: "speech-to-text/stop",
    username,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/display/image", (req, res) => {
  const { image, username, sockId } = req.body;
  broadcast({
    action: "image",
    username,
    image,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/text-to-speech/start", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({
    ...req.body,
    action: "text-to-speech/start",
    username,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/text-to-speech/stop", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({
    ...req.body,
    action: "text-to-speech/stop",
    username,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/clear-subtitle", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({
    ...req.body,
    action: "clear-subtitle",
    username,
    sockId,
  });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/start", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({ ...req.body, action: "start", username, sockId });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/exit", (req, res) => {
  const { username, sockId } = req.body;
  broadcast({ ...req.body, action: "exit", username, sockId });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/error", async (req, res) => {
  const { username, sockId } = req.body;
  broadcast({ ...req.body, action: "error", username, sockId });
  res.sendStatus(200);
});

// scenario-engine -> browser
app.post("/log", async (req, res) => {
  const { username, sockId } = req.body;
  broadcast({ ...req.body, action: "log", username, sockId });
  res.sendStatus(200);
});

// browser -> scenario-engine
app.post("/transcript", isLogined, (req, res) => {
  const { username, sockId } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/transcript`, {
      ...req.body,
      username,
      sockId,
    });
  res.sendStatus(200);
});

app.post("/logout", (req, res) => {
  delete req.session.username;
  res.sendStatus(200);
});

// browser -> scenario-engine
app.post("/init", (req, res) => {
  const { username } = req.session;
  const { sockId } = req.body;
  req.session.sockId = sockId;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/init`, {
      ...req.body,
      username,
      sockId,
    });
  res.sendStatus(200);
});

// browser -> scenario-engine
app.post("/reset", (req, res) => {
  const { username } = req.session;
  const { sockId } = req.body;
  req.session.sockId = sockId;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/reset`, {
      ...req.body,
      username,
      sockId,
    });
  res.sendStatus(200);
});

// browser -> scenario-engine
app.post("/ready", (req, res) => {
  const { username, sockId } = req.session;
  if (scenarioManagerHost)
    axios.post(`${scenarioManagerHost}/ready`, {
      ...req.body,
      username,
      sockId,
    });
  res.sendStatus(200);
});

app.post("/logger", (req, res) => {
  res.sendStatus(200);
});

io.installHandlers(httpServer, { prefix: "/controller" });

io.on("connection", conn => {
  console.log("a user connected");
  broadcastConnections[conn.id] = conn;
  console.log(conn.id);
  console.log(Object.keys(broadcastConnections));
  conn.write(JSON.stringify({ action: "login", sockId: conn.id }));
  conn.on("close", () => {
    axios.post(`${scenarioManagerHost}/close`, {
      sockId: conn.id,
    });
    delete broadcastConnections[conn.id];
    console.log("closed");
  });
});

httpServer.listen(port, () => {
  console.log(`Scenario Manager: ${scenarioManagerHost}`);
  console.log(`browser-speech app listening at ${backendHost}:${port}`);
});

process.once("SIGUSR2", function () {
  process.kill(process.pid, "SIGUSR2");
});
