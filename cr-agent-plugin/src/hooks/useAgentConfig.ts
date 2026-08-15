import { useEffect, useState } from "react";

import AgentService from "../services/AgentService";
import { AgentConfig } from "../types/agent";

export const useAgentConfig = (
  workerSid: string | undefined,
): {
  config: AgentConfig | null;
  isLoading: boolean;
  error: boolean;
  setConfig: (config: AgentConfig) => void;
} => {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!workerSid) {
      setConfig(null);
      setIsLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);

    const loadConfig = async () => {
      try {
        const result = await AgentService.fetchAgentConfig(workerSid);
        if (cancelled) return;
        setConfig(result);
      } catch (e) {
        if (cancelled) return;
        console.error(`Error loading agent configuration: ${e}`);
        setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [workerSid]);

  return { config, isLoading, error, setConfig };
};
