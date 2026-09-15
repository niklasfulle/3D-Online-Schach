import { useEffect, useRef, useState } from 'react';

import type { ChessGame } from '@chess3d/chess-core';
import type { GameSummary, Square } from '@chess3d/shared';

import type { Language, Translator } from '../../i18n';
import type { AuthUser, ChatMessage, MoveRecord } from '../../app/types';
import { isChatNearBottom, scrollChatToBottom } from '../../app/utils';
import { GameBoardPanel, GameChatPanel, GameInfoPanel, GameToolbar } from './GameViewParts';

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
  const boardColor = !spectatorMode && selectedGame.blackPlayerId === user.id ? 'black' : 'white';
  const desktopLayout = isCompactGameLayout === false;

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia?.('(max-width: 1360px)');
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
    <section className="grid min-h-0 h-full grid-rows-[auto_minmax(0,1fr)] gap-4">
      <h1 className="sr-only">{t('page.game.title')}</h1>
      <GameToolbar
        selectedGame={selectedGame}
        positionStatus={gameState.status}
        t={t}
        spectatorMode={spectatorMode}
        linkCopied={linkCopied}
        onBackToLobby={onBackToLobby}
        onCopyLink={onCopyLink}
        spectatorLinkCopied={spectatorLinkCopied}
        onCopySpectatorLink={onCopySpectatorLink}
        chatOpen={chatOpen}
        desktopLayout={desktopLayout}
        onToggleChat={() => setChatOpen((open) => !open)}
      />
      <div
        className={
          chatOpen && desktopLayout
            ? 'grid min-h-0 min-w-0 h-full grid-cols-[minmax(32rem,1fr)_18rem_18rem] gap-4 max-[1120px]:grid-cols-[minmax(0,1fr)_18rem] max-[820px]:grid-cols-1'
            : 'grid min-h-0 min-w-0 h-full grid-cols-[minmax(0,1fr)_18rem] gap-4 max-[820px]:grid-cols-1'
        }
      >
        <GameBoardPanel
          className={chatOpen && desktopLayout ? 'max-[1120px]:col-span-full' : ''}
          user={user}
          selectedGame={selectedGame}
          gameState={gameState}
          boardColor={boardColor}
          legalTargets={legalTargets}
          selectedSquare={selectedSquare}
          moveHistory={moveHistory}
          spectatorMode={spectatorMode}
          turnLabel={turnLabel}
          t={t}
          onSelectSquare={handleSelectSquare}
        />
        <GameInfoPanel
          t={t}
          selectedGame={selectedGame}
          gameState={gameState}
          moveHistory={moveHistory}
          spectatorMode={spectatorMode}
          confirmationAction={confirmationAction}
          setConfirmationAction={setConfirmationAction}
          onBackToLobby={onBackToLobby}
          onDeleteGame={onDeleteGame}
          onResign={onResign}
        />
        {chatOpen && desktopLayout ? (
          <GameChatPanel
            language={language}
            t={t}
            spectatorMode={spectatorMode}
            chatMessages={chatMessages}
            chatDraft={chatDraft}
            chatMessagesRef={chatMessagesRef}
            showNewMessages={showNewMessages}
            onChatDraftChange={onChatDraftChange}
            onSendChat={onSendChat}
            onScrollToLatest={scrollToLatestChat}
            onScrolledNearBottom={() => setShowNewMessages(false)}
            userId={user.id}
          />
        ) : null}
      </div>
    </section>
  );
}
