/******************************************************
 * Slack directory fetchers
 ******************************************************/
const IGNORED_MESSAGE_SUBTYPES: Record<string, boolean> = {
  channel_join: true,
  channel_leave: true,
  channel_topic: true,
  channel_purpose: true,
  channel_name: true,
  channel_archive: true,
};

function ensureBotJoinedChannel_(channelId: string): void {
  try {
    slackFetch_("conversations.join", { channel: channelId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("already_in_channel")) return;
    throw e;
  }
}
function fetchAllPublicChannels_(): SlackChannel[] {
  let cursor: string | undefined;
  const all: SlackChannel[] = [];
  do {
    const res = slackFetch_("conversations.list", {
      types: "public_channel",
      exclude_archived: true,
      limit: 1000,
      cursor,
    }) as SlackConversationsListResponse;
    (res.channels || []).forEach((c) => {
      if ((c.num_members ?? 0) === 0) return;
      all.push({ id: c.id, name: c.name, num_members: c.num_members });
    });
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

function fetchAllHumanUsers_(): SlackUser[] {
  let cursor: string | undefined;
  const users: SlackUser[] = [];
  do {
    const res = slackFetch_("users.list", { limit: 200, cursor }) as SlackUsersListResponse;
    (res.members || []).forEach((m) => {
      if (m.deleted) return;
      if (m.is_bot) return;
      if (m.id === "USLACKBOT") return;
      users.push({
        id: m.id,
        name: m.name,
        real_name: m.profile?.real_name || "",
        display_name: m.profile?.display_name || "",
      });
    });
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor);
  return users;
}

function fetchChannelMessageStats_(
  channelId: string,
  oldestTs: number
): { messageCount: number; uniqueUsers: number } {
  ensureBotJoinedChannel_(channelId);
  Utilities.sleep(150);

  let cursor: string | undefined;
  let messageCount = 0;
  const users = new Set<string>();
  do {
    const res = slackFetch_("conversations.history", {
      channel: channelId,
      limit: 200,
      cursor,
      oldest: oldestTs,
      inclusive: false,
    }) as SlackConversationsHistoryResponse;
    (res.messages || []).forEach((msg) => {
      if (msg.type && msg.type !== "message") return;
      if (msg.subtype && IGNORED_MESSAGE_SUBTYPES[msg.subtype]) return;
      messageCount += 1;
      if (msg.user) users.add(msg.user);
    });
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor);
  return { messageCount, uniqueUsers: users.size };
}
