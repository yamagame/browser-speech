# React SpeechRecognition Sample

Chrome ブラウザで音声認識を行うサンプルです。

## 準備

node_modules をダウンロードします。

```
$ npm install
```

## 開発サーバ実行

```
$ npm start
```

## docker compose

```
# ビルド
$ RECEIVER_URL=http://[音声認識文字列を受けるサーバー]/transcript docker-compose build
# 実行
$ docker-compose up
```
