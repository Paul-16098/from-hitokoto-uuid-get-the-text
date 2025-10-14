/**
 * form https://github.com/Paul-16098/Js-object-to-ts-interfaces
 * url: https://localhost:8080/%E4%B8%80%E8%A8%80.md
 * obj: [object Object]
 */
interface hitokoto_uuid_score {
  status: number;
  message: string;
  data: {
    0: {
      id: number;
      sentence_uuid: string;
      score: { total: number; participants: number; average: number };
      logs: Array<{
        id: number;
        sentence_uuid: string;
        user_id: number;
        score: number;
        comment: string;
        updated_at: string;
        created_at: string;
      }>;
      updated_at: string;
      created_at: string;
    };
  };
  ts: number;
}
