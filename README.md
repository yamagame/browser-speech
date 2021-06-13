# React SpeechRecognition Sample

Chrome ブラウザで音声認識を行うサンプルです。

## 準備

node_modules をダウンロードします。

```
$ npm install
```

## エコーシナリオサーバ実行

```
$ npm run echo-server
```

## 開発サーバ実行

```
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
