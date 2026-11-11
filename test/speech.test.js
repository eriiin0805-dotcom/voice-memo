import { test, assert } from "./harness.js";
import { createRecognizer, isSpeechSupported } from "../speech.js";

function fakeWin() {
  const win = {};
  win.webkitSpeechRecognition = class {
    constructor() { win.last = this; }
    start() {}
    stop() { this.onend && this.onend(); }
  };
  return win;
}
const res = (text, isFinal) => {
  const r = [{ transcript: text }];
  r.isFinal = isFinal;
  return r;
};

test("isSpeechSupported detects webkitSpeechRecognition", () => {
  assert.equal(isSpeechSupported(fakeWin()), true);
  assert.equal(isSpeechSupported({}), false);
});

test("final text accumulates and interim is separate", () => {
  const win = fakeWin();
  let got = null;
  const r = createRecognizer(win, { onText: (f, i) => (got = [f, i]), onEnd() {} });
  r.start();
  win.last.onresult({ resultIndex: 0, results: [res("こんにちは", true)] });
  win.last.onresult({ resultIndex: 1, results: [res("こんにちは", true), res("世界", false)] });
  assert.deepEqual(got, ["こんにちは", "世界"]);
  win.last.onresult({ resultIndex: 1, results: [res("こんにちは", true), res("世界", true)] });
  assert.deepEqual(got, ["こんにちは世界", ""]);
});

test("onEnd fires once with the right reason", () => {
  const cases = [
    [null, false, "silence"],
    ["no-speech", false, "silence"],
    ["not-allowed", false, "denied"],
    ["network", false, "error"],
    [null, true, "stopped"],
  ];
  for (const [err, stop, want] of cases) {
    const win = fakeWin();
    const reasons = [];
    const r = createRecognizer(win, { onText() {}, onEnd: (x) => reasons.push(x) });
    r.start();
    if (err) win.last.onerror({ error: err });
    if (stop) r.stop(); else win.last.onend();
    win.last.onend();
    assert.deepEqual(reasons, [want]);
  }
});
