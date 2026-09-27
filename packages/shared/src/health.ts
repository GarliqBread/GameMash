export type HealthResponse = {
  status: "ok";
  redis: "up" | "down";
};
