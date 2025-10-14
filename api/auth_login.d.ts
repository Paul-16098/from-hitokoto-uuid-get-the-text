/**
 * form https://github.com/Paul-16098/Js-object-to-ts-interfaces
 * url: https://localhost:8080/%E4%B8%80%E8%A8%80.md
 * obj: [object Object]
 */
interface auth_login {
  status: number;
  message: string;
  data: {
    0: {
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
    };
  };
  ts: number;
}
