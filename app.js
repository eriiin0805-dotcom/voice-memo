import {
  loadMemos, addMemo, updateMemo, deleteMemo, searchMemos, StorageError,
} from "./store.js";
import { isSpeechSupported, createRecognizer } from "./speech.js";

const $ = (id) => document.getElementById(id);
const els = {
  search: $("search"), list: $("list"), empty: $("empty"), notice: $("notice"),
  capture: $("capture"), status: $("status"), text: $("captureText"),
  saveTyped: $("saveTyped"), mic: $("mic"), micIcon: $("micIcon"), hint: $("hint"),
};

let storage = null;
try { storage = window.localStorage; storage.getItem("x"); } catch { storage = null; }

const supported = isSpeechSupported(window);
let recognizer = null;
let recording = false;
let lastFinal = "";
let lastInterim = "";

function notice(msg) {
  els.notice.textContent = msg || "";
  els.notice.hidden = !msg;
}

function fmt(ts) {
  const d = new Date(ts);
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

function render() {
  const memos = storage ? searchMemos(loadMemos(storage), els.search.value) : [];
  els.list.replaceChildren();
  for (const m of memos) els.list.append(renderItem(m));
  els.empty.hidden = memos.length > 0 || !!els.search.value;
}

function renderItem(m) {
  const li = document.createElement("li");
  const time = document.createElement("div");
  time.className = "time";
  time.textContent = fmt(m.createdAt);
  const text = document.createElement("div");
  text.className = "text";
  text.textContent = m.text;
  li.append(time, text);
  text.addEventListener("click", () => edit(li, m));
  return li;
}

function edit(li, m) {
  const ta = document.createElement("textarea");
  ta.value = m.text;
  ta.rows = 4;
  const row = document.createElement("div");
  row.className = "row";
  const mk = (label, cls, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "small " + cls; b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  };
  row.append(
    mk("保存", "", () => guarded(() => {
      if (!ta.value.trim()) return notice("空のメモは保存できません");
      updateMemo(storage, m.id, ta.value); notice(""); render();
    })),
    mk("削除", "danger", () => {
      if (confirm("このメモを削除しますか?")) guarded(() => { deleteMemo(storage, m.id); render(); });
    }),
    mk("閉じる", "", render),
  );
  li.replaceChildren(ta, row);
  ta.focus();
}

function guarded(fn) {
  try { fn(); } catch (e) {
    notice(e instanceof StorageError ? "保存できませんでした。空き容量を確認してください" : "エラーが起きました");
  }
}

function saveText(text) {
  if (!storage) return notice("この環境では保存できません");
  guarded(() => {
    if (addMemo(storage, text)) { notice(""); render(); els.text.value = ""; }
  });
}

function setRecording(on) {
  recording = on;
  els.mic.classList.toggle("recording", on);
  els.capture.classList.toggle("recording", on);
  els.micIcon.textContent = on ? "■" : "●";
  els.mic.setAttribute("aria-label", on ? "止める" : "話す");
  els.hint.textContent = on ? "タップして終了・自動保存" : "タップして話す";
  els.status.textContent = on ? "● 聞いています" : "";
  els.capture.hidden = !on && supported;
}

if (supported) {
  recognizer = createRecognizer(window, {
    onText(fin, interim) {
      lastFinal = fin; lastInterim = interim;
      els.text.value = fin + interim;
    },
    onEnd(reason) {
      setRecording(false);
      const text = (lastFinal + lastInterim).trim();
      lastFinal = lastInterim = "";
      if (reason === "denied") {
        notice("マイクを許可してください(設定 > Safari > マイク)");
      }
      if (text) saveText(text);
      els.text.value = "";
    },
  });
  els.mic.addEventListener("click", () => {
    if (recording) { recognizer.stop(); return; }
    notice(""); els.text.value = ""; lastFinal = lastInterim = "";
    setRecording(true);
    recognizer.start();
  });
} else {
  els.capture.hidden = false;
  els.saveTyped.hidden = false;
  els.mic.hidden = true;
  els.hint.textContent = "キーボードのマイクで話して入力できます";
  els.text.placeholder = "ここに入力(キーボードのマイクで音声入力)";
  els.saveTyped.addEventListener("click", () => saveText(els.text.value));
}

const diag = document.createElement("p");
diag.className = "hint";
els.hint.after(diag);
function updateDiag() {
  let boots = "?";
  try {
    boots = (parseInt(storage.getItem("voice-memo:boots") || "0", 10) || 0) + 1;
    storage.setItem("voice-memo:boots", String(boots));
  } catch {}
  const n = storage ? loadMemos(storage).length : 0;
  diag.textContent = `診断: 起動${boots}回目 / メモ${n}件 / 保存${storage ? "可" : "不可"}`;
}
updateDiag();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

els.search.addEventListener("input", render);
if (!storage) notice("この環境ではメモを保存できません(プライベートブラウズの可能性)");
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
