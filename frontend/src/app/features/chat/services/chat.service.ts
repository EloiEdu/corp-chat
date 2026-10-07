import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Channel } from '../../../models/channel.model';
import type { Message, MessagePage } from '../../../models/message.model';
import type { Workspace } from '../../../models/workspace.model';
import { environment } from '../../../../environments/environment';

export type WorkspaceMemberRole = 'ADMIN' | 'MEMBER';

export interface WorkspaceMemberResponse {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${environment.apiUrl}/workspaces`);
  }

  createWorkspace(data: { name: string; slug: string }): Observable<Workspace> {
    return this.http.post<Workspace>(`${environment.apiUrl}/workspaces`, data);
  }

  deleteWorkspace(workspaceId: string): Observable<Workspace> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    return this.http.delete<Workspace>(
      `${environment.apiUrl}/workspaces/${encodedWorkspaceId}`,
    );
  }

  getChannels(workspaceId: string): Observable<Channel[]> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    return this.http.get<Channel[]>(
      `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/channels`,
    );
  }

  createChannel(
    workspaceId: string,
    data: { name: string; description?: string; isPrivate?: boolean },
  ): Observable<Channel> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    return this.http.post<Channel>(
      `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/channels`,
      data,
    );
  }

  deleteChannel(workspaceId: string, channelId: string): Observable<Channel> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    const encodedChannelId = encodeURIComponent(channelId);
    return this.http.delete<Channel>(
      `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/channels/${encodedChannelId}`,
    );
  }

  addWorkspaceMember(
    workspaceId: string,
    data: { userId: string; role?: WorkspaceMemberRole },
  ): Observable<WorkspaceMemberResponse> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    return this.http.post<WorkspaceMemberResponse>(
      `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/members`,
      data,
    );
  }

  getMessages(
    workspaceId: string,
    channelId: string,
    cursor?: string,
  ): Observable<MessagePage> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    const encodedChannelId = encodeURIComponent(channelId);
    const url = `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/channels/${encodedChannelId}/messages`;
    const params = cursor ? new HttpParams().set('cursor', cursor) : new HttpParams();

    return this.http.get<MessagePage>(url, { params });
  }

  sendMessage(
    workspaceId: string,
    channelId: string,
    content: string,
  ): Observable<Message> {
    const encodedWorkspaceId = encodeURIComponent(workspaceId);
    const encodedChannelId = encodeURIComponent(channelId);
    const url = `${environment.apiUrl}/workspaces/${encodedWorkspaceId}/channels/${encodedChannelId}/messages`;

    // O DTO atual do backend aceita somente content; fileUrl ainda não faz
    // parte do contrato HTTP de criação de mensagens.
    return this.http.post<Message>(url, { content });
  }
}
