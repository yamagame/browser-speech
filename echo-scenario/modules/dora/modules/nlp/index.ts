import { Node } from "../../";
const utils = require("../../libs/utils");
const fetch = require("node-fetch");
const { vegetables, building, structure, hospital, house } = require("./words");

const slotPattern = {
  名前: [/(山口)/, /(須崎)/, /(新海)/, /(小出)/, /(沼尾)/],
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
  くし: [/(くし)/, /(福祉)/, /(牛)/],
  はさみ: [/(はさみ)/],
  タバコ: [/(タバコ)/, /(たばこ)/],
  ボールペン: [/(ボールペン)/],
  場所: [...building, ...structure, ...hospital, ...house].sort((a, b) => {
    return b.length - a.length;
  }),
  野菜: [...vegetables],
};

const convertMatchString = (transcript, re, slot) => {
  if (typeof re === "string") {
    const index = transcript.indexOf(re);
    if (index >= 0) {
      return {
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
    msg.nlp.slot[slot] = [...msg.nlp.slot[slot], ...foundMatch];
    if (foundMatch.length > 0) {
      msg.match = foundMatch[0].match;
      msg.slot = foundMatch[0].slot;
    }
  }
  return msg;
};

export const Nlp = function (DORA, config = {}) {
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
   * /nlp.store/ストア名/:NEXT
   * 全てのスロットが埋まっていれば保存してNEXTへ
   */
  function Store(node: Node, options) {
    const params = options.split("/");
    const string = params[0];
    const isTemplated = (string || "").indexOf("{{") != -1;
    if (params.length > 1) {
      node.nextLabel(params.slice(1).join("/"));
    }
    node.on("input", async function (msg) {
      prepare(msg);
      console.log(JSON.stringify(msg.nlp.slot, null, "  "));
      let message = string;
      if (isTemplated) {
        message = utils.mustache.render(message, msg);
      }
      if (
        !Object.keys(msg.nlp.slot).some((key) => {
          return msg.nlp.slot[key].length <= 0;
        })
      ) {
        msg.nlp.store[message] = msg.nlp.slot;
        msg.nlp.slot = {};
        if (params.length > 1) {
          node.jump(msg);
          return;
        }
      }
      node.next(msg);
    });
  }
  DORA.registerType("store", Store);
};
