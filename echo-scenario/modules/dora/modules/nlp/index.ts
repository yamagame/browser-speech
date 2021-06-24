import { Node } from "../../";
const utils = require("../../libs/utils");
const fetch = require("node-fetch");

const getSlot = (msg, options, isTemplated = false) => {
  let slot = "";
  slot += "";
  try {
    var message = options || JSON.stringify(msg, null, "  ");
    if (isTemplated) {
      message = utils.mustache.render(message, msg);
    }
    slot += message;
  } catch (err) {
    slot += options;
  }
  return slot;
};

export const Nlp = function (DORA, config = {}) {
  /*
   *
   *
   */
  function Slot(node: Node, options) {
    const isTemplated = (options || "").indexOf("{{") != -1;
    node.on("input", async function (msg) {
      msg.slot = getSlot(msg, options, isTemplated);
      node.next(msg);
    });
  }
  DORA.registerType("slot", Slot);
};
