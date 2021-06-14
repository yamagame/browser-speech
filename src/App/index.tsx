import React from "react";
import axios from "axios";
import {
  authCheck,
  processControl,
  processRecognition,
  speechSynthesis,
} from "./usecase";
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
  React.useEffect(
    () => authCheck({ loading, history, setUsername, setLoading }),
    [loading, history]
  );

  // サーバーからのコントロールメッセージを処理
  React.useEffect(() => processControl({ setResult, setStartRecognition }), []);

  // 音声認識
  React.useEffect(() => {
    processRecognition({ startRecognition, setResult, setStartRecognition });
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
