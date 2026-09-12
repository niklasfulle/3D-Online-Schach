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
        className="grid min-h-dvh grid-rows-[1fr_auto] place-items-center bg-app-page text-app-text"
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
        className="grid min-h-dvh grid-rows-[1fr_auto] bg-[var(--app-bg)] text-app-text"
        data-theme={theme}
      >
        <div className="grid min-h-0 w-full min-w-0 grid-rows-[auto_1fr] overflow-hidden bg-[rgb(12_18_29_/_88%)] backdrop-blur-3xl">
          <section className="w-full min-w-0 px-[clamp(1rem,3vw,2rem)] py-6">
            {error ? (
              <div
                className="flex w-full items-start justify-between gap-4 rounded-xl border border-[#8e4654] bg-[#3d202b] px-4 py-3 text-sm leading-6 text-[#ffdce3]"
                role="alert"
                aria-live="polite"
              >
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
