import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { Channel } from '../../../models/channel.model';
import type { Workspace } from '../../../models/workspace.model';
import { ChatService } from '../services/chat.service';
import { MessagePanelComponent } from './message-panel.component';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [MessagePanelComponent],
  template: `
    <main class="flex h-screen min-h-[480px] overflow-hidden bg-slate-950 text-slate-100">
      <aside
        class="flex w-[76px] shrink-0 flex-col items-center gap-4 border-r border-slate-800 bg-slate-950 py-5"
        aria-label="Workspaces"
      >
        <div
          class="mb-2 flex size-11 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-950/40"
          aria-label="Corp Chat"
        >
          C
        </div>

        @if (isLoadingWorkspaces()) {
          <span class="px-1 text-center text-xs text-slate-500">Carregando</span>
        } @else {
          @for (workspace of workspaces(); track workspace.id) {
            <button
              type="button"
              (click)="selectWorkspace(workspace)"
              [attr.aria-label]="'Abrir workspace ' + workspace.name"
              [attr.aria-pressed]="selectedWorkspaceId() === workspace.id"
              [title]="workspace.name"
              class="flex size-11 items-center justify-center rounded-2xl text-sm font-semibold transition"
              [class.bg-indigo-500]="selectedWorkspaceId() === workspace.id"
              [class.text-white]="selectedWorkspaceId() === workspace.id"
              [class.bg-slate-800]="selectedWorkspaceId() !== workspace.id"
              [class.text-slate-300]="selectedWorkspaceId() !== workspace.id"
              [class.hover:bg-slate-700]="selectedWorkspaceId() !== workspace.id"
            >
              {{ workspace.name.slice(0, 2).toUpperCase() }}
            </button>
          }
        }
      </aside>

      <aside class="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80">
        <header class="flex h-16 items-center border-b border-slate-800 px-5">
          <div class="min-w-0">
            <p class="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Workspace
            </p>
            <h1 class="truncate font-semibold text-slate-100">
              {{ selectedWorkspace()?.name ?? 'Corp Chat' }}
            </h1>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto px-3 py-5">
          @if (workspaceError()) {
            <div class="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
              <p>{{ workspaceError() }}</p>
              <button
                type="button"
                class="mt-3 font-semibold text-rose-100 underline underline-offset-4"
                (click)="loadWorkspaces()"
              >
                Tentar novamente
              </button>
            </div>
          } @else if (isLoadingWorkspaces()) {
            <p class="px-2 text-sm text-slate-500">Buscando workspaces...</p>
          } @else if (workspaces().length === 0) {
            <p class="px-2 text-sm leading-6 text-slate-400">
              Você ainda não participa de nenhum workspace.
            </p>
          } @else {
            <div class="mb-3 flex items-center justify-between px-2">
              <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Canais
              </h2>
              @if (selectedWorkspace()) {
                <span class="max-w-28 truncate text-xs text-slate-500">
                  {{ selectedWorkspace()?.slug }}
                </span>
              }
            </div>

            @if (channelsError()) {
              <div class="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">
                <p>{{ channelsError() }}</p>
                <button
                  type="button"
                  class="mt-3 font-semibold text-rose-100 underline underline-offset-4"
                  (click)="retryChannels()"
                >
                  Tentar novamente
                </button>
              </div>
            } @else if (isLoadingChannels()) {
              <p class="px-2 py-2 text-sm text-slate-500">Carregando canais...</p>
            } @else if (channels().length === 0) {
              <p class="px-2 py-2 text-sm leading-6 text-slate-500">
                Este workspace ainda não tem canais.
              </p>
            } @else {
              <ul class="space-y-1">
                @for (channel of channels(); track channel.id) {
                  <li>
                    <button
                      type="button"
                      (click)="selectChannel(channel)"
                      [attr.aria-pressed]="selectedChannelId() === channel.id"
                      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition"
                      [class.bg-slate-800]="selectedChannelId() === channel.id"
                      [class.text-white]="selectedChannelId() === channel.id"
                      [class.text-slate-400]="selectedChannelId() !== channel.id"
                      [class.hover:bg-slate-800/70]="selectedChannelId() !== channel.id"
                      [class.hover:text-slate-100]="selectedChannelId() !== channel.id"
                    >
                      <span class="text-base leading-none text-slate-500" aria-hidden="true">
                        {{ channel.isPrivate ? '▣' : '#' }}
                      </span>
                      <span class="min-w-0 flex-1 truncate">{{ channel.name }}</span>
                      @if (channel.isPrivate) {
                        <span class="sr-only">Canal privado</span>
                      }
                    </button>
                  </li>
                }
              </ul>
            }
          }
        </div>

        <footer class="border-t border-slate-800 px-5 py-4">
          <p class="truncate text-xs text-slate-500">Mensagens corporativas</p>
        </footer>
      </aside>

      <section class="flex min-w-0 flex-1 flex-col bg-slate-950" aria-label="Chat">
        @if (selectedChannel(); as channel) {
          <app-message-panel
            [workspaceId]="selectedWorkspaceId() ?? ''"
            [channelId]="channel.id"
            [channelName]="channel.name"
          />
        } @else {
          <div class="flex flex-1 items-center justify-center p-8 text-center">
            <div class="max-w-sm">
              <h2 class="text-xl font-semibold text-slate-200">
                {{ selectedWorkspace() ? 'Escolha um canal' : 'Selecione um workspace' }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Selecione um item na barra lateral para começar a conversar.
              </p>
            </div>
          </div>
        }
      </section>
    </main>
  `,
})
export class ChatLayoutComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  private channelsRequest?: Subscription;

  readonly workspaces = signal<Workspace[]>([]);
  readonly selectedWorkspaceId = signal<string | null>(null);
  readonly channels = signal<Channel[]>([]);
  readonly selectedChannelId = signal<string | null>(null);

  readonly isLoadingWorkspaces = signal(false);
  readonly isLoadingChannels = signal(false);
  readonly workspaceError = signal<string | null>(null);
  readonly channelsError = signal<string | null>(null);

  readonly selectedWorkspace = computed(
    () => this.workspaces().find((workspace) => workspace.id === this.selectedWorkspaceId()) ?? null,
  );
  readonly selectedChannel = computed(
    () => this.channels().find((channel) => channel.id === this.selectedChannelId()) ?? null,
  );

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.workspaceError.set(null);
    this.isLoadingWorkspaces.set(true);

    this.chatService
      .getWorkspaces()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingWorkspaces.set(false)),
      )
      .subscribe({
        next: (workspaces) => {
          this.workspaces.set(workspaces);
          const firstWorkspace = workspaces[0];

          if (firstWorkspace) {
            this.selectWorkspace(firstWorkspace);
          } else {
            this.selectedWorkspaceId.set(null);
            this.channels.set([]);
            this.selectedChannelId.set(null);
          }
        },
        error: () => {
          this.workspaceError.set('Não foi possível carregar seus workspaces.');
        },
      });
  }

  selectWorkspace(workspace: Workspace): void {
    if (this.selectedWorkspaceId() === workspace.id) return;

    this.selectedWorkspaceId.set(workspace.id);
    this.selectedChannelId.set(null);
    this.channels.set([]);
    this.channelsError.set(null);
    this.loadChannels(workspace.id);
  }

  selectChannel(channel: Channel): void {
    this.selectedChannelId.set(channel.id);
  }

  retryChannels(): void {
    const workspaceId = this.selectedWorkspaceId();
    if (workspaceId) this.loadChannels(workspaceId);
  }

  private loadChannels(workspaceId: string): void {
    this.channelsRequest?.unsubscribe();
    this.channelsError.set(null);
    this.isLoadingChannels.set(true);

    this.channelsRequest = this.chatService
      .getChannels(workspaceId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingChannels.set(false)),
      )
      .subscribe({
        next: (channels) => {
          this.channels.set(channels);
          this.selectedChannelId.set(channels[0]?.id ?? null);
        },
        error: () => {
          this.channelsError.set('Não foi possível carregar os canais deste workspace.');
        },
      });
  }
}
