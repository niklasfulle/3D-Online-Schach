export const DEFAULT_LANGUAGE = 'de' as const;
export const LANGUAGE_STORAGE_KEY = 'chess3d.language';
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type TranslationKey =
  | 'language.label'
  | 'language.de'
  | 'language.en'
  | 'theme.label'
  | 'theme.dark'
  | 'theme.light'
  | 'footer.label'
  | 'footer.version'
  | 'footer.links'
  | 'footer.repository'
  | 'footer.privacy'
  | 'footer.imprint'
  | 'mode.ranked'
  | 'mode.casual'
  | 'mode.correspondence'
  | 'status.check'
  | 'status.checkmate'
  | 'status.stalemate'
  | 'status.draw'
  | 'status.active'
  | 'status.finished'
  | 'player.open'
  | 'player.you'
  | 'player.opponent'
  | 'player.player'
  | 'page.game.eyebrow'
  | 'page.game.title'
  | 'page.game.description'
  | 'page.friends.eyebrow'
  | 'page.friends.title'
  | 'page.friends.description'
  | 'page.history.eyebrow'
  | 'page.history.title'
  | 'page.history.description'
  | 'page.replay.eyebrow'
  | 'page.replay.title'
  | 'page.replay.description'
  | 'page.profile.eyebrow'
  | 'page.profile.title'
  | 'page.profile.description'
  | 'page.publicProfile.eyebrow'
  | 'page.publicProfile.title'
  | 'page.publicProfile.description'
  | 'page.admin.eyebrow'
  | 'page.admin.title'
  | 'page.admin.description'
  | 'page.lobby.eyebrow'
  | 'page.lobby.title'
  | 'page.lobby.description'
  | 'page.correspondence.eyebrow'
  | 'page.correspondence.title'
  | 'page.correspondence.description'
  | 'page.leaderboard.eyebrow'
  | 'page.leaderboard.title'
  | 'page.leaderboard.description'
  | 'game.backToLobby'
  | 'game.ranked'
  | 'game.casual'
  | 'game.correspondence'
  | 'game.stockfish'
  | 'game.engineLevel'
  | 'game.spectator'
  | 'game.live'
  | 'game.waiting'
  | 'game.copyLink'
  | 'game.linkCopied'
  | 'game.copySpectatorLink'
  | 'game.spectatorLinkCopied'
  | 'game.resign'
  | 'game.resignConfirmTitle'
  | 'game.resignConfirmMessage'
  | 'game.resignCancel'
  | 'game.resignConfirm'
  | 'game.delete'
  | 'game.deleteConfirmTitle'
  | 'game.deleteConfirmMessage'
  | 'game.deleteCancel'
  | 'game.deleteConfirm'
  | 'game.board'
  | 'game.white'
  | 'game.black'
  | 'game.waitingForOpponent'
  | 'game.turn'
  | 'game.spectatorTurn'
  | 'game.selected'
  | 'game.moveBoard'
  | 'game.overview'
  | 'game.moves'
  | 'game.status'
  | 'game.timeControl'
  | 'game.unlimited'
  | 'game.minutes'
  | 'game.moveHistory'
  | 'game.san'
  | 'game.noMoves'
  | 'game.startsWhenReady'
  | 'game.fen'
  | 'game.info'
  | 'chat.title'
  | 'chat.room'
  | 'chat.live'
  | 'chat.readOnly'
  | 'chat.noMessages'
  | 'chat.spectatorHint'
  | 'chat.messageLabel'
  | 'chat.placeholder'
  | 'chat.send'
  | 'chat.newMessages'
  | 'chat.open'
  | 'chat.close'
  | 'guest.eyebrow'
  | 'guest.description'
  | 'guest.connectionHint'
  | 'guest.closeHint'
  | 'guest.loadingGame'
  | 'auth.welcome'
  | 'auth.createAccount'
  | 'auth.description'
  | 'auth.username'
  | 'auth.email'
  | 'auth.optional'
  | 'auth.password'
  | 'auth.login'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.noAccount'
  | 'auth.alreadyRegistered'
  | 'header.online'
  | 'notifications.label'
  | 'notifications.refresh'
  | 'notifications.openGame'
  | 'notifications.openSpectator'
  | 'notifications.openFriends'
  | 'notifications.empty'
  | 'history.label'
  | 'history.resultFilter'
  | 'history.modeFilter'
  | 'history.all'
  | 'history.wins'
  | 'history.losses'
  | 'history.draws'
  | 'history.allModes'
  | 'history.empty'
  | 'history.loading'
  | 'history.loadMore'
  | 'history.details'
  | 'history.downloadPgn'
  | 'history.ratingChange'
  | 'history.openReplay'
  | 'history.back'
  | 'history.moves'
  | 'history.noMoves'
  | 'history.opponent'
  | 'history.win'
  | 'history.loss'
  | 'history.draw'
  | 'replay.label'
  | 'replay.title'
  | 'replay.play'
  | 'replay.pause'
  | 'replay.restart'
  | 'replay.previous'
  | 'replay.next'
  | 'replay.speed'
  | 'replay.realtime'
  | 'replay.position'
  | 'replay.moves'
  | 'replay.start'
  | 'replay.ready'
  | 'replay.noMoves'
  | 'profile.label'
  | 'profile.publicLabel'
  | 'profile.summary'
  | 'profile.publicSummary'
  | 'profile.memberSince'
  | 'profile.rating'
  | 'profile.statistics'
  | 'profile.totalGames'
  | 'profile.wins'
  | 'profile.losses'
  | 'profile.draws'
  | 'profile.breakdown'
  | 'profile.modes'
  | 'profile.winsLossesDraws'
  | 'profile.games'
  | 'profile.ratingHistory'
  | 'profile.ratingDevelopment'
  | 'profile.loading'
  | 'sidebar.workspace'
  | 'sidebar.navigation'
  | 'sidebar.lobby'
  | 'sidebar.administration'
  | 'sidebar.friends'
  | 'sidebar.history'
  | 'sidebar.correspondence'
  | 'sidebar.activeGame'
  | 'sidebar.profile'
  | 'sidebar.leaderboard'
  | 'sidebar.rating'
  | 'insight.status'
  | 'insight.ready'
  | 'insight.rating'
  | 'insight.friends'
  | 'insight.quickStart'
  | 'insight.directGame'
  | 'insight.quickStartDescription'
  | 'insight.createGame'
  | 'lobby.nextMove'
  | 'lobby.findGame'
  | 'lobby.description'
  | 'lobby.createCasual'
  | 'lobby.playRanked'
  | 'lobby.playAi'
  | 'lobby.aiTitle'
  | 'lobby.aiDescription'
  | 'lobby.aiLevel'
  | 'lobby.aiLevelEasiest'
  | 'lobby.aiLevelBeginner'
  | 'lobby.aiLevelEasy'
  | 'lobby.aiLevelBalanced'
  | 'lobby.aiLevelChallenging'
  | 'lobby.aiLevelVeryStrong'
  | 'lobby.aiLevelMaximum'
  | 'lobby.aiCancel'
  | 'lobby.startAi'
  | 'lobby.createCorrespondence'
  | 'lobby.correspondenceDescription'
  | 'lobby.openGames'
  | 'lobby.gameModes'
  | 'lobby.serverStatus'
  | 'lobby.liveGames'
  | 'lobby.title'
  | 'lobby.refresh'
  | 'lobby.emptyTitle'
  | 'lobby.emptyDescription'
  | 'lobby.open'
  | 'lobby.join'
  | 'lobby.unavailableTitle'
  | 'lobby.unavailableDescription'
  | 'lobby.closeNotice'
  | 'lobby.delete'
  | 'lobby.deleteGame'
  | 'lobby.deleteSuffix'
  | 'lobby.yourGame'
  | 'lobby.waiting'
  | 'lobby.openGameDescription'
  | 'admin.label'
  | 'admin.title'
  | 'admin.refresh'
  | 'admin.noEmail'
  | 'admin.rating'
  | 'admin.roleFor'
  | 'admin.user'
  | 'admin.admin'
  | 'admin.spectator'
  | 'friends.social'
  | 'friends.title'
  | 'friends.invite'
  | 'friends.inviteSpectator'
  | 'friends.empty'
  | 'friends.incoming'
  | 'friends.outgoing'
  | 'friends.requestSent'
  | 'friends.accept'
  | 'friends.reject'
  | 'friends.findPlayers'
  | 'friends.searchTitle'
  | 'friends.searchPlaceholder'
  | 'friends.search'
  | 'friends.add'
  | 'correspondence.label'
  | 'correspondence.listTitle'
  | 'correspondence.listDescription'
  | 'correspondence.start'
  | 'correspondence.empty'
  | 'correspondence.emptyDescription'
  | 'correspondence.inviteTitle'
  | 'correspondence.inviteDescription'
  | 'correspondence.selectFriend'
  | 'correspondence.preparing'
  | 'correspondence.noFriends'
  | 'correspondence.cancel'
  | 'promotion.label'
  | 'promotion.queen'
  | 'promotion.rook'
  | 'promotion.bishop'
  | 'promotion.knight'
  | 'error.connection'
  | 'error.authentication'
  | 'error.lobbyLoad'
  | 'error.historyLoad'
  | 'error.correspondenceLoad'
  | 'error.replayLoad'
  | 'error.profileLoad'
  | 'error.leaderboardLoad'
  | 'leaderboard.current'
  | 'leaderboard.remaining'
  | 'leaderboard.finished'
  | 'leaderboard.archive'
  | 'leaderboard.empty'
  | 'leaderboard.games'
  | 'leaderboard.wins'
  | 'leaderboard.draws'
  | 'leaderboard.losses'
  | 'leaderboard.season'
  | 'error.friendsLoad'
  | 'error.notificationsUpdate'
  | 'error.gameConnection'
  | 'error.gameOpen'
  | 'error.gameCreate'
  | 'error.gameJoin'
  | 'error.gameDelete'
  | 'error.resign'
  | 'error.roleUpdate'
  | 'error.userSearch'
  | 'error.friendRequest'
  | 'error.request'
  | 'error.invitation'
  | 'error.spectatorInvitation'
  | 'error.copyGameLink'
  | 'error.copySpectatorLink'
  | 'error.chat'
  | 'error.sync'
  | 'error.move'
  | 'notification.friendRequest'
  | 'notification.gameInvitation'
  | 'notification.spectatorInvitation'
  | 'notification.moveTurn'
  | 'notification.friendRequestMessage'
  | 'notification.gameInvitationMessage'
  | 'notification.spectatorInvitationMessage'
  | 'notification.moveTurnMessage';

type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type Translator = (key: TranslationKey) => string;

type TranslationEntry = readonly [TranslationKey, string, string];

const translationEntries: readonly TranslationEntry[] = [
  ["language.label", 'Sprache', 'Language'],
  ["language.de", 'Deutsch', 'German'],
  ["language.en", 'Englisch', 'English'],
  ["theme.label", 'Darstellung', 'Theme'],
  ["theme.dark", 'Dunkel', 'Dark'],
  ["theme.light", 'Hell', 'Light'],
  ["footer.label", 'Footer', 'Footer'],
  ["footer.version", 'Version', 'Version'],
  ["footer.links", 'Produktlinks', 'Product links'],
  ["footer.repository", 'Repository', 'Repository'],
  ["footer.privacy", 'Datenschutz', 'Privacy'],
  ["footer.imprint", 'Impressum', 'Imprint'],
  ["mode.ranked", 'Ranked', 'Ranked'],
  ["mode.casual", 'Casual', 'Casual'],
  ["mode.correspondence", 'Fernpartie', 'Correspondence'],
  ["status.check", 'Schach', 'Check'],
  ["status.checkmate", 'Schachmatt', 'Checkmate'],
  ["status.stalemate", 'Patt', 'Stalemate'],
  ["status.draw", 'Remis', 'Draw'],
  ["status.active", 'Partie läuft', 'Game in progress'],
  ["status.finished", 'Beendet', 'Finished'],
  ["player.open", 'Offen', 'Open'],
  ["player.you", 'Du', 'You'],
  ["player.opponent", 'Gegner', 'Opponent'],
  ["player.player", 'Spieler', 'Player'],
  ["page.game.eyebrow", 'DEINE PARTIE', 'YOUR GAME'],
  ["page.game.title", 'Am Brett', 'At the board'],
  ["page.game.description", 'Konzentriert bleiben. Jeder Zug zählt.', 'Stay focused. Every move counts.'],
  ["page.friends.eyebrow", 'COMMUNITY', 'COMMUNITY'],
  ["page.friends.title", 'Deine Freunde', 'Your friends'],
  ["page.friends.description", 'Finde Spieler, vernetze dich und bleib in Kontakt.', 'Find players, connect and stay in touch.'],
  ["page.history.eyebrow", 'DEINE PARTIEN', 'YOUR GAMES'],
  ["page.history.title", 'Spielhistorie', 'Game history'],
  ["page.history.description", 'Sieh dir deine abgeschlossenen Partien und Züge an.', 'Review your finished games and moves.'],
  ["page.replay.eyebrow", 'WIEDERGABE', 'REPLAY'],
  ["page.replay.title", 'Partie-Replay', 'Game replay'],
  ["page.replay.description", 'Sieh dir die Partie Zug für Zug noch einmal an.', 'Review the game move by move.'],
  ["page.profile.eyebrow", 'DEIN PROFIL', 'YOUR PROFILE'],
  ["page.profile.title", 'Mein Profil', 'My profile'],
  ["page.profile.description", 'Behalte deine Spielstatistiken und Wertungsentwicklung im Blick.', 'Keep your game statistics and rating development in view.'],
  ["page.publicProfile.eyebrow", 'SPIELERPROFIL', 'PLAYER PROFILE'],
  ["page.publicProfile.title", 'Öffentliches Profil', 'Public profile'],
  ["page.publicProfile.description", 'Entdecke die Spielstatistiken dieses Spielers.', "Discover this player's game statistics."],
  ["page.admin.eyebrow", 'VERWALTUNG', 'ADMINISTRATION'],
  ["page.admin.title", 'Benutzerverwaltung', 'User administration'],
  ["page.admin.description", 'Rollen und Zugänge der Community im Blick behalten.', 'Keep community roles and access under control.'],
  ["page.lobby.eyebrow", 'SPIELZENTRALE', 'GAME HUB'],
  ["page.lobby.title", 'Bereit für den nächsten Zug?', 'Ready for your next move?'],
  ["page.lobby.description", 'Finde eine Partie oder eröffne deinen eigenen Raum.', 'Find a game or open your own room.'],
  ["page.correspondence.eyebrow", 'DEINE FERNPARTIEN', 'YOUR CORRESPONDENCE GAMES'],
  ["page.correspondence.title", 'Partien mit Zeit zum Denken', 'Games with time to think'],
  ["page.correspondence.description", 'Spiele private, unbegrenzte Partien in deinem eigenen Tempo.', 'Play private, unlimited games with friends at your own pace.'],
  ["page.leaderboard.eyebrow", 'SAISONWERTUNG', 'SEASON RATING'],
  ["page.leaderboard.title", 'Leaderboard', 'Leaderboard'],
  ["page.leaderboard.description", 'Vergleiche deine Platzierung in der aktuellen und vergangenen Seasons.', 'Compare your position in the current and past seasons.'],
  ["game.backToLobby", 'Zurück zur Lobby', 'Back to lobby'],
  ["game.ranked", 'Ranked-Partie', 'Ranked game'],
  ["game.casual", 'Casual-Partie', 'Casual game'],
  ["game.correspondence", 'Fernpartie', 'Correspondence game'],
  ["game.stockfish", 'Stockfish', 'Stockfish'],
  ["game.engineLevel", 'Stufe', 'Level'],
  ["game.spectator", 'Zuschauer', 'Spectator'],
  ["game.live", 'Live', 'Live'],
  ["game.waiting", 'Wartet', 'Waiting'],
  ["game.copyLink", 'Link kopieren', 'Copy link'],
  ["game.linkCopied", 'Link kopiert', 'Link copied'],
  ["game.copySpectatorLink", 'Zuschauerlink kopieren', 'Copy spectator link'],
  ["game.spectatorLinkCopied", 'Zuschauerlink kopiert', 'Spectator link copied'],
  ["game.resign", 'Aufgeben', 'Resign'],
  ["game.resignConfirmTitle", 'Partie aufgeben', 'Resign game'],
  ["game.resignConfirmMessage", 'Möchtest du die Partie wirklich aufgeben?', 'Are you sure you want to resign this game?'],
  ["game.resignCancel", 'Abbrechen', 'Cancel'],
  ["game.resignConfirm", 'Aufgabe bestätigen', 'Confirm resignation'],
  ["game.delete", 'Partie löschen', 'Delete game'],
  ["game.deleteConfirmTitle", 'Partie löschen', 'Delete game'],
  ["game.deleteConfirmMessage", 'Möchtest du diese wartende Partie wirklich löschen?', 'Are you sure you want to delete this waiting game?'],
  ["game.deleteCancel", 'Abbrechen', 'Cancel'],
  ["game.deleteConfirm", 'Löschung bestätigen', 'Confirm deletion'],
  ["game.board", '3D-Schachbrett', '3D chess board'],
  ["game.white", 'Weiß', 'White'],
  ["game.black", 'Schwarz', 'Black'],
  ["game.waitingForOpponent", 'Warte auf einen Gegner', 'Waiting for an opponent'],
  ["game.turn", 'am Zug', 'to move'],
  ["game.spectatorTurn", 'am Zug · nur Zuschauen', 'to move · spectating only'],
  ["game.selected", 'ausgewählt', 'selected'],
  ["game.moveBoard", 'Brett mit rechter Maustaste verschieben', 'Move board with the right mouse button'],
  ["game.overview", 'Partieübersicht', 'Game overview'],
  ["game.moves", 'Züge', 'moves'],
  ["game.status", 'Status', 'Status'],
  ["game.timeControl", 'Zeitkontrolle', 'Time control'],
  ["game.unlimited", 'Unbegrenzt', 'Unlimited'],
  ["game.minutes", 'min', 'min'],
  ["game.moveHistory", 'Zugverlauf', 'Move history'],
  ["game.san", 'SAN', 'SAN'],
  ["game.noMoves", 'Noch keine Züge', 'No moves yet'],
  ["game.startsWhenReady", 'Die Partie beginnt, sobald beide Spieler bereit sind.', 'The game starts as soon as both players are ready.'],
  ["game.fen", 'FEN', 'FEN'],
  ["game.info", 'Partieinformationen', 'Game information'],
  ["chat.title", 'Partiechat', 'Game chat'],
  ["chat.room", 'Spielraum', 'Game room'],
  ["chat.live", 'Live', 'Live'],
  ["chat.readOnly", 'Nur lesen', 'Read-only'],
  ["chat.noMessages", 'Noch keine Nachrichten.', 'No messages yet.'],
  ["chat.spectatorHint", 'Als Zuschauer kannst du den Chat mitlesen.', 'As a spectator, you can read the chat.'],
  ["chat.messageLabel", 'Chatnachricht', 'Chat message'],
  ["chat.placeholder", 'Nachricht schreiben …', 'Write a message …'],
  ["chat.send", 'Senden', 'Send'],
  ["chat.newMessages", 'Neue Nachrichten', 'New messages'],
  ["chat.open", 'Chat öffnen', 'Open chat'],
  ["chat.close", 'Chat schließen', 'Close chat'],
  ["guest.eyebrow", 'ZUSCHAUEN', 'SPECTATING'],
  ["guest.description", 'Du siehst diese Partie als Gast im schreibgeschützten Modus.', 'You are watching this game as a guest in read-only mode.'],
  ["guest.connectionHint", 'Verbindungshinweis', 'Connection notice'],
  ["guest.closeHint", 'Hinweis schließen', 'Close notice'],
  ["guest.loadingGame", 'Partie wird geladen …', 'Loading game …'],
  ["auth.welcome", 'Willkommen zurück', 'Welcome back'],
  ["auth.createAccount", 'Konto erstellen', 'Create account'],
  ["auth.description", 'Spiele online, finde Freunde und tritt einer Lobby bei.', 'Play online, find friends and join a lobby.'],
  ["auth.username", 'Benutzername', 'Username'],
  ["auth.email", 'E-Mail', 'Email'],
  ["auth.optional", 'optional', 'optional'],
  ["auth.password", 'Passwort', 'Password'],
  ["auth.login", 'Anmelden', 'Sign in'],
  ["auth.register", 'Registrieren', 'Register'],
  ["auth.logout", 'Abmelden', 'Sign out'],
  ["auth.noAccount", 'Noch kein Konto? Registrieren', 'No account yet? Register'],
  ["auth.alreadyRegistered", 'Bereits registriert? Anmelden', 'Already registered? Sign in'],
  ["header.online", 'Online', 'Online'],
  ["notifications.label", 'Benachrichtigungen', 'Notifications'],
  ["notifications.refresh", 'Aktualisieren', 'Refresh'],
  ["notifications.openGame", 'Partie öffnen', 'Open game'],
  ["notifications.openSpectator", 'Zuschaueransicht öffnen', 'Open spectator view'],
  ["notifications.openFriends", 'Freundebereich öffnen', 'Open friends area'],
  ["notifications.empty", 'Keine neuen Benachrichtigungen.', 'No new notifications.'],
  ["history.label", 'VERLAUF', 'HISTORY'],
  ["history.resultFilter", 'Ergebnis', 'Result'],
  ["history.modeFilter", 'Modus', 'Mode'],
  ["history.all", 'Alle Ergebnisse', 'All results'],
  ["history.wins", 'Siege', 'Wins'],
  ["history.losses", 'Niederlagen', 'Losses'],
  ["history.draws", 'Remis', 'Draws'],
  ["history.allModes", 'Alle Modi', 'All modes'],
  ["history.empty", 'Noch keine abgeschlossenen Partien.', 'No finished games yet.'],
  ["history.loading", 'Lädt …', 'Loading …'],
  ["history.loadMore", 'Mehr laden', 'Load more'],
  ["history.details", 'Partiedetails', 'Game details'],
  ["history.downloadPgn", 'PGN herunterladen', 'Download PGN'],
  ["history.ratingChange", 'Wertungsänderung', 'Rating change'],
  ["history.openReplay", 'Replay öffnen', 'Open replay'],
  ["history.back", 'Zurück zur Historie', 'Back to history'],
  ["history.moves", 'Züge', 'Moves'],
  ["history.noMoves", 'Für diese Partie sind keine Züge gespeichert.', 'No moves were saved for this game.'],
  ["history.opponent", 'Gegner', 'Opponent'],
  ["history.win", 'Sieg', 'Win'],
  ["history.loss", 'Niederlage', 'Loss'],
  ["history.draw", 'Remis', 'Draw'],
  ["replay.label", 'WIEDERGABE', 'REPLAY'],
  ["replay.title", 'Partie abspielen', 'Replay game'],
  ["replay.play", 'Abspielen', 'Play'],
  ["replay.pause", 'Pause', 'Pause'],
  ["replay.restart", 'Von vorne', 'Restart'],
  ["replay.previous", 'Vorheriger Zug', 'Previous move'],
  ["replay.next", 'Nächster Zug', 'Next move'],
  ["replay.speed", 'Geschwindigkeit', 'Speed'],
  ["replay.realtime", 'Echtzeit', 'Real time'],
  ["replay.position", 'Replay-Position', 'Replay position'],
  ["replay.moves", 'Züge', 'moves'],
  ["replay.start", 'Partiestart', 'Game start'],
  ["replay.ready", 'Bereit', 'Ready'],
  ["replay.noMoves", 'Keine Züge vorhanden', 'No moves available'],
  ["profile.label", 'PROFIL', 'PROFILE'],
  ["profile.publicLabel", 'ÖFFENTLICHES PROFIL', 'PUBLIC PROFILE'],
  ["profile.summary", 'Profilübersicht', 'Profile overview'],
  ["profile.publicSummary", 'Öffentliche Profilübersicht', 'Public profile overview'],
  ["profile.memberSince", 'Dabei seit', 'Member since'],
  ["profile.rating", 'Wertung', 'Rating'],
  ["profile.statistics", 'Spielstatistiken', 'Game statistics'],
  ["profile.totalGames", 'Partien gesamt', 'Total games'],
  ["profile.wins", 'Siege', 'Wins'],
  ["profile.losses", 'Niederlagen', 'Losses'],
  ["profile.draws", 'Remis', 'Draws'],
  ["profile.breakdown", 'AUSWERTUNG', 'BREAKDOWN'],
  ["profile.modes", 'Ranked und Casual', 'Ranked and casual'],
  ["profile.winsLossesDraws", 'Siege / Niederlagen / Remis', 'Wins / losses / draws'],
  ["profile.games", 'Partien', 'games'],
  ["profile.ratingHistory", 'WERTUNGSVERLAUF', 'RATING HISTORY'],
  ["profile.ratingDevelopment", 'Deine Entwicklung', 'Your development'],
  ["profile.loading", 'Profil wird geladen …', 'Loading profile …'],
  ["sidebar.workspace", 'Arbeitsbereich', 'Workspace'],
  ["sidebar.navigation", 'Hauptnavigation', 'Main navigation'],
  ["sidebar.lobby", 'Lobby', 'Lobby'],
  ["sidebar.administration", 'Administration', 'Administration'],
  ["sidebar.friends", 'Freunde', 'Friends'],
  ["sidebar.history", 'Historie', 'History'],
  ["sidebar.correspondence", 'Fernpartien', 'Correspondence'],
  ["sidebar.activeGame", 'Aktive Partie', 'Active game'],
  ["sidebar.profile", 'Dein Profil', 'Your profile'],
  ["sidebar.leaderboard", 'Leaderboard', 'Leaderboard'],
  ["sidebar.rating", 'Wertung', 'Rating'],
  ["insight.status", 'DEIN STATUS', 'YOUR STATUS'],
  ["insight.ready", 'Bereit für eine Partie?', 'Ready for a game?'],
  ["insight.rating", 'Wertung', 'Rating'],
  ["insight.friends", 'Freunde', 'Friends'],
  ["insight.quickStart", 'Schnellstart', 'Quick start'],
  ["insight.directGame", 'Direkt ins Spiel', 'Start a game'],
  ["insight.quickStartDescription", 'Eröffne eine Casual-Partie für deinen nächsten Zug.', 'Open a casual game for your next move.'],
  ["insight.createGame", 'Partie erstellen', 'Create game'],
  ["lobby.nextMove", 'Dein nächster Zug', 'Your next move'],
  ["lobby.findGame", 'Finde deine nächste Partie.', 'Find your next game.'],
  ["lobby.description", 'Spiele entspannt gegen Freunde oder setze deine Wertung aufs Spiel.', 'Play casually with friends or put your rating on the line.'],
  ["lobby.createCasual", 'Casual-Spiel erstellen', 'Create casual game'],
  ["lobby.playRanked", 'Ranked spielen', 'Play ranked'],
  ["lobby.playAi", 'Gegen KI spielen', 'Play against AI'],
  ["lobby.aiTitle", 'Stockfish-Partie', 'Stockfish game'],
  ["lobby.aiDescription", 'Wähle eine Spielstärke von 0 (leicht) bis 20 (stärkste Stufe). Die Stufen sind keine Elo-Angaben.', 'Choose a playing strength from 0 (easiest) to 20 (strongest). These levels are not Elo ratings.'],
  ["lobby.aiLevel", 'Schwierigkeitsstufe', 'Difficulty level'],
  ["lobby.aiLevelEasiest", 'Leichteste Einstellung', 'Easiest setting'],
  ["lobby.aiLevelBeginner", 'Sehr leicht', 'Very easy'],
  ["lobby.aiLevelEasy", 'Leicht', 'Easy'],
  ["lobby.aiLevelBalanced", 'Ausgewogen', 'Balanced'],
  ["lobby.aiLevelChallenging", 'Anspruchsvoll', 'Challenging'],
  ["lobby.aiLevelVeryStrong", 'Sehr stark', 'Very strong'],
  ["lobby.aiLevelMaximum", 'Maximale Stärke', 'Maximum strength'],
  ["lobby.aiCancel", 'Abbrechen', 'Cancel'],
  ["lobby.startAi", 'Partie starten', 'Start game'],
  ["lobby.createCorrespondence", 'Fernpartie starten', 'Start correspondence game'],
  ["lobby.correspondenceDescription", 'Ohne Zeitdruck, nur für eingeladene Freunde.', 'No clock, friends only by invitation.'],
  ["lobby.openGames", 'Offene Partien', 'Open games'],
  ["lobby.gameModes", 'Spielmodi', 'Game modes'],
  ["lobby.serverStatus", 'Serverstatus', 'Server status'],
  ["lobby.liveGames", 'Live-Spiele', 'Live games'],
  ["lobby.title", 'Öffentliche Lobby', 'Public lobby'],
  ["lobby.refresh", 'Aktualisieren', 'Refresh'],
  ["lobby.emptyTitle", 'Noch keine offenen Partien', 'No open games yet'],
  ["lobby.emptyDescription", 'Eröffne ein Spiel und lade andere Spieler ein.', 'Open a game and invite other players.'],
  ["lobby.open", 'Öffnen', 'Open'],
  ["lobby.join", 'Beitreten', 'Join'],
  ["lobby.unavailableTitle", 'Lobby nicht verfügbar', 'Lobby unavailable'],
  ["lobby.unavailableDescription", 'Die Lobby mit dem Code {code} ist nicht mehr verfügbar.', 'The lobby with code {code} is no longer available.'],
  ["lobby.closeNotice", 'Hinweis schließen', 'Close notice'],
  ["lobby.delete", 'Löschen', 'Delete'],
  ["lobby.deleteGame", 'Partie', 'Game'],
  ["lobby.deleteSuffix", 'löschen', 'delete'],
  ["lobby.yourGame", 'Deine Partie', 'Your game'],
  ["lobby.waiting", 'Wartet', 'Waiting'],
  ["lobby.openGameDescription", 'offen', 'open'],
  ["admin.label", 'Admin', 'Admin'],
  ["admin.title", 'Benutzer und Rollen', 'Users and roles'],
  ["admin.refresh", 'Aktualisieren', 'Refresh'],
  ["admin.noEmail", 'Keine E-Mail', 'No email'],
  ["admin.rating", 'Wertung', 'Rating'],
  ["admin.roleFor", 'Rolle für', 'Role for'],
  ["admin.user", 'User', 'User'],
  ["admin.admin", 'Admin', 'Admin'],
  ["admin.spectator", 'Zuschauer', 'Spectator'],
  ["friends.social", 'Social', 'Social'],
  ["friends.title", 'Freundesliste', 'Friends list'],
  ["friends.invite", 'Einladen', 'Invite'],
  ["friends.inviteSpectator", 'Zuschauer einladen', 'Invite spectator'],
  ["friends.empty", 'Noch keine Freunde.', 'No friends yet.'],
  ["friends.incoming", 'Eingehend', 'Incoming'],
  ["friends.outgoing", 'Ausstehend', 'Pending'],
  ["friends.requestSent", 'Anfrage gesendet', 'Request sent'],
  ["friends.accept", 'Annehmen', 'Accept'],
  ["friends.reject", 'Ablehnen', 'Decline'],
  ["friends.findPlayers", 'Spieler finden', 'Find players'],
  ["friends.searchTitle", 'Benutzersuche', 'User search'],
  ["friends.searchPlaceholder", 'z. B. niklas…', 'e.g. niklas…'],
  ["friends.search", 'Suchen', 'Search'],
  ["friends.add", '+ Freund', '+ Friend'],
  ["correspondence.label", 'FERNPARTIEN', 'CORRESPONDENCE'],
  ["correspondence.listTitle", 'Deine Fernpartien', 'Your correspondence games'],
  ["correspondence.listDescription", 'Alle privaten Partien mit deinen Freunden an einem Ort.', 'All private games with your friends in one place.'],
  ["correspondence.start", 'Fernpartie starten', 'Start correspondence game'],
  ["correspondence.empty", 'Noch keine Fernpartie', 'No correspondence games yet'],
  ["correspondence.emptyDescription", 'Starte eine Partie und lade direkt einen Freund ein.', 'Start a game and invite a friend right away.'],
  ["correspondence.inviteTitle", 'Freund zur Fernpartie einladen', 'Invite a friend to correspondence'],
  ["correspondence.inviteDescription", 'Wähle einen bestätigten Freund. Danach öffnest du direkt das Brett.', 'Choose a confirmed friend. Then you go straight to the board.'],
  ["correspondence.selectFriend", 'Freund auswählen', 'Choose a friend'],
  ["correspondence.preparing", 'Deine Fernpartie wird vorbereitet …', 'Preparing your correspondence game …'],
  ["correspondence.noFriends", 'Du hast noch keine bestätigten Freunde zum Einladen.', 'You have no confirmed friends to invite yet.'],
  ["correspondence.cancel", 'Abbrechen', 'Cancel'],
  ["promotion.label", 'Bauernumwandlung', 'Pawn promotion'],
  ["promotion.queen", 'Dame', 'Queen'],
  ["promotion.rook", 'Turm', 'Rook'],
  ["promotion.bishop", 'Läufer', 'Bishop'],
  ["promotion.knight", 'Springer', 'Knight'],
  ["error.connection", 'Die Echtzeitverbindung zur Partie konnte nicht aufgebaut werden', 'The real-time connection to the game could not be established'],
  ["error.authentication", 'Authentifizierung fehlgeschlagen', 'Authentication failed'],
  ["error.lobbyLoad", 'Lobby konnte nicht geladen werden', 'Could not load lobby'],
  ["error.historyLoad", 'Spielhistorie konnte nicht geladen werden', 'Could not load game history'],
  ["error.correspondenceLoad", 'Fernpartien konnten nicht geladen werden', 'Could not load correspondence games'],
  ["error.replayLoad", 'Replay konnte nicht geladen werden', 'Could not load replay'],
  ["error.profileLoad", 'Profil konnte nicht geladen werden', 'Could not load profile'],
  ["error.leaderboardLoad", 'Leaderboard konnte nicht geladen werden', 'Could not load leaderboard'],
  ["leaderboard.current", 'Aktuelle Season', 'Current season'],
  ["leaderboard.remaining", 'Verbleibend', 'Remaining'],
  ["leaderboard.finished", 'Beendet', 'Finished'],
  ["leaderboard.archive", 'Vergangene Seasons', 'Past seasons'],
  ["leaderboard.empty", 'Noch keine gewerteten Partien in dieser Season.', 'No rated games in this season yet.'],
  ["leaderboard.games", 'Partien', 'Games'],
  ["leaderboard.wins", 'Siege', 'Wins'],
  ["leaderboard.draws", 'Remis', 'Draws'],
  ["leaderboard.losses", 'Niederlagen', 'Losses'],
  ["leaderboard.season", 'Season', 'Season'],
  ["error.friendsLoad", 'Freunde konnten nicht geladen werden', 'Could not load friends'],
  ["error.notificationsUpdate", 'Benachrichtigung konnte nicht aktualisiert werden', 'Could not update notification'],
  ["error.gameConnection", 'Partie konnte nicht synchronisiert werden', 'Could not synchronize game'],
  ["error.gameOpen", 'Partie konnte nicht geöffnet werden', 'Could not open game'],
  ["error.gameCreate", 'Partie konnte nicht erstellt werden', 'Could not create game'],
  ["error.gameJoin", 'Partie konnte nicht beigetreten werden', 'Could not join game'],
  ["error.gameDelete", 'Partie konnte nicht gelöscht werden', 'Could not delete game'],
  ["error.resign", 'Partie konnte nicht aufgegeben werden', 'Could not resign game'],
  ["error.roleUpdate", 'Rolle konnte nicht geändert werden', 'Could not update role'],
  ["error.userSearch", 'Benutzersuche fehlgeschlagen', 'User search failed'],
  ["error.friendRequest", 'Freundschaftsanfrage fehlgeschlagen', 'Friend request failed'],
  ["error.request", 'Anfrage konnte nicht verarbeitet werden', 'Could not process request'],
  ["error.invitation", 'Einladung konnte nicht gesendet werden', 'Could not send invitation'],
  ["error.spectatorInvitation", 'Zuschauereinladung konnte nicht gesendet werden', 'Could not send spectator invitation'],
  ["error.copyGameLink", 'Der Partie-Link konnte nicht kopiert werden', 'Could not copy the game link'],
  ["error.copySpectatorLink", 'Der Zuschauerlink konnte nicht kopiert werden', 'Could not copy the spectator link'],
  ["error.chat", 'Nachricht konnte nicht gesendet werden', 'Could not send message'],
  ["error.sync", 'Partie konnte nicht synchronisiert werden', 'Could not synchronize game'],
  ["error.move", 'Zug wurde abgelehnt', 'Move was rejected'],
  ["notification.friendRequest", 'Neue Freundschaftsanfrage', 'New friend request'],
  ["notification.gameInvitation", 'Einladung zu einer Partie', 'Game invitation'],
  ["notification.spectatorInvitation", 'Zuschauereinladung', 'Spectator invitation'],
  ["notification.moveTurn", 'Du bist am Zug', 'Your turn'],
  ["notification.friendRequestMessage", '{username} möchte dich als Freund hinzufügen.', '{username} wants to add you as a friend.'],
  ["notification.gameInvitationMessage", '{username} lädt dich zu einer Partie ein.', '{username} invited you to a game.'],
  ["notification.spectatorInvitationMessage", '{username} lädt dich zum Zuschauen ein.', '{username} invited you to spectate.'],
  ["notification.moveTurnMessage", '{username} hat gezogen. Jetzt bist du am Zug.', '{username} moved. It is your turn.'],
];

const translations = {
  de: Object.fromEntries(translationEntries.map(([key, german]) => [key, german])),
  en: Object.fromEntries(translationEntries.map(([key, , english]) => [key, english])),
} as Record<Language, Record<TranslationKey, string>>;

function browserStorage(): LanguageStorage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

export function readLanguage(
  storage: Pick<Storage, 'getItem'> | null = browserStorage(),
): Language {
  if (!storage) return DEFAULT_LANGUAGE;
  try {
    const stored = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(
  language: Language,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  try {
    storage?.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A blocked or unavailable browser storage must not break the app.
  }
}

export function createTranslator(language: Language): Translator {
  return (key: TranslationKey): string =>
    translations[language][key] ?? translations.de[key] ?? key;
}
