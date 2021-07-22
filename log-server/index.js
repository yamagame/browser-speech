const express = require("express");
const dgram = require("dgram");
const http = require("http");
const port = process.env.PORT || 4200;
const TARGET_PORT = process.env.TARGET_PORT || 7010;
const TARGET_HOST = process.env.TARGET_HOST || "";

const socket = dgram.createSocket("udp4");

const app = express();
const httpServer = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "application/*" }));
app.use(express.text());

app.post("/logger", (req, res) => {
  console.log(JSON.stringify(req.body, null, "  "));
  if (TARGET_HOST) {
    try {
      const data = JSON.stringify(req.body, null, "  ");
      socket.send(
        data,
        0,
        Buffer.byteLength(data),
        TARGET_PORT,
        TARGET_HOST,
        (err, bytes) => {
          if (err) throw err;
        }
      );
    } catch (err) {
      console.error(err);
    }
  }
  res.sendStatus(200);
});

httpServer.listen(port, () => {
  console.log(`log-server app listening at localhost:${port}`);
});
