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
  | 'game.backToLobby'
  | 'game.ranked'
  | 'game.casual'
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
  | 'sidebar.activeGame'
  | 'sidebar.profile'
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
  | 'promotion.label'
  | 'promotion.queen'
  | 'promotion.rook'
  | 'promotion.bishop'
  | 'promotion.knight'
  | 'error.connection'
  | 'error.authentication'
  | 'error.lobbyLoad'
  | 'error.historyLoad'
  | 'error.profileLoad'
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
  | 'notification.friendRequestMessage'
  | 'notification.gameInvitationMessage'
  | 'notification.spectatorInvitationMessage';

type LanguageStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type Translator = (key: TranslationKey) => string;

const translations: Record<Language, Record<TranslationKey, string>> = {
  de: {
    'language.label': 'Sprache',
    'language.de': 'Deutsch',
    'language.en': 'Englisch',
    'theme.label': 'Darstellung',
    'theme.dark': 'Dunkel',
    'theme.light': 'Hell',
    'footer.label': 'Footer',
    'footer.version': 'Version',
    'footer.links': 'Produktlinks',
    'footer.repository': 'Repository',
    'footer.privacy': 'Datenschutz',
    'footer.imprint': 'Impressum',
    'mode.ranked': 'Ranked',
    'mode.casual': 'Casual',
    'status.check': 'Schach',
    'status.checkmate': 'Schachmatt',
    'status.stalemate': 'Patt',
    'status.draw': 'Remis',
    'status.active': 'Partie läuft',
    'status.finished': 'Beendet',
    'player.open': 'Offen',
    'player.you': 'Du',
    'player.opponent': 'Gegner',
    'player.player': 'Spieler',
    'page.game.eyebrow': 'DEINE PARTIE',
    'page.game.title': 'Am Brett',
    'page.game.description': 'Konzentriert bleiben. Jeder Zug zählt.',
    'page.friends.eyebrow': 'COMMUNITY',
    'page.friends.title': 'Deine Freunde',
    'page.friends.description': 'Finde Spieler, vernetze dich und bleib in Kontakt.',
    'page.history.eyebrow': 'DEINE PARTIEN',
    'page.history.title': 'Spielhistorie',
    'page.history.description': 'Sieh dir deine abgeschlossenen Partien und Züge an.',
    'page.profile.eyebrow': 'DEIN PROFIL',
    'page.profile.title': 'Mein Profil',
    'page.profile.description': 'Behalte deine Spielstatistiken und Wertungsentwicklung im Blick.',
    'page.publicProfile.eyebrow': 'SPIELERPROFIL',
    'page.publicProfile.title': 'Öffentliches Profil',
    'page.publicProfile.description': 'Entdecke die Spielstatistiken dieses Spielers.',
    'page.admin.eyebrow': 'VERWALTUNG',
    'page.admin.title': 'Benutzerverwaltung',
    'page.admin.description': 'Rollen und Zugänge der Community im Blick behalten.',
    'page.lobby.eyebrow': 'SPIELZENTRALE',
    'page.lobby.title': 'Bereit für den nächsten Zug?',
    'page.lobby.description': 'Finde eine Partie oder eröffne deinen eigenen Raum.',
    'game.backToLobby': 'Zurück zur Lobby',
    'game.ranked': 'Ranked-Partie',
    'game.casual': 'Casual-Partie',
    'game.spectator': 'Zuschauer',
    'game.live': 'Live',
    'game.waiting': 'Wartet',
    'game.copyLink': 'Link kopieren',
    'game.linkCopied': 'Link kopiert',
    'game.copySpectatorLink': 'Zuschauerlink kopieren',
    'game.spectatorLinkCopied': 'Zuschauerlink kopiert',
    'game.resign': 'Aufgeben',
    'game.resignConfirmTitle': 'Partie aufgeben',
    'game.resignConfirmMessage': 'Möchtest du die Partie wirklich aufgeben?',
    'game.resignCancel': 'Abbrechen',
    'game.resignConfirm': 'Aufgabe bestätigen',
    'game.delete': 'Partie löschen',
    'game.deleteConfirmTitle': 'Partie löschen',
    'game.deleteConfirmMessage': 'Möchtest du diese wartende Partie wirklich löschen?',
    'game.deleteCancel': 'Abbrechen',
    'game.deleteConfirm': 'Löschung bestätigen',
    'game.board': '3D-Schachbrett',
    'game.white': 'Weiß',
    'game.black': 'Schwarz',
    'game.waitingForOpponent': 'Warte auf einen Gegner',
    'game.turn': 'am Zug',
    'game.spectatorTurn': 'am Zug · nur Zuschauen',
    'game.selected': 'ausgewählt',
    'game.moveBoard': 'Brett mit rechter Maustaste verschieben',
    'game.overview': 'Partieübersicht',
    'game.moves': 'Züge',
    'game.status': 'Status',
    'game.timeControl': 'Zeitkontrolle',
    'game.minutes': 'min',
    'game.moveHistory': 'Zugverlauf',
    'game.san': 'SAN',
    'game.noMoves': 'Noch keine Züge',
    'game.startsWhenReady': 'Die Partie beginnt, sobald beide Spieler bereit sind.',
    'game.fen': 'FEN',
    'game.info': 'Partieinformationen',
    'chat.title': 'Partiechat',
    'chat.room': 'Spielraum',
    'chat.live': 'Live',
    'chat.readOnly': 'Nur lesen',
    'chat.noMessages': 'Noch keine Nachrichten.',
    'chat.spectatorHint': 'Als Zuschauer kannst du den Chat mitlesen.',
    'chat.messageLabel': 'Chatnachricht',
    'chat.placeholder': 'Nachricht schreiben …',
    'chat.send': 'Senden',
    'chat.newMessages': 'Neue Nachrichten',
    'chat.open': 'Chat öffnen',
    'chat.close': 'Chat schließen',
    'guest.eyebrow': 'ZUSCHAUEN',
    'guest.description': 'Du siehst diese Partie als Gast im schreibgeschützten Modus.',
    'guest.connectionHint': 'Verbindungshinweis',
    'guest.closeHint': 'Hinweis schließen',
    'guest.loadingGame': 'Partie wird geladen …',
    'auth.welcome': 'Willkommen zurück',
    'auth.createAccount': 'Konto erstellen',
    'auth.description': 'Spiele online, finde Freunde und tritt einer Lobby bei.',
    'auth.username': 'Benutzername',
    'auth.email': 'E-Mail',
    'auth.optional': 'optional',
    'auth.password': 'Passwort',
    'auth.login': 'Anmelden',
    'auth.register': 'Registrieren',
    'auth.logout': 'Abmelden',
    'auth.noAccount': 'Noch kein Konto? Registrieren',
    'auth.alreadyRegistered': 'Bereits registriert? Anmelden',
    'header.online': 'Online',
    'notifications.label': 'Benachrichtigungen',
    'notifications.refresh': 'Aktualisieren',
    'notifications.openGame': 'Partie öffnen',
    'notifications.openSpectator': 'Zuschaueransicht öffnen',
    'notifications.empty': 'Keine neuen Benachrichtigungen.',
    'history.label': 'VERLAUF',
    'history.resultFilter': 'Ergebnis',
    'history.modeFilter': 'Modus',
    'history.all': 'Alle Ergebnisse',
    'history.wins': 'Siege',
    'history.losses': 'Niederlagen',
    'history.draws': 'Remis',
    'history.allModes': 'Alle Modi',
    'history.empty': 'Noch keine abgeschlossenen Partien.',
    'history.loading': 'Lädt …',
    'history.loadMore': 'Mehr laden',
    'history.details': 'Partiedetails',
    'history.downloadPgn': 'PGN herunterladen',
    'history.moves': 'Züge',
    'history.noMoves': 'Für diese Partie sind keine Züge gespeichert.',
    'history.opponent': 'Gegner',
    'history.win': 'Sieg',
    'history.loss': 'Niederlage',
    'history.draw': 'Remis',
    'replay.label': 'WIEDERGABE',
    'replay.title': 'Partie abspielen',
    'replay.play': 'Abspielen',
    'replay.pause': 'Pause',
    'replay.restart': 'Von vorne',
    'replay.previous': 'Vorheriger Zug',
    'replay.next': 'Nächster Zug',
    'replay.speed': 'Geschwindigkeit',
    'replay.realtime': 'Echtzeit',
    'replay.position': 'Replay-Position',
    'replay.moves': 'Züge',
    'replay.start': 'Partiestart',
    'replay.ready': 'Bereit',
    'replay.noMoves': 'Keine Züge vorhanden',
    'profile.label': 'PROFIL',
    'profile.publicLabel': 'ÖFFENTLICHES PROFIL',
    'profile.summary': 'Profilübersicht',
    'profile.publicSummary': 'Öffentliche Profilübersicht',
    'profile.memberSince': 'Dabei seit',
    'profile.rating': 'Wertung',
    'profile.statistics': 'Spielstatistiken',
    'profile.totalGames': 'Partien gesamt',
    'profile.wins': 'Siege',
    'profile.losses': 'Niederlagen',
    'profile.draws': 'Remis',
    'profile.breakdown': 'AUSWERTUNG',
    'profile.modes': 'Ranked und Casual',
    'profile.winsLossesDraws': 'Siege / Niederlagen / Remis',
    'profile.games': 'Partien',
    'profile.ratingHistory': 'WERTUNGSVERLAUF',
    'profile.ratingDevelopment': 'Deine Entwicklung',
    'profile.loading': 'Profil wird geladen …',
    'sidebar.workspace': 'Arbeitsbereich',
    'sidebar.navigation': 'Hauptnavigation',
    'sidebar.lobby': 'Lobby',
    'sidebar.administration': 'Administration',
    'sidebar.friends': 'Freunde',
    'sidebar.history': 'Historie',
    'sidebar.activeGame': 'Aktive Partie',
    'sidebar.profile': 'Dein Profil',
    'sidebar.rating': 'Wertung',
    'insight.status': 'DEIN STATUS',
    'insight.ready': 'Bereit für eine Partie?',
    'insight.rating': 'Wertung',
    'insight.friends': 'Freunde',
    'insight.quickStart': 'Schnellstart',
    'insight.directGame': 'Direkt ins Spiel',
    'insight.quickStartDescription': 'Eröffne eine Casual-Partie für deinen nächsten Zug.',
    'insight.createGame': 'Partie erstellen',
    'lobby.nextMove': 'Dein nächster Zug',
    'lobby.findGame': 'Finde deine nächste Partie.',
    'lobby.description': 'Spiele entspannt gegen Freunde oder setze deine Wertung aufs Spiel.',
    'lobby.createCasual': 'Casual-Spiel erstellen',
    'lobby.playRanked': 'Ranked spielen',
    'lobby.openGames': 'Offene Partien',
    'lobby.gameModes': 'Spielmodi',
    'lobby.serverStatus': 'Serverstatus',
    'lobby.liveGames': 'Live-Spiele',
    'lobby.title': 'Öffentliche Lobby',
    'lobby.refresh': 'Aktualisieren',
    'lobby.emptyTitle': 'Noch keine offenen Partien',
    'lobby.emptyDescription': 'Eröffne ein Spiel und lade andere Spieler ein.',
    'lobby.open': 'Öffnen',
    'lobby.join': 'Beitreten',
    'lobby.unavailableTitle': 'Lobby nicht verfügbar',
    'lobby.unavailableDescription': 'Die Lobby mit dem Code {code} ist nicht mehr verfügbar.',
    'lobby.closeNotice': 'Hinweis schließen',
    'lobby.delete': 'Löschen',
    'lobby.deleteGame': 'Partie',
    'lobby.deleteSuffix': 'löschen',
    'lobby.yourGame': 'Deine Partie',
    'lobby.waiting': 'Wartet',
    'lobby.openGameDescription': 'offen',
    'admin.label': 'Admin',
    'admin.title': 'Benutzer und Rollen',
    'admin.refresh': 'Aktualisieren',
    'admin.noEmail': 'Keine E-Mail',
    'admin.rating': 'Wertung',
    'admin.roleFor': 'Rolle für',
    'admin.user': 'User',
    'admin.admin': 'Admin',
    'admin.spectator': 'Zuschauer',
    'friends.social': 'Social',
    'friends.title': 'Freundesliste',
    'friends.invite': 'Einladen',
    'friends.inviteSpectator': 'Zuschauer einladen',
    'friends.empty': 'Noch keine Freunde.',
    'friends.incoming': 'Eingehend',
    'friends.outgoing': 'Ausstehend',
    'friends.requestSent': 'Anfrage gesendet',
    'friends.accept': 'Annehmen',
    'friends.reject': 'Ablehnen',
    'friends.findPlayers': 'Spieler finden',
    'friends.searchTitle': 'Benutzersuche',
    'friends.searchPlaceholder': 'z. B. niklas…',
    'friends.search': 'Suchen',
    'friends.add': '+ Freund',
    'promotion.label': 'Bauernumwandlung',
    'promotion.queen': 'Dame',
    'promotion.rook': 'Turm',
    'promotion.bishop': 'Läufer',
    'promotion.knight': 'Springer',
    'error.connection': 'Die Echtzeitverbindung zur Partie konnte nicht aufgebaut werden',
    'error.authentication': 'Authentifizierung fehlgeschlagen',
    'error.lobbyLoad': 'Lobby konnte nicht geladen werden',
    'error.historyLoad': 'Spielhistorie konnte nicht geladen werden',
    'error.profileLoad': 'Profil konnte nicht geladen werden',
    'error.friendsLoad': 'Freunde konnten nicht geladen werden',
    'error.notificationsUpdate': 'Benachrichtigung konnte nicht aktualisiert werden',
    'error.gameConnection': 'Partie konnte nicht synchronisiert werden',
    'error.gameOpen': 'Partie konnte nicht geöffnet werden',
    'error.gameCreate': 'Partie konnte nicht erstellt werden',
    'error.gameJoin': 'Partie konnte nicht beigetreten werden',
    'error.gameDelete': 'Partie konnte nicht gelöscht werden',
    'error.resign': 'Partie konnte nicht aufgegeben werden',
    'error.roleUpdate': 'Rolle konnte nicht geändert werden',
    'error.userSearch': 'Benutzersuche fehlgeschlagen',
    'error.friendRequest': 'Freundschaftsanfrage fehlgeschlagen',
    'error.request': 'Anfrage konnte nicht verarbeitet werden',
    'error.invitation': 'Einladung konnte nicht gesendet werden',
    'error.spectatorInvitation': 'Zuschauereinladung konnte nicht gesendet werden',
    'error.copyGameLink': 'Der Partie-Link konnte nicht kopiert werden',
    'error.copySpectatorLink': 'Der Zuschauerlink konnte nicht kopiert werden',
    'error.chat': 'Nachricht konnte nicht gesendet werden',
    'error.sync': 'Partie konnte nicht synchronisiert werden',
    'error.move': 'Zug wurde abgelehnt',
    'notification.friendRequest': 'Neue Freundschaftsanfrage',
    'notification.gameInvitation': 'Einladung zu einer Partie',
    'notification.spectatorInvitation': 'Zuschauereinladung',
    'notification.friendRequestMessage': '{username} möchte dich als Freund hinzufügen.',
    'notification.gameInvitationMessage': '{username} lädt dich zu einer Partie ein.',
    'notification.spectatorInvitationMessage': '{username} lädt dich zum Zuschauen ein.',
  },
  en: {
    'language.label': 'Language',
    'language.de': 'German',
    'language.en': 'English',
    'theme.label': 'Theme',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'footer.label': 'Footer',
    'footer.version': 'Version',
    'footer.links': 'Product links',
    'footer.repository': 'Repository',
    'footer.privacy': 'Privacy',
    'footer.imprint': 'Imprint',
    'mode.ranked': 'Ranked',
    'mode.casual': 'Casual',
    'status.check': 'Check',
    'status.checkmate': 'Checkmate',
    'status.stalemate': 'Stalemate',
    'status.draw': 'Draw',
    'status.active': 'Game in progress',
    'status.finished': 'Finished',
    'player.open': 'Open',
    'player.you': 'You',
    'player.opponent': 'Opponent',
    'player.player': 'Player',
    'page.game.eyebrow': 'YOUR GAME',
    'page.game.title': 'At the board',
    'page.game.description': 'Stay focused. Every move counts.',
    'page.friends.eyebrow': 'COMMUNITY',
    'page.friends.title': 'Your friends',
    'page.friends.description': 'Find players, connect and stay in touch.',
    'page.history.eyebrow': 'YOUR GAMES',
    'page.history.title': 'Game history',
    'page.history.description': 'Review your finished games and moves.',
    'page.profile.eyebrow': 'YOUR PROFILE',
    'page.profile.title': 'My profile',
    'page.profile.description': 'Keep your game statistics and rating development in view.',
    'page.publicProfile.eyebrow': 'PLAYER PROFILE',
    'page.publicProfile.title': 'Public profile',
    'page.publicProfile.description': "Discover this player's game statistics.",
    'page.admin.eyebrow': 'ADMINISTRATION',
    'page.admin.title': 'User administration',
    'page.admin.description': 'Keep community roles and access under control.',
    'page.lobby.eyebrow': 'GAME HUB',
    'page.lobby.title': 'Ready for your next move?',
    'page.lobby.description': 'Find a game or open your own room.',
    'game.backToLobby': 'Back to lobby',
    'game.ranked': 'Ranked game',
    'game.casual': 'Casual game',
    'game.spectator': 'Spectator',
    'game.live': 'Live',
    'game.waiting': 'Waiting',
    'game.copyLink': 'Copy link',
    'game.linkCopied': 'Link copied',
    'game.copySpectatorLink': 'Copy spectator link',
    'game.spectatorLinkCopied': 'Spectator link copied',
    'game.resign': 'Resign',
    'game.resignConfirmTitle': 'Resign game',
    'game.resignConfirmMessage': 'Are you sure you want to resign this game?',
    'game.resignCancel': 'Cancel',
    'game.resignConfirm': 'Confirm resignation',
    'game.delete': 'Delete game',
    'game.deleteConfirmTitle': 'Delete game',
    'game.deleteConfirmMessage': 'Are you sure you want to delete this waiting game?',
    'game.deleteCancel': 'Cancel',
    'game.deleteConfirm': 'Confirm deletion',
    'game.board': '3D chess board',
    'game.white': 'White',
    'game.black': 'Black',
    'game.waitingForOpponent': 'Waiting for an opponent',
    'game.turn': 'to move',
    'game.spectatorTurn': 'to move · spectating only',
    'game.selected': 'selected',
    'game.moveBoard': 'Move board with the right mouse button',
    'game.overview': 'Game overview',
    'game.moves': 'moves',
    'game.status': 'Status',
    'game.timeControl': 'Time control',
    'game.minutes': 'min',
    'game.moveHistory': 'Move history',
    'game.san': 'SAN',
    'game.noMoves': 'No moves yet',
    'game.startsWhenReady': 'The game starts as soon as both players are ready.',
    'game.fen': 'FEN',
    'game.info': 'Game information',
    'chat.title': 'Game chat',
    'chat.room': 'Game room',
    'chat.live': 'Live',
    'chat.readOnly': 'Read-only',
    'chat.noMessages': 'No messages yet.',
    'chat.spectatorHint': 'As a spectator, you can read the chat.',
    'chat.messageLabel': 'Chat message',
    'chat.placeholder': 'Write a message …',
    'chat.send': 'Send',
    'chat.newMessages': 'New messages',
    'chat.open': 'Open chat',
    'chat.close': 'Close chat',
    'guest.eyebrow': 'SPECTATING',
    'guest.description': 'You are watching this game as a guest in read-only mode.',
    'guest.connectionHint': 'Connection notice',
    'guest.closeHint': 'Close notice',
    'guest.loadingGame': 'Loading game …',
    'auth.welcome': 'Welcome back',
    'auth.createAccount': 'Create account',
    'auth.description': 'Play online, find friends and join a lobby.',
    'auth.username': 'Username',
    'auth.email': 'Email',
    'auth.optional': 'optional',
    'auth.password': 'Password',
    'auth.login': 'Sign in',
    'auth.register': 'Register',
    'auth.logout': 'Sign out',
    'auth.noAccount': 'No account yet? Register',
    'auth.alreadyRegistered': 'Already registered? Sign in',
    'header.online': 'Online',
    'notifications.label': 'Notifications',
    'notifications.refresh': 'Refresh',
    'notifications.openGame': 'Open game',
    'notifications.openSpectator': 'Open spectator view',
    'notifications.empty': 'No new notifications.',
    'history.label': 'HISTORY',
    'history.resultFilter': 'Result',
    'history.modeFilter': 'Mode',
    'history.all': 'All results',
    'history.wins': 'Wins',
    'history.losses': 'Losses',
    'history.draws': 'Draws',
    'history.allModes': 'All modes',
    'history.empty': 'No finished games yet.',
    'history.loading': 'Loading …',
    'history.loadMore': 'Load more',
    'history.details': 'Game details',
    'history.downloadPgn': 'Download PGN',
    'history.moves': 'Moves',
    'history.noMoves': 'No moves were saved for this game.',
    'history.opponent': 'Opponent',
    'history.win': 'Win',
    'history.loss': 'Loss',
    'history.draw': 'Draw',
    'replay.label': 'REPLAY',
    'replay.title': 'Replay game',
    'replay.play': 'Play',
    'replay.pause': 'Pause',
    'replay.restart': 'Restart',
    'replay.previous': 'Previous move',
    'replay.next': 'Next move',
    'replay.speed': 'Speed',
    'replay.realtime': 'Real time',
    'replay.position': 'Replay position',
    'replay.moves': 'moves',
    'replay.start': 'Game start',
    'replay.ready': 'Ready',
    'replay.noMoves': 'No moves available',
    'profile.label': 'PROFILE',
    'profile.publicLabel': 'PUBLIC PROFILE',
    'profile.summary': 'Profile overview',
    'profile.publicSummary': 'Public profile overview',
    'profile.memberSince': 'Member since',
    'profile.rating': 'Rating',
    'profile.statistics': 'Game statistics',
    'profile.totalGames': 'Total games',
    'profile.wins': 'Wins',
    'profile.losses': 'Losses',
    'profile.draws': 'Draws',
    'profile.breakdown': 'BREAKDOWN',
    'profile.modes': 'Ranked and casual',
    'profile.winsLossesDraws': 'Wins / losses / draws',
    'profile.games': 'games',
    'profile.ratingHistory': 'RATING HISTORY',
    'profile.ratingDevelopment': 'Your development',
    'profile.loading': 'Loading profile …',
    'sidebar.workspace': 'Workspace',
    'sidebar.navigation': 'Main navigation',
    'sidebar.lobby': 'Lobby',
    'sidebar.administration': 'Administration',
    'sidebar.friends': 'Friends',
    'sidebar.history': 'History',
    'sidebar.activeGame': 'Active game',
    'sidebar.profile': 'Your profile',
    'sidebar.rating': 'Rating',
    'insight.status': 'YOUR STATUS',
    'insight.ready': 'Ready for a game?',
    'insight.rating': 'Rating',
    'insight.friends': 'Friends',
    'insight.quickStart': 'Quick start',
    'insight.directGame': 'Start a game',
    'insight.quickStartDescription': 'Open a casual game for your next move.',
    'insight.createGame': 'Create game',
    'lobby.nextMove': 'Your next move',
    'lobby.findGame': 'Find your next game.',
    'lobby.description': 'Play casually with friends or put your rating on the line.',
    'lobby.createCasual': 'Create casual game',
    'lobby.playRanked': 'Play ranked',
    'lobby.openGames': 'Open games',
    'lobby.gameModes': 'Game modes',
    'lobby.serverStatus': 'Server status',
    'lobby.liveGames': 'Live games',
    'lobby.title': 'Public lobby',
    'lobby.refresh': 'Refresh',
    'lobby.emptyTitle': 'No open games yet',
    'lobby.emptyDescription': 'Open a game and invite other players.',
    'lobby.open': 'Open',
    'lobby.join': 'Join',
    'lobby.unavailableTitle': 'Lobby unavailable',
    'lobby.unavailableDescription': 'The lobby with code {code} is no longer available.',
    'lobby.closeNotice': 'Close notice',
    'lobby.delete': 'Delete',
    'lobby.deleteGame': 'Game',
    'lobby.deleteSuffix': 'delete',
    'lobby.yourGame': 'Your game',
    'lobby.waiting': 'Waiting',
    'lobby.openGameDescription': 'open',
    'admin.label': 'Admin',
    'admin.title': 'Users and roles',
    'admin.refresh': 'Refresh',
    'admin.noEmail': 'No email',
    'admin.rating': 'Rating',
    'admin.roleFor': 'Role for',
    'admin.user': 'User',
    'admin.admin': 'Admin',
    'admin.spectator': 'Spectator',
    'friends.social': 'Social',
    'friends.title': 'Friends list',
    'friends.invite': 'Invite',
    'friends.inviteSpectator': 'Invite spectator',
    'friends.empty': 'No friends yet.',
    'friends.incoming': 'Incoming',
    'friends.outgoing': 'Pending',
    'friends.requestSent': 'Request sent',
    'friends.accept': 'Accept',
    'friends.reject': 'Decline',
    'friends.findPlayers': 'Find players',
    'friends.searchTitle': 'User search',
    'friends.searchPlaceholder': 'e.g. niklas…',
    'friends.search': 'Search',
    'friends.add': '+ Friend',
    'promotion.label': 'Pawn promotion',
    'promotion.queen': 'Queen',
    'promotion.rook': 'Rook',
    'promotion.bishop': 'Bishop',
    'promotion.knight': 'Knight',
    'error.connection': 'The real-time connection to the game could not be established',
    'error.authentication': 'Authentication failed',
    'error.lobbyLoad': 'Could not load lobby',
    'error.historyLoad': 'Could not load game history',
    'error.profileLoad': 'Could not load profile',
    'error.friendsLoad': 'Could not load friends',
    'error.notificationsUpdate': 'Could not update notification',
    'error.gameConnection': 'Could not synchronize game',
    'error.gameOpen': 'Could not open game',
    'error.gameCreate': 'Could not create game',
    'error.gameJoin': 'Could not join game',
    'error.gameDelete': 'Could not delete game',
    'error.resign': 'Could not resign game',
    'error.roleUpdate': 'Could not update role',
    'error.userSearch': 'User search failed',
    'error.friendRequest': 'Friend request failed',
    'error.request': 'Could not process request',
    'error.invitation': 'Could not send invitation',
    'error.spectatorInvitation': 'Could not send spectator invitation',
    'error.copyGameLink': 'Could not copy the game link',
    'error.copySpectatorLink': 'Could not copy the spectator link',
    'error.chat': 'Could not send message',
    'error.sync': 'Could not synchronize game',
    'error.move': 'Move was rejected',
    'notification.friendRequest': 'New friend request',
    'notification.gameInvitation': 'Game invitation',
    'notification.spectatorInvitation': 'Spectator invitation',
    'notification.friendRequestMessage': '{username} wants to add you as a friend.',
    'notification.gameInvitationMessage': '{username} invited you to a game.',
    'notification.spectatorInvitationMessage': '{username} invited you to spectate.',
  },
};

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
