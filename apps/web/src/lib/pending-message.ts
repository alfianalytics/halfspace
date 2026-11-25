const pendingMessages = new Map<string, string>();

export function newSessionId(): string {
  return `chat-${Math.random().toString(36).slice(2, 10)}`;
}

export function setPendingMessage(sessionId: string, text: string): void {
  pendingMessages.set(sessionId, text);
}

export function takePendingMessage(sessionId: string): string | undefined {
  const text = pendingMessages.get(sessionId);
  if (text !== undefined) {
    pendingMessages.delete(sessionId);
  }
  return text;
}
