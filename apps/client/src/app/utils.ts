import type { ChessGame, Move } from '@chess3d/chess-core';
import type { GameSummary } from '@chess3d/shared';

import type { Language, Translator } from '../i18n';
import type {
  AppView,
  AuthUser,
  HistoryGame,
  HistoryResultFilter,
  NotificationItem,
  PageHeading,
} from './types';

export function notificationTitle(
  notification: NotificationItem,
  language: Language,
  t: Translator,
) {
  if (language === 'de') return notification.title;
  if (notification.type === 'friend_request') return t('notification.friendRequest');
  if (notification.type === 'game_invitation') return t('notification.gameInvitation');
  return t('notification.spectatorInvitation');
}

export function notificationMessage(
  notification: NotificationItem,
  language: Language,
  t: Translator,
) {
  if (language === 'de') return notification.message;
  const username = notification.actor?.username ?? t('player.player');
  let key: Parameters<Translator>[0];
  if (notification.type === 'friend_request') {
    key = 'notification.friendRequestMessage';
  } else if (notification.type === 'game_invitation') {
    key = 'notification.gameInvitationMessage';
  } else {
    key = 'notification.spectatorInvitationMessage';
  }
  return t(key).replace('{username}', username);
}

export function statusLabel(status: ReturnType<ChessGame['getStatus']>, t: Translator) {
  switch (status) {
    case 'check':
      return t('status.check');
    case 'checkmate':
      return t('status.checkmate');
    case 'stalemate':
      return t('status.stalemate');
    case 'draw':
      return t('status.draw');
    default:
      return t('status.active');
  }
}

export function gameLabel(game: GameSummary, t: Translator) {
  return `${game.mode === 'ranked' ? t('mode.ranked') : t('mode.casual')} · ${game.code}`;
}

export function gameStatusLabel(status: GameSummary['status'], t: Translator) {
  if (status === 'waiting') return t('game.waiting');
  if (status === 'active') return t('game.live');
  return t('status.finished');
}

export function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function playerLabel(playerId: string | undefined, currentUserId: string, t: Translator) {
  if (!playerId) return t('player.open');
  return playerId === currentUserId ? t('player.you') : t('player.opponent');
}

export function viewerPlayerLabel(
  playerId: string | undefined,
  currentUserId: string,
  spectator: boolean,
  t: Translator,
) {
  if (spectator) return playerId ? t('player.player') : t('player.open');
  return playerLabel(playerId, currentUserId, t);
}

export function pageHeadingFor(view: AppView, t: Translator): PageHeading {
  if (view === 'game') {
    return {
      eyebrow: t('page.game.eyebrow'),
      title: t('page.game.title'),
      description: t('page.game.description'),
    };
  }
  if (view === 'friends') {
    return {
      eyebrow: t('page.friends.eyebrow'),
      title: t('page.friends.title'),
      description: t('page.friends.description'),
    };
  }
  if (view === 'history') {
    return {
      eyebrow: t('page.history.eyebrow'),
      title: t('page.history.title'),
      description: t('page.history.description'),
    };
  }
  if (view === 'profile') {
    return {
      eyebrow: t('page.profile.eyebrow'),
      title: t('page.profile.title'),
      description: t('page.profile.description'),
    };
  }
  if (view === 'public-profile') {
    return {
      eyebrow: t('page.publicProfile.eyebrow'),
      title: t('page.publicProfile.title'),
      description: t('page.publicProfile.description'),
    };
  }
  if (view === 'admin') {
    return {
      eyebrow: t('page.admin.eyebrow'),
      title: t('page.admin.title'),
      description: t('page.admin.description'),
    };
  }
  return {
    eyebrow: t('page.lobby.eyebrow'),
    title: t('page.lobby.title'),
    description: t('page.lobby.description'),
  };
}

export function playerColorForGame(game: GameSummary, userId: string): 'white' | 'black' | null {
  if (game.whitePlayerId === userId) return 'white';
  if (game.blackPlayerId === userId) return 'black';
  return null;
}

export function canSelectSquare(
  promotionMove: Move | null,
  selectedGame: GameSummary | null,
  user: AuthUser | null,
  activeColor: 'white' | 'black',
): boolean {
  if (promotionMove || (selectedGame && selectedGame.status !== 'active')) return false;
  if (!selectedGame && user) return true;
  if (!selectedGame || !user) return false;
  const ownColor = playerColorForGame(selectedGame, user.id);
  return ownColor === activeColor;
}

export function invitationCodeFromPath(pathname: string): string | null {
  const match = /^\/game\/([a-z0-9]+)\/?$/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

export function spectatorCodeFromPath(pathname: string): string | null {
  const match = /^\/watch\/([a-z0-9]+)\/?$/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

export function publicProfileIdFromPath(pathname: string): string | null {
  const match = /^\/users\/([^/]+)\/?$/i.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function viewFromPath(pathname: string): AppView {
  if (invitationCodeFromPath(pathname) || spectatorCodeFromPath(pathname)) return 'game';
  if (publicProfileIdFromPath(pathname)) return 'public-profile';
  if (pathname === '/history' || pathname === '/history/') return 'history';
  if (pathname === '/friends' || pathname === '/friends/') return 'friends';
  if (pathname === '/profile' || pathname === '/profile/') return 'profile';
  if (pathname === '/admin' || pathname === '/admin/') return 'admin';
  return 'lobby';
}

export function pathForView(view: Exclude<AppView, 'game' | 'public-profile'>): string {
  if (view === 'history') return '/history';
  if (view === 'friends') return '/friends';
  if (view === 'profile') return '/profile';
  if (view === 'admin') return '/admin';
  return '/';
}

export function publicProfilePath(id: string): string {
  return `/users/${encodeURIComponent(id)}`;
}

export function gamePath(code: string): string {
  return `/game/${encodeURIComponent(code)}`;
}

export function formatChatTime(createdAt: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

export function formatHistoryDate(createdAt: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));
}

export function historyOutcome(historyGame: HistoryGame, userId: string, t: Translator): string {
  if (historyGame.result === 'draw') return t('history.draw');
  if (!historyGame.result) return t('status.finished');
  const userColor = historyGame.whitePlayer?.id === userId ? 'white' : 'black';
  return historyGame.result === userColor ? t('history.win') : t('history.loss');
}

export function matchesHistoryFilter(
  historyGame: HistoryGame,
  userId: string,
  filter: HistoryResultFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'draws') return historyGame.result === 'draw';
  if (!historyGame.result || historyGame.result === 'draw') return false;
  const userColor = historyGame.whitePlayer?.id === userId ? 'white' : 'black';
  return filter === 'wins' ? historyGame.result === userColor : historyGame.result !== userColor;
}

export function isChatNearBottom(element: HTMLDivElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 64;
}

export function scrollChatToBottom(element: HTMLDivElement): void {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  } else {
    element.scrollTop = element.scrollHeight;
  }
}

export function spectatorPath(code: string): string {
  return `/watch/${encodeURIComponent(code)}`;
}

export function setGamePath(code: string | null): void {
  globalThis.history?.replaceState({}, '', code ? gamePath(code) : '/');
}
