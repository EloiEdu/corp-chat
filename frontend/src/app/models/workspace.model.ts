/** Workspace retornado pela API, sem relações que os endpoints não incluem. */
export type WorkspaceRole = 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  /** Presente na listagem de workspaces do usuário autenticado. */
  role?: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}
