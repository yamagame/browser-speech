const axios = require("axios");
const fs = require("fs");
const path = require("path");
import { EventEmitter } from "events";
import { Dora, Node } from "./dora";

export type DoraEngineProps = {
  scenarioDir: string;
  backendHost: string;
  scenarioHost: string;
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
    scenarioHost: "",
  };
  robots: { [index: string]: Robot } = {};

  constructor(options: DoraEngineProps) {
    this.options = { ...this.options, ...options };
  }

  async init(username: string) {
    const scenarioPath = (filename) =>
      path.join(this.options.scenarioDir, filename);

    const { backendHost, scenarioHost } = this.options;

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
      const { timeout } = payload.params;
      if (backendHost) {
        await axios.post(`${backendHost}/speech-to-text/start`, {
          username,
          timeout,
        });
      }
      this.robots[username].next = callback;
    });
    socket.addListener("display/image", async (payload, callback) => {
      const { image } = payload.params;
      if (backendHost) {
        await axios.post(`${backendHost}/display/image`, {
          username,
          image,
        });
      }
      this.robots[username].next = callback;
    });

    const dora = new Dora();
    this.robots[username] = { dora, socket, next: () => {} };
    const startScenario = "start.txt";
    const defaults = {};

    let run_scenario = true;

    const res = { username };
    await axios.post(`${backendHost}/start`, res);

    const play = async ({ startScenario, range, username }, defaults) => {
      function emitError(err) {
        err.info = dora.errorInfo();
        if (!err.info.reason) {
          err.info.reason = err.toString();
        }
        console.log(err.info);
        run_scenario = false;
      }
      try {
        const scenario = fs.readFileSync(scenarioPath(startScenario), "utf8");
        await dora.parse(scenario, startScenario, (filename, callback) => {
          fs.readFile(scenarioPath(filename), (err, data) => {
            if (err) {
              emitError(err);
              return;
            }
            callback(data.toString());
          });
        });
        dora.play(
          {
            username,
            scenarioDir: this.options.scenarioDir,
          },
          {
            socket,
            host: scenarioHost,
            range,
            defaults,
          },
          async (err, msg) => {
            if (err) {
              emitError(err);
              if (err.info) {
                if (err.info.lineNumber >= 1) {
                  console.log(
                    `${err.info.lineNumber}行目でエラーが発生しました。\n\n${err.info.code}\n\n${err.info.reason}`
                  );
                } else {
                  console.log(
                    `エラーが発生しました。\n\n${err.info.code}\n\n${err.info.reason}`
                  );
                }
              } else {
                console.log(`エラーが発生しました。\n\n`);
              }
              run_scenario = false;
              return;
            }
            if (typeof msg._nextscript !== "undefined") {
              if (run_scenario) {
                play(
                  {
                    startScenario: msg._nextscript,
                    range: { start: 0 },
                    username,
                  },
                  defaults
                );
              }
            } else if (backendHost) {
              const res = { username, ...msg };
              console.log(JSON.stringify(res, null, "  "));
              await axios.post(`${backendHost}/exit`, res);
            }
          }
        );
      } catch (err) {
        emitError(err);
      }
    };

    dora.request = async (command, options, params) => {
      console.log(command);
    };

    await play(
      {
        startScenario,
        range: {
          start: 0,
        },
        username,
      },
      defaults
    );
  }

  think(username: string, transcript: string) {
    if (this.robots[username].next) this.robots[username].next({ transcript });
  }

  ready(username: string) {
    if (this.robots[username].next) this.robots[username].next({});
  }
}
