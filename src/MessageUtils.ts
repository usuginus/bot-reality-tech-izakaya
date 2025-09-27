/******************************************************
 * Message composition helpers
 ******************************************************/
function splitByLength_(s: string, n: number): string[] {
  const arr: string[] = [];
  for (let i = 0; i < s.length; i += n) arr.push(s.slice(i, i + n));
  return arr;
}

function getPreferredName_(user: SlackUser): string {
  const n =
    (user.display_name && user.display_name.trim()) ||
    (user.real_name && user.real_name.trim()) ||
    (user.name && user.name.trim()) ||
    "";
  return n.endsWith("さん") ? n : `${n}さん`;
}

function joinNamesJa_(users: SlackUser[]): string {
  return users.map(getPreferredName_).join("、");
}

function joinMentions_(users: SlackUser[]): string {
  return users.map((u) => `<@${u.id}>`).join(" ");
}

function buildHeader_(namesLine: string): string {
  return `${namesLine}、「Tech居酒屋 -REALITY-」へようこそ 🚀`;
}

function buildIntro_(): string {
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

function buildChannelListSection_(channels: SlackChannel[]): string {
  const lines = channels.map(
    (c) => `• #${c.name}  (${c.num_members ?? "n/a"} members)`
  );
  return `📋 公開チャンネル一覧（${channels.length}件）\n${lines.join("\n")}`;
}
