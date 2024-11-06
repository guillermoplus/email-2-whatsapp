export interface MessageEntity {
  id: number;
  message: string;
  status: string;
  sent_at: Date;
  scheduled_at: Date;
  created_at: Date;
  updated_at: Date;
}

export enum MessageStatus {
  SENT = 'SENT',
  SCHEDULED = 'SCHEDULED',
}
