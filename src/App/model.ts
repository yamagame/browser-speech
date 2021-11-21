interface ControlMessageTextToSpeechStart {
  action: "text-to-speech/start";
  utterance: string;
}

interface ControlMessageTextToSpeechStop {
  action: "text-to-speech/stop";
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

interface ControlMessageLogin {
  action: "login";
  sockId: string;
}

interface ControlMessageClearSubtitle {
  action: "clear-subtitle";
}

interface ControlMessageError {
  action: "error";
  error: {
    lineNumber: number;
    code: string;
    reason: string;
  };
}

interface ControlMessageLog {
  action: "log";
  payload: {
    message: string;
    code: string;
    reason: string;
  };
}

export type ControlMessage =
  | ControlMessageTextToSpeechStart
  | ControlMessageTextToSpeechStop
  | ControlMessageSpeechToTextStart
  | ControlMessageSpeechToTextStop
  | ControlMessageImage
  | ControlMessageStart
  | ControlMessageExit
  | ControlMessageLogin
  | ControlMessageClearSubtitle
  | ControlMessageError
  | ControlMessageLog;
