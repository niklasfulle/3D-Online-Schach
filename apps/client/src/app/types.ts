import type { Move } from '@chess3d/chess-core';
import type { GameMode, GameSummary, UserRole } from '@chess3d/shared';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role?: UserRole;
}

export const GUEST_SPECTATOR: AuthUser = {
  id: 'guest-spectator',
  username: 'Gastzuschauer',
  rating: 0,
  role: 'spectator',
};

export type AppView =
  'lobby' | 'history' | 'replay' | 'profile' | 'public-profile' | 'friends' | 'admin' | 'game';

export interface PageHeading {
  eyebrow: string;
  title: string;
  description: string;
}

export interface SocialUser extends AuthUser {
  online: boolean;
}

export interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  sender: SocialUser;
  receiver: SocialUser;
}

export interface FriendsOverview {
  friends: SocialUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role: UserRole;
  lastOnline?: string;
}

export interface NotificationItem {
  id: string;
  type: 'friend_request' | 'game_invitation' | 'spectator_invitation';
  title: string;
  message: string;
  gameCode?: string;
  friendRequestId?: string;
  read: boolean;
  createdAt: string;
  actor?: SocialUser;
}

export interface MoveRecord extends Move {
  san: string;
  elapsedMs?: number;
}

export interface AcceptedMove {
  fen: string;
  game: GameSummary;
  move: MoveRecord;
}

export interface GameSync {
  fen: string;
  game: GameSummary;
  moves: MoveRecord[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  createdAt: string;
}

export interface LobbyGame extends GameSummary {
  isOwner: boolean;
}

export interface HistoryPlayer {
  id: string;
  username: string;
}

export interface HistoryMove {
  moveNumber: number;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
  fenAfterMove: string;
  elapsedMs: number;
}

export interface HistoryGame {
  id: string;
  code: string;
  mode: GameMode;
  result: 'white' | 'black' | 'draw' | null;
  createdAt: string;
  finishedAt: string;
  whitePlayer: HistoryPlayer | null;
  blackPlayer: HistoryPlayer | null;
  moves: HistoryMove[];
}

export interface ReplayGame extends HistoryGame {
  initialFen: string;
}

export interface HistoryPage {
  games: HistoryGame[];
  nextCursor?: string;
}

export interface ProfileBreakdown {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface UserProfile {
  user: {
    id: string;
    username: string;
    rating: number;
    createdAt: string;
  };
  stats: ProfileBreakdown & {
    ranked: ProfileBreakdown;
    casual: ProfileBreakdown;
    ratingHistory: Array<{ at: string; rating: number }>;
  };
}

export type HistoryResultFilter = 'all' | 'wins' | 'losses' | 'draws';
export type HistoryModeFilter = 'all' | GameMode;
