/** Workspace retornado pela API, sem relações que os endpoints não incluem. */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}
