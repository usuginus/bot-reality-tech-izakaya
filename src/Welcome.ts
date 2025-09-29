/******************************************************
 * New member detection and welcome workflow
 ******************************************************/
const NEWCOMER_BATCH_SIZE = 10;
const CHUNK_LEN = 2500;

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
