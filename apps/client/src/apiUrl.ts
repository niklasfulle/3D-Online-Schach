export function resolveApiUrl(
  configuredApiUrl: string | undefined,
  location: Pick<Location, 'protocol' | 'hostname'>,
): string {
  return configuredApiUrl?.trim() || `${location.protocol}//${location.hostname}:3001`;
}
