import React from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { speechRecognition, speechSynthesis } from "./usecase";
import { Button } from "components/Button";
import { ControlMessage } from "./model";

function App() {
  const [startScenario, setStartScenario] = React.useState(false);
  const [startRecognition, setStartRecognition] = React.useState(false);
  const [result, setResult] = React.useState("");

  React.useEffect(() => {
    const sock = new SockJS("/controller");
    const onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as ControlMessage;
      switch (data.action) {
        case "text-to-speech":
          speechSynthesis(data.utterance);
          break;
        case "speech-to-text/start":
          setStartRecognition(true);
          break;
        case "speech-to-text/stop":
          setStartRecognition(false);
          break;
      }
    };
    sock.onmessage = onmessage;
    return () => {};
  }, []);

  React.useEffect(() => {
    if (speechRecognition !== undefined) {
      if (startRecognition) {
        speechRecognition.onresult = async (e) => {
          setResult(e.results[0][0].transcript);
          await axios.post("/transcript", {
            transcript: e.results[0][0].transcript,
          });
        };
        speechRecognition.onend = () => {
          setStartRecognition(false);
        };
        speechRecognition.start();
      } else {
        speechRecognition.stop();
      }
    }
  }, [startRecognition]);

  const toggleStartRecognition = React.useCallback(() => {
    setStartRecognition((v) => !v);
  }, []);

  return (
    <div className="container">
      {startScenario ? (
        <>
          <Button
            label={startRecognition ? "Stop Recognition" : "Start Recognition"}
            onClick={toggleStartRecognition}
          ></Button>
        </>
      ) : (
        <>
          <Button
            label={"スタート"}
            onClick={async () => {
              await axios.post("/start");
              setStartScenario(true);
              speechSynthesis("");
            }}
          ></Button>
        </>
      )}
      <div>{result}</div>
    </div>
  );
}

export default App;
