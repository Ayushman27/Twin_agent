type EventHandler = (payload: unknown) => void;

/**
 * Thin WebSocket abstraction. Components subscribe to typed event names
 * (see AGENT/TASK/APPROVAL events below) instead of touching the socket.
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();

  connect(url: string) {
    if (this.socket) return;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        this.handlers.get(type)?.forEach((h) => h(payload));
      } catch {
        // ignore malformed frames
      }
    };
  }

  on(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}

export const websocketService = new WebSocketService();

export const WS_EVENTS = {
  AGENT_STARTED: "agent.started",
  AGENT_PLANNING: "agent.planning",
  AGENT_TOOL_CALLED: "agent.tool_called",
  AGENT_WAITING_APPROVAL: "agent.waiting_approval",
  AGENT_COMPLETED: "agent.completed",
  AGENT_FAILED: "agent.failed",
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_COMPLETED: "task.completed",
  APPROVAL_CREATED: "approval.created",
  APPROVAL_UPDATED: "approval.updated",
  NOTIFICATION_CREATED: "notification.created",
} as const;
