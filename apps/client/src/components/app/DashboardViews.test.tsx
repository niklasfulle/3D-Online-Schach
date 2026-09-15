import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LobbyView } from './DashboardViews.js';
import { createTranslator } from '../../i18n.js';

const translate = (key: string) => key;

afterEach(() => cleanup());

describe('LobbyView Stockfish setup', () => {
  it('offers all 21 Stockfish levels and starts at the selected level', () => {
    const onCreateAi = vi.fn();
    render(
      <LobbyView
        t={translate as never}
        games={[]}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
        onCreateAi={onCreateAi}
        onJoin={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'lobby.playAi' }));
    const levelSelect = screen.getByRole('combobox', { name: 'lobby.aiLevel' });

    expect(Array.from(levelSelect.querySelectorAll('option'), (option) => option.value)).toEqual(
      Array.from({ length: 21 }, (_, level) => String(level)),
    );

    fireEvent.change(levelSelect, { target: { value: '17' } });
    fireEvent.click(screen.getByRole('button', { name: 'lobby.startAi' }));

    expect(onCreateAi).toHaveBeenCalledWith(17);
  });

  it.each([
    ['de', 'Leichteste Einstellung', 'Sehr stark', 'Maximale Stärke'],
    ['en', 'Easiest setting', 'Very strong', 'Maximum strength'],
  ] as const)('describes each selected skill level in %s', (language, easiest, strong, strongest) => {
    const t = createTranslator(language);
    render(
      <LobbyView
        t={t}
        games={[]}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
        onCreateAi={vi.fn()}
        onJoin={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('lobby.playAi') }));
    const levelSelect = screen.getByRole('combobox', { name: t('lobby.aiLevel') });
    const options = Array.from(levelSelect.querySelectorAll('option'));

    expect(options[0]?.textContent).toContain(easiest);
    expect(options[17]?.textContent).toContain(strong);
    expect(options[20]?.textContent).toContain(strongest);
    fireEvent.change(levelSelect, { target: { value: '17' } });
    expect(screen.getByText(strong)).toBeTruthy();
  });

  it('closes with Escape and restores focus to the launcher', () => {
    render(
      <LobbyView
        t={translate as never}
        games={[]}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
        onCreateAi={vi.fn()}
        onJoin={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const launcher = screen.getByRole('button', { name: 'lobby.playAi' });
    fireEvent.click(launcher);
    const dialog = screen.getByRole('dialog');
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'lobby.aiLevel' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
