export const SESSION_COOKIE = 'chess3d_session';

export function readSessionToken(cookieHeader: string | undefined): string | undefined {
  const sessionCookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return sessionCookie?.slice(SESSION_COOKIE.length + 1);
}
