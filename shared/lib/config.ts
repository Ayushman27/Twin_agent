const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const normalizedApiUrl = rawApiUrl.endsWith("/api/v1")
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, "")}/api/v1`;

export const config = {
  apiUrl: normalizedApiUrl,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws",
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
};
