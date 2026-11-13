const assert = require("node:assert/strict");
const { transcribe } = require("@kutalia/whisper-node-addon");
assert.equal(typeof transcribe, "function");
console.log("Whisper chargé sous Node " + process.version);

const [model, audio] = process.argv.slice(2);
if (model && audio) {
  transcribe({ model, fname_inp: audio, language: "en", use_gpu: false, n_threads: 2 }).then((result) => {
    assert.match(JSON.stringify(result.transcription), /fellow Americans/i);
    console.log("Whisper CPU a transcrit l’échantillon JFK.");
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
