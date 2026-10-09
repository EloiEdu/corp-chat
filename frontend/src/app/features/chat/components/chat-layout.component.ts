import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import type { Channel } from '../../../models/channel.model';
import type { Workspace } from '../../../models/workspace.model';
import { ChatService, type WorkspaceMemberRole } from '../services/chat.service';
import { MessagePanelComponent } from './message-panel.component';

type ChatDialog = 'workspace' | 'channel' | 'member' | 'delete-workspace' | 'delete-channel';
type DeletionTarget =
  | { kind: 'workspace'; id: string; name: string }
  | { kind: 'channel'; id: string; name: string };

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [FormsModule, MessagePanelComponent],
  template: `
    <main class="flex h-screen min-h-[480px] flex-col overflow-hidden bg-slate-950 text-slate-100 md:flex-row">
      <aside
        class="flex h-[76px] w-full shrink-0 flex-row items-center gap-3 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 py-3 md:h-auto md:w-[76px] md:flex-col md:overflow-x-visible md:border-r md:border-b-0 md:px-0 md:py-5 md:flex!"
        [class.hidden]="mobileChatView()"
        aria-label="Workspaces"
      >
        <div
          class="mb-0 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-950/40 md:mb-2"
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
              class="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold transition"
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

        <button
          type="button"
          (click)="openDialog('workspace')"
          aria-label="Criar workspace"
          title="Criar workspace"
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-2xl text-slate-400 transition hover:border-indigo-400 hover:text-indigo-300"
        >
          +
        </button>
      </aside>

      <aside
        class="flex min-h-0 w-full min-w-0 flex-1 flex-col border-r border-slate-800 bg-slate-900/80 md:w-72 md:flex-none md:flex!"
        [class.hidden]="mobileChatView()"
      >
        <header class="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div class="min-w-0">
            <p class="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Workspace
            </p>
            <h1 class="truncate font-semibold text-slate-100">
              {{ selectedWorkspace()?.name ?? 'Corp Chat' }}
            </h1>
          </div>
          @if (selectedWorkspace(); as workspace) {
            @if (workspace.role === 'ADMIN') {
              <button
                type="button"
                (click)="requestDeleteWorkspace(workspace)"
                [attr.aria-label]="'Excluir workspace ' + workspace.name"
                title="Excluir workspace"
                class="rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300"
              >
                Excluir
              </button>
            }
          }
        </header>

        @if (actionNotice()) {
          <p class="mx-4 mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200" role="status">
            {{ actionNotice() }}
          </p>
        }

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
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="openDialog('channel')"
                    [attr.aria-label]="'Criar canal em ' + selectedWorkspace()?.name"
                    title="Criar canal"
                    class="flex size-7 items-center justify-center rounded-md text-lg text-slate-400 transition hover:bg-slate-800 hover:text-indigo-300"
                  >
                    +
                  </button>
                  @if (selectedWorkspace()?.role === 'ADMIN') {
                    <button
                      type="button"
                      (click)="openDialog('member')"
                      [attr.aria-label]="'Adicionar membro a ' + selectedWorkspace()?.name"
                      title="Adicionar membro"
                      class="flex size-7 items-center justify-center rounded-md text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-indigo-300"
                    >
                      M+
                    </button>
                  }
                </div>
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
                  <li class="group flex items-center gap-1">
                    <button
                      type="button"
                      (click)="selectChannel(channel)"
                      [attr.aria-pressed]="selectedChannelId() === channel.id"
                      class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition"
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
                    @if (canDeleteChannel(channel)) {
                      <button
                        type="button"
                        (click)="requestDeleteChannel(channel)"
                        [attr.aria-label]="'Excluir canal ' + channel.name"
                        [title]="'Excluir canal ' + channel.name"
                        class="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        Excluir
                      </button>
                    }
                  </li>
                }
              </ul>
            }
          }
        </div>

        <footer class="border-t border-slate-800 px-4 py-4">
          @if (currentUser(); as user) {
            <div class="flex min-w-0 items-center gap-3">
              @if (user.avatarUrl) {
                <img
                  [src]="user.avatarUrl"
                  [alt]="'Avatar de ' + user.fullName"
                  class="size-10 shrink-0 rounded-full object-cover"
                />
              } @else {
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200"
                  aria-hidden="true"
                >
                  {{ getUserInitials(user.fullName) }}
                </div>
              }
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-200" [title]="user.fullName">
                  {{ user.fullName }}
                </p>
                <div class="mt-1 flex min-w-0 items-center gap-1">
                  <span class="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-500" [title]="user.id">
                    {{ user.id }}
                  </span>
                  <button
                    type="button"
                    (click)="copyUserId(user.id)"
                    aria-label="Copiar UUID do usuário"
                    title="Copiar UUID"
                    class="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    ⧉
                  </button>
                </div>
              </div>
            </div>
            @if (copyFeedback()) {
              <p class="mt-2 text-right text-xs text-emerald-300" role="status">
                {{ copyFeedback() }}
              </p>
            }
          } @else {
            <p class="truncate text-xs text-slate-500">Carregando perfil...</p>
          }
        </footer>
      </aside>

      <section
        class="hidden min-h-0 min-w-0 flex-1 flex-col bg-slate-950 md:flex md:flex!"
        [style.display]="mobileChatView() ? 'flex' : null"
        aria-label="Chat"
      >
        <button
          type="button"
          (click)="showMobileNavigation()"
          class="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 px-4 text-sm font-medium text-slate-300 hover:bg-slate-900 md:hidden"
          aria-label="Voltar para workspaces e canais"
        >
          <span aria-hidden="true">←</span>
          Workspaces e canais
        </button>
        @if (selectedChannel(); as channel) {
          <app-message-panel
            class="min-h-0 flex-1"
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

    @if (activeDialog(); as dialog) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        (click)="closeDialog()"
      >
        <section
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'chat-dialog-title'"
          class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="chat-dialog-title" class="text-lg font-semibold text-white">
                @if (dialog === 'workspace') {
                  Novo workspace
                } @else if (dialog === 'channel') {
                  Novo canal
                } @else if (dialog === 'member') {
                  Adicionar membro
                } @else {
                  Confirmar exclusão
                }
              </h2>
              <p class="mt-1 text-sm text-slate-400">
                @if (dialog === 'workspace') {
                  Crie um espaço de trabalho para sua equipe.
                } @else if (dialog === 'channel') {
                  O canal será criado no workspace selecionado.
                } @else if (dialog === 'member') {
                  Informe o UUID da conta que deve entrar neste workspace.
                } @else {
                  @if (deletionTarget(); as target) {
                    Esta ação excluirá permanentemente
                    <strong class="text-slate-200">{{ target.name }}</strong>.
                    @if (target.kind === 'workspace') {
                      Os canais e membros associados também serão removidos.
                    }
                  }
                }
              </p>
            </div>
            <button
              type="button"
              (click)="closeDialog()"
              [disabled]="isSubmittingAction()"
              aria-label="Fechar"
              class="rounded-md px-2 py-1 text-xl text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              &times;
            </button>
          </div>

          <form (ngSubmit)="submitDialog()" class="space-y-4">
            @if (dialog === 'workspace') {
              <div>
                <label for="workspace-name" class="mb-2 block text-sm font-medium text-slate-200">
                  Nome do workspace
                </label>
                <input
                  id="workspace-name"
                  name="workspaceName"
                  type="text"
                  required
                  maxlength="100"
                  [ngModel]="workspaceName()"
                  (ngModelChange)="workspaceName.set($event)"
                  placeholder="Ex.: Engenharia"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
                <p class="mt-2 text-xs text-slate-500">
                  Um identificador será gerado automaticamente a partir do nome.
                </p>
              </div>
            } @else if (dialog === 'channel') {
              <div>
                <label for="channel-name" class="mb-2 block text-sm font-medium text-slate-200">
                  Nome do canal
                </label>
                <input
                  id="channel-name"
                  name="channelName"
                  type="text"
                  required
                  maxlength="100"
                  [ngModel]="channelName()"
                  (ngModelChange)="channelName.set($event)"
                  placeholder="Ex.: avisos"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
              </div>
              <div>
                <label for="channel-description" class="mb-2 block text-sm font-medium text-slate-200">
                  Descrição <span class="text-slate-500">(opcional)</span>
                </label>
                <input
                  id="channel-description"
                  name="channelDescription"
                  type="text"
                  maxlength="500"
                  [ngModel]="channelDescription()"
                  (ngModelChange)="channelDescription.set($event)"
                  placeholder="Para que serve este canal?"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
              </div>
              <label class="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                <input
                  name="channelIsPrivate"
                  type="checkbox"
                  [ngModel]="channelIsPrivate()"
                  (ngModelChange)="channelIsPrivate.set($event)"
                  class="size-4 rounded border-slate-600 bg-slate-950 accent-indigo-500"
                />
                Canal privado
              </label>
            } @else if (dialog === 'member') {
              <div>
                <label for="member-user-id" class="mb-2 block text-sm font-medium text-slate-200">
                  ID do usuário
                </label>
                <input
                  id="member-user-id"
                  name="memberUserId"
                  type="text"
                  required
                  [ngModel]="memberUserId()"
                  (ngModelChange)="memberUserId.set($event)"
                  placeholder="UUID da conta"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                />
              </div>
              <div>
                <label for="member-role" class="mb-2 block text-sm font-medium text-slate-200">
                  Papel no workspace
                </label>
                <select
                  id="member-role"
                  name="memberRole"
                  [ngModel]="memberRole()"
                  (ngModelChange)="memberRole.set($event)"
                  class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                >
                  <option value="MEMBER">Membro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p class="mt-2 text-xs text-slate-500">
                  Administradores podem gerenciar membros e excluir o workspace.
                </p>
              </div>
            } @else {
              <p class="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                Esta operação não pode ser desfeita.
              </p>
            }

            @if (actionError()) {
              <p class="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200" role="alert">
                {{ actionError() }}
              </p>
            }

            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="closeDialog()"
                [disabled]="isSubmittingAction()"
                class="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmittingAction()"
                [class.bg-indigo-500]="!isDeletionDialog()"
                [class.hover:bg-indigo-400]="!isDeletionDialog()"
                [class.bg-rose-600]="isDeletionDialog()"
                [class.hover:bg-rose-500]="isDeletionDialog()"
                class="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60"
              >
                {{ isSubmittingAction() ? 'Processando...' : (isDeletionDialog() ? 'Excluir' : 'Confirmar') }}
              </button>
            </div>
          </form>
        </section>
      </div>
    }
  `,
})
export class ChatLayoutComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private channelsRequest?: Subscription;
  private copyFeedbackTimeout?: ReturnType<typeof setTimeout>;

  readonly currentUser = this.authService.currentUser;

  readonly workspaces = signal<Workspace[]>([]);
  readonly selectedWorkspaceId = signal<string | null>(null);
  readonly channels = signal<Channel[]>([]);
  readonly selectedChannelId = signal<string | null>(null);
  readonly mobileChatView = signal(false);

  readonly isLoadingWorkspaces = signal(false);
  readonly isLoadingChannels = signal(false);
  readonly workspaceError = signal<string | null>(null);
  readonly channelsError = signal<string | null>(null);
  readonly activeDialog = signal<ChatDialog | null>(null);
  readonly deletionTarget = signal<DeletionTarget | null>(null);
  readonly workspaceName = signal('');
  readonly channelName = signal('');
  readonly channelDescription = signal('');
  readonly channelIsPrivate = signal(false);
  readonly memberUserId = signal('');
  readonly memberRole = signal<WorkspaceMemberRole>('MEMBER');
  readonly isSubmittingAction = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly actionNotice = signal<string | null>(null);
  readonly copyFeedback = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
    });
  }

  readonly selectedWorkspace = computed(
    () => this.workspaces().find((workspace) => workspace.id === this.selectedWorkspaceId()) ?? null,
  );
  readonly selectedChannel = computed(
    () => this.channels().find((channel) => channel.id === this.selectedChannelId()) ?? null,
  );

  openDialog(dialog: ChatDialog): void {
    if (dialog !== 'workspace' && !this.selectedWorkspaceId()) return;
    if (dialog === 'member' && this.selectedWorkspace()?.role !== 'ADMIN') return;

    this.activeDialog.set(dialog);
    this.actionError.set(null);
    this.actionNotice.set(null);
  }

  closeDialog(): void {
    if (this.isSubmittingAction()) return;

    this.resetDialog();
  }

  private resetDialog(): void {
    this.activeDialog.set(null);
    this.actionError.set(null);
    this.deletionTarget.set(null);
    this.workspaceName.set('');
    this.channelName.set('');
    this.channelDescription.set('');
    this.channelIsPrivate.set(false);
    this.memberUserId.set('');
    this.memberRole.set('MEMBER');
  }

  submitDialog(): void {
    switch (this.activeDialog()) {
      case 'workspace':
        this.createWorkspace();
        break;
      case 'channel':
        this.createChannel();
        break;
      case 'member':
        this.addWorkspaceMember();
        break;
      case 'delete-workspace':
        this.deleteWorkspace();
        break;
      case 'delete-channel':
        this.deleteChannel();
        break;
    }
  }

  isDeletionDialog(): boolean {
    const dialog = this.activeDialog();
    return dialog === 'delete-workspace' || dialog === 'delete-channel';
  }

  requestDeleteWorkspace(workspace: Workspace): void {
    if (workspace.role !== 'ADMIN') return;

    this.deletionTarget.set({ kind: 'workspace', id: workspace.id, name: workspace.name });
    this.openDialog('delete-workspace');
  }

  requestDeleteChannel(channel: Channel): void {
    if (!this.canDeleteChannel(channel)) return;

    this.deletionTarget.set({ kind: 'channel', id: channel.id, name: channel.name });
    this.openDialog('delete-channel');
  }

  canDeleteChannel(channel: Channel): boolean {
    return (
      this.selectedWorkspace()?.role === 'ADMIN' ||
      (!!this.authService.currentUser()?.id &&
        channel.createdById === this.authService.currentUser()?.id)
    );
  }

  getUserInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  async copyUserId(userId: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showCopyFeedback('Cópia indisponível');
      return;
    }

    try {
      await navigator.clipboard.writeText(userId);
      this.showCopyFeedback('Copiado!');
    } catch {
      this.showCopyFeedback('Não foi possível copiar');
    }
  }

  private showCopyFeedback(message: string): void {
    this.copyFeedback.set(message);
    if (this.copyFeedbackTimeout) clearTimeout(this.copyFeedbackTimeout);
    this.copyFeedbackTimeout = setTimeout(() => this.copyFeedback.set(null), 1800);
  }

  private deleteWorkspace(): void {
    const target = this.deletionTarget();
    if (!target || target.kind !== 'workspace') return;

    this.actionError.set(null);
    this.isSubmittingAction.set(true);
    this.chatService
      .deleteWorkspace(target.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAction.set(false)),
      )
      .subscribe({
        next: () => {
          const remaining = this.workspaces().filter((workspace) => workspace.id !== target.id);
          const wasSelected = this.selectedWorkspaceId() === target.id;
          this.workspaces.set(remaining);
          this.resetDialog();
          this.actionNotice.set('Workspace excluído.');

          if (wasSelected) {
            this.mobileChatView.set(false);
            this.selectedWorkspaceId.set(null);
            this.channels.set([]);
            this.selectedChannelId.set(null);
            const nextWorkspace = remaining[0];
            if (nextWorkspace) this.selectWorkspace(nextWorkspace);
          }
        },
        error: () => {
          this.actionError.set('Não foi possível excluir o workspace. Verifique sua permissão e tente novamente.');
        },
      });
  }

  private deleteChannel(): void {
    const target = this.deletionTarget();
    const workspaceId = this.selectedWorkspaceId();
    if (!target || target.kind !== 'channel' || !workspaceId) return;

    this.actionError.set(null);
    this.isSubmittingAction.set(true);
    this.chatService
      .deleteChannel(workspaceId, target.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAction.set(false)),
      )
      .subscribe({
        next: () => {
          const remaining = this.channels().filter((channel) => channel.id !== target.id);
          const wasSelected = this.selectedChannelId() === target.id;
          this.channels.set(remaining);
          if (wasSelected) {
            this.selectedChannelId.set(remaining[0]?.id ?? null);
            if (remaining.length === 0) this.mobileChatView.set(false);
          }
          this.resetDialog();
          this.actionNotice.set('Canal excluído.');
        },
        error: () => {
          this.actionError.set('Não foi possível excluir o canal. Verifique sua permissão e tente novamente.');
        },
      });
  }

  private createWorkspace(): void {
    const name = this.workspaceName().trim();
    if (!name) return;

    const slug = this.createWorkspaceSlug(name);
    this.actionError.set(null);
    this.isSubmittingAction.set(true);

    this.chatService
      .createWorkspace({ name, slug })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAction.set(false)),
      )
      .subscribe({
        next: (workspace) => {
          this.workspaces.update((workspaces) => [workspace, ...workspaces]);
          this.resetDialog();
          this.selectWorkspace(workspace);
        },
        error: () => {
          this.actionError.set('Nao foi possivel criar o workspace. O nome pode ja estar em uso.');
        },
      });
  }

  private createChannel(): void {
    const workspaceId = this.selectedWorkspaceId();
    const name = this.channelName().trim();
    if (!workspaceId || !name) return;

    this.actionError.set(null);
    this.isSubmittingAction.set(true);

    this.chatService
      .createChannel(workspaceId, {
        name,
        description: this.channelDescription().trim() || undefined,
        isPrivate: this.channelIsPrivate(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAction.set(false)),
      )
      .subscribe({
        next: (channel) => {
          this.channels.update((channels) => [...channels, channel]);
          this.selectedChannelId.set(channel.id);
          this.mobileChatView.set(true);
          this.resetDialog();
        },
        error: () => {
          this.actionError.set('Nao foi possivel criar o canal neste workspace.');
        },
      });
  }

  private addWorkspaceMember(): void {
    const workspaceId = this.selectedWorkspaceId();
    const userId = this.memberUserId().trim();
    const role = this.memberRole();
    if (!workspaceId || !userId) return;

    this.actionError.set(null);
    this.isSubmittingAction.set(true);

    this.chatService
      .addWorkspaceMember(workspaceId, { userId, role })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmittingAction.set(false)),
      )
      .subscribe({
        next: () => {
          this.resetDialog();
          this.actionNotice.set('Membro adicionado ao workspace.');
        },
        error: () => {
          this.actionError.set('Nao foi possivel adicionar o membro. Verifique o UUID e sua permissao de administrador.');
        },
      });
  }

  private createWorkspaceSlug(name: string): string {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .replace(/-+$/g, '');

    return slug.length >= 3 ? slug : `ws-${slug || 'novo'}`;
  }

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

    this.mobileChatView.set(false);
    this.selectedWorkspaceId.set(workspace.id);
    this.selectedChannelId.set(null);
    this.channels.set([]);
    this.channelsError.set(null);
    this.loadChannels(workspace.id);
  }

  selectChannel(channel: Channel): void {
    this.selectedChannelId.set(channel.id);
    this.mobileChatView.set(true);
  }

  showMobileNavigation(): void {
    this.mobileChatView.set(false);
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
