import type { Translator } from '../../i18n';

export function LobbyUnavailablePopover({
  code,
  onClose,
  t,
}: Readonly<{ code: string; onClose: () => void; t: Translator }>) {
  return (
    <dialog className="lobby-unavailable-popover" open aria-label={t('lobby.unavailableTitle')}>
      <div>
        <strong>{t('lobby.unavailableTitle')}</strong>
        <p>{t('lobby.unavailableDescription').replace('{code}', code)}</p>
      </div>
      <button
        aria-label={t('lobby.closeNotice')}
        className="quiet-button"
        type="button"
        onClick={onClose}
      >
        ×
      </button>
    </dialog>
  );
}
