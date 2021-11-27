const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ip = require("ip");
const uuidv4 = require("uuid/v4");
import { EventEmitter } from "events";
import { Dora, Node } from "./dora";

const psTree = require("ps-tree");

function getHash() {
  return uuidv4();
}

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
  next: { callback: (res: any) => void; id: string; key: string }[];
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
    const scenarioPath = filename => path.join(this.options.scenarioDir, filename);

    const { backendHost, scenarioHost, scenarioPort, commandDir, loggerHost, robotServer } =
      this.options;

    const socket = new EventEmitter();
    socket.addListener("text-to-speech", async (payload, callback) => {
      const key = getHash();
      const { message, action } = payload.params as {
        message: string;
        action: "play" | "stop";
      };
      const server = robotServer || backendHost;
      const call = async () => {
        if (action === "play") {
          return await axios.post(`${server}/text-to-speech/start`, {
            payload: message,
            username,
            sockId,
            key,
          });
        }
        if (action === "stop") {
          return await axios.post(`${server}/text-to-speech/stop`, {
            utterance: message,
            username,
            sockId,
            key,
          });
        }
      };
      const res = await call();
      if (robotServer) {
        let status = res.data.status;
        while (status === "NG") {
          const res = await call();
          if (!res) break;
          status = res.data.status;
        }
      }
      if (this.robots[username])
        this.robots[username].next.push({
          callback,
          id: "text-to-speech",
          key,
        });
    });
    socket.addListener("speech-to-text", async (payload, callback) => {
      const key = getHash();
      const { timeout, action } = payload.params;
      if (action === "play") {
        if (backendHost) {
          await axios.post(`${backendHost}/speech-to-text/start`, {
            username,
            timeout,
            sockId,
            key,
          });
        }
      }
      if (action === "stop") {
        if (backendHost) {
          await axios.post(`${backendHost}/speech-to-text/stop`, {
            username,
            timeout,
            sockId,
            key,
          });
        }
      }
      if (this.robots[username])
        this.robots[username].next.push({
          callback,
          id: "speech-to-text",
          key,
        });
    });
    socket.addListener("display/image", async (payload, callback) => {
      const key = getHash();
      const { image } = payload.params;
      if (backendHost) {
        await axios.post(`${backendHost}/display/image`, {
          username,
          image,
          sockId,
          key,
        });
      }
      if (this.robots[username])
        this.robots[username].next.push({
          callback,
          id: "display-image",
          key,
        });
    });
    socket.addListener("http-request", async (payload, callback) => {
      const key = getHash();
      if (this.robots[username])
        this.robots[username].next.push({ callback, id: "http-request", key });
      try {
        const { request } = payload;
        await axios.request({ ...request, data: { ...request.data, key } });
      } catch {
        this.robots[username].next = this.robots[username].next.filter(
          v => v.id !== "http-request" && v.key !== key
        );
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
    socket.addListener("log", async payload => {
      await axios.post(`${backendHost}/log`, {
        payload,
        username,
        sockId,
      });
    });

    const dora = new Dora();
    this.robots[username] = { dora, socket, sockId, next: [] };
    const startScenario = "start.txt";
    const defaults = {};

    let run_scenario = true;

    const res = { username, sockId };
    await axios.post(`${backendHost}/start`, res);

    const play = async ({ startScenario, range, username }, defaults) => {
      async function emitError(err) {
        err.info = dora.errorInfo();
        if (!err.info.reason) {
          err.info.reason = err.toString();
        }
        await axios.post(`${backendHost}/error`, {
          error: {
            ...err.info,
          },
          username,
          sockId,
        });
        run_scenario = false;
      }
      try {
        const scenario = fs.readFileSync(scenarioPath(startScenario), "utf8");
        await dora.parse(scenario, startScenario, (filename, callback) => {
          fs.readFile(scenarioPath(filename), async (err, data) => {
            if (err) {
              await emitError(err);
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
              await emitError(err);
              if (err.info) {
                if (err.info.lineNumber >= 1) {
                  console.log(
                    `${err.info.lineNumber}行目でエラーが発生しました。\n\n${err.info.code}\n\n${err.info.reason}`
                  );
                } else {
                  console.log(`エラーが発生しました。\n\n${err.info.code}\n\n${err.info.reason}`);
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

  think(username: string, key: string, transcript: string) {
    if (this.robots[username] && this.robots[username].next.length > 0) {
      this.robots[username].next.forEach(v => v.callback({ transcript }));
      this.robots[username].next = [];
    }
  }

  ready(username: string, key: string) {
    console.log(`${username} ${key}`);
    if (this.robots[username] && this.robots[username].next.length > 0) {
      const next = this.robots[username].next;
      if (key) {
        next.filter(v => v.key === key).forEach(v => v.callback({}));
        this.robots[username].next = next.filter(v => v.key !== key);
      } else {
        next.forEach(v => v.callback({}));
        this.robots[username].next = [];
      }
    }
  }

  button(username: string, key: string, action: string) {
    if (this.robots[username] && this.robots[username].next.length > 0) {
      const next = this.robots[username].next;
      next
        .filter(v => v.id !== "text-to-speech")
        .forEach(v =>
          v.callback({
            transcript: `[button.${action}]`,
          })
        );
      this.robots[username].next = next.filter(v => v.id === "text-to-speech");
    }
  }

  reset(username: string, key: string) {
    if (this.robots[username]) {
      this.robots[username].next = [];
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
