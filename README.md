# bot-reality-tech-izakaya

Tech コミュニティ「Tech 居酒屋 -REALITY-」の Google Apps Script プロジェクトです。

## プロジェクト構成

- `Code.js` : Slack API とやり取りする本体ロジック。新規メンバー検知・歓迎メッセージ生成・チャンネル一覧取得をすべてここで行います。
- `.clasp.json` : `clasp` 用の設定ファイル。既存 Apps Script プロジェクト（`scriptId`）と紐付けられています。
- `appsscript.json` : Apps Script のメタ設定。タイムゾーンやランタイム（V8）を指定しています。
- `package.json` / `package-lock.json` : ローカル開発向け依存関係管理。型補完用に `@types/google-apps-script` を利用しています。

## スクリプトプロパティ（環境変数）

Slack トークンや投稿先などの機密値は **Apps Script スクリプトプロパティ** に保存します。GAS エディタの「プロジェクトの設定 > スクリプト プロパティ」から設定するか、`clasp` の `scripts.properties` コマンドを使ってください。

| Key                   | 必須 | 説明                                                               | 推奨値・補足                                                                                                      |
| --------------------- | ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`     | はい | Slack Bot Token。Bearer 認証に使用します。                         | Slack App で発行した Bot User OAuth Token (`xoxb-…`) を設定。Scopes: `users:read`, `channels:read`, `chat:write`. |
| `DEFAULT_CHANNEL`     | はい | 歓迎投稿を行うチャンネル ID（例: `C1234567890`）。                 | Slack でチャンネルを開き、URL の末尾 ID を設定。                                                                  |
| `KNOWN_USER_IDS_JSON` | 自動 | 既知ユーザー ID の JSON 化された配列。初回実行で自動生成されます。 | 手動変更は不要。リセットしたい場合のみ削除。                                                                      |

> 注意: トークンが未設定の場合 `checkNewMembersAndWelcome` は例外を投げます。デプロイ前に必ずプロパティを設定してください。

## セットアップ手順

1. 依存関係のインストール
   ```bash
   npm install
   ```
2. `clasp` の認証
   ```bash
   npx clasp login
   ```
3. Apps Script プロジェクトと同期
   - 既存プロジェクトに紐付いている場合は `npx clasp pull` で最新を取得。
   - 修正後は `npx clasp push` でデプロイ用プロジェクトに反映。
4. スクリプトプロパティの設定
   - Apps Script エディタ (https://script.google.com) を開き、`SLACK_BOT_TOKEN` と `DEFAULT_CHANNEL` を追加。
5. Slack App の準備
   - Bot Token Scopes に `chat:write`, `users:read`, `channels:read` を追加。
   - Bot を対象チャンネルに招待しておく (`/invite @your-bot`)。
6. トリガーの設定
   - Apps Script の「トリガー」から `checkNewMembersAndWelcome` を時間主導で設定（例: 1 分おき）。

## 運用ノート

- 新規参加者が複数いる場合も、1 投稿あたり 10 名までまとめて歓迎します。必要に応じて `NEWCOMER_BATCH_SIZE` を調整してください。
- Slack メッセージはガイドライン、メンション、チャンネル一覧で構成されます。長文になった場合は 2,500 文字ごとに分割投稿します。
- `KNOWN_USER_IDS_JSON` を削除すると、次回実行時にワークスペース全員が「既知ユーザー」として再登録され、スパム投稿を防ぎます。完全リセットしたい場合のみ手動削除ください。

## 開発時のヒント

- `Code.js` は V8 環境で実行されるため、ES2015+ の構文が利用できます。
- テスト実行は Apps Script エディタ、もしくは `npx clasp run checkNewMembersAndWelcome` からトリガーできます。ローカル Shell から実行する場合、実行前にスクリプトプロパティが有効なプロジェクトにデプロイされているか確認してください。
- ガイドライン文やチャンネル一覧のフォーマットは `buildIntro_` や `postWelcomeWithChannelListForUsers_` を編集することで調整できます。
