/**
 * form https://github.com/Paul-16098/Js-object-to-ts-interfaces
 * url: https://localhost:8080/%E4%B8%80%E8%A8%80.md
 * obj: [object Object]
 */
interface hitokoto_uuid {
  status: number;
  message: string;
  data: {
    0: {
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
    };
  };
  ts: number;
}
