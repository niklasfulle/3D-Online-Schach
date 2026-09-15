import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { Canvas } from '@react-three/fiber';

import type { ChessGame } from '@chess3d/chess-core';
import type { GameSummary, Square } from '@chess3d/shared';

import { ChessScene } from '../../board/ChessScene';
import type { Language, Translator } from '../../i18n';
import type { AuthUser, ChatMessage, MoveRecord } from '../../app/types';
import {
  formatChatTime,
  formatClock,
  gameLabel,
  gameModeLabel,
  isChatNearBottom,
  viewerPlayerLabel,
} from '../../app/utils';

type GameState = ReturnType<ChessGame['getState']>;
type ConfirmationAction = 'delete' | 'resign' | null;

const panelLabelClass = 'text-xs font-bold uppercase tracking-[.12em] text-app-accent';
const mutedClass = 'text-app-text-muted';
const toolbarIconClass =
  'inline-grid size-11 cursor-pointer place-items-center rounded-xl border border-[var(--game-border)] bg-[var(--game-surface-inset)] text-[var(--game-text)] leading-none shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition hover:-translate-y-px hover:border-[var(--game-border-strong)] hover:bg-[var(--game-control-hover)] hover:text-[var(--game-text)] data-[copied=true]:border-[rgb(95_214_153_/_54%)] data-[copied=true]:bg-[rgb(20_59_42_/_92%)] data-[copied=true]:text-[#b8f1cb]';
const toolbarIconSvgClass = 'size-7 shrink-0';
const secondaryButtonClass =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[var(--game-border-strong)] bg-[var(--game-control-hover)] px-3.5 py-2.5 text-center text-xs font-bold text-[var(--game-text)] transition hover:border-[var(--game-border-strong)] hover:brightness-105 active:translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--game-border-strong)] focus-visible:outline-offset-2';
const dangerButtonClass =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-[var(--game-danger-border)] bg-[var(--game-danger)] px-3.5 py-2.5 text-center text-xs font-bold text-[var(--game-danger-text)] shadow-[0_8px_18px_rgb(97_34_54_/_18%)] transition hover:border-[var(--game-danger-border)] hover:bg-[var(--game-danger-hover)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--game-danger-border)] focus-visible:outline-offset-2';

function gameStatusText(
  status: GameSummary['status'],
  positionStatus: GameState['status'],
  spectatorMode: boolean,
  t: Translator,
): string {
  if (status === 'finished') {
    if (positionStatus === 'checkmate') return t('status.checkmate');
    if (positionStatus === 'stalemate') return t('status.stalemate');
    if (positionStatus === 'draw') return t('status.draw');
    return t('status.finished');
  }
  if (spectatorMode) return t('game.spectator');
  if (status === 'active') return t('game.live');
  return t('game.waiting');
}

function turnStatusText(
  status: GameSummary['status'],
  positionStatus: GameState['status'],
  spectatorMode: boolean,
  turnLabel: string,
  t: Translator,
): string {
  if (status === 'finished') return gameStatusText(status, positionStatus, false, t);
  if (spectatorMode) return `${turnLabel} ${t('game.spectatorTurn')}`;
  if (status === 'active') return `${turnLabel} ${t('game.turn')}`;
  return t('game.waitingForOpponent');
}

function stockfishOpponentLabel(
  game: GameSummary,
  t: Translator,
): string | undefined {
  if (game.opponentType !== 'stockfish') return undefined;
  if (game.engineLevel === undefined) return t('game.stockfish');
  return `${t('game.stockfish')} · ${game.engineLevel}`;
}

function GameStatusBadge({
  status,
  positionStatus,
  spectatorMode,
  t,
}: Readonly<{
  status: GameSummary['status'];
  positionStatus: GameState['status'];
  spectatorMode: boolean;
  t: Translator;
}>) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[rgb(95_214_153_/_25%)] bg-[#153d2b] px-3 py-1.5 text-[.72rem] font-bold text-[#b6f4cb]">
      <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />{' '}
      {gameStatusText(status, positionStatus, spectatorMode, t)}
    </span>
  );
}

function GameToolbarActions({
  t,
  spectatorMode,
  linkCopied,
  onCopyLink,
  spectatorLinkCopied,
  onCopySpectatorLink,
  chatOpen,
  desktopLayout,
  onToggleChat,
}: Readonly<{
  t: Translator;
  spectatorMode: boolean;
  linkCopied: boolean;
  onCopyLink: () => void;
  spectatorLinkCopied: boolean;
  onCopySpectatorLink: () => void;
  chatOpen: boolean;
  desktopLayout: boolean;
  onToggleChat: () => void;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 max-[760px]:items-start max-[760px]:flex-col max-[760px]:pl-12">
      {!spectatorMode && <CopyLinkButton t={t} copied={linkCopied} onCopy={onCopyLink} />}
      <CopySpectatorLinkButton t={t} copied={spectatorLinkCopied} onCopy={onCopySpectatorLink} />
      {desktopLayout && <ChatToggleButton t={t} open={chatOpen} onToggle={onToggleChat} />}
    </div>
  );
}

function CopyLinkButton({
  t,
  copied,
  onCopy,
}: Readonly<{ t: Translator; copied: boolean; onCopy: () => void }>) {
  const label = copied ? t('game.linkCopied') : t('game.copyLink');

  return (
    <button
      className={toolbarIconClass}
      type="button"
      aria-label={label}
      title={label}
      data-copied={copied}
      onClick={onCopy}
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </button>
  );
}

function CopySpectatorLinkButton({
  t,
  copied,
  onCopy,
}: Readonly<{ t: Translator; copied: boolean; onCopy: () => void }>) {
  const label = copied ? t('game.spectatorLinkCopied') : t('game.copySpectatorLink');

  return (
    <button
      className={toolbarIconClass}
      type="button"
      aria-label={label}
      title={label}
      data-copied={copied}
      onClick={onCopy}
    >
      {copied ? <CheckIcon /> : <EyeIcon />}
    </button>
  );
}

function ChatToggleButton({
  t,
  open,
  onToggle,
}: Readonly<{ t: Translator; open: boolean; onToggle: () => void }>) {
  const label = open ? t('chat.close') : t('chat.open');

  return (
    <button
      className={`${toolbarIconClass} ${open ? 'border-[var(--game-border-strong)] bg-[var(--game-control-hover)] text-[var(--game-text)]' : ''}`}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-controls="game-chat"
      title={label}
      onClick={onToggle}
    >
      <ChatIcon />
    </button>
  );
}

export function GameToolbar({
  selectedGame,
  positionStatus,
  t,
  spectatorMode,
  linkCopied,
  onBackToLobby,
  onCopyLink,
  spectatorLinkCopied,
  onCopySpectatorLink,
  chatOpen,
  desktopLayout,
  onToggleChat,
}: Readonly<{
  selectedGame: GameSummary;
  positionStatus: GameState['status'];
  t: Translator;
  spectatorMode: boolean;
  linkCopied: boolean;
  onBackToLobby: () => void;
  onCopyLink: () => void;
  spectatorLinkCopied: boolean;
  onCopySpectatorLink: () => void;
  chatOpen: boolean;
  desktopLayout: boolean;
  onToggleChat: () => void;
}>) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-[var(--game-border)] bg-[var(--game-surface)] p-2.5 shadow-[0_2px_10px_rgb(0_0_0_/_8%)] max-xl:flex-wrap">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--game-border)] bg-[var(--game-surface-inset)] text-xl text-[var(--game-text)] transition hover:-translate-x-px hover:border-[var(--game-border-strong)] hover:bg-[var(--game-control-hover)] hover:text-white active:scale-[.97]"
          aria-label={t('game.backToLobby')}
          type="button"
          onClick={onBackToLobby}
        >
          ←
        </button>
        <div>
          <span className={panelLabelClass}>
            {gameModeLabel(selectedGame.mode, t)}
            {selectedGame.opponentType === 'stockfish' && selectedGame.engineLevel !== undefined
              ? ` · ${t('game.stockfish')} · ${t('game.engineLevel')} ${selectedGame.engineLevel}`
              : ''}
          </span>
          <h2 className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-lg tracking-[-.03em] text-[var(--game-text)]">
            {selectedGame.code}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <GameStatusBadge
          status={selectedGame.status}
          positionStatus={positionStatus}
          spectatorMode={spectatorMode}
          t={t}
        />
        <GameToolbarActions
          t={t}
          spectatorMode={spectatorMode}
          linkCopied={linkCopied}
          onCopyLink={onCopyLink}
          spectatorLinkCopied={spectatorLinkCopied}
          onCopySpectatorLink={onCopySpectatorLink}
          chatOpen={chatOpen}
          desktopLayout={desktopLayout}
          onToggleChat={onToggleChat}
        />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className={toolbarIconSvgClass}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4.25 4.25L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      className={toolbarIconSvgClass}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M10 13.5a4.5 4.5 0 0 0 6.36.14l2-2a4.5 4.5 0 0 0-6.36-6.36L10.85 6.43"
        strokeLinecap="round"
      />
      <path
        d="M14 10.5a4.5 4.5 0 0 0-6.36-.14l-2 2A4.5 4.5 0 0 0 12 18.72l1.15-1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      className={toolbarIconSvgClass}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      className={toolbarIconSvgClass}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 11.5a7.5 7.5 0 0 1-7.75 7.5 8.7 8.7 0 0 1-3.14-.59L4 20l1.52-4.07A7.21 7.21 0 0 1 4.5 12 7.5 7.5 0 0 1 12.25 4.5 7.5 7.5 0 0 1 20 11.5Z" />
      <path d="M8.5 11.5h.01M12.25 11.5h.01M16 11.5h.01" strokeLinecap="round" strokeWidth="2.6" />
    </svg>
  );
}

export function GameBoardPanel({
  className = '',
  user,
  selectedGame,
  gameState,
  boardColor,
  legalTargets,
  selectedSquare,
  moveHistory,
  spectatorMode,
  turnLabel,
  t,
  onSelectSquare,
}: Readonly<{
  className?: string;
  user: AuthUser;
  selectedGame: GameSummary;
  gameState: GameState;
  boardColor: 'black' | 'white';
  legalTargets: Square[];
  selectedSquare: Square | null;
  moveHistory: MoveRecord[];
  spectatorMode: boolean;
  turnLabel: string;
  t: Translator;
  onSelectSquare: (square: Square) => void;
}>) {
  return (
    <div
      className={`relative grid min-h-[calc(100dvh-18.5rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-[var(--game-border)] bg-[var(--game-canvas)] shadow-[0_18px_48px_rgb(0_0_0_/_22%)] max-[820px]:min-h-0 ${className}`}
      aria-label={t('game.board')}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--game-divider)] bg-[var(--game-surface-inset)] p-3 max-[760px]:gap-1 max-[760px]:p-2">
        <PlayerCard
          color="white"
          active={gameState.activeColor === 'white'}
          playerId={selectedGame.whitePlayerId}
          userId={user.id}
          spectatorMode={spectatorMode}
          remainingMs={selectedGame.whiteRemainingMs}
          unlimited={selectedGame.timeControl.unlimited === true}
          running={selectedGame.status === 'active' && selectedGame.turnStartedAt !== undefined}
          turnStartedAt={selectedGame.turnStartedAt}
          t={t}
        />
        <span className="text-[.62rem] font-extrabold tracking-[.1em] text-[#637b97]">VS</span>
        <PlayerCard
          color="black"
          active={gameState.activeColor === 'black'}
          playerId={selectedGame.blackPlayerId}
          labelOverride={stockfishOpponentLabel(selectedGame, t)}
          userId={user.id}
          spectatorMode={spectatorMode}
          remainingMs={selectedGame.blackRemainingMs}
          unlimited={selectedGame.timeControl.unlimited === true}
          running={selectedGame.status === 'active' && selectedGame.turnStartedAt !== undefined}
          turnStartedAt={selectedGame.turnStartedAt}
          t={t}
        />
      </div>
      <div className="min-h-0 h-[min(calc(100dvh-23.75rem),calc(100vw-24rem))] w-full min-w-0 overflow-hidden max-[1120px]:h-[min(calc(100dvh-23.75rem),calc(100vw-4rem))] max-[760px]:h-[min(82vw,500px)]">
        <Canvas
          className="!block !h-full !min-h-0 !w-full"
          camera={{
            position: [0, 13.5, boardColor === 'black' ? -16.5 : 16.5],
            rotation: [-0.67, boardColor === 'black' ? Math.PI : 0, 0],
            fov: 36,
          }}
          gl={{ preserveDrawingBuffer: true }}
          onContextMenu={(event) => event.preventDefault()}
          shadows
        >
          <ChessScene
            boardColor={boardColor}
            fen={gameState.fen}
            highlightedSquares={legalTargets}
            lastMove={moveHistory.at(-1)}
            selectedSquare={selectedSquare}
            onSelectSquare={onSelectSquare}
          />
        </Canvas>
      </div>
      <div className="flex justify-between gap-4 border-t border-[var(--game-divider)] bg-[var(--game-surface-inset)] px-3.5 py-2.5 text-[.68rem] text-[var(--game-muted)] max-[760px]:items-start max-[760px]:flex-col max-[760px]:gap-1">
        <span>
          <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />{' '}
          {turnStatusText(selectedGame.status, gameState.status, spectatorMode, turnLabel, t)}
        </span>
        <span>
          {selectedSquare ? `${selectedSquare} ${t('game.selected')}` : t('game.moveBoard')}
        </span>
      </div>
    </div>
  );
}

function PlayerCard({
  color,
  active,
  playerId,
  labelOverride,
  userId,
  spectatorMode,
  remainingMs,
  unlimited,
  running,
  turnStartedAt,
  t,
}: Readonly<{
  color: 'black' | 'white';
  active: boolean;
  playerId?: string;
  labelOverride?: string;
  userId: string;
  spectatorMode: boolean;
  remainingMs: number;
  unlimited: boolean;
  running: boolean;
  turnStartedAt?: number;
  t: Translator;
}>) {
  const isWhite = color === 'white';
  const ticking = running && active && !unlimited;
  const snapshot = useMemo(
    () => ({ remainingMs, receivedAt: Date.now() }),
    [remainingMs, turnStartedAt, ticking],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    const timer = globalThis.setInterval(() => setNow(Date.now()), 250);
    return () => globalThis.clearInterval(timer);
  }, [ticking]);

  const displayedMs = ticking
    ? Math.max(0, snapshot.remainingMs - Math.max(0, now - snapshot.receivedAt))
    : remainingMs;
  return (
    <div
      className={`${isWhite ? '' : 'flex-row-reverse text-right'} flex min-w-0 items-center gap-2 rounded-lg border p-2 text-[var(--game-text)] max-[760px]:gap-1 max-[760px]:p-1 ${active ? 'border-[var(--game-border-strong)] bg-[rgb(69_127_185_/_18%)]' : 'border-transparent'}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg text-base max-[760px]:size-7 ${isWhite ? 'bg-[#dbe7f4] text-[#294c70]' : 'bg-[#273c58] text-[#d2a44f]'}`}
      >
        {isWhite ? '♙' : '♟'}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--game-text)]">
          {labelOverride ?? viewerPlayerLabel(playerId, userId, spectatorMode, t)}
        </strong>
        <span className="text-[.65rem] text-[var(--game-muted)]">
          {isWhite ? t('game.white') : t('game.black')}
        </span>
      </div>
      <strong className="tabular-nums">
        {unlimited ? t('game.unlimited') : formatClock(displayedMs)}
      </strong>
    </div>
  );
}

export function GameInfoPanel({
  t,
  selectedGame,
  gameState,
  moveHistory,
  spectatorMode,
  confirmationAction,
  setConfirmationAction,
  onBackToLobby,
  onDeleteGame,
  onResign,
}: Readonly<{
  t: Translator;
  selectedGame: GameSummary;
  gameState: GameState;
  moveHistory: MoveRecord[];
  spectatorMode: boolean;
  confirmationAction: ConfirmationAction;
  setConfirmationAction: Dispatch<SetStateAction<ConfirmationAction>>;
  onBackToLobby: () => void;
  onDeleteGame: () => void;
  onResign: () => void;
}>) {
  return (
    <aside
      className="grid min-w-0 min-h-0 h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_auto_auto_minmax(0,1fr)_auto] gap-3 self-stretch overflow-hidden rounded-2xl border border-[var(--game-border)] bg-[var(--game-surface)] p-4 shadow-[0_18px_48px_rgb(0_0_0_/_22%)] max-[820px]:min-h-0 max-[820px]:overflow-y-auto"
      aria-label={t('game.info')}
    >
      <div className="flex min-w-0 items-start justify-between gap-2.5">
        <div className="min-w-0">
          <span className={panelLabelClass}>{t('game.overview')}</span>
          <h3 className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--game-text)]">
            {gameLabel(selectedGame, t)}
          </h3>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-[rgb(112_168_255_/_24%)] bg-[rgb(29_56_88_/_80%)] px-2 py-1 text-[.62rem] text-[#c7e2ff]">
          {moveHistory.length} {t('game.moves')}
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div className="grid min-w-0 gap-1 rounded-lg border border-[var(--game-divider)] bg-[var(--game-surface-inset)] p-2.5">
          <span className={`${mutedClass} overflow-hidden text-ellipsis whitespace-nowrap`}>
            {t('game.status')}
          </span>
          <strong className="text-xs text-[var(--game-text)]">
            {gameStatusText(selectedGame.status, gameState.status, false, t)}
          </strong>
        </div>
        <div className="grid min-w-0 gap-1 rounded-lg border border-[var(--game-divider)] bg-[var(--game-surface-inset)] p-2.5">
          <span className={`${mutedClass} overflow-hidden text-ellipsis whitespace-nowrap`}>
            {t('game.timeControl')}
          </span>
          <strong className="text-xs text-[var(--game-text)]">
            {selectedGame.timeControl.unlimited
              ? t('game.unlimited')
              : `${Math.round(selectedGame.timeControl.initialMs / 60000)} ${t('game.minutes')}`}
          </strong>
        </div>
      </div>
      <div className="grid w-full justify-items-center gap-3 border-t border-[var(--game-divider)] pt-3">
        <button
          className="inline-flex min-h-11 w-full max-w-48 cursor-pointer items-center justify-center rounded-xl border border-[var(--game-border)] bg-[var(--game-control-hover)] px-3.5 py-2.5 text-xs font-bold text-[var(--game-text)] transition hover:border-[var(--game-border-strong)] hover:brightness-105 active:translate-y-px focus-visible:outline-2 focus-visible:outline-[var(--game-border-strong)] focus-visible:outline-offset-2"
          type="button"
          onClick={onBackToLobby}
        >
          ← {t('game.backToLobby')}
        </button>
        {spectatorMode ? null : (
          <GameAction
            action="resign"
            visible={selectedGame.status === 'active'}
            confirmationAction={confirmationAction}
            setConfirmationAction={setConfirmationAction}
            t={t}
            onConfirm={onResign}
          />
        )}
        {spectatorMode ? null : (
          <GameAction
            action="delete"
            visible={selectedGame.status === 'waiting'}
            confirmationAction={confirmationAction}
            setConfirmationAction={setConfirmationAction}
            t={t}
            onConfirm={onDeleteGame}
          />
        )}
      </div>
      <div className="row-start-5 grid min-h-0 min-w-0 max-h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden border-t border-[var(--game-divider)] pt-3 max-[820px]:max-h-72">
        <div className="flex items-start justify-between gap-2.5">
          <span className={panelLabelClass}>{t('game.moveHistory')}</span>
          <span className={mutedClass}>{t('game.san')}</span>
        </div>
        <div className="grid min-h-0 min-w-0 max-h-full grid-cols-[minmax(0,1fr)] content-start gap-1.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {moveHistory.length === 0 ? (
            <div className="grid justify-items-center gap-1.5 self-center p-4 text-center text-[var(--game-text)]">
              <span
                className="grid size-10 place-items-center rounded-xl bg-[#1e3d5e] text-xl text-[#d4a34e]"
                aria-hidden="true"
              >
                ♟
              </span>
              <span>{t('game.noMoves')}</span>
              <small className="max-w-60 text-[.68rem] leading-6 text-[var(--game-muted)]">
                {t('game.startsWhenReady')}
              </small>
            </div>
          ) : (
            [...moveHistory].reverse().map((move, reverseIndex) => {
              const index = moveHistory.length - 1 - reverseIndex;

              return (
                <div
                  className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 border-b border-[var(--game-divider)] py-1.5 text-sm"
                  key={`${move.san}-${index}`}
                >
                  <span>
                    {Math.floor(index / 2) + 1}
                    {index % 2 === 0 ? '.' : '…'}
                  </span>
                  <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {move.san}
                  </strong>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="row-start-6 grid min-h-0 min-w-0 gap-1.5 self-start border-t border-[var(--game-divider)] pt-3">
        <span className={panelLabelClass}>{t('game.fen')}</span>
        <code className="min-w-0 break-all text-[.63rem] leading-4 text-[#7189a5]">
          {gameState.fen}
        </code>
      </div>
    </aside>
  );
}

function GameConfirmationDialog({
  dialogId,
  title,
  message,
  cancel,
  confirm,
  onCancel,
  onConfirm,
}: Readonly<{
  dialogId: string;
  title: string;
  message: string;
  cancel: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return () => dialog.close();
    }
    dialog.setAttribute('open', '');
    return () => dialog.removeAttribute('open');
  }, []);

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-message`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] max-w-none rounded-2xl border border-[var(--game-danger-border)] bg-app-surface-raised p-5 text-[var(--game-text)] shadow-[0_24px_64px_rgb(0_0_0_/_40%)] backdrop:bg-black/65 max-[420px]:p-4"
    >
      <h3 id={`${dialogId}-title`} className="m-0 text-lg font-bold leading-snug">
        {title}
      </h3>
      <p
        id={`${dialogId}-message`}
        className="mt-3 mb-0 text-sm leading-6 text-[var(--game-muted)]"
      >
        {message}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
        <button className={secondaryButtonClass} type="button" autoFocus onClick={onCancel}>
          {cancel}
        </button>
        <button className={dangerButtonClass} type="button" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </dialog>
  );
}

function GameAction({
  action,
  visible,
  confirmationAction,
  setConfirmationAction,
  t,
  onConfirm,
}: Readonly<{
  action: 'delete' | 'resign';
  visible: boolean;
  confirmationAction: ConfirmationAction;
  setConfirmationAction: Dispatch<SetStateAction<ConfirmationAction>>;
  t: Translator;
  onConfirm: () => void;
}>) {
  if (!visible) return null;
  const isResign = action === 'resign';
  const dialogId = isResign ? 'resign-confirmation' : 'delete-confirmation';
  const title = isResign ? t('game.resignConfirmTitle') : t('game.deleteConfirmTitle');
  const message = isResign ? t('game.resignConfirmMessage') : t('game.deleteConfirmMessage');
  const label = isResign ? t('game.resign') : t('game.delete');
  const cancel = isResign ? t('game.resignCancel') : t('game.deleteCancel');
  const confirm = isResign ? t('game.resignConfirm') : t('game.deleteConfirm');
  const isOpen = confirmationAction === action;

  return (
    <div className="grid w-full max-w-48 justify-items-center">
      <button
        className={dangerButtonClass}
        type="button"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={() => setConfirmationAction(isOpen ? null : action)}
      >
        {label}
      </button>
      {isOpen ? (
        <GameConfirmationDialog
          dialogId={dialogId}
          title={title}
          message={message}
          cancel={cancel}
          confirm={confirm}
          onCancel={() => setConfirmationAction(null)}
          onConfirm={() => {
            setConfirmationAction(null);
            onConfirm();
          }}
        />
      ) : null}
    </div>
  );
}

export function GameChatPanel({
  userId,
  language,
  t,
  spectatorMode,
  chatMessages,
  chatDraft,
  chatMessagesRef,
  showNewMessages,
  onChatDraftChange,
  onSendChat,
  onScrollToLatest,
  onScrolledNearBottom,
}: Readonly<{
  userId: string;
  language: Language;
  t: Translator;
  spectatorMode: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  chatMessagesRef: RefObject<HTMLDivElement | null>;
  showNewMessages: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
  onScrollToLatest: () => void;
  onScrolledNearBottom: () => void;
}>) {
  return (
    <aside
      id="game-chat"
      className="grid min-w-0 min-h-[calc(100dvh-18.5rem)] h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 self-stretch overflow-hidden rounded-2xl border border-[var(--game-border)] bg-[var(--game-surface)] p-4 shadow-[0_18px_48px_rgb(0_0_0_/_22%)] max-[820px]:min-h-0"
      aria-label={t('chat.title')}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--game-divider)] pb-3">
        <div>
          <span className={panelLabelClass}>{t('chat.title')}</span>
          <h3 className="mt-1 text-sm text-[var(--game-text)]">{t('chat.room')}</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-app-text-muted">
          <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />{' '}
          {spectatorMode ? t('chat.readOnly') : t('chat.live')}
        </span>
      </div>
      <div className="relative min-h-0 overflow-hidden px-0.5">
        <div
          className="grid h-full content-start gap-2.5 overflow-y-auto px-0.5 py-1"
          ref={chatMessagesRef}
          role="log"
          aria-live="polite"
          onScroll={(event) => {
            if (isChatNearBottom(event.currentTarget)) onScrolledNearBottom();
          }}
        >
          {chatMessages.length ? (
            chatMessages.map((message) => (
              <div
                aria-label={`${message.senderUsername}: ${message.message} um ${formatChatTime(message.createdAt, language)}`}
                className={
                  message.senderId === userId
                    ? 'grid w-fit max-w-[92%] justify-self-end gap-1 rounded-[.9rem_.9rem_.3rem_.9rem] border border-[rgb(112_168_255_/_42%)] bg-[linear-gradient(145deg,rgb(56_112_176_/_72%),rgb(38_80_133_/_76%))] px-3 py-2.5 shadow-[0_8px_20px_rgb(0_0_0_/_12%)]'
                    : 'grid w-fit max-w-[92%] gap-1 rounded-[.9rem_.9rem_.9rem_.3rem] border border-[var(--game-divider)] bg-[var(--game-surface-inset)] px-3 py-2.5 shadow-[0_8px_20px_rgb(0_0_0_/_12%)]'
                }
                key={message.id}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-[.72rem] text-[var(--accent)]">
                    {message.senderUsername}
                  </strong>
                  <time
                    className="text-[.65rem] tabular-nums text-[var(--game-muted)]"
                    dateTime={message.createdAt}
                  >
                    {formatChatTime(message.createdAt, language)}
                  </time>
                </div>
                <span className="break-words text-xs leading-6 text-[var(--game-text)]">
                  {message.message}
                </span>
              </div>
            ))
          ) : (
            <span className={mutedClass}>{t('chat.noMessages')}</span>
          )}
        </div>
        {showNewMessages ? (
          <button
            className="absolute bottom-2 right-2 cursor-pointer rounded-full border border-[rgb(112_168_255_/_42%)] bg-[#1d4f84] px-3 py-1.5 text-xs font-bold text-[#eef6ff] shadow-[0_8px_24px_rgb(0_0_0_/_30%)]"
            type="button"
            onClick={onScrollToLatest}
          >
            {t('chat.newMessages')}
          </button>
        ) : null}
      </div>
      {spectatorMode ? (
        <span className={mutedClass}>{t('chat.spectatorHint')}</span>
      ) : (
        <form
          className="grid gap-1.5 border-t border-[var(--game-divider)] pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSendChat();
          }}
        >
          <label className="sr-only" htmlFor="chat-message">
            {t('chat.messageLabel')}
          </label>
          <div className="flex min-w-0 min-h-13 items-center gap-2 rounded-xl border border-[var(--game-border)] bg-[var(--game-surface-inset)] p-1 shadow-[inset_0_1px_0_rgb(255_255_255_/_3%)] transition focus-within:border-[rgb(112_168_255_/_72%)] focus-within:shadow-[0_0_0_3px_rgb(112_168_255_/_14%)]">
            <input
              id="chat-message"
              maxLength={500}
              value={chatDraft}
              onChange={(event) => onChatDraftChange(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2.5 text-[var(--game-text)] outline-none placeholder:text-[var(--game-muted)]"
              placeholder={t('chat.placeholder')}
            />
            <button
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[rgb(142_190_255_/_44%)] bg-[linear-gradient(145deg,#477ebd,#2d609d)] px-3 text-xs font-extrabold text-[#f6faff] shadow-[0_8px_18px_rgb(11_45_82_/_30%)] transition hover:-translate-y-px hover:border-[#d5e8ff] hover:brightness-110 disabled:cursor-not-allowed disabled:border-[rgb(111_151_201_/_18%)] disabled:bg-[rgb(39_61_87_/_68%)] disabled:text-[#7187a1] disabled:shadow-none max-[1360px]:w-11 max-[1360px]:px-2 max-[1360px]:[&>span]:hidden"
              type="submit"
              aria-label={t('chat.send')}
              disabled={!chatDraft.trim()}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m5 12 14-7-4.5 14-3.2-5.1L5 12Z" strokeLinejoin="round" />
                <path d="m11.3 13.9 3.3-3.1" strokeLinecap="round" />
              </svg>
              <span>{t('chat.send')}</span>
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
