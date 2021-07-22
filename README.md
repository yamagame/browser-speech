# React SpeechRecognition Sample

Chrome ブラウザで音声認識を行うサンプルです。

## 開発サーバの準備と実行

node_modules をダウンロードします。

```
$ npm install
$ npm start
```

## エコーシナリオサーバの準備と実行

```
$ cd scenario-engine
$ npm install
$ npm start
```

## docker compose で起動

必要があれば TARGET_PORT、TARGET_HOST でログを送信する先のサーバーを指定します。
指定したホストに JSON データを UDP で送信します。

```
$ TARGET_PORT=7010 TARGET_HOST=192.168.11.153 docker-compose up
```

以下の URL をブラウザで開きます。

```
http://localhost:4100
```
