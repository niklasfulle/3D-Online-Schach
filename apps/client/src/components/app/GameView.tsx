import { useEffect, useRef, useState } from 'react';
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
  isChatNearBottom,
  scrollChatToBottom,
  statusLabel,
  viewerPlayerLabel,
} from '../../app/utils';

export interface GameViewProps {
  user: AuthUser;
  language: Language;
  t: Translator;
  selectedGame: GameSummary;
  gameState: ReturnType<ChessGame['getState']>;
  selectedSquare: Square | null;
  legalTargets: Square[];
  moveHistory: MoveRecord[];
  turnLabel: string;
  onBackToLobby: () => void;
  onDeleteGame: () => void;
  handleSelectSquare: (square: Square) => void;
  onCopyLink: () => void;
  linkCopied: boolean;
  spectatorMode: boolean;
  onCopySpectatorLink: () => void;
  spectatorLinkCopied: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
  onResign: () => void;
}

function gameStatusText(
  status: GameSummary['status'],
  spectatorMode: boolean,
  t: Translator,
): string {
  if (spectatorMode) return t('game.spectator');
  if (status === 'active') return t('game.live');
  if (status === 'finished') return t('status.finished');
  return t('game.waiting');
}

function turnStatusText(
  status: GameSummary['status'],
  spectatorMode: boolean,
  turnLabel: string,
  t: Translator,
): string {
  if (spectatorMode) return `${turnLabel} ${t('game.spectatorTurn')}`;
  if (status === 'active') return `${turnLabel} ${t('game.turn')}`;
  if (status === 'finished') return t('status.finished');
  return t('game.waitingForOpponent');
}

export function GameView({
  user,
  language,
  t,
  selectedGame,
  gameState,
  selectedSquare,
  legalTargets,
  moveHistory,
  turnLabel,
  onBackToLobby,
  onDeleteGame,
  handleSelectSquare,
  onCopyLink,
  linkCopied,
  spectatorMode,
  onCopySpectatorLink,
  spectatorLinkCopied,
  chatMessages,
  chatDraft,
  onChatDraftChange,
  onSendChat,
  onResign,
}: Readonly<GameViewProps>) {
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef<number | null>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [isCompactGameLayout, setIsCompactGameLayout] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'delete' | 'resign' | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(max-width: 1360px)');
    if (!mediaQuery) return;

    const updateLayout = () => setIsCompactGameLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    const element = chatMessagesRef.current;
    if (!element) return;

    const isInitialLoad = previousMessageCountRef.current === null;
    const hasNewMessages =
      previousMessageCountRef.current !== null &&
      chatMessages.length > previousMessageCountRef.current;
    if (isInitialLoad || (hasNewMessages && isChatNearBottom(element))) {
      scrollChatToBottom(element);
      setShowNewMessages(false);
    } else if (hasNewMessages) {
      setShowNewMessages(true);
    }
    previousMessageCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  function scrollToLatestChat() {
    const element = chatMessagesRef.current;
    if (!element) return;
    scrollChatToBottom(element);
    setShowNewMessages(false);
  }

  return (
    <section className="game-view grid gap-4">
      <div className="game-toolbar flex items-center justify-between gap-4 max-xl:flex-wrap">
        <div className="game-toolbar-title flex items-center gap-3">
          <button
            className="back-button"
            aria-label={t('game.backToLobby')}
            type="button"
            onClick={onBackToLobby}
          >
            ←
          </button>
          <div>
            <span className="panel-label">
              {selectedGame.mode === 'ranked' ? t('game.ranked') : t('game.casual')}
            </span>
            <h2>{selectedGame.code}</h2>
          </div>
        </div>
        <div className="game-toolbar-meta flex flex-wrap items-center justify-end gap-2">
          <span className="game-status-pill">
            <span className="live-dot" /> {gameStatusText(selectedGame.status, spectatorMode, t)}
          </span>
          {!spectatorMode && (
            <button
              className="game-toolbar-icon-button"
              type="button"
              aria-label={linkCopied ? t('game.linkCopied') : t('game.copyLink')}
              title={linkCopied ? t('game.linkCopied') : t('game.copyLink')}
              data-copied={linkCopied}
              onClick={onCopyLink}
            >
              {linkCopied ? (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 12 4.25 4.25L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 13.5a4.5 4.5 0 0 0 6.36.14l2-2a4.5 4.5 0 0 0-6.36-6.36L10.85 6.43" strokeLinecap="round" />
                  <path d="M14 10.5a4.5 4.5 0 0 0-6.36-.14l-2 2A4.5 4.5 0 0 0 12 18.72l1.15-1.15" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}
          <button
            className="game-toolbar-icon-button"
            type="button"
            aria-label={spectatorLinkCopied ? t('game.spectatorLinkCopied') : t('game.copySpectatorLink')}
            title={spectatorLinkCopied ? t('game.spectatorLinkCopied') : t('game.copySpectatorLink')}
            data-copied={spectatorLinkCopied}
            onClick={onCopySpectatorLink}
          >
            {spectatorLinkCopied ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m5 12 4.25 4.25L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
          {!isCompactGameLayout ? (
            <button
              className="chat-toolbar-toggle"
              type="button"
              aria-label={chatOpen ? t('chat.close') : t('chat.open')}
              aria-expanded={chatOpen}
              aria-controls="game-chat"
              title={chatOpen ? t('chat.close') : t('chat.open')}
              onClick={() => setChatOpen((open) => !open)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 11.5a7.5 7.5 0 0 1-7.75 7.5 8.7 8.7 0 0 1-3.14-.59L4 20l1.52-4.07A7.21 7.21 0 0 1 4.5 12 7.5 7.5 0 0 1 12.25 4.5 7.5 7.5 0 0 1 20 11.5Z" />
                <path d="M8.5 11.5h.01M12.25 11.5h.01M16 11.5h.01" strokeLinecap="round" strokeWidth="2.6" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={
          chatOpen && !isCompactGameLayout
            ? 'game-layout chat-open grid min-w-0 gap-4'
            : 'game-layout chat-collapsed grid min-w-0 gap-4'
        }
      >
        <div
          className="scene-card relative min-w-0 overflow-hidden"
          aria-label={t('game.board')}
        >
          <div className="player-strip">
            <div
              className={gameState.activeColor === 'white' ? 'player-card active' : 'player-card'}
            >
              <span className="player-avatar light">♙</span>
              <div>
                <strong>
                  {viewerPlayerLabel(selectedGame.whitePlayerId, user.id, spectatorMode, t)}
                </strong>
                <span>{t('game.white')}</span>
              </div>
              <strong className="player-clock">{formatClock(selectedGame.whiteRemainingMs)}</strong>
            </div>
            <span className="versus-badge">VS</span>
            <div
              className={gameState.activeColor === 'black' ? 'player-card active' : 'player-card'}
            >
              <span className="player-avatar dark">♟</span>
              <div>
                <strong>
                  {viewerPlayerLabel(selectedGame.blackPlayerId, user.id, spectatorMode, t)}
                </strong>
                <span>{t('game.black')}</span>
              </div>
              <strong className="player-clock">{formatClock(selectedGame.blackRemainingMs)}</strong>
            </div>
          </div>
          <div className="board-canvas">
            <Canvas
              className="h-full w-full"
              camera={{ position: [0, 9.6, 11.8], fov: 32 }}
              onContextMenu={(event) => event.preventDefault()}
              shadows
            >
              <ChessScene
                fen={gameState.fen}
                highlightedSquares={legalTargets}
                lastMove={moveHistory.at(-1)}
                selectedSquare={selectedSquare}
                onSelectSquare={handleSelectSquare}
              />
            </Canvas>
          </div>
          <div className="board-footer">
            <span>
              <span className="live-dot" />{' '}
              {turnStatusText(selectedGame.status, spectatorMode, turnLabel, t)}
            </span>
            <span>
              {selectedSquare ? `${selectedSquare} ${t('game.selected')}` : t('game.moveBoard')}
            </span>
          </div>
        </div>
        <aside
          className="game-panel grid content-start gap-4 p-4"
          aria-label={t('game.info')}
        >
          <div className="game-panel-header">
            <div>
              <span className="panel-label">{t('game.overview')}</span>
              <h3>{gameLabel(selectedGame, t)}</h3>
            </div>
            <span className="move-count">
              {moveHistory.length} {t('game.moves')}
            </span>
          </div>
          <div className="game-facts">
            <div>
              <span className="muted">{t('game.status')}</span>
              <strong>{statusLabel(gameState.status, t)}</strong>
            </div>
            <div>
              <span className="muted">{t('game.timeControl')}</span>
              <strong>
                {Math.round(selectedGame.timeControl.initialMs / 60000)} {t('game.minutes')}
              </strong>
            </div>
          </div>
          <div className="panel-actions">
            <button className="quiet-button panel-back-button" type="button" onClick={onBackToLobby}>
              ← {t('game.backToLobby')}
            </button>
            {!spectatorMode && selectedGame.status === 'active' ? (
              <div className="resign-action">
                <button
                  className="danger-button game-resign-button"
                  type="button"
                  aria-expanded={confirmationAction === 'resign'}
                  aria-controls="resign-confirmation"
                  onClick={() => setConfirmationAction((action) => (action === 'resign' ? null : 'resign'))}
                >
                  {t('game.resign')}
                </button>
                {confirmationAction === 'resign' ? (
                  <div
                    id="resign-confirmation"
                    className="resign-popover"
                    role="dialog"
                    aria-label={t('game.resignConfirmTitle')}
                  >
                    <strong>{t('game.resignConfirmTitle')}</strong>
                    <p>{t('game.resignConfirmMessage')}</p>
                    <div className="resign-popover-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setConfirmationAction(null)}
                      >
                        {t('game.resignCancel')}
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => {
                          setConfirmationAction(null);
                          onResign();
                        }}
                      >
                        {t('game.resignConfirm')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!spectatorMode && selectedGame.status === 'waiting' ? (
              <div className="resign-action">
                <button
                  className="danger-button game-resign-button"
                  type="button"
                  aria-expanded={confirmationAction === 'delete'}
                  aria-controls="delete-confirmation"
                  onClick={() => setConfirmationAction((action) => (action === 'delete' ? null : 'delete'))}
                >
                  {t('game.delete')}
                </button>
                {confirmationAction === 'delete' ? (
                  <div
                    id="delete-confirmation"
                    className="resign-popover"
                    role="dialog"
                    aria-label={t('game.deleteConfirmTitle')}
                  >
                    <strong>{t('game.deleteConfirmTitle')}</strong>
                    <p>{t('game.deleteConfirmMessage')}</p>
                    <div className="resign-popover-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setConfirmationAction(null)}
                      >
                        {t('game.deleteCancel')}
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => {
                          setConfirmationAction(null);
                          onDeleteGame();
                        }}
                      >
                        {t('game.deleteConfirm')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="panel-section move-history">
            <div className="moves-heading">
              <span className="panel-label">{t('game.moveHistory')}</span>
              <span className="muted">{t('game.san')}</span>
            </div>
            <div className="move-list">
              {moveHistory.length === 0 ? (
                <div className="moves-empty">
                  <span className="empty-icon" aria-hidden="true">
                    ♟
                  </span>
                  <span>{t('game.noMoves')}</span>
                  <small>{t('game.startsWhenReady')}</small>
                </div>
              ) : (
                moveHistory.map((move, index) => (
                  <div className="move-row" key={`${move.san}-${index}`}>
                    <span>
                      {Math.floor(index / 2) + 1}
                      {index % 2 === 0 ? '.' : '…'}
                    </span>
                    <strong>{move.san}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="fen-box">
            <span className="panel-label">{t('game.fen')}</span>
            <code>{gameState.fen}</code>
          </div>
        </aside>
        {chatOpen && !isCompactGameLayout ? (
        <aside
          id="game-chat"
          className="chat-column grid h-full self-stretch grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden p-4"
          aria-label={t('chat.title')}
        >
          <div className="chat-column-header">
            <div>
              <span className="panel-label">{t('chat.title')}</span>
              <h3>{t('chat.room')}</h3>
            </div>
            <span className="chat-presence">
              <span className="live-dot" /> {spectatorMode ? t('chat.readOnly') : t('chat.live')}
            </span>
          </div>
          <div className="chat-log-shell">
            <div
              className="chat-messages"
              ref={chatMessagesRef}
              role="log"
              aria-live="polite"
              onScroll={(event) => {
                if (isChatNearBottom(event.currentTarget)) setShowNewMessages(false);
              }}
            >
              {chatMessages.length ? (
                chatMessages.map((message) => (
                  <div
                    aria-label={`${message.senderUsername}: ${message.message} um ${formatChatTime(message.createdAt, language)}`}
                    className={`chat-message ${message.senderId === user.id ? 'outgoing' : 'incoming'}`}
                    key={message.id}
                  >
                    <div className="chat-message-meta">
                      <strong>{message.senderUsername}</strong>
                      <time dateTime={message.createdAt}>
                        {formatChatTime(message.createdAt, language)}
                      </time>
                    </div>
                    <span>{message.message}</span>
                  </div>
                ))
              ) : (
                <span className="muted">{t('chat.noMessages')}</span>
              )}
            </div>
            {showNewMessages ? (
              <button className="chat-new-messages" type="button" onClick={scrollToLatestChat}>
                {t('chat.newMessages')}
              </button>
            ) : null}
          </div>
          {spectatorMode ? (
            <span className="muted">{t('chat.spectatorHint')}</span>
          ) : (
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSendChat();
              }}
            >
              <label className="sr-only" htmlFor="chat-message">
                {t('chat.messageLabel')}
              </label>
              <div className="chat-input-row">
                <input
                  id="chat-message"
                  maxLength={500}
                  value={chatDraft}
                  onChange={(event) => onChatDraftChange(event.target.value)}
                  placeholder={t('chat.placeholder')}
                />
                <button
                  className="chat-send-button"
                  type="submit"
                  aria-label={t('chat.send')}
                  disabled={!chatDraft.trim()}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 14-7-4.5 14-3.2-5.1L5 12Z" strokeLinejoin="round" />
                    <path d="m11.3 13.9 3.3-3.1" strokeLinecap="round" />
                  </svg>
                  <span>{t('chat.send')}</span>
                </button>
              </div>
            </form>
          )}
        </aside>
        ) : null}
      </div>
    </section>
  );
}
