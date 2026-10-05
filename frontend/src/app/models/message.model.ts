import type { MessageSender } from './user.model';

/** Mensagem retornada pela API ou enviada pelo Gateway. */
export interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  channelId: string;
  senderId: string;
  createdAt: string;
  updatedAt: string;
  /** Presente na listagem; criação e broadcast atuais não incluem esse objeto. */
  sender?: MessageSender;
}

/** Resposta paginada de GET /workspaces/:id/channels/:id/messages. */
export interface MessagePage {
  data: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}
