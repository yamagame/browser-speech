import React from "react";
import axios from "axios";
import { Button } from "components/Button";
import { useHistory } from "react-router-dom";

export type PresentationProps = {
  start: boolean;
  startRecognition: boolean;
  result: string;
  image: string;
  onStartPresentation: () => void;
  onStopPresentation: () => void;
  onStartRecognition: () => void;
  onStopRecognition: () => void;
};

export const RecognitionButton: React.FC<{
  startRecognition: boolean;
  onStartRecognition: () => void;
  onStopRecognition: () => void;
}> = ({ startRecognition, onStartRecognition, onStopRecognition }) => {
  return (
    <Button
      className="m-8"
      label={startRecognition ? "Stop Recognition" : "Start Recognition"}
      onClick={() => {
        if (startRecognition) {
          onStopRecognition();
        } else {
          onStartRecognition();
        }
      }}
    ></Button>
  );
};

export const Presentation: React.FC<PresentationProps> = ({
  start,
  startRecognition,
  result,
  image,
  onStartPresentation,
  onStopPresentation,
  onStartRecognition,
  onStopRecognition,
}) => {
  const history = useHistory();

  console.log(`start ${start}`);

  return (
    <>
      {!start ? (
        <>
          <Button
            className="m-8"
            label={"Start Scenario"}
            onClick={() => {
              onStartPresentation();
            }}
          ></Button>
          <Button
            label={"ログアウト"}
            onClick={() => {
              onStopPresentation();
              axios.post("/logout");
              history.push("/login");
            }}
          ></Button>
        </>
      ) : (
        <>
          {image ? <img alt="" src={image} /> : null}
          {result ? <div>{result}</div> : null}
        </>
      )}
    </>
  );
};
