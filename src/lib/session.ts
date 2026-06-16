

export function getPromixToken(): string {
  return localStorage.getItem('promix_token') || '';
}
