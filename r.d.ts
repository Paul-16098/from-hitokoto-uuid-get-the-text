/** form [object Object] */
interface hitokoto_uuid {
  status: number;
  message: string;
  data: {
    hitokoto: string;
    uuid: string;
    type: string;
    from: string;
    from_who: string;
    creator: string;
    creator_uid: number;
    reviewer: number;
    commit_from: string;
    created_at: string;
    status: string;
  }[];

  ts: number;
}

/** form [object Object] */
interface auth_login {
  status: number;
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    is_suspended: number;
    is_admin: number;
    is_reviewer: number;
    email_verified_at: string;
    created_from: string;
    created_at: string;
    updated_at: string;
    token: string;
  }[];
  ts: number;
}
