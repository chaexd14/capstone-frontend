export type RecipientType = 'RECRUITER' | 'APPLICANT';

export type NotificationType =
  | 'NEW_APPLICATION'
  | 'STATUS_UPDATE'
  | 'APPLICATION_SUBMITTED';

export interface NotificationItem {
  id: number;
  recipient_type: RecipientType;
  user_id?: string | null;
  application?: number | null;
  candidate_code?: string | null;
  applicant_name?: string | null;
  job?: number | null;
  job_title?: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  unread_count: number;
  notifications: NotificationItem[];
}
