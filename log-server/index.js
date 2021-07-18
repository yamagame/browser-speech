const express = require("express");
const http = require("http");
const port = process.env.PORT || 4200;

const app = express();
const httpServer = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "application/*" }));
app.use(express.text());

app.post("/logger", (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

httpServer.listen(port, () => {
  console.log(`log-server app listening at localhost:${port}`);
});
