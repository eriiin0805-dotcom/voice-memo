import { test } from "./harness.js";
import { assert } from "./harness.js";
import {
  loadMemos, addMemo, updateMemo, deleteMemo, searchMemos, StorageError,
} from "../store.js";

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test("addMemo trims text and puts newest first", () => {
  const s = fakeStorage();
  addMemo(s, "古い", 1);
  const memo = addMemo(s, "  牛乳を買う ", 2);
  assert.equal(memo.text, "牛乳を買う");
  assert.equal(loadMemos(s)[0].text, "牛乳を買う");
  assert.equal(loadMemos(s).length, 2);
});

test("addMemo ignores blank text", () => {
  const s = fakeStorage();
  assert.equal(addMemo(s, "   "), null);
  assert.equal(addMemo(s, ""), null);
  assert.equal(loadMemos(s).length, 0);
});

test("loadMemos returns [] for corrupted JSON", () => {
  const s = fakeStorage();
  s.setItem("voice-memo:v1", "{壊れ");
  assert.deepEqual(loadMemos(s), []);
});

test("updateMemo changes text, deleteMemo removes", () => {
  const s = fakeStorage();
  const m = addMemo(s, "a", 1);
  assert.equal(updateMemo(s, m.id, "b").text, "b");
  assert.equal(loadMemos(s)[0].text, "b");
  deleteMemo(s, m.id);
  assert.equal(loadMemos(s).length, 0);
});

test("searchMemos is case-insensitive substring match", () => {
  const memos = [
    { id: "1", text: "xxabcxx", createdAt: 1 },
    { id: "2", text: "other", createdAt: 2 },
  ];
  assert.deepEqual(searchMemos(memos, "ABC").map((m) => m.id), ["1"]);
  assert.equal(searchMemos(memos, "").length, 2);
});

test("addMemo throws StorageError when storage fails", () => {
  const s = {
    getItem: () => null,
    setItem: () => { throw new Error("quota"); },
  };
  assert.throws(() => addMemo(s, "x"), StorageError);
});
