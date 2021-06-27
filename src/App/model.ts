interface ControlMessageTextToSpeech {
  action: "text-to-speech";
  utterance: string;
}

interface ControlMessageSpeechToTextStart {
  action: "speech-to-text/start";
  timeout: number;
  username: string;
}

interface ControlMessageSpeechToTextStop {
  action: "speech-to-text/stop";
}

interface ControlMessageImage {
  action: "image";
  image: {
    src?: string;
  };
}

interface ControlMessageStart {
  action: "start";
}

interface ControlMessageExit {
  action: "exit";
}

export type ControlMessage =
  | ControlMessageTextToSpeech
  | ControlMessageSpeechToTextStart
  | ControlMessageSpeechToTextStop
  | ControlMessageImage
  | ControlMessageStart
  | ControlMessageExit;
