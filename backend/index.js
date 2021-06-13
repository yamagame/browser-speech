const express = require("express");
const http = require("http");
const axios = require("axios");
const sockjs = require("sockjs");
const io = sockjs.createServer();

const broadcastConnections = {};
const broadcast = (payload) => {
  for (const id in broadcastConnections) {
    broadcastConnections[id].write(JSON.stringify(payload));
  }
};

const app = express();
const httpServer = http.createServer(app);

const port = process.env.PORT || 4100;
const receiverUrl = process.env.RECEIVER_URL || null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("front"));

app.use((req, res, next) => {
  console.log(req.body);
  next();
});

app.post("/start", (req, res) => {
  res.sendStatus(200);
});

app.post("/stop", (req, res) => {
  res.sendStatus(200);
});

app.post("/speech-to-text/start", (req, res) => {
  broadcast({ action: "speech-to-text/start" });
  res.sendStatus(200);
});

app.post("/speech-to-text/stop", (req, res) => {
  broadcast({ action: "speech-to-text/stop" });
  res.sendStatus(200);
});

app.post("/transcript", (req, res) => {
  if (receiverUrl) axios.post(receiverUrl, req.body);
  res.sendStatus(200);
});

app.post("/text-to-speech", (req, res) => {
  broadcast({ ...req.body, action: "text-to-speech" });
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
  console.log(`receiverUrl: ${receiverUrl}`);
  console.log(`browser-speech app listening at http://localhost:${port}`);
});
