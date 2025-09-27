/******************************************************
 * Slack directory fetchers
 ******************************************************/
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
