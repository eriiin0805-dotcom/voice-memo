export function isSpeechSupported(win = window) {
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function createRecognizer(win, handlers) {
  const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
  let rec = null;
  let finalText = "";
  let ended = true;
  let stopRequested = false;
  let lastError = null;

  function finish(reason) {
    if (ended) return;
    ended = true;
    handlers.onEnd(reason);
  }

  function start() {
    finalText = "";
    stopRequested = false;
    lastError = null;
    ended = false;
    rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      handlers.onText(finalText, interim);
    };
    rec.onerror = (ev) => {
      lastError = ev.error;
    };
    rec.onend = () => {
      if (stopRequested) return finish("stopped");
      if (lastError === "not-allowed" || lastError === "service-not-allowed") {
        return finish("denied");
      }
      if (!lastError || lastError === "no-speech" || lastError === "aborted") {
        return finish("silence");
      }
      finish("error");
    };
    try {
      rec.start();
    } catch {
      finish("error");
    }
  }

  function stop() {
    stopRequested = true;
    if (rec) {
      try { rec.stop(); } catch { finish("stopped"); }
    }
  }

  return { start, stop };
}
