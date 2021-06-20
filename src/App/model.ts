interface ControlMessageTextToSpeech {
  action: "text-to-speech";
  utterance: string;
}

interface ControlMessageSpeechToTextStart {
  action: "speech-to-text/start";
}

interface ControlMessageSpeechToTextStop {
  action: "speech-to-text/stop";
}

interface ControlMessageExit {
  action: "exit";
}

export type ControlMessage =
  | ControlMessageTextToSpeech
  | ControlMessageSpeechToTextStart
  | ControlMessageSpeechToTextStop
  | ControlMessageExit;
