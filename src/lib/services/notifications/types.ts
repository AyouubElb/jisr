// `type` is an open string in the DB; this union keeps app code + templates in
// sync. Add a kind by extending the union + its payload shape.
export type NotificationType = "quiz_corrected";

export interface NotificationPayloads {
  quiz_corrected: {
    attempt_id: string;
    quiz_id: string;
    quiz_title: string;
    course_id: string;
    score: number | null;
  };
}

export interface CreateNotificationArgs<T extends NotificationType = NotificationType> {
  userId: string;
  type: T;
  payload: NotificationPayloads[T];
}
