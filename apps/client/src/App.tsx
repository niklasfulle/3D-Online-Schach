import { AppFooter } from './components/app/AppFooter';
import { AuthScreen } from './components/app/AuthScreen';
import { AuthenticatedView } from './components/app/AuthenticatedView';
import { GameView } from './components/app/GameView';
import { useAppController } from './app/useAppController';
import { GUEST_SPECTATOR } from './app/types';

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
      <main
        className="grid min-h-dvh place-items-center bg-app-page p-6 text-app-text max-sm:p-4"
        data-theme={theme}
      >
        <div className="text-center text-app-text-muted">{t('guest.connectionHint')} …</div>
        <AppFooter t={t} />
      </main>
    );
  }

  if (!user && spectatorCode) {
    const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
    return (
      <main
        className="app-shell game-mode guest-spectator-shell grid min-h-dvh bg-app-page text-app-text"
        data-theme={theme}
      >
        <div className="dashboard-shell grid w-full min-w-0">
          <section className="dashboard-main min-w-0 px-[clamp(1rem,3vw,2rem)] py-6">
            <div className="page-heading flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">{t('guest.eyebrow')}</span>
                <h1 className="text-[clamp(2rem,5vw,4rem)] leading-none tracking-[-0.04em] text-app-text-strong">
                  {t('page.game.title')}
                </h1>
                <p className="mt-3 text-app-text-muted">{t('guest.description')}</p>
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
                onBackToLobby={() => globalThis.location.assign('/')}
                onDeleteGame={() => undefined}
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
              <div className="grid min-h-64 place-items-center rounded-2xl border border-app-border bg-app-surface p-6 text-app-text-muted">
                {t('guest.loadingGame')}
              </div>
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
