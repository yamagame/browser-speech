const axios = require("axios");
const fs = require("fs");
const path = require("path");
import { EventEmitter } from "events";
import { Dora, Node } from "./dora";

export type DoraEngineProps = {
  scenarioDir: string;
  backendHost: string;
};

type Robot = {
  dora: Dora;
  socket: EventEmitter;
  next: (res: any) => void;
};

export class DoraEngine {
  options: DoraEngineProps = {
    scenarioDir: "",
    backendHost: "",
  };
  robots: { [index: string]: Robot } = {};

  constructor(options: DoraEngineProps) {
    this.options = { ...this.options, ...options };
  }

  async init(username: string) {
    const scenarioPath = (filename) =>
      path.join(this.options.scenarioDir, filename);

    const { backendHost } = this.options;

    const socket = new EventEmitter();
    socket.addListener("text-to-speech", async (payload, callback) => {
      const { params } = payload;
      if (backendHost) {
        await axios.post(`${backendHost}/text-to-speech`, {
          utterance: params.message,
          username,
        });
      }
      this.robots[username].next = callback;
    });
    socket.addListener("speech-to-text", async (payload, callback) => {
      if (backendHost) {
        await axios.post(`${backendHost}/speech-to-text/start`, {
          username,
        });
      }
      this.robots[username].next = callback;
    });

    const dora = new Dora();
    this.robots[username] = { dora, socket, next: () => {} };
    const startScenario = "start.txt";

    const scenario = fs.readFileSync(scenarioPath(startScenario), "utf8");
    await dora.parse(scenario, startScenario, (filename, callback) => {
      fs.readFile(scenarioPath(filename), (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        callback(data.toString());
      });
    });
    dora.play(
      {
        username,
      },
      {
        socket,
        range: {
          start: 0,
        },
      },
      async (err, msg) => {
        if (err) {
          console.error(err);
          return;
        }
        if (backendHost) {
          await axios.post(`${backendHost}/exit`, { username, ...msg });
        }
      }
    );
  }

  think(username: string, transcript: string) {
    if (this.robots[username].next) this.robots[username].next({ transcript });
  }

  ready(username: string) {
    if (this.robots[username].next) this.robots[username].next({});
  }
}
