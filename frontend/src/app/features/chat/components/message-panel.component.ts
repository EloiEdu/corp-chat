import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { Message } from '../../../models/message.model';
import { AuthService } from '../../../core/services/auth.service';
import { WebsocketService } from '../../../core/services/websocket.service';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-message-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <section class="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100" aria-label="Mensagens do canal">
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-5 sm:px-7">
        <div class="flex min-w-0 items-center gap-3">
          <span class="text-xl text-slate-500" aria-hidden="true">#</span>
          <div class="min-w-0">
            <h2 class="truncate font-semibold">{{ channelName() }}</h2>
            <p class="truncate text-xs text-slate-500">{{ workspaceId() }}</p>
          </div>
        </div>

        <span
          class="ml-3 inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs"
          [class.border-emerald-400/20]="websocket.isConnected()"
          [class.bg-emerald-400/10]="websocket.isConnected()"
          [class.text-emerald-300]="websocket.isConnected()"
          [class.border-slate-700]="!websocket.isConnected()"
          [class.bg-slate-800/70]="!websocket.isConnected()"
          [class.text-slate-400]="!websocket.isConnected()"
          role="status"
        >
          <span
            class="size-2 rounded-full"
            [class.bg-emerald-400]="websocket.isConnected()"
            [class.bg-slate-500]="!websocket.isConnected()"
          ></span>
          {{ websocket.isConnected() ? 'Conectado' : 'Conectando' }}
        </span>
      </header>

      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-7" aria-live="polite">
        @if (historyError()) {
          <div class="mx-auto mb-5 w-full max-w-3xl rounded-lg border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">
            <p>{{ historyError() }}</p>
            <button
              type="button"
              class="mt-2 font-semibold underline underline-offset-4"
              (click)="retryHistory()"
            >
              Tentar novamente
            </button>
          </div>
        }

        @if (isLoadingHistory()) {
          <p class="py-8 text-center text-sm text-slate-500">Carregando mensagens...</p>
        } @else {
          @if (hasMore() && nextCursor()) {
            <button
              type="button"
              (click)="loadOlderMessages()"
              [disabled]="isLoadingOlder()"
              class="mx-auto mb-5 rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-700 hover:text-slate-200 disabled:cursor-wait disabled:opacity-60"
            >
              {{ isLoadingOlder() ? 'Carregando...' : 'Carregar mensagens anteriores' }}
            </button>
          }

          @if (messages().length === 0 && !historyError()) {
            <div class="flex flex-1 items-center justify-center py-10 text-center">
              <div>
                <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-2xl text-indigo-300" aria-hidden="true">
                  #
                </div>
                <h3 class="font-semibold text-slate-200">Este é o início de {{ channelName() }}</h3>
                <p class="mt-2 text-sm text-slate-500">Envie a primeira mensagem do canal.</p>
              </div>
            </div>
          } @else {
            <div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-5">
              @for (message of messages(); track message.id) {
                <article class="flex gap-3" [class.flex-row-reverse]="isOwnMessage(message)">
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-indigo-200"
                    aria-hidden="true"
                  >
                    {{ getInitials(message) }}
                  </div>
                  <div class="min-w-0 max-w-[min(85%,42rem)]">
                    <div class="mb-1 flex items-baseline gap-2" [class.flex-row-reverse]="isOwnMessage(message)">
                      <span class="text-sm font-semibold text-slate-200">
                        {{ message.sender?.fullName ?? (isOwnMessage(message) ? 'Você' : 'Usuário') }}
                      </span>
                      <time class="text-xs text-slate-500" [attr.datetime]="message.createdAt">
                        {{ message.createdAt | date: 'shortTime' }}
                      </time>
                    </div>
                    <p class="whitespace-pre-wrap break-words rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-200">
                      {{ message.content }}
                    </p>
                  </div>
                </article>
              }
            </div>
          }
        }
      </div>

      <form class="shrink-0 border-t border-slate-800 px-4 py-4 sm:px-7" (submit)="handleSubmit($event)">
        <div class="mx-auto flex w-full max-w-3xl items-end gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 transition focus-within:border-slate-500">
          <label class="sr-only" for="message-composer">Escreva uma mensagem</label>
          <textarea
            id="message-composer"
            rows="1"
            [value]="draft()"
            (input)="updateDraft($event)"
            (keydown.enter)="handleEnter($event)"
            placeholder="Mensagem para #{{ channelName() }}"
            class="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-1 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          ></textarea>
          <button
            type="submit"
            [disabled]="!draft().trim() || !websocket.isConnected()"
            class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
        <p class="mx-auto mt-2 max-w-3xl text-xs text-slate-600">
          Enter envia · Shift + Enter quebra a linha
        </p>
      </form>
    </section>
  `,
})
export class MessagePanelComponent {
  readonly workspaceId = input.required<string>();
  readonly channelId = input.required<string>();
  readonly channelName = input.required<string>();

  readonly messages = signal<Message[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly isLoadingHistory = signal(false);
  readonly isLoadingOlder = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly draft = signal('');

  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly websocket = inject(WebsocketService);

  private historyRequest?: Subscription;
  private olderMessagesRequest?: Subscription;

  private readonly loadHistoryEffect = effect((onCleanup) => {
    const workspaceId = this.workspaceId();
    const channelId = this.channelId();

    this.historyRequest?.unsubscribe();
    this.olderMessagesRequest?.unsubscribe();
    this.messages.set([]);
    this.nextCursor.set(null);
    this.hasMore.set(false);
    this.historyError.set(null);
    this.isLoadingHistory.set(true);
    this.isLoadingOlder.set(false);

    const request = this.chatService
      .getMessages(workspaceId, channelId)
      .pipe(finalize(() => this.isLoadingHistory.set(false)))
      .subscribe({
        next: (page) => {
          // A API envia primeiro as mensagens mais recentes; a tela exibe em ordem cronológica.
          this.mergeMessages([...page.data].reverse());
          this.hasMore.set(page.hasMore);
          this.nextCursor.set(page.nextCursor);
        },
        error: () => {
          this.historyError.set('Não foi possível carregar o histórico deste canal.');
        },
      });

    this.historyRequest = request;
    onCleanup(() => {
      request.unsubscribe();
      this.olderMessagesRequest?.unsubscribe();
    });
  });

  private readonly channelRoomEffect = effect((onCleanup) => {
    const workspaceId = this.workspaceId();
    const channelId = this.channelId();

    this.websocket.connect();
    if (this.websocket.isConnected()) {
      this.websocket.joinChannel(workspaceId, channelId);
    }

    onCleanup(() => {
      if (this.websocket.isConnected()) {
        this.websocket.leaveChannel(channelId);
      }
    });
  });

  private readonly incomingMessageEffect = effect(() => {
    const message = this.websocket.lastMessage();
    if (!message || message.channelId !== this.channelId()) return;

    // Evita que a leitura de messages() transforme este effect em um ciclo reativo.
    untracked(() => this.mergeMessages([message]));
  });

  loadOlderMessages(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.isLoadingOlder()) return;

    this.isLoadingOlder.set(true);
    this.olderMessagesRequest = this.chatService
      .getMessages(this.workspaceId(), this.channelId(), cursor)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingOlder.set(false)),
      )
      .subscribe({
        next: (page) => {
          this.mergeMessages([...page.data].reverse());
          this.hasMore.set(page.hasMore);
          this.nextCursor.set(page.nextCursor);
        },
        error: () => {
          this.historyError.set('Não foi possível carregar mensagens anteriores.');
        },
      });
  }

  retryHistory(): void {
    this.historyError.set(null);
    this.isLoadingHistory.set(true);
    this.historyRequest = this.chatService
      .getMessages(this.workspaceId(), this.channelId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingHistory.set(false)),
      )
      .subscribe({
        next: (page) => {
          this.messages.set([]);
          this.mergeMessages([...page.data].reverse());
          this.hasMore.set(page.hasMore);
          this.nextCursor.set(page.nextCursor);
        },
        error: () => {
          this.historyError.set('Não foi possível carregar o histórico deste canal.');
        },
      });
  }

  sendMessage(): void {
    const content = this.draft().trim();
    if (!content || !this.websocket.isConnected()) return;

    this.websocket.sendMessage(
      this.workspaceId(),
      this.channelId(),
      content,
    );
    this.draft.set('');
  }

  updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  handleEnter(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.shiftKey) return;

    event.preventDefault();
    this.sendMessage();
  }

  handleSubmit(event: Event): void {
    event.preventDefault();
    this.sendMessage();
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.authService.currentUser()?.id;
  }

  getInitials(message: Message): string {
    const name = message.sender?.fullName;
    if (!name) return this.isOwnMessage(message) ? 'EU' : 'U';

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private mergeMessages(incoming: Message[]): void {
    const byId = new Map(
      this.messages().map((message) => [message.id, message] as const),
    );

    for (const message of incoming) {
      byId.set(message.id, message);
    }

    const orderedMessages = [...byId.values()].sort((left, right) => {
      const timeDifference =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return timeDifference || left.id.localeCompare(right.id);
    });

    this.messages.set(orderedMessages);
  }
}
