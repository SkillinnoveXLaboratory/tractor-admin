import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useToast } from "../components/ui";

// List filters live in the URL so every filtered view can be bookmarked or shared.
export function useUrlState(defaults) {
  const [search, setSearch] = useSearchParams();
  const state = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) if (search.has(key)) out[key] = search.get(key);
    out.page = Math.max(1, Number(search.get("page")) || 1);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const update = useCallback((patch) => {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "" || value === defaults[key]) next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in patch)) next.delete("page");
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearch]);
  return [state, update];
}

export function useApi(path, params, options = {}) {
  return useQuery({
    queryKey: [path, params || {}],
    queryFn: () => api(path, { params }),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    ...options,
  });
}

// Runs a write, shows the server's message, and refreshes everything that may have changed.
export function useAction() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ path, method = "POST", body, form }) => api(path, { method, body, form }),
    onSuccess: (data, vars) => {
      if (!vars.silent) toast(data.message || "Saved.");
      queryClient.invalidateQueries();
    },
    onError: (error, vars) => {
      if (!vars.throwOnly) toast(error.message, "error");
    },
  });
}
