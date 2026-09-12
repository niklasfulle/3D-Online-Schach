import { AppFooter } from './components/app/AppFooter';
import { AuthScreen } from './components/app/AuthScreen';
import { AuthenticatedView } from './components/app/AuthenticatedView';
import { GameView } from './components/app/GameView';
import { useAppController } from './app/useAppController';
import { GUEST_SPECTATOR } from './app/types';
import { gameLabel, gameStatusLabel, statusLabel } from './app/utils';

export function App() {
  const controller = useAppController();
  const {
    loading,
    theme,
    t,
    user,
    spectatorCode,
    selectedGame,
    error,
    gameState,
    language,
    selectedSquare,
    legalTargets,
    moveHistory,
    spectatorLinkCopied,
    copySpectatorLink,
    handleSelectSquare,
    chatMessages,
    setError,
    authMode,
    setAuthMode,
    setLanguage,
    setTheme,
    authForm,
    setAuthForm,
    submitAuth,
  } = controller;

  if (loading) {
    return (
      <main className="centered-message" data-theme={theme}>
        <div>{t('guest.connectionHint')} …</div>
        <AppFooter t={t} />
      </main>
    );
  }

  if (!user && spectatorCode) {
    const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
    const gameStatus = selectedGame
      ? `${gameLabel(selectedGame, t)} · ${gameStatusLabel(selectedGame.status, t)}`
      : statusLabel(gameState.status, t);

    return (
      <main className="app-shell game-mode guest-spectator-shell" data-theme={theme}>
        <div className="dashboard-shell">
          <section className="dashboard-main">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{t('guest.eyebrow')}</span>
                <h1>{t('page.game.title')}</h1>
                <p>{t('guest.description')}</p>
              </div>
            </div>
            {error ? (
              <div className="error-banner" role="alert" aria-live="polite">
                <span>
                  <strong>{t('guest.connectionHint')}</strong>
                  {error}
                </span>
                <button
                  aria-label={t('guest.closeHint')}
                  type="button"
                  onClick={() => setError('')}
                >
                  ×
                </button>
              </div>
            ) : null}
            {selectedGame ? (
              <GameView
                user={GUEST_SPECTATOR}
                language={language}
                t={t}
                selectedGame={selectedGame}
                gameState={gameState}
                selectedSquare={selectedSquare}
                legalTargets={legalTargets}
                moveHistory={moveHistory}
                turnLabel={turnLabel}
                gameStatus={gameStatus}
                onBackToLobby={() => globalThis.location.assign('/')}
                handleSelectSquare={handleSelectSquare}
                onCopyLink={() => undefined}
                linkCopied={false}
                spectatorMode
                onCopySpectatorLink={() => void copySpectatorLink()}
                spectatorLinkCopied={spectatorLinkCopied}
                chatMessages={chatMessages}
                chatDraft=""
                onChatDraftChange={() => undefined}
                onSendChat={() => undefined}
                onResign={() => undefined}
              />
            ) : (
              <div className="centered-message">{t('guest.loadingGame')}</div>
            )}
          </section>
        </div>
        <AppFooter t={t} />
      </main>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
        form={authForm}
        setForm={setAuthForm}
        error={error}
        onSubmit={submitAuth}
        t={t}
      />
    );
  }

  return <AuthenticatedView {...controller} />;
}
