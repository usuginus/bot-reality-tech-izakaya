/******************************************************
 * New member detection and welcome workflow
 ******************************************************/
const NEWCOMER_BATCH_SIZE = 10;
const CHUNK_LEN = 2500;
const CHANNEL_ACTIVITY_LOOKBACK_DAYS = 7;
const FEATURED_CHANNEL_LIMIT = 5;

function postChunkedMessage_(
  postChannelId: string,
  header: string,
  body: string
): void {
  if (body.length <= CHUNK_LEN) {
    postMessage_(postChannelId, header, [
      { type: "section", text: { type: "mrkdwn", text: body } },
    ]);
    return;
  }

  const parts = splitByLength_(body, CHUNK_LEN);
  parts.forEach((part, idx) => {
    const title = `${header} (part ${idx + 1})`;
    postMessage_(postChannelId, title, [
      { type: "section", text: { type: "mrkdwn", text: part } },
    ]);
    Utilities.sleep(300);
  });
}

function postWelcomeWithChannelListForUsers_(
  postChannelId: string,
  usersBatch: SlackUser[]
): void {
  const intro = buildIntro_();

  const namesLine = joinNamesJa_(usersBatch);
  const mentionsLine = joinMentions_(usersBatch);
  const header = buildHeader_(namesLine);

  const channels = fetchAllPublicChannels_();
  const channelSection = buildChannelListSection_(channels);

  const body =
    `${header}\n` +
    `${mentionsLine}\n` +
    `${intro}\n` +
    `${channelSection}`;

  postChunkedMessage_(postChannelId, header, body);
}

function checkNewMembersAndWelcome(): void {
  const postChannel = PropertiesService.getScriptProperties().getProperty(
    "DEFAULT_CHANNEL"
  );
  if (!postChannel)
    throw new Error("DEFAULT_CHANNEL is not set in Script Properties.");

  const known = loadKnownUserIds_();
  const all = fetchAllHumanUsers_();

  if (known.size === 0) {
    all.forEach((u) => known.add(u.id));
    saveKnownUserIds_(known);
    console.log(`Initialized KNOWN_USER_IDS with ${known.size} users.`);
    return;
  }

  const newcomers = all.filter((u) => !known.has(u.id));
  if (newcomers.length === 0) {
    console.log("No newcomers.");
    return;
  }

  for (let i = 0; i < newcomers.length; i += NEWCOMER_BATCH_SIZE) {
    const batch = newcomers.slice(i, i + NEWCOMER_BATCH_SIZE);
    try {
      postWelcomeWithChannelListForUsers_(postChannel, batch);
      Utilities.sleep(700);
      batch.forEach((u) => known.add(u.id));
    } catch (e) {
      console.warn(`welcome batch failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  saveKnownUserIds_(known);

  console.log(
    `Welcomed ${newcomers.length} newcomer(s) in ${Math.ceil(
      newcomers.length / NEWCOMER_BATCH_SIZE
    )} batch(es).`
  );
}

function postWeeklyChannelDigest(): void {
  const postChannel = PropertiesService.getScriptProperties().getProperty(
    "DEFAULT_CHANNEL"
  );
  if (!postChannel)
    throw new Error("DEFAULT_CHANNEL is not set in Script Properties.");

  const channels = fetchAllPublicChannels_();
  if (channels.length === 0) {
    console.log("No public channels to report.");
    return;
  }

  const today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy/MM/dd"
  );
  const header = `Tech居酒屋 -REALITY- 公開チャンネル案内 (${today})`;
  const intro =
    "Tech居酒屋 -REALITY- の公開チャンネル一覧です。気になるチャンネルにぜひ参加してください！";
  const body = `${intro}\n\n${buildChannelListSection_(channels)}`;

  postChunkedMessage_(postChannel, header, body);
  console.log(`Posted public channel digest with ${channels.length} entries.`);
}

function postChannelActivityHighlights(): void {
  const postChannel = PropertiesService.getScriptProperties().getProperty(
    "DEFAULT_CHANNEL"
  );
  if (!postChannel)
    throw new Error("DEFAULT_CHANNEL is not set in Script Properties.");

  const channels = fetchAllPublicChannels_();
  if (channels.length === 0) {
    console.log("No public channels available for activity highlights.");
    return;
  }

  const now = new Date();
  const oldestDate = new Date(
    now.getTime() - CHANNEL_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  );
  const oldestTs = Math.floor(oldestDate.getTime() / 1000);

  const activity: Array<{
    channel: SlackChannel;
    messageCount: number;
    uniqueUsers: number;
  }> = [];

  channels.forEach((channel) => {
    try {
      const stats = fetchChannelMessageStats_(channel.id, oldestTs);
      if (stats.messageCount > 0) {
        activity.push({ channel, messageCount: stats.messageCount, uniqueUsers: stats.uniqueUsers });
      }
      Utilities.sleep(150);
    } catch (e) {
      console.warn(
        `Failed to fetch message history for ${channel.name}: ${
          e instanceof Error ? e.message : e
        }`
      );
      Utilities.sleep(300);
    }
  });

  if (activity.length === 0) {
    console.log("No channel activity detected in the lookback window.");
    return;
  }

  activity.sort((a, b) => {
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    return b.uniqueUsers - a.uniqueUsers;
  });

  const featured = activity.slice(0, FEATURED_CHANNEL_LIMIT);
  const tz = Session.getScriptTimeZone();
  const oldestLabel = Utilities.formatDate(oldestDate, tz, "yyyy/MM/dd");
  const latestLabel = Utilities.formatDate(now, tz, "yyyy/MM/dd");
  const header = `Tech居酒屋 -REALITY- 注目チャンネル (${oldestLabel}〜${latestLabel})`;
  const intro = `過去${CHANNEL_ACTIVITY_LOOKBACK_DAYS}日間で特に盛り上がったチャンネルをピックアップしました。`;

  const lines = featured.map((entry, idx) => {
    const dailyAvg = entry.messageCount / CHANNEL_ACTIVITY_LOOKBACK_DAYS;
    const dailyAvgRounded = Math.round(dailyAvg * 10) / 10;
    return `${idx + 1}. #${entry.channel.name} — ${entry.messageCount}件 (${entry.uniqueUsers}人が投稿, 1日平均${dailyAvgRounded.toFixed(1)}件)`;
  });

  const othersCount = activity.length - featured.length;
  if (othersCount > 0)
    lines.push(`他にも ${othersCount} チャンネルで活動が確認されています。`);

  const body = `${intro}\n\n${lines.join("\n")}`;

  postChunkedMessage_(postChannel, header, body);
  console.log(
    `Posted channel activity highlights for ${featured.length} channel(s) out of ${activity.length}.`
  );
}
