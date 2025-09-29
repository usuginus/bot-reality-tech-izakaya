type SlackChannel = {
  id: string;
  name: string;
  num_members?: number;
};

type SlackUser = {
  id: string;
  name: string;
  real_name: string;
  display_name: string;
};

type SlackConversationsListResponse = {
  channels?: Array<{
    id: string;
    name: string;
    num_members?: number;
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
};

type SlackUsersListResponse = {
  members?: Array<{
    id: string;
    name: string;
    deleted?: boolean;
    is_bot?: boolean;
    profile?: {
      real_name?: string;
      display_name?: string;
    };
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
};

type SlackMessage = {
  type?: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
  subtype?: string;
  thread_ts?: string;
};

type SlackConversationsHistoryResponse = {
  messages?: SlackMessage[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
};
