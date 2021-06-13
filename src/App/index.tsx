import React from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { speechRecognition, speechSynthesis } from "./usecase";
import { ControlMessage } from "./model";
import { Route } from "react-router-dom";
import { Login } from "pages/Login";
import { Presentation } from "pages/Presentation";
import { useHistory } from "react-router-dom";

function App() {
  const history = useHistory();

  const [username, setUsername] = React.useState("");
  const [startPresentation, setStartPresentation] = React.useState(false);
  const [startRecognition, setStartRecognition] = React.useState(false);
  const [result, setResult] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // 未ログインならログインページへ遷移
  React.useEffect(() => {
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
  }, [loading, history]);

  // サーバーからのコントロールメッセージを処理
  React.useEffect(() => {
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
  }, []);

  // 音声認識
  React.useEffect(() => {
    if (speechRecognition !== undefined) {
      if (startRecognition) {
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
          await axios.post("/ready");
        };
        speechRecognition.start();
      } else {
        speechRecognition.stop();
      }
    }
  }, [startRecognition]);

  const onChangeUsername = (e: any) => {
    setResult("");
    setUsername(e.target.value);
  };

  if (loading) {
    return <div className="container"></div>;
  }

  return (
    <div className="container">
      <Route path="/login">
        <Login username={username} onChangeUsername={onChangeUsername} />
      </Route>
      <Route exact path="/">
        <Presentation
          start={startPresentation}
          startRecognition={startRecognition}
          result={result}
          onStartPresentation={async () => {
            setResult("");
            if (!startPresentation) speechSynthesis("");
            setStartPresentation(true);
            await axios.post("/init");
          }}
          onStopPresentation={() => {
            setResult("");
            setStartPresentation(false);
          }}
          onStartRecognition={() => {
            setStartRecognition(true);
          }}
          onStopRecognition={() => {
            setStartRecognition(false);
          }}
        />
      </Route>
    </div>
  );
}

export default App;
