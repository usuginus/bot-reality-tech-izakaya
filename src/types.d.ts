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
