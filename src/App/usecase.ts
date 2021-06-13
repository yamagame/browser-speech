declare const webkitSpeechRecognition: typeof SpeechRecognition;

export const speechRecognition = (() => {
  if ("webkitSpeechRecognition" in window) {
    return new webkitSpeechRecognition();
  }
})();

const synth = window.speechSynthesis;

export const speechSynthesis = (text: string) => {
  console.log(text);
  if (synth) {
    synth.cancel();
    var utterThis = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.name === "Kyoko") ||
      voices.find((v) => v.lang === "ja-JP");
    if (voice) {
      utterThis.voice = voice;
      synth.speak(utterThis);
    }
  }
};
