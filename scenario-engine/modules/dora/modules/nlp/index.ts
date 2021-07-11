const fetch = require("node-fetch");
import { Node } from "../../";
const utils = require("../../libs/utils");
const { vegetables, building, structure, hospital, house } = require("./words");
const { TextKan2Num } = require("./kan2num");
const { familyNames } = require("./names");

const slotPattern = {
  名前: [
    ...familyNames
      .map((d) => d.slice(1))
      .sort((a, b) => {
        return b[0].length - a[0].length;
      }),
  ],
  年: [/(\d+)年/],
  月: [/(\d+)月/],
  日: [/(\d+)日/],
  曜日: [/([日月火水木金土])曜/],
  歳: [/(\d+)/],
  桜: [/(桜)/, /(さくら)/],
  猫: [/(猫)/, /(ねこ)/],
  電車: [/(電車)/],
  梅: [/(梅)/],
  犬: [/(犬)/],
  自動車: [/(自動車)/],
  数字: [/(\d+)/],
  "２８６": [/(286)/],
  "９２５３": [/(9253)/],
  時計: [/(時計)/, /(OK)/, /(おけい)/],
  くし: [/(くし)/, /(福祉)/, /(牛)/, /(節)/, /(寿司)/],
  はさみ: [/(はさみ)/],
  タバコ: [/(タバコ)/, /(たばこ)/],
  ボールペン: [/(ボールペン)/],
  場所: [...building, ...structure, ...hospital, ...house].sort((a, b) => {
    return b.length - a.length;
  }),
  野菜: [...vegetables],
};

const convertMatchString = (transcript, re, slot) => {
  if (slot === "歳") {
    transcript = TextKan2Num(transcript);
  }
  if (Array.isArray(re)) {
    const match = re[0];
    for (let i = 0; i < re.length; i++) {
      const result = convertMatchString(transcript, re[i], slot);
      if (result) {
        result.match = match;
        return result;
      }
    }
    return null;
  }
  if (typeof re === "string") {
    const index = transcript.indexOf(re);
    if (index >= 0) {
      return {
        date: new Date(),
        org: transcript,
        match: re,
        index,
        slot,
      };
    }
    return null;
  }
  const match = transcript.match(re);
  if (!match) return null;
  return {
    date: new Date(),
    org: match[0],
    match: match[1],
    index: match.index,
    slot,
  };
};

const prepare = (msg) => {
  if (!msg.nlp) msg.nlp = {};
  if (!msg.nlp.slot) msg.nlp.slot = {};
  if (!msg.nlp.store) msg.nlp.store = {};
};

const getSlot = (msg, options, isTemplated = false) => {
  let slot = "";
  let pattern = [];
  try {
    const params = options.split("/");
    const string = params[0];
    let message = string;
    if (isTemplated) {
      message = utils.mustache.render(message, msg);
    }
    if (params.length > 1) {
      if (params[1].trim() === "数字") {
        pattern = [...slotPattern["数字"]];
      }
    }
    slot = message;
  } catch (err) {
    slot = options;
  }
  if (!msg.nlp.slot[slot]) msg.nlp.slot[slot] = [];
  if (slotPattern[slot]) pattern = [...pattern, ...slotPattern[slot]];
  if (pattern.length > 0) {
    const foundMatch = pattern
      .map((re) => {
        return convertMatchString(msg.payload.toString(), re, slot);
      })
      .filter((item) => item != null);
    if (foundMatch.length > 0) {
      msg.nlp.slot[slot] = [...msg.nlp.slot[slot], foundMatch[0]];
      msg.match = foundMatch[0].match;
      msg.slot = foundMatch[0].slot;
    }
  }
  return msg;
};

export const Nlp = function (DORA, config = {}) {
  /*
   * /nlp.startQuestion
   * 診断開始
   */
  function StartQuestion(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      prepare(msg);
      node.next(msg);
    });
  }
  DORA.registerType("startQuestion", StartQuestion);

  /*
   * /nlp.endQuestion
   * 診断終了
   */
  function EndQuestion(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      prepare(msg);
      node.next(msg);
    });
  }
  DORA.registerType("endQuestion", EndQuestion);

  /*
   * /nlp.logger/質問文
   * 診断終了
   */
  function Logger(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      const { loggerHost } = node.flow.options;
      prepare(msg);
      let message = options;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (loggerHost) {
        const headers = {};
        try {
          headers["Content-Type"] = "application/json";
          let response = await fetch(`${loggerHost}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              payload: message,
            }),
            timeout: "httpTimeout" in msg ? msg.httpTimeout : 3000,
          });
          if (response.ok) {
            const data = await response.text();
            try {
              msg.payload = JSON.parse(data);
            } catch (err) {
              msg.payload = data;
            }
          } else {
            if (msg._httpErrorInterrupt && msg._httpErrorInterrupt.length > 0) {
              msg.httpError = {
                status: response.status,
                statusText: response.statusText,
              };
              node.goto(msg, msg._httpErrorInterrupt);
              return;
            } else {
              msg.httpError = {
                status: response.status,
                statusText: response.statusText,
              };
            }
          }
        } catch (err) {
          msg.httpError = {
            code: err.code,
            type: err.type,
            errno: err.errno,
            message: err.message,
          };
          if (msg._httpErrorInterrupt && msg._httpErrorInterrupt.length > 0) {
            node.goto(msg, msg._httpErrorInterrupt);
            return;
          }
        }
      }
      node.next(msg);
    });
  }
  DORA.registerType("logger", Logger);

  /*
   * /nlp.slot/キーワード
   * キーワードがpayloadに含まれていればスロットに入れる
   */
  function Slot(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      prepare(msg);
      node.next(getSlot(msg, options, isTemplated));
    });
  }
  DORA.registerType("slot", Slot);

  /*
   * /nlp.exist/キーワード/:FOUND
   * キーワードがスロットに含まれていればFOUNDへ移動
   */
  function Exist(node: Node, options) {
    const params = options.split("/");
    const string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", async function (msg) {
      prepare(msg);
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (msg.nlp.slot[message].length > 0) {
        node.jump(msg);
        return;
      }
      node.next(msg);
    });
  }
  DORA.registerType("exist", Exist);

  /*
   * /nlp.check/ストア名/:NEXT
   * 全てのスロットが埋まっていれば保存してNEXTへ
   */
  function Check(node: Node, options) {
    const params = options.split("/");
    const string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", async function (msg) {
      prepare(msg);
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (
        Object.keys(msg.nlp.slot).some((key) => {
          return msg.nlp.slot[key].length <= 0;
        })
      ) {
        node.next(msg);
        return;
      }
      if (params.length > 1) {
        msg.nlp.store[message] = [
          ...(msg.nlp.store[message] || []),
          msg.nlp.slot,
        ];
        msg.nlp.slot = {};
        node.jump(msg);
      } else {
        node.next(msg);
      }
    });
  }
  DORA.registerType("check", Check);

  /*
   * /nlp.save/ストア名
   * スロットをストアへ保存
   */
  function Save(node: Node, options) {
    const params = options.split("/");
    const string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", async function (msg) {
      prepare(msg);
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      msg.nlp.store[message] = [
        ...(msg.nlp.store[message] || []),
        msg.nlp.slot,
      ];
      msg.nlp.slot = {};
      node.next(msg);
    });
  }
  DORA.registerType("save", Save);
};
