type RetryOptions = { retries: number; baseDelayMs: number; retryOn: readonly number[] };
type RetryDetails = { attempt: number; delayMs: number; status: number };

function getErrorStatus(error: unknown): number | undefined {
  const candidate = error as {
    response?: { status?: number; statusCode?: number };
    status?: number;
    statusCode?: number;
  } | null;
  return (
    candidate?.response?.status ??
    candidate?.response?.statusCode ??
    candidate?.status ??
    candidate?.statusCode
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  onRetry: (details: RetryDetails) => void = () => {},
  wait: (delayMs: number) => Promise<unknown> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = getErrorStatus(error);
      if (status == null || !options.retryOn.includes(status) || attempt >= options.retries) {
        throw error;
      }
      const delayMs = options.baseDelayMs * 2 ** attempt;
      onRetry({ attempt: attempt + 1, delayMs, status });
      await wait(delayMs);
    }
  }
}
