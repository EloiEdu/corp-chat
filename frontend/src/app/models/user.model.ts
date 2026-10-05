export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

/** Dados públicos de um usuário retornados pela API. */
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/** Dados do autor incluídos nas mensagens, conforme o select do backend. */
export type MessageSender = Pick<User, 'id' | 'fullName' | 'avatarUrl'>;
