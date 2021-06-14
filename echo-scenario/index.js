const express = require("express");
const axios = require("axios");
const port = process.env.PORT || 5200;
const backendHost = process.env.BACKEND_HOST || null;

const app = express();

app.use((req, res, next) => {
  console.log(req.path);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/init", async (req, res) => {
  console.log(req.body);
  const username = req.body.username;
  await axios.post(`${backendHost}/text-to-speech`, {
    utterance: "ようこそ",
    username,
  });
  res.sendStatus(200);
});

app.post("/recognition", async (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

app.post("/ready", async (req, res) => {
  console.log(req.body);
  const username = req.body.username;
  await axios.post(`${backendHost}/speech-to-text/start`, {
    username,
  });
  res.sendStatus(200);
});

app.post("/transcript", async (req, res) => {
  const username = req.body.username;
  await axios.post(`${backendHost}/text-to-speech`, {
    utterance: req.body.transcript,
    username,
  });
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`echo-scenario app listening at http://localhost:${port}`);
});
