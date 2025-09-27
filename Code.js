/******************************************************
 * 新メンバー検知（GASポーリング）→ 複数名まとめて歓迎投稿
 ******************************************************/

// ===== 設定 =====
const SLACK_API_BASE = "https://slack.com/api";
const NEWCOMER_BATCH_SIZE = 10; // 一度の投稿に含める最大人数
const CHUNK_LEN = 2500; // メッセージ分割の閾値

// ===== 共通ユーティリティ =====
function getToken_() {
  const token =
    PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
  if (!token)
    throw new Error("SLACK_BOT_TOKEN is not set in Script Properties.");
  return token;
}

function slackFetch_(endpoint, payload) {
  const token = getToken_();
  const res = UrlFetchApp.fetch(`${SLACK_API_BASE}/${endpoint}`, {
    method: "post",
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    payload: JSON.stringify(payload || {}),
  });
  const json = JSON.parse(res.getContentText());
  if (!json.ok)
    throw new Error(
      `${endpoint} failed: ${json.error || res.getResponseCode()}`
    );
  return json;
}

function postMessage_(channelId, text, blocks) {
  return slackFetch_("chat.postMessage", {
    channel: channelId,
    text,
    blocks: blocks || undefined,
  });
}

function splitByLength_(s, n) {
  const arr = [];
  for (let i = 0; i < s.length; i += n) arr.push(s.slice(i, i + n));
  return arr;
}

// ===== 名前ユーティリティ =====
function getPreferredName_(user) {
  const n =
    (user.display_name && user.display_name.trim()) ||
    (user.real_name && user.real_name.trim()) ||
    (user.name && user.name.trim()) ||
    "";
  return n.endsWith("さん") ? n : `${n}さん`;
}

function joinNamesJa_(users) {
  // 「山田さん、鈴木さん、佐藤さん」のように連結
  return users.map(getPreferredName_).join("、");
}

function joinMentions_(users) {
  // "<@U123> <@U456>" のようにメンション列を作る
  return users.map((u) => `<@${u.id}>`).join(" ");
}

// ===== 公開チャンネル一覧 =====
function fetchAllPublicChannels_() {
  let cursor;
  const all = [];
  do {
    const res = slackFetch_("conversations.list", {
      types: "public_channel",
      exclude_archived: true,
      limit: 1000,
      cursor,
    });
    (res.channels || []).forEach((c) => {
      if (c.num_members == 0) return; // メンバー0は除外（不要なら削除）
      all.push({ id: c.id, name: c.name, num_members: c.num_members });
    });
    cursor = (res.response_metadata && res.response_metadata.next_cursor) || "";
  } while (cursor);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

// ===== ユーザー一覧（bot/削除済みを除外） =====
function fetchAllHumanUsers_() {
  let cursor;
  const users = [];
  do {
    const res = slackFetch_("users.list", { limit: 200, cursor });
    (res.members || []).forEach((m) => {
      if (m.deleted) return;
      if (m.is_bot) return;
      if (m.id === "USLACKBOT") return;
      // if (m.is_restricted || m.is_ultra_restricted || m.is_stranger) return;
      users.push({
        id: m.id,
        name: m.name,
        real_name: (m.profile && m.profile.real_name) || "",
        display_name: (m.profile && m.profile.display_name) || "",
      });
    });
    cursor = (res.response_metadata && res.response_metadata.next_cursor) || "";
  } while (cursor);
  return users;
}

// ===== ガイドライン文 =====
function buildIntro_() {
  return `---
ここでは利害関係を一切抜きにして、少年の頃の気持ちを思い出しながら、技術やお酒の話で盛り上がりましょう！
---
✅ 歓迎すること
• 気になる技術トピックについて語り合うこと
• 寂しくなったら気軽に飲み会を企画すること
• 初心者・ベテラン関係なくリスペクトし合うこと
• 雑談や息抜きとしてのユーモアを楽しむこと
---
❌ 避けたいこと
• 内部・機密情報の漏洩
• リクルーティングや引き抜きなど、営利・勧誘目的の行為
• 特定の技術・団体・個人に対する攻撃や誹謗中傷
• 他人を不快にさせるような差別的・排他的な発言
• 過度な宣伝やスパム投稿
---
🍻 みんなで安心して語れる場を大事にしましょう！
---`;
}

// ===== 歓迎メッセージ + チャンネル一覧（複数名まとめて） =====
function postWelcomeWithChannelListForUsers_(postChannelId, usersBatch) {
  const intro = buildIntro_();

  const namesLine = joinNamesJa_(usersBatch); // 例: "山田さん、鈴木さん"
  const mentionsLine = joinMentions_(usersBatch); // 例: "<@U1> <@U2>"
  const header = `${namesLine}、「Tech居酒屋 -REALITY-」へようこそ 🚀`;

  const channels = fetchAllPublicChannels_();
  const lines = channels.map(
    (c) => `• #${c.name}  (${c.num_members ?? "n/a"} members)`
  );

  const body =
    `${header}\n` +
    `${mentionsLine}\n` +
    `${intro}\n` +
    `📋 公開チャンネル一覧（${channels.length}件）\n` +
    lines.join("\n");

  if (body.length <= CHUNK_LEN) {
    postMessage_(postChannelId, header, [
      { type: "section", text: { type: "mrkdwn", text: body } },
    ]);
  } else {
    const parts = splitByLength_(body, CHUNK_LEN);
    parts.forEach((part, idx) => {
      postMessage_(postChannelId, `${header} (part ${idx + 1})`, [
        { type: "section", text: { type: "mrkdwn", text: part } },
      ]);
      Utilities.sleep(300);
    });
  }
}

// ===== 既知ユーザーの管理 =====
const KNOWN_USERS_KEY = "KNOWN_USER_IDS_JSON";

function loadKnownUserIds_() {
  const raw =
    PropertiesService.getScriptProperties().getProperty(KNOWN_USERS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveKnownUserIds_(set) {
  PropertiesService.getScriptProperties().setProperty(
    KNOWN_USERS_KEY,
    JSON.stringify(Array.from(set))
  );
}

// ===== メイン：新メンバーを検知して歓迎（複数名まとめて） =====
function checkNewMembersAndWelcome() {
  const postChannel =
    PropertiesService.getScriptProperties().getProperty("DEFAULT_CHANNEL");
  if (!postChannel)
    throw new Error("DEFAULT_CHANNEL is not set in Script Properties.");

  const known = loadKnownUserIds_();
  const all = fetchAllHumanUsers_();

  // 初回：既存ユーザーで初期化して終了（スパム防止）
  if (known.size === 0) {
    all.forEach((u) => known.add(u.id));
    saveKnownUserIds_(known);
    console.log(`Initialized KNOWN_USER_IDS with ${known.size} users.`);
    return;
  }

  // 既知にないユーザー＝新規
  const newcomers = all.filter((u) => !known.has(u.id));
  if (newcomers.length === 0) {
    console.log("No newcomers.");
    return;
  }

  // まとめて投稿：人数が多いと読みにくいのでバッチ化
  for (let i = 0; i < newcomers.length; i += NEWCOMER_BATCH_SIZE) {
    const batch = newcomers.slice(i, i + NEWCOMER_BATCH_SIZE);
    try {
      postWelcomeWithChannelListForUsers_(postChannel, batch);
      Utilities.sleep(700); // 連投の間隔
      batch.forEach((u) => known.add(u.id));
    } catch (e) {
      console.warn(`welcome batch failed: ${e.message || e}`);
      // 失敗しても既知化は保留にしたいなら上行の known.add を削ってください
    }
  }
  saveKnownUserIds_(known);

  console.log(
    `Welcomed ${newcomers.length} newcomer(s) in ${Math.ceil(
      newcomers.length / NEWCOMER_BATCH_SIZE
    )} batch(es).`
  );
}
