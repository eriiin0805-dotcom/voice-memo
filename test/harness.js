export const results = [];
export function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: String(e.message || e) }); }
}
const j = (v) => JSON.stringify(v);
export const assert = {
  equal(a, b) { if (a !== b) throw new Error(`expected ${j(b)} got ${j(a)}`); },
  deepEqual(a, b) { if (j(a) !== j(b)) throw new Error(`expected ${j(b)} got ${j(a)}`); },
  throws(fn, Cls) {
    try { fn(); } catch (e) { if (!Cls || e instanceof Cls) return; throw new Error("wrong error type"); }
    throw new Error("did not throw");
  },
};
