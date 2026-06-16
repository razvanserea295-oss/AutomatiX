




export function getErrorMessage(error: unknown, fallback = 'A apărut o eroare neașteptată'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}


export function getErrorCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code: unknown }).code;
    if (typeof c === 'number') return c;
  }
  return null;
}
