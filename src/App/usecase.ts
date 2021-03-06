import axios from "axios";
import SockJS from "sockjs-client";
import { ControlMessage } from "./model";
import { useHistory } from "react-router-dom";

export const initialStartRecoginition: {
  state: boolean;
  timeout?: number;
} = {
  state: false,
  timeout: 15,
};

export type StartRecoginitionProps = typeof initialStartRecoginition;

export const initialStartPresentation: {
  state: boolean;
} = {
  state: false,
};

export type StartPresentationProps = typeof initialStartPresentation;

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
  setImage,
  setSockId,
  setStartRecognition,
  setStartPresentation,
}: {
  setResult: (value: string) => void;
  setImage: (value: string) => void;
  setSockId: (value: string) => void;
  setStartRecognition: (value: StartRecoginitionProps) => void;
  setStartPresentation: (value: StartPresentationProps) => void;
}) => {
  const sock = new SockJS("/controller");
  const onmessage = async (e: MessageEvent) => {
    const data = JSON.parse(e.data) as ControlMessage;
    switch (data.action) {
      case "login":
        setSockId(data.sockId);
        break;
      case "text-to-speech/start":
        setResult(data.utterance);
        await speechSynthesis(data.utterance);
        await axios.post("/ready");
        break;
      case "text-to-speech/stop":
        if (synth.speaking) {
          synth.cancel();
        } else {
          await axios.post("/ready");
        }
        break;
      case "speech-to-text/start":
        setStartRecognition({ state: true, timeout: data.timeout });
        setStartPresentation({ state: true });
        setResult("");
        break;
      case "speech-to-text/stop":
        setStartRecognition({ state: false });
        setStartPresentation({ state: true });
        setResult("");
        break;
      case "image":
        setImage(data.image.src ?? "");
        break;
      case "start":
        setStartPresentation({ state: true });
        setStartRecognition({ state: false });
        setResult("");
        break;
      case "exit":
        setStartPresentation({ state: false });
        setStartRecognition({ state: false });
        setResult("");
        break;
    }
  };
  sock.onopen = function () {
    console.log("open");
  };
  sock.onclose = function () {
    console.log("close");
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
  startRecognition: StartRecoginitionProps;
  setResult: (value: string) => void;
  setStartRecognition: (value: StartRecoginitionProps) => void;
}) => {
  if (speechRecognition !== undefined) {
    if (startRecognition.state) {
      const { timeout } = startRecognition;
      let recordingTranscript = true;
      let doneTranscript = false;
      const timeoutTimer =
        timeout &&
        setTimeout(() => {
          if (!doneTranscript) {
            speechRecognition.stop();
          }
          recordingTranscript = false;
        }, timeout * 1000);
      speechRecognition.onresult = async (e) => {
        recordingTranscript = false;
        doneTranscript = true;
        setResult(e.results[0][0].transcript);
        // ?????????????????????
        await axios.post("/transcript", {
          transcript: e.results[0][0].transcript,
        });
      };
      speechRecognition.onend = async () => {
        if (recordingTranscript) {
          speechRecognition.start();
          return;
        }
        if (timeoutTimer) clearTimeout(timeoutTimer);
        setStartRecognition({ state: false });
        // ????????????????????????
        if (!doneTranscript) {
          await axios.post("/transcript", {
            transcript: "[timeout]",
          });
        }
      };
      try {
        speechRecognition.start();
      } catch (err) {
        console.error(err);
      }
    } else {
      speechRecognition.stop();
    }
  }
};

export const stopRecognition = () => {
  if (speechRecognition !== undefined) {
    speechRecognition.stop();
  }
};
