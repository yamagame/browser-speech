import React from "react";

declare const webkitSpeechRecognition: typeof SpeechRecognition;

const speechRecognition = (() => {
  if ("webkitSpeechRecognition" in window) {
    return new webkitSpeechRecognition();
  }
})();

const Button: React.FC<{ label: string; onClick: React.MouseEventHandler }> = ({
  label,
  onClick,
}) => {
  return (
    <button
      className="border rounded-lg p-2 focus:outline-none"
      onClick={onClick}
    >
      {label}
    </button>
  );
};

function App() {
  const [startRecognition, setStartRecognition] = React.useState(false);
  const [result, setResult] = React.useState("");
  React.useEffect(() => {
    if (speechRecognition !== undefined) {
      if (startRecognition) {
        speechRecognition.onresult = (e) => {
          setResult(e.results[0][0].transcript);
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
      <Button
        label={startRecognition ? "Stop Recognition" : "Start Recognition"}
        onClick={toggleStartRecognition}
      ></Button>
      <div>{result}</div>
    </div>
  );
}

export default App;
