import { useEffect } from "react";
import { websocketService } from "@shared/services/websocket.service";
import { config } from "@shared/lib/config";

export function useWebSocketEvent<T = unknown>(eventType: string, handler: (payload: T) => void) {
  useEffect(() => {
    websocketService.connect(config.wsUrl);
    const unsubscribe = websocketService.on(eventType, handler as (p: unknown) => void);
    return () => {
      unsubscribe();
    };
  }, [eventType, handler]);
}
