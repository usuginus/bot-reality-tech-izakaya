/******************************************************
 * New member detection and welcome workflow
 ******************************************************/
const NEWCOMER_BATCH_SIZE = 10;
const CHUNK_LEN = 2500;

function postWelcomeWithChannelListForUsers_(postChannelId, usersBatch) {
  const intro = buildIntro_();

  const namesLine = joinNamesJa_(usersBatch);
  const mentionsLine = joinMentions_(usersBatch);
  const header = buildHeader_(namesLine);

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

function checkNewMembersAndWelcome() {
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
      console.warn(`welcome batch failed: ${e.message || e}`);
    }
  }
  saveKnownUserIds_(known);

  console.log(
    `Welcomed ${newcomers.length} newcomer(s) in ${Math.ceil(
      newcomers.length / NEWCOMER_BATCH_SIZE
    )} batch(es).`
  );
}
