const express = require("express");
const dgram = require("dgram");
const http = require("http");
const port = process.env.PORT || 4200;

const socket = dgram.createSocket("udp4");

const app = express();
const httpServer = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "application/*" }));
app.use(express.text());

app.post("/logger", (req, res) => {
  console.log(JSON.stringify(req.body, null, "  "));
  try {
    const data = JSON.stringify(req.body, null, "  ");
    socket.send(
      data,
      0,
      Buffer.byteLength(data),
      7010,
      "192.168.11.153",
      (err, bytes) => {
        if (err) throw err;
      }
    );
  } catch {}
  res.sendStatus(200);
});

httpServer.listen(port, () => {
  console.log(`log-server app listening at localhost:${port}`);
});
