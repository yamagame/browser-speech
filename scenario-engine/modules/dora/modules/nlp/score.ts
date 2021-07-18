export const calcHasegawaScore = (msg) => {
  let score = 0;

  if (!msg?.nlp?.store) return score;

  const filter = (a) => {
    if (a) return a.filter((a) => Object.keys(a).length > 0);
    return a;
  };

  // :年齢
  // msg.nlp.store["年齢"][0]["歳"][0].match
  {
    const store = filter(msg.nlp.store["年齢"]);
    if (store) {
      try {
        const answerAge = Number(store[0]["歳"][0].match);
        const correctAget = Number(msg.age);
        if (answerAge >= correctAget - 1 && answerAge <= correctAget + 1) {
          score++;
        }
      } catch {}
    }
  }

  // :日時の見当識
  {
    const store = filter(msg.nlp.store["日時の見当識"]);
    if (store) {
      const now = new Date(msg.timestamp);
      const correctYear = now.getFullYear();
      const correctMonth = now.getMonth() + 1;
      const correctDate = now.getDate();
      const correctDay = ["日", "月", "火", "水", "木", "金", "土"][
        now.getDay()
      ];
      if (
        store
          .filter((a) => "年" in a)
          .some((a) => a["年"].some((a) => a.match == correctYear))
      ) {
        score++;
      }
      if (
        store
          .filter((a) => "月" in a)
          .some((a) => a["月"].some((a) => a.match == correctMonth))
      ) {
        score++;
      }
      if (
        store
          .filter((a) => "日" in a)
          .some((a) => a["日"].some((a) => a.match == correctDate))
      ) {
        score++;
      }
      if (
        store
          .filter((a) => "曜日" in a)
          .some((a) => a["曜日"].some((a) => a.match == correctDay))
      ) {
        score++;
      }
    }
  }

  // :場所の見当識
  {
    const store1 = filter(msg.nlp.store["場所の見当識1"]);
    const store2 = filter(msg.nlp.store["場所の見当識2"]);
    while (true) {
      if (
        store2 &&
        store2
          .filter((a) => "場所" in a)
          .some((a) => a["場所"].some((a) => a.match !== ""))
      ) {
        score++;
        break;
      }
      if (
        store1 &&
        store1
          .filter((a) => "場所" in a)
          .some((a) => a["場所"].some((a) => a.match !== ""))
      ) {
        score += 2;
      }
      break;
    }
  }

  // :言葉の即時記銘
  {
    const store = filter(msg.nlp.store["言葉の即時記銘"]);
    if (store) {
      [msg.hasegawa.w1, msg.hasegawa.w2, msg.hasegawa.w3].forEach((word) => {
        if (
          store
            .filter((a) => word in a)
            .some((a) => a[word].some((a) => a.slot === word))
        ) {
          score++;
        }
      });
    }
  }

  // :計算
  {
    const store1 = filter(msg.nlp.store["計算1"]);
    const store2 = filter(msg.nlp.store["計算2"]);
    if (store1 || store2) {
      if (
        store1 &&
        store1
          .filter((a) => "数字" in a)
          .some((a) => a["数字"].some((a) => a.match === "93"))
      ) {
        score++;
      }
      if (
        store2 &&
        store2
          .filter((a) => "数字" in a)
          .some((a) => a["数字"].some((a) => a.match === "86"))
      ) {
        score++;
      }
    }
  }

  // :数字の逆唱
  {
    const store1 = filter(msg.nlp.store["数字の逆唱1"]);
    const store2 = filter(msg.nlp.store["数字の逆唱2"]);
    if (store1 || store2) {
      if (store1 && store1.length > 0) {
        score++;
      }
      if (store2 && store2.length > 0) {
        score++;
      }
    }
  }

  // :言葉の遅延再生
  {
    const store1 = filter(msg.nlp.store["言葉の遅延再生1"]);
    const store2 = filter(msg.nlp.store["言葉の遅延再生2"]);
    if (store1 || store2) {
      [msg.hasegawa.w1, msg.hasegawa.w2, msg.hasegawa.w3].forEach((word) => {
        while (true) {
          if (
            store1 &&
            store1
              .filter((a) => word in a)
              .some((a) => a[word].some((a) => a.slot === word))
          ) {
            score += 2;
            break;
          }
          if (
            store2 &&
            store2
              .filter((a) => word in a)
              .some((a) => a[word].some((a) => a.slot === word))
          ) {
            score++;
          }
          break;
        }
      });
    }
  }

  // :物品記銘
  {
    const store = filter(msg.nlp.store["物品記銘"]);
    if (store) {
      ["時計", "くし", "はさみ", "タバコ", "ボールペン"].forEach((word) => {
        if (
          store
            .filter((a) => word in a)
            .some((a) => a[word].some((a) => a.slot === word))
        ) {
          score++;
        }
      });
    }
  }

  // :言語の流暢性
  {
    const store = filter(msg.nlp.store["言語の流暢性"]);
    if (store) {
      try {
        const vegetable = store
          .filter((a) => "野菜" in a)
          .map((a) => a["野菜"])
          .reduce((a, v) => {
            v.forEach((b) => (a[b.match] = b));
            return { ...a };
          }, {});
        const length = Object.entries(vegetable).map((value, index) => {
          return index;
        }).length;
        if (length >= 10) {
          score += 5;
        } else if (length >= 9) {
          score += 4;
        } else if (length >= 8) {
          score += 3;
        } else if (length >= 7) {
          score += 2;
        } else if (length >= 6) {
          score += 1;
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  return score;
};
