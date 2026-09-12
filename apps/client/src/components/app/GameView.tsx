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
  gameStatus: string;
  onBackToLobby: () => void;
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
  gameStatus,
  onBackToLobby,
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
    <section className="game-view">
      <div className="game-toolbar">
        <div className="game-toolbar-title">
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
        <div className="game-toolbar-meta">
          <span className="game-status-pill">
            <span className="live-dot" /> {gameStatusText(selectedGame.status, spectatorMode, t)}
          </span>
          <span className="game-code-label">{gameStatus}</span>
          {!spectatorMode && (
            <button className="secondary-button" type="button" onClick={onCopyLink}>
              {linkCopied ? t('game.linkCopied') : t('game.copyLink')}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onCopySpectatorLink}>
            {spectatorLinkCopied ? t('game.spectatorLinkCopied') : t('game.copySpectatorLink')}
          </button>
          {!spectatorMode && selectedGame.status === 'active' ? (
            <button className="tiny-button danger" type="button" onClick={onResign}>
              {t('game.resign')}
            </button>
          ) : null}
        </div>
      </div>
      <div className="game-layout">
        <div className="scene-card" aria-label={t('game.board')}>
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
              camera={{ position: [0, 9.6, 11.8], fov: 46 }}
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
        <aside className="game-panel" aria-label={t('game.info')}>
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
          <div className="panel-section move-history">
            <div className="moves-heading">
              <span className="panel-label">{t('game.moveHistory')}</span>
              <span className="muted">{t('game.san')}</span>
            </div>
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
          <div className="fen-box">
            <span className="panel-label">{t('game.fen')}</span>
            <code>{gameState.fen}</code>
          </div>
          <button className="quiet-button panel-back-button" type="button" onClick={onBackToLobby}>
            ← {t('game.backToLobby')}
          </button>
        </aside>
        <aside className="chat-column" aria-label={t('chat.title')}>
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
              <label htmlFor="chat-message">{t('chat.messageLabel')}</label>
              <div className="chat-input-row">
                <input
                  id="chat-message"
                  maxLength={500}
                  value={chatDraft}
                  onChange={(event) => onChatDraftChange(event.target.value)}
                  placeholder={t('chat.placeholder')}
                />
                <button className="tiny-button" type="submit">
                  {t('chat.send')}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
