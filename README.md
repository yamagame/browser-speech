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

先にフロントをビルドします。

```
$ npm run build
```

起動します。

```
$ docker-compose up
```

以下の URL をブラウザで開きます。

```
http://localhost:4100
```
