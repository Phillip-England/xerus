export enum ContextState {
  OPEN = "OPEN",         // Everything is mutable
  WRITTEN = "WRITTEN",   // Body is set, Handler chain stops, but Headers are STILL mutable (Fixes Onion pattern)
  STREAMING = "STREAMING", // Streaming started. Headers are IMMUTABLE.
  SENT = "SENT"          // Response handed off. Immutable.
}