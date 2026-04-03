import { useActor } from "../hooks/useActor";

/**
 * Minimal hook to get the actor instance for direct async calls.
 * Returns { actor, isFetching } from useActor.
 */
export function useBackend() {
  return useActor();
}
