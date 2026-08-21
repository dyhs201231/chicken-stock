const DEFAULT_RECENT_EXECUTION_LIMIT = 100;

export function rememberRealtimeExecution(
  seenExecutionIds: Set<string>,
  executionId: string,
  limit = DEFAULT_RECENT_EXECUTION_LIMIT,
) {
  if (seenExecutionIds.has(executionId)) {
    return false;
  }

  seenExecutionIds.add(executionId);

  if (seenExecutionIds.size > limit) {
    const oldestExecutionId = seenExecutionIds.values().next().value;

    if (oldestExecutionId !== undefined) {
      seenExecutionIds.delete(oldestExecutionId);
    }
  }

  return true;
}
