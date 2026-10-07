/** Canal retornado pela API dentro de um workspace. */
export interface Channel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  workspaceId: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
