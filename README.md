# bot-reality-tech-izakaya

Tech コミュニティ「Tech 居酒屋 -REALITY-」の Google Apps Script プロジェクトです。

## プロジェクト構成

- `src/` : TypeScript ソースコード。`SlackApi.ts` や `Welcome.ts` など用途別に分割しています。
- `src/appsscript.json` : Apps Script マニフェスト。ビルド時に `dist/appsscript.json` へコピーされます。
- `src/types.d.ts` : Slack API から取得するデータ型を定義したローカル型定義。
- `dist/` : `npm run build` で生成される Apps Script へのデプロイ用成果物（JavaScript + マニフェスト）。
- `.clasp.json` : `rootDir` が `dist` を指す `clasp` 設定。コンパイル済みファイルをアップロードします。
- `package.json` / `package-lock.json` : ローカル開発用依存関係とビルドスクリプト。`typescript` と `@types/google-apps-script` を利用しています。

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
   - `npm run build` で `dist/` を更新したあと、`npx clasp push` でアップロードします。
4. スクリプトプロパティの設定
   - Apps Script エディタ (https://script.google.com) を開き、`SLACK_BOT_TOKEN` と `DEFAULT_CHANNEL` を追加。
5. Slack App の準備
   - Bot Token Scopes に `chat:write`, `users:read`, `channels:read` を追加。
   - Bot を対象チャンネルに招待しておく (`/invite @your-bot`)。
6. トリガーの設定
   - Apps Script の「トリガー」から `checkNewMembersAndWelcome` を時間主導で設定（例: 1 分おき）。
   - 公開チャンネル一覧の定期投稿には `postWeeklyChannelDigest` を週 1 回など好みの頻度で追加。

## 開発フロー

1. `src/` 以下の TypeScript ファイルを編集します。
2. `npm run build` を実行して `dist/` を生成します。
   - 開発中にウォッチしたい場合は `npx tsc --watch` などを利用してください。
3. ビルド成果物を反映する場合は `npx clasp push` を実行します。

## 運用ノート

- 新規参加者が複数いる場合も、1 投稿あたり 10 名までまとめて歓迎します。必要に応じて `NEWCOMER_BATCH_SIZE` を調整してください。
- Slack メッセージはガイドライン、メンション、チャンネル一覧で構成されます。長文になった場合は 2,500 文字ごとに分割投稿します。
- 公開チャンネル一覧投稿 (`postWeeklyChannelDigest`) も同様に 2,500 文字ごとに分割され、`DEFAULT_CHANNEL` に投稿されます。
- `KNOWN_USER_IDS_JSON` を削除すると、次回実行時にワークスペース全員が「既知ユーザー」として再登録され、スパム投稿を防ぎます。完全リセットしたい場合のみ手動削除ください。

## 開発時のヒント

- TypeScript の設定は `tsconfig.json` で管理しています。Apps Script V8 ランタイムに合わせて ES2019 をターゲットにしています。
- テスト実行は Apps Script エディタ、もしくは `npx clasp run checkNewMembersAndWelcome` からトリガーできます。ローカル Shell から実行する場合、実行前にスクリプトプロパティが有効なプロジェクトにデプロイされているか確認してください。
- ガイドライン文やチャンネル一覧のフォーマットは `buildIntro_` や `postWelcomeWithChannelListForUsers_` を編集することで調整できます。
