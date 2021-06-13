import React from "react";
import axios from "axios";
import { Button } from "components/Button";
import { useHistory } from "react-router-dom";

export type PresentationProps = {
  start: boolean;
  startRecognition: boolean;
  result: string;
  onStartPresentation: () => void;
  onStopPresentation: () => void;
  onStartRecognition: () => void;
  onStopRecognition: () => void;
};

export const Presentation: React.FC<PresentationProps> = ({
  start,
  startRecognition,
  result,
  onStartPresentation,
  onStopPresentation,
  onStartRecognition,
  onStopRecognition,
}) => {
  const history = useHistory();

  return (
    <>
      {!start ? (
        <Button
          label={"Start"}
          onClick={() => {
            onStartPresentation();
          }}
        ></Button>
      ) : (
        <Button
          label={startRecognition ? "Stop Recognition" : "Start Recognition"}
          onClick={() => {
            if (startRecognition) {
              onStopRecognition();
            } else {
              onStartRecognition();
            }
          }}
        ></Button>
      )}
      <Button
        label={"ログアウト"}
        onClick={() => {
          onStopPresentation();
          axios.post("/logout");
          history.push("/login");
        }}
      ></Button>
      <div>{result}</div>
    </>
  );
};
