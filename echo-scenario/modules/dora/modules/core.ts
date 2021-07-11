import { Node } from "../";
const utils = require("../libs/utils");

const EmitTextToSpeech = (node: Node, msg, message) => {
  const { socket } = node.flow.options;
  delete msg.slot;
  delete msg.match;
  const params: {
    speed?;
    volume?;
    voice?;
    languageCode?;
    audioEncoding?;
    ssmlGender?;
    speakingRate?;
    pitch?;
    name?;
    host?;
    voiceId?;
  } = {};
  if (typeof msg.speech !== "undefined") {
    //aquesTalk Pi向けパラメータ
    if (typeof msg.speech.speed !== "undefined") {
      params.speed = msg.speech.speed;
    }
    if (typeof msg.speech.volume !== "undefined") {
      params.volume = msg.speech.volume;
    }
    if (typeof msg.speech.voice !== "undefined") {
      params.voice = msg.speech.voice;
    }
    //google text-to-speech向けパラメータ
    if (typeof msg.speech.languageCode !== "undefined") {
      params.languageCode = msg.speech.languageCode;
    }
    if (typeof msg.speech.audioEncoding !== "undefined") {
      params.audioEncoding = msg.speech.audioEncoding;
    }
    if (typeof msg.speech.gender !== "undefined") {
      params.ssmlGender = msg.speech.gender;
    }
    if (typeof msg.speech.rate !== "undefined") {
      params.speakingRate = msg.speech.rate;
    }
    if (typeof msg.speech.pitch !== "undefined") {
      params.pitch = msg.speech.pitch;
    }
    if (typeof msg.speech.name !== "undefined") {
      params.name = msg.speech.name;
    }
    if (typeof msg.speech.host !== "undefined") {
      params.host = msg.speech.host;
    }
    //AWS Polly向けパラメータ
    if (typeof msg.speech.voiceId !== "undefined") {
      params.voiceId = msg.speech.voiceId;
    }
  }
  if (msg.silence) {
    if (msg.payload !== "") {
      msg.payload += "\n";
    }
    msg.payload += message;
    node.send(msg);
  } else if (message === "") {
    msg.payload = message;
    node.send(msg);
  } else {
    socket.emit(
      "text-to-speech",
      {
        msg,
        params: {
          action: "play",
          message,
          ...params,
          ...node.credential(),
        },
        node,
      },
      (res) => {
        if (!node.isAlive()) return;
        msg.payload = message;
        node.send(msg);
      }
    );
  }
};

export const Core = function (DORA, config = {}) {
  /*
   *
   *
   */
  function CoreLog(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const { socket } = node.flow.options;
      let logstr = "";
      logstr += "";
      try {
        var message = options || JSON.stringify(msg, null, "  ");
        if (isTemplated) {
          message = utils.mustache.render(message, msg);
        }
        logstr += message;
      } catch (err) {
        logstr += options;
      }
      console.log(`log-->\n${logstr}\n<--log`);
      utils.logMessage(node, socket, logstr);
      node.send(msg);
    });
  }
  DORA.registerType("log", CoreLog);

  /*
   *
   *
   */
  function CoreError(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", function (msg) {
      var message = options || msg.payload;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      node.err(new Error(message));
    });
  }
  DORA.registerType("error", CoreError);

  /*
   *
   *
   */
  function CoreComment(node, options) {
    node.on("input", function (msg) {
      node.send(msg);
    });
  }
  DORA.registerType("comment", CoreComment);

  /*
   *
   *
   */
  function CoreLabel(node, options) {
    const p = options.split("/");
    const name = p[0];
    const args = p.slice(1);
    const m = name.match(/^\:(.+)/);
    node.labelName = name;
    if (m) {
      node.labelName = m[1];
    }
    node.on("input", function (msg) {
      if (typeof this.flow.labels[node.labelName] === "undefined") {
        this.flow.labels[node.labelName] = 0;
      }
      if (typeof msg.labels[node.labelName] !== "undefined") {
        this.flow.labels[node.labelName] = msg.labels[node.labelName];
      }
      this.flow.labels[node.labelName]++;
      msg.labels = this.flow.labels;
      node.send(msg);
    });
  }
  DORA.registerType("label", CoreLabel);

  /*
   * /if/こんにちは/:label
   * payload に指定した文字が含まれていれば label へ移動
   */
  function CoreIf(node, options) {
    const params = options.split("/");
    var string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", function (msg) {
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (
        typeof msg.payload !== "undefined" &&
        msg.payload
          .toString()
          .toLowerCase()
          .indexOf(message.trim().toLowerCase()) >= 0
      ) {
        node.jump(msg);
      } else {
        node.next(msg);
      }
    });
  }
  DORA.registerType("if", CoreIf);

  /*
   * /goto/:label
   * label へ移動
   */
  function CoreGoto(node, options) {
    if (node.nextLabel(options).length <= 0)
      throw new Error("ラベルを指定してください。");
    node.on("input", function (msg) {
      node.jump(msg);
    });
  }
  DORA.registerType("goto", CoreGoto);

  /*
   *
   *
   */
  function CoreGosub(node, options) {
    if (node.nextLabel(options).length <= 0)
      throw new Error("ラベルを指定してください。");
    node.on("input", function (msg, stack) {
      stack.push(node.wires[node.wires.length - 1]);
      node.jump(msg);
    });
  }
  DORA.registerType("gosub", CoreGosub);

  /*
   *
   *
   */
  function CoreReturn(node, options) {
    node.on("input", function (msg, stack) {
      if (stack.length <= 0) {
        return node.err(new Error("gosubが呼ばれていません"));
      }
      node.wires = [stack.pop()];
      node.send(msg);
    });
  }
  DORA.registerType("return", CoreReturn);

  /*
   *  ランダムに遷移
   *  /goto.random/:A/:B/:C
   */
  function CoreGotoRandom(node, options) {
    if (node.nextLabel(options).length <= 0)
      throw new Error("ラベルを指定してください。");
    node._counter = 0;
    node.on("input", function (msg) {
      if (node._counter === 0) {
        node._randtable = node.wires
          .slice(0, node.wires.length - 1)
          .map((_, i) => {
            return i;
          });
        for (var i = 0; i < node.wires.length * 3; i++) {
          const a = utils.randInteger(0, node.wires.length - 1);
          const b = utils.randInteger(0, node.wires.length - 1);
          const c = node._randtable[a];
          node._randtable[a] = node._randtable[b];
          node._randtable[b] = c;
        }
      }
      const n = node._randtable[node._counter];
      const t = node.wires.map((v) => {
        return null;
      });
      t[n] = msg;
      node._counter++;
      if (node._counter >= node.wires.length - 1) {
        node._counter = 0;
      }
      node.send(t);
    });
  }
  DORA.registerType("goto.random", CoreGotoRandom);

  /*
   *  ラベル順に遷移
   *  /goto.sequence/:A/:B/:C
   */
  function CoreGotoSequence(node, options) {
    if (node.nextLabel(options).length <= 0)
      throw new Error("ラベルを指定してください。");
    node._counter = 0;
    node.on("input", function (msg) {
      const t = node.wires.map((v) => {
        return null;
      });
      t[node._counter] = msg;
      node._counter++;
      if (node._counter >= node.wires.length - 1) {
        node._counter = 0;
      }
      node.send(t);
    });
  }
  DORA.registerType("goto.sequence", CoreGotoSequence);

  /*
   *
   *
   */
  function CoreDelay(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      let rate =
        typeof msg.defaultInterval === "undefined"
          ? 1
          : parseFloat(msg.defaultInterval);
      let delay = options;
      if (isTemplated) {
        delay = utils.mustache.render(delay, msg);
      }
      if (msg.silence) {
        msg.payload += "\n";
      } else {
        if (delay === "0") {
          await utils.timeout(1000 * rate);
        } else {
          await utils.timeout(1000 * parseFloat(delay) * rate);
        }
      }
      node.send(msg);
    });
  }
  DORA.registerType("delay", CoreDelay);

  /*
   *
   *
   */
  function CoreEnd(node, options) {
    node.on("input", function (msg) {
      node.end(null, msg);
    });
  }
  DORA.registerType("end", CoreEnd);

  /*
   *
   *
   */
  function Sound(action: "play.async" | "play.sync" | "stop") {
    return function (node: Node, options) {
      const isTemplated = (options || "").indexOf("{{") != -1;
      node.on("input", async function (msg) {
        const { socket } = node.flow.options;
        let message = options;
        if (isTemplated) {
          message = DORA.utils.mustache.render(message, msg);
        }
        socket.emit(
          "sound",
          {
            msg,
            params: {
              action,
              sound: message,
              ...this.credential(),
            },
            node,
          },
          (res) => {
            if (!node.isAlive()) return;
            node.send(msg);
          }
        );
      });
    };
  }
  DORA.registerType("sound", Sound("play.sync"));
  DORA.registerType("sound.sync", Sound("play.sync"));
  DORA.registerType("sound.stop", Sound("stop"));

  /*
   *
   *
   */
  function CoreSet(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    const p = options.split("/");
    const field = p[0].split(".").filter((v) => v !== "");
    if (p.length < 2) {
      throw new Error("パラメータがありません。");
    }
    node.on("input", async function (msg) {
      let t = msg;
      let key = null;
      let v = msg;
      field.forEach((f) => {
        if (typeof t === "undefined" || typeof t !== "object") {
          v[key] = {};
          t = v[key];
        }
        key = f;
        v = t;
        t = t[f];
      });
      if (typeof v !== "undefined" && typeof key !== "undefined") {
        const val = (v) => {
          if (utils.isNumeric(v)) {
            if (v.indexOf(".") >= 0) {
              return parseFloat(v);
            } else {
              return parseInt(v);
            }
          }
          if (isTemplated) {
            v = utils.mustache.render(v, msg);
          }
          return v;
        };
        v[key] = val(p.slice(1).join("/"));
      }
      if (msg.labels) {
        Object.keys(msg.labels).forEach((key) => {
          const v = msg.labels[key];
          this.flow.labels[key] = v;
        });
      }
      node.send(msg);
    });
  }
  DORA.registerType("set", CoreSet);

  /*
   *
   *
   */
  function CoreSetString(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    const p = options.split("/");
    const field = p[0].split(".").filter((v) => v !== "");
    if (p.length < 2) {
      throw new Error("パラメータがありません。");
    }
    node.on("input", async function (msg) {
      let t = msg;
      let key = null;
      let v = msg;
      field.forEach((f) => {
        if (typeof t === "undefined" || typeof t !== "object") {
          v[key] = {};
          t = v[key];
        }
        key = f;
        v = t;
        t = t[f];
      });
      if (typeof v !== "undefined" && typeof key !== "undefined") {
        let message = p.slice(1).join("/");
        if (isTemplated) {
          message = utils.mustache.render(message, msg);
        }
        v[key] = message;
      }
      if (msg.labels) {
        Object.keys(msg.labels).forEach((key) => {
          const v = msg.labels[key];
          this.flow.labels[key] = v;
        });
      }
      node.send(msg);
    });
  }
  DORA.registerType("set.string", CoreSetString);

  /*
   *
   *
   */
  function CoreSetNumber(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    const p = options.split("/");
    const field = p[0].split(".").filter((v) => v !== "");
    if (p.length < 2) {
      throw new Error("パラメータがありません。");
    }
    node.on("input", async function (msg) {
      let t = msg;
      let key = null;
      let v = msg;
      field.forEach((f) => {
        if (typeof t === "undefined" || typeof t !== "object") {
          v[key] = {};
          t = v[key];
        }
        key = f;
        v = t;
        t = t[f];
      });
      if (typeof v !== "undefined" && typeof key !== "undefined") {
        const val = (v) => {
          if (utils.isNumeric(v)) {
            if (v.indexOf(".") >= 0) {
              return parseFloat(v);
            } else {
              return parseInt(v);
            }
          }
          node.err(new Error("数字ではありません。"));
        };
        let message = p.slice(1).join("/");
        if (isTemplated) {
          message = utils.mustache.render(message, msg);
        }
        v[key] = val(message);
      }
      if (msg.labels) {
        Object.keys(msg.labels).forEach((key) => {
          const v = msg.labels[key];
          this.flow.labels[key] = v;
        });
      }
      node.send(msg);
    });
  }
  DORA.registerType("set.number", CoreSetNumber);

  /*
   *
   *
   */
  function CoreGet(node, options) {
    const p = options.split("/");
    const field = p[0].split(".");
    node.on("input", async function (msg) {
      let t = msg;
      field.forEach((f) => {
        if (f !== "") {
          if (typeof t !== "undefined") {
            t = t[f];
          }
        }
      });
      if (typeof t !== "undefined") {
        msg.payload = t;
      }
      node.send(msg);
    });
  }
  DORA.registerType("get", CoreGet);

  /*
   *
   *
   */
  function CoreChange(node, options) {
    const params = options.split("/");
    if (params.length < 2) {
      throw new Error("パラメータがありません。");
    }
    const isTemplated1 = (params[0] || "").indexOf("{{") != -1;
    const isTemplated2 = (params[1] || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      let p1 = params[0];
      let p2 = params[1];
      if (isTemplated1) {
        p1 = utils.mustache.render(p1, msg);
      }
      if (isTemplated2) {
        p2 = utils.mustache.render(p2, msg);
      }
      if (p1.indexOf(".") == 0) {
        p1 = p1.slice(1);
      }
      if (p2.indexOf(".") == 0) {
        p2 = p2.slice(1);
      }
      const getField = (msg, field) => {
        let val = msg;
        let key = null;
        field.split(".").forEach((f) => {
          if (key) {
            if (
              typeof val[key] === "undefined" ||
              typeof val[key] !== "object"
            ) {
              val[key] = {};
            }
            val = val[key];
          }
          key = f;
        });
        return { val, key };
      };
      const v1 = getField(msg, p1);
      const v2 = getField(msg, p2);
      if (v1 && v2) {
        v1.val[v1.key] = utils.clone(v2.val[v2.key]);
      }
      node.send(msg);
    });
  }
  DORA.registerType("change", CoreChange);

  /*
   *
   *
   */
  function TextToSpeech(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const { socket } = node.flow.options;
      var message = options || msg.payload;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      EmitTextToSpeech(node, msg, message);
    });
  }
  DORA.registerType("text-to-speech", TextToSpeech);

  /*
   * ランダムに発話
   * /text-to-speech.random/こんにちは/ヤッホー/こんちわー
   */
  function SpeechRandom(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node._counter = 0;
    node.on("input", async function (msg) {
      let message = options || "";
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      const params = message.split("/");
      if (node._counter === 0) {
        node._randtable = new Array(params.length).fill(0).map((_, i) => i);
        for (var i = 0; i < params.length * 3; i++) {
          const a = utils.randInteger(0, params.length);
          const b = utils.randInteger(0, params.length);
          const c = node._randtable[a];
          node._randtable[a] = node._randtable[b];
          node._randtable[b] = c;
        }
      }
      message = params[node._randtable[node._counter]];
      node._counter++;
      if (node._counter >= params.length) {
        node._counter = 0;
      }
      EmitTextToSpeech(node, msg, message);
    });
  }
  DORA.registerType("text-to-speech.random", SpeechRandom);

  /*
   *
   *
   */
  function SpeechToText(node: Node, options) {
    node.nextLabel(options);
    node.on("input", function (msg) {
      const { socket } = node.flow.options;
      const params: {
        timeout?;
        sensitivity?;
        level?;
        languageCode?;
        alternativeLanguageCodes?;
      } = {
        timeout: 15000,
        sensitivity: "keep",
        level: "keep",
      };
      if (typeof msg.timeout !== "undefined") {
        params.timeout = msg.timeout;
      }
      if (typeof msg.sensitivity !== "undefined") {
        params.sensitivity = msg.sensitivity;
      }
      if (typeof msg.voice !== "undefined") {
        if (typeof msg.voice.timeout !== "undefined") {
          params.timeout = msg.voice.timeout;
        }
        if (typeof msg.voice.sensitivity !== "undefined") {
          params.sensitivity = msg.voice.sensitivity;
        }
        if (typeof msg.voice.level !== "undefined") {
          params.level = msg.voice.level;
        }
        if (typeof msg.voice.languageCode !== "undefined") {
          params.languageCode = msg.voice.languageCode.split("/");
        }
        if (typeof msg.voice.alternativeLanguageCodes !== "undefined") {
          params.alternativeLanguageCodes =
            msg.voice.alternativeLanguageCodes.split("/");
        }
      }
      node.recording = true;
      socket.emit(
        "speech-to-text",
        {
          msg,
          params: {
            action: "play",
            ...params,
            ...this.credential(),
          },
          node,
        },
        (res) => {
          if (!node.recording) return;
          if (!node.isAlive()) return;
          node.recording = false;
          if (res == "[timeout]") {
            msg.payload = "timeout";
            node.send(msg);
          } else if (res == "[canceled]") {
            msg.payload = "canceled";
            node.send(msg);
          } else if (res == "[camera]") {
            msg.payload = "camera";
            node.send(msg);
          } else {
            if (res.button) {
              msg.payload = "button";
              msg.button = res;
              delete res.button;
              node.send(msg);
            } else if (res.gamepad) {
              msg.payload = "gamepad";
              msg.gamepad = res;
              delete res.gamepad;
              node.send(msg);
            } else if (res.speechRequest) {
              msg.speechRequest = true;
              msg.payload = res.payload;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              node.next(msg);
            } else if (typeof res === "object") {
              (msg.languageCode = res.languageCode),
                (msg.confidence = res.confidence);
              msg.payload = res.transcript;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              delete msg.speechRequest;
              node.next(msg);
            } else {
              msg.payload = res;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              delete msg.speechRequest;
              node.next(msg);
            }
          }
        }
      );
    });
  }
  DORA.registerType("speech-to-text", SpeechToText);

  /*
   *
   *
   */
  function WaitEvent(node: Node, options) {
    node.nextLabel(options);
    node.on("input", function (msg) {
      const { socket } = node.flow.options;
      const params: { timeout?; sensitivity?; recording? } = {
        timeout: 0,
        sensitivity: "keep",
      };
      if (
        typeof msg.waitevent !== "undefined" &&
        typeof msg.waitevent.timeout !== "undefined"
      ) {
        params.timeout = msg.waitevent.timeout;
      }
      params.recording = false;
      node.recording = true;
      socket.emit(
        "speech-to-text",
        {
          msg,
          params: {
            action: "play",
            ...params,
            ...this.credential(),
          },
          node,
        },
        (res) => {
          if (!node.recording) return;
          if (!node.isAlive()) return;
          node.recording = false;
          if (res == "[timeout]") {
            msg.payload = "timeout";
            node.send(msg);
          } else if (res == "[canceled]") {
            msg.payload = "canceled";
            node.send(msg);
          } else if (res == "[camera]") {
            msg.payload = "camera";
            node.send(msg);
          } else {
            if (res.button) {
              msg.payload = "button";
              msg.button = res;
              delete res.button;
              node.send(msg);
            } else if (res.gamepad) {
              msg.payload = "gamepad";
              msg.gamepad = res;
              delete res.gamepad;
              node.send(msg);
            } else if (res.speechRequest) {
              msg.speechRequest = true;
              msg.payload = res.payload;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              node.next(msg);
            } else if (typeof res === "object") {
              (msg.languageCode = res.languageCode),
                (msg.confidence = res.confidence);
              msg.payload = res.transcript;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              delete msg.speechRequest;
              node.next(msg);
            } else {
              msg.payload = res;
              msg.speechText = msg.payload;
              msg.topicPriority = 0;
              delete msg.speechRequest;
              node.next(msg);
            }
          }
        }
      );
    });
  }
  DORA.registerType("wait-event", WaitEvent);

  /*
   *
   *
   */
  function SpeechStop(node: Node, options) {
    node.on("input", function (msg) {
      const { socket } = node.flow.options;
      socket.emit(
        "text-to-speech",
        {
          msg,
          params: {
            action: "stop",
            ...this.credential(),
          },
          node,
        },
        (res) => {
          if (!node.isAlive()) return;
          node.next(msg);
        }
      );
    });
  }
  DORA.registerType("speech.stop", SpeechStop);

  /*
   *
   *
   */
  function Join(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", function (msg) {
      const { socket } = node.flow.options;
      var option = options;
      if (isTemplated) {
        option = utils.mustache.render(option, msg);
      }
      socket.emit(
        "text-to-speech",
        {
          msg,
          params: {
            action: "stop",
            ...this.credential(),
            option,
          },
          node,
        },
        (res) => {
          if (!node.isAlive()) return;
          node.join();
          node.next(msg);
        }
      );
    });
  }
  DORA.registerType("join", Join);

  /*
   *
   *
   */
  function CoreSwitch(node, options) {
    const params = options.split("/");
    var string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    } else {
      node.nextLabel(string);
    }
    node.on("input", function (msg) {
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (typeof msg.payload === "undefined") msg.payload = "";
      if (
        message.trim().toLowerCase() ==
        msg.payload.toString().trim().toLowerCase()
      ) {
        node.jump(msg);
      } else {
        node.next(msg);
      }
    });
  }
  DORA.registerType("switch", CoreSwitch);

  /*
   *
   *
   */
  function CorePayload(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", function (msg) {
      var message = options || msg.payload;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      msg.payload = message;
      node.send(msg);
    });
  }
  DORA.registerType("payload", CorePayload);

  /*
   *
   *
   */
  function CoreCall(node, options) {
    node.options = options;
    node.on("input", async function (msg) {
      const opt: { range? } = {};
      Object.keys(node.flow.options).forEach((key) => {
        opt[key] = node.flow.options[key];
      });
      opt.range = {
        start: 0,
      };
      const dora = await node.dora();
      dora.play(msg, opt, (err, msg) => {
        if (err) node.err(new Error("再生エラー。"));
        if (!node.isAlive()) return;
        node.send(msg);
      });
    });
  }
  DORA.registerType("call", CoreCall);

  /*
   *
   *
   */
  function CoreExec(node, options) {
    node.on("input", function (msg) {
      var script = options;
      //eval(script);
      node.send(msg);
    });
  }
  DORA.registerType("exec", CoreExec);

  /*
   *
   *
   */
  function CoreEval(node, options) {
    node.on("input", function (msg) {
      node.flow.engine.eval(node, msg, {}, (err, msg) => {
        node.send(msg);
      });
    });
  }
  DORA.registerType("eval", CoreEval);

  /*
   *
   *
   */
  function Run(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      if (!node.isAlive()) return;
      let nextscript = options || msg.payload;
      if (isTemplated) {
        nextscript = utils.mustache.render(nextscript, msg);
      }
      nextscript = nextscript.trim();
      //console.log(`nextscript ${nextscript}`);
      if (nextscript.indexOf("http") == 0) {
        const res = await node.flow.request({
          type: "scenario",
          action: "load",
          uri: nextscript,
          username: msg.username,
        });
        //console.log(`res ${JSON.stringify(res)}`);
        msg._nextscript = res.next_script;
      } else {
        msg._nextscript = nextscript;
      }
      node.end(null, msg);
    });
  }
  DORA.registerType("run", Run);

  /*
   * 値を変換する
   *
   */
  function Convert(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      let message = options || msg.payload;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (typeof message !== "undefined") {
        let p = message.toString().split("/");
        let command = p.shift();
        message = p.join("/");
        if (command === "encodeURIComponent") {
          msg.payload = encodeURIComponent(message);
        }
        if (command === "decodeURIComponent") {
          msg.payload = decodeURIComponent(message);
        }
      }
      node.next(msg);
    });
  }
  DORA.registerType("convert", Convert);

  /*
   * 設定値のセーブ
   *
   */
  function Save(node, options) {
    const p = options ? options.split("/") : [];
    let field = p.length > 0 ? p[0].split(".") : [];
    if (p.length < 1) {
      field = ["defaults"];
    }
    node.on("input", async function (msg) {
      let t = msg;
      field.forEach((f) => {
        if (f !== "") {
          if (typeof t !== "undefined") {
            t = t[f];
          }
        }
      });
      if (typeof t !== "undefined") {
        await node.flow.request({
          type: "save",
          action: "defaults",
          data: t,
        });
      }
      node.next(msg);
    });
  }
  DORA.registerType("save", Save);

  /*
   * 設定値のロード
   *
   */
  function Load(node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    const p = options ? options.split("/") : [];
    let field = p.length > 0 ? p[0].split(".").filter((v) => v !== "") : [];
    if (p.length < 1) {
      field = ["defaults"];
    }
    node.on("input", async function (msg) {
      const response = await node.flow.request({
        type: "load",
        action: "defaults",
      });
      let t = msg;
      let key = null;
      let v = msg;
      field.forEach((f) => {
        if (typeof t === "undefined" || typeof t !== "object") {
          v[key] = {};
          t = v[key];
        }
        key = f;
        v = t;
        t = t[f];
      });
      if (typeof v !== "undefined" && typeof key !== "undefined") {
        v[key] = response.data;
      }
      if (msg.labels) {
        Object.keys(msg.labels).forEach((key) => {
          const v = msg.labels[key];
          this.flow.labels[key] = v;
        });
      }
      node.next(msg);
    });
  }
  DORA.registerType("load", Load);

  /**
   *
   *
   */
  function CommmandFunc(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const { socket } = node.flow.options;
      let command = options || msg.payload;
      if (isTemplated) {
        command = utils.mustache.render(command, msg);
      }
      if (typeof command !== "undefined") {
        socket.emit(
          "command",
          {
            msg,
            params: {
              command,
              ...this.credential(),
            },
            node,
          },
          (res) => {
            if (!node.isAlive()) return;
            node.next(msg);
          }
        );
      } else {
        node.next(msg);
      }
    });
  }
  DORA.registerType("command", CommmandFunc);

  /*
   * 音声認識のタイムアウト値(秒)を指定する
   * /timeout/3
   */
  function Timeout(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const val = (v) => {
        if (utils.isNumeric(v)) {
          if (v.indexOf(".") >= 0) {
            return parseFloat(v);
          } else {
            return parseInt(v);
          }
        }
        node.err(new Error("タイムアウトの値が数字ではありません。"));
      };
      let message = options;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      msg.timeout = val(message);
      node.next(msg);
    });
  }
  DORA.registerType("timeout", Timeout);

  /*
   * 画像表示
   * /image/"http://localhost:3000/img/picture.png"
   * /image/"img/picture.png"
   */
  function Image(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const { socket, host } = node.flow.options;
      let message = options;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (![/^http.+/, /^:.+/, /^\/\/.+/].some((re) => message.match(re))) {
        message = `${host}/${message}`;
      }
      socket.emit(
        "display/image",
        {
          msg,
          params: {
            image: {
              src: message,
            },
            ...this.credential(),
          },
          node,
        },
        (res) => {}
      );
      node.next(msg);
    });
  }
  DORA.registerType("image", Image);

  /*
   *  /loop/.counter/:LOOP
   *  カウンタが0になるまでLOOPへ
   */
  function Loop(node: Node, options) {
    const params = options.split("/");
    const field = params[0].split(".").filter((v) => v !== "");
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", async function (msg) {
      const result = node.getField(msg, field);
      if (result !== null) {
        const { object, key } = result;
        object[key] = parseInt(object[key]) - 1;
        if (object[key] > 0) {
          node.jump(msg);
          return;
        }
      }
      node.next(msg);
    });
  }
  DORA.registerType("loop", Loop);
};
