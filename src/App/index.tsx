import "./index.css";
import React from "react";
import axios from "axios";
import {
  authCheck,
  processControl,
  processRecognition,
  speechSynthesis,
  stopRecognition,
  initialStartPresentation,
  initialStartRecoginition,
} from "./usecase";
import { Route } from "react-router-dom";
import { Login } from "pages/Login";
import { ControlPanel } from "components/ControlPanel";
import { Presentation } from "pages/Presentation";
import { useHistory } from "react-router-dom";

function App() {
  const history = useHistory();

  const [username, setUsername] = React.useState("");
  const [startPresentation, setStartPresentation] = React.useState(
    initialStartPresentation
  );
  const [startRecognition, setStartRecognition] = React.useState(
    initialStartRecoginition
  );
  const [result, setResult] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  // 未ログインならログインページへ遷移
  React.useEffect(
    () => authCheck({ loading, history, setUsername, setLoading }),
    [loading, history]
  );

  // サーバーからのコントロールメッセージを処理
  React.useEffect(
    () =>
      processControl({ setResult, setStartRecognition, setStartPresentation }),
    []
  );

  // 音声認識
  React.useEffect(() => {
    processRecognition({
      startRecognition,
      setResult,
      setStartRecognition,
    });
  }, [startRecognition]);

  const onChangeUsername = (e: any) => {
    setResult("");
    setUsername(e.target.value);
  };

  if (loading) {
    return <div className="container"></div>;
  }

  return (
    <div className="container mx-auto">
      <ControlPanel>
        <Route path="/login">
          <Login username={username} onChangeUsername={onChangeUsername} />
        </Route>
        <Route exact path="/">
          <Presentation
            start={startPresentation.state}
            startRecognition={startRecognition.state}
            result={result}
            onStartPresentation={async () => {
              setResult("");
              if (!startPresentation) speechSynthesis("");
              await axios.post("/init");
            }}
            onStopPresentation={() => {
              setResult("");
              setStartPresentation({ state: false });
              stopRecognition();
            }}
            onStartRecognition={() => {
              setStartRecognition({ state: true });
            }}
            onStopRecognition={() => {
              setStartRecognition({ state: false });
            }}
          />
        </Route>
      </ControlPanel>
    </div>
  );
}

export default App;
