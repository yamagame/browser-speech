import { Node } from "../../";
const utils = require("../../libs/utils");
const fetch = require("node-fetch");

const slotPattern = {
  年: [/(\d+)年/],
  月: [/(\d+)月/],
  日: [/(\d+)日/],
  曜日: [/([日月火水木金土])曜/],
  歳: [/(\d+)歳/],
  桜: [/(桜)/],
  猫: [/(猫)/],
  電車: [/(電車)/],
  梅: [/(梅)/],
  犬: [/(犬)/],
  自動車: [/(自動車)/],
  数字: [/(\d+)/],
  "２８６": [/(286)/],
  "９２５３": [/(9253)/],
  時計: [/(時計)/],
  くし: [/(くし)/],
  はさみ: [/(はさみ)/],
  タバコ: [/(タバコ)/],
  ペン: [/(ペン)/],
  場所: [],
  野菜: [],
};

const convertMatchString = (match) => {
  if (!match) return null;
  return {
    org: match[0],
    match: match[1],
    index: match.index,
  };
};

const getSlot = (msg, options, isTemplated = false) => {
  if (!msg.slot) msg.slot = {};
  let slot = "";
  try {
    var message = options || JSON.stringify(msg, null, "  ");
    if (isTemplated) {
      message = utils.mustache.render(message, msg);
    }
    slot = message;
  } catch (err) {
    slot = options;
  }
  if (!msg.slot[slot]) msg.slot[slot] = [];
  if (slotPattern[slot]) {
    msg.slot[slot] = [
      ...msg.slot[slot],
      ...slotPattern[slot].map((re) => {
        return convertMatchString(msg.payload.toString().match(re));
      }),
    ];
    msg.slot[slot] = msg.slot[slot].filter((item) => item != null);
  }
  return msg;
};

export const Nlp = function (DORA, config = {}) {
  /*
   *
   *
   */
  function Slot(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      node.next(getSlot(msg, options, isTemplated));
    });
  }
  DORA.registerType("slot", Slot);

  /*
   *
   *
   */
  function Clear(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      msg.slot = {};
      node.next(msg);
    });
  }
  DORA.registerType("clear", Clear);
};
