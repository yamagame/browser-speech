const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ip = require("ip");
import { EventEmitter } from "events";
import { Dora, Node } from "./dora";

const psTree = require("ps-tree");

function kill(pid, signal, callback) {
  signal = signal || "SIGKILL";
  callback = callback || function () {};
  var killTree = true;
  if (killTree) {
    psTree(pid, function (err, children) {
      [pid]
        .concat(
          children.map(function (p) {
            return p.PID;
          })
        )
        .forEach(function (tpid) {
          try {
            process.kill(tpid, signal);
          } catch (ex) {}
        });
      callback();
    });
  } else {
    try {
      process.kill(pid, signal);
    } catch (ex) {}
    callback();
  }
}

export type DoraEngineProps = {
  scenarioDir: string;
  backendHost: string;
  robotServer?: string;
  scenarioHost: string;
  scenarioPort: string;
  commandDir: string;
  loggerHost: string;
};

type Robot = {
  dora: Dora;
  socket: EventEmitter;
  sockId: string;
  next: (res: any) => void;
};

export class DoraEngine {
  options: DoraEngineProps = {
    scenarioDir: "",
    backendHost: "",
    robotServer: "",
    scenarioHost: "",
    scenarioPort: "",
    commandDir: "",
    loggerHost: "",
  };
  robots: { [index: string]: Robot } = {};
  playsnd = {};

  constructor(options: DoraEngineProps) {
    this.options = { ...this.options, ...options };
  }

  async init(username: string, sockId: string) {
    const scenarioPath = filename =>
      path.join(this.options.scenarioDir, filename);

    const {
      backendHost,
      scenarioHost,
      scenarioPort,
      commandDir,
      loggerHost,
      robotServer,
    } = this.options;

    const socket = new EventEmitter();
    socket.addListener("text-to-speech", async (payload, callback) => {
      const { message, action } = payload.params as {
        message: string;
        action: "play" | "stop";
      };
      if (action === "play") {
        if (robotServer) {
          await axios.post(`${robotServer}/speech`, {
            payload: message,
            username,
            sockId,
          });
        } else if (backendHost) {
          await axios.post(`${backendHost}/text-to-speech/start`, {
            utterance: message,
            username,
            sockId,
          });
        }
      }
      if (action === "stop") {
        if (backendHost) {
          await axios.post(`${backendHost}/text-to-speech/stop`, {
            utterance: message,
            username,
            sockId,
          });
        }
      }
      if (this.robots[username]) this.robots[username].next = callback;
    });
    socket.addListener("speech-to-text", async (payload, callback) => {
      const { timeout, action } = payload.params;
      if (action === "play") {
        if (backendHost) {
          await axios.post(`${backendHost}/speech-to-text/start`, {
            username,
            timeout,
            sockId,
          });
        }
      }
      if (action === "stop") {
        if (backendHost) {
          await axios.post(`${backendHost}/speech-to-text/stop`, {
            username,
            timeout,
            sockId,
          });
        }
      }
      if (this.robots[username]) this.robots[username].next = callback;
    });
    socket.addListener("display/image", async (payload, callback) => {
      const { image } = payload.params;
      if (backendHost) {
        await axios.post(`${backendHost}/display/image`, {
          username,
          image,
          sockId,
        });
      }
      if (this.robots[username]) this.robots[username].next = callback;
    });
    socket.addListener("http-request", async (payload, callback) => {
      if (this.robots[username]) this.robots[username].next = callback;
      try {
        await axios.request(payload.request);
      } catch {
        delete this.robots[username].next;
        callback();
      }
    });
    socket.addListener("clear-subtitle", async (payload, callback) => {
      if (backendHost) {
        await axios.post(`${backendHost}/clear-subtitle`, {
          username,
          sockId,
        });
      }
      callback();
    });
    socket.addListener("sound", async (payload, callback) => {
      const { sound, action } = payload.params as {
        sound: string;
        action: "play.async" | "play.sync" | "stop";
      };
      // サウンド停止
      if (action === "stop") {
        const pids = Object.keys(this.playsnd);
        const _playsnd = this.playsnd;
        let count = pids.length;
        if (count > 0) {
          this.playsnd = {};
          pids.forEach(pid => {
            const playone = _playsnd[pid].playone;
            if (playone) {
              kill(playone.pid, "SIGTERM", function () {
                count--;
                if (count <= 0) {
                  if (callback) callback();
                }
              });
            }
          });
        } else {
          if (callback) callback();
        }
        return;
      }
      // サウンド再生
      const cmd = process.platform === "darwin" ? "afplay.sh" : "aplay.sh";
      const playone = spawn(path.join(commandDir, cmd), [scenarioPath(sound)]);
      playone.on("close", () => {
        delete this.playsnd[playone.pid];
        if (action === "play.sync") {
          if (callback) callback();
        }
      });
      this.playsnd[playone.pid] = { playone, sound };
      if (action !== "play.async") {
        if (callback) callback();
      }
    });

    const dora = new Dora();
    this.robots[username] = { dora, socket, sockId, next: () => {} };
    const startScenario = "start.txt";
    const defaults = {};

    let run_scenario = true;

    const res = { username, sockId };
    await axios.post(`${backendHost}/start`, res);

    const play = async ({ startScenario, range, username }, defaults) => {
      function emitError(err) {
        err.info = dora.errorInfo();
        if (!err.info.reason) {
          err.info.reason = err.toString();
        }
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
            applicationType: robotServer !== null ? "robot" : "browser",
            robotServer,
            backendHost,
            scenarioHost,
            scenarioPort,
            ipAddress: ip.address(),
          },
          {
            socket,
            host: `${scenarioHost}:${scenarioPort}`,
            loggerHost,
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
              const res = { username, sockId, ...msg };
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
    if (this.robots[username] && this.robots[username].next) {
      this.robots[username].next({ transcript });
      delete this.robots[username].next;
    }
  }

  ready(username: string) {
    if (this.robots[username] && this.robots[username].next) {
      this.robots[username].next({});
      delete this.robots[username].next;
    }
  }

  button(username: string, action: string) {
    if (this.robots[username] && this.robots[username].next) {
      const { socket, sockId } = this.robots[username];
      if (socket) {
        socket.emit("speech-to-text", {
          params: {
            action: "stop",
            sockId,
          },
        });
      }
      this.robots[username].next({ transcript: `[button.${action}]` });
      delete this.robots[username].next;
    }
  }

  reset(username: string) {
    if (this.robots[username]) {
      delete this.robots[username].next;
      const { robotServer } = this.options;
      if (robotServer) {
        const stop = async () => {
          await axios.post(`${robotServer}/command`, {
            type: "scenario",
            action: "sound-stop",
          });
        };
        stop();
      }
    }
  }
}
