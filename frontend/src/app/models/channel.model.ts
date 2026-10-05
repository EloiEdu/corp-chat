/** Canal retornado pela API dentro de um workspace. */
export interface Channel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}
