export function normalizePostgresConnectionString(
  connectionString: string,
): string {
  const url = new URL(connectionString)
  const sslmode = url.searchParams.get('sslmode')

  if (
    sslmode === 'prefer' ||
    sslmode === 'require' ||
    sslmode === 'verify-ca'
  ) {
    url.searchParams.set('sslmode', 'verify-full')
    return url.toString()
  }

  return connectionString
}
