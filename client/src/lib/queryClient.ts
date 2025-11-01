import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

function buildQueryString(params: any): string {
  if (!params || typeof params !== 'object') return '';
  
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      });
    } else {
      searchParams.set(key, String(value));
    }
  }
  
  return searchParams.toString();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url: string;
    
    if (queryKey.length === 1) {
      url = queryKey[0] as string;
    } else if (queryKey.length === 2) {
      const endpoint = queryKey[0] as string;
      const second = queryKey[1];
      
      if (typeof second === 'string' || typeof second === 'number') {
        url = `${endpoint}/${second}`;
      } else {
        const params = buildQueryString(second);
        url = `${endpoint}${params ? `?${params}` : ''}`;
      }
    } else {
      const endpoint = queryKey[0] as string;
      const pathParam = queryKey[1];
      const queryParams = queryKey[2];
      
      if (pathParam === undefined || pathParam === null) {
        throw new Error(`Path parameter is undefined for endpoint: ${endpoint}`);
      }
      
      url = `${endpoint}/${pathParam}`;
      const params = buildQueryString(queryParams);
      if (params) {
        url += `?${params}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
