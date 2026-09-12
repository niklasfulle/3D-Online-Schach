import type { PromotionPiece } from '@chess3d/chess-core';

import { resolveApiUrl } from '../apiUrl';

export const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL,
  globalThis.location ?? { protocol: 'http:', hostname: 'localhost' },
);

export const PROMOTION_OPTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];
