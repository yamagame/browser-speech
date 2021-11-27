## backend.js API

// browser -> backend
POST /auth

// browser -> backend
POST /login

// browser -> backend
POST /logout

// scenario-engine -> browser/speech-to-text/start
POST /speech-to-text/start

// scenario-engine -> browser/speech-to-text/stop
POST /speech-to-text/stop

// scenario-engine -> browser/image
POST /display/image

// scenario-engine -> browser/text-to-speech/start
POST /text-to-speech/start

// scenario-engine -> browser/text-to-speech/stop
POST /text-to-speech/stop

// scenario-engine -> browser/clear-subtitle
POST /clear-subtitle

// scenario-engine -> browser/start
POST /start

// scenario-engine -> browser/exit
POST /exit

// scenario-engine -> browser/error
POST /error

// scenario-engine -> browser/log
POST /log

// browser -> scenario-engine/transcript
POST /transcript

// browser -> scenario-engine/init
POST /init

// browser -> scenario-engine/reset
POST /reset

// browser -> scenario-engine/ready
POST /ready

## scenario-engine

// シナリオスタート
POST /init

// リセット
POST /reset

// クローズ
POST /close

// シナリオ継続通知
POST /ready

// シナリオ継続通知
POST /robotReady

// ボタンイベント通知
POST /button/:action

// 音声認識結果
POST /transcript

## DoraEngine.ts

// DoraEngine -> robotServer/speech
socket.on("text-to-speech");

// DoraEngine -> backend/text-to-speech/start
socket.on("text-to-speech");

// DoraEngine -> backend/text-to-speech/stop
socket.on("text-to-speech");

// DoraEngine -> backend/speech-to-text/start
socket.on("speech-to-text");

// DoraEngine -> backend/speech-to-text/stop
socket.on("speech-to-text");

// DoraEngine -> backend/display/image
socket.on("display/image");

// DoraEngine -> backend/clear-subtitle
socket.on("clear-subtitle");

// DoraEngine -> afplay
socket.on("sound");

// DoraEngine -> bavkend/log
socket.on("log");
