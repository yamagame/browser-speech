import axios from "axios";
import SockJS from "sockjs-client";
import { ControlMessage } from "./model";
import { useHistory } from "react-router-dom";

declare const webkitSpeechRecognition: typeof SpeechRecognition;

export const speechRecognition = (() => {
  if ("webkitSpeechRecognition" in window) {
    return new webkitSpeechRecognition();
  }
})();

const synth = window.speechSynthesis;

export const speechSynthesis = (text: string) => {
  return new Promise((resolve) => {
    if (synth) {
      synth.cancel();
      var utterThis = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.name === "Kyoko") ||
        voices.find((v) => v.lang === "ja-JP");
      if (voice) {
        utterThis.voice = voice;
        utterThis.onend = () => {
          resolve(true);
        };
        synth.speak(utterThis);
        return;
      }
    }
    resolve(false);
  });
};

export const authCheck = ({
  loading,
  history,
  setUsername,
  setLoading,
}: {
  loading: boolean;
  history: ReturnType<typeof useHistory>;
  setUsername: (value: string) => void;
  setLoading: (value: boolean) => void;
}) => {
  const auth = async () => {
    try {
      const res = await axios.post("/auth");
      if (res.data.username) {
        setUsername(res.data.username);
      } else {
        history.push("/login");
      }
    } catch (err) {
      history.push("/login");
    }
    setLoading(false);
  };
  if (loading) auth();
};

export const processControl = ({
  setResult,
  setStartRecognition,
}: {
  setResult: (value: string) => void;
  setStartRecognition: (value: boolean) => void;
}) => {
  const sock = new SockJS("/controller");
  const onmessage = async (e: MessageEvent) => {
    const data = JSON.parse(e.data) as ControlMessage;
    switch (data.action) {
      case "text-to-speech":
        setResult(data.utterance);
        await speechSynthesis(data.utterance);
        await axios.post("/ready");
        break;
      case "speech-to-text/start":
        setStartRecognition(true);
        setResult("");
        break;
      case "speech-to-text/stop":
        setStartRecognition(false);
        setResult("");
        break;
    }
  };
  sock.addEventListener("message", onmessage);
  return () => {
    sock.removeEventListener("message", onmessage);
  };
};

export const processRecognition = async ({
  startRecognition,
  setResult,
  setStartRecognition,
}: {
  startRecognition: boolean;
  setResult: (value: string) => void;
  setStartRecognition: (value: boolean) => void;
}) => {
  if (speechRecognition !== undefined) {
    if (startRecognition) {
      await axios.post("/recognition", { state: "start" });
      speechRecognition.onresult = async (e) => {
        setResult(e.results[0][0].transcript);
        // 認識結果を送信
        await axios.post("/transcript", {
          transcript: e.results[0][0].transcript,
        });
      };
      speechRecognition.onend = async () => {
        setStartRecognition(false);
        // 音声認識終了通知
        await axios.post("/recognition", { state: "end" });
      };
      speechRecognition.start();
    } else {
      speechRecognition.stop();
    }
  }
};
