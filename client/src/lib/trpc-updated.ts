import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

/**
 * Custom serializer that handles File objects
 * Converts File to FormData for transport
 */
const fileAwareSerializer = {
  serialize: (object: any): any => {
    if (object instanceof File) {
      return {
        __type: "File",
        name: object.name,
        size: object.size,
        type: object.type,
      };
    }
    return superjson.serialize(object);
  },
  deserialize: (object: any): any => {
    return superjson.deserialize(object);
  },
};

export const trpc = createTRPCReact<AppRouter>({
  overrides: {
    useMutation: {
      async onSuccess(opts) {
        // Invalidate queries after mutation
        await opts.queryClient.invalidateQueries();
      },
    },
  },
});

/**
 * Helper function to convert input with File objects to FormData
 */
function inputToFormData(input: any): FormData | null {
  const formData = new FormData();
  let hasFile = false;

  const addToFormData = (obj: any, prefix = "") => {
    if (obj === null || obj === undefined) return;

    if (obj instanceof File) {
      hasFile = true;
      formData.append(prefix || "file", obj);
    } else if (typeof obj === "object" && !(obj instanceof Date)) {
      Object.entries(obj).forEach(([key, value]) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (value instanceof File) {
          hasFile = true;
          formData.append(newPrefix, value);
        } else if (typeof value === "object" && value !== null) {
          addToFormData(value, newPrefix);
        } else {
          formData.append(newPrefix, String(value));
        }
      });
    }
  };

  addToFormData(input);
  return hasFile ? formData : null;
}

/**
 * Create tRPC client with file upload support
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        async fetch(url, options) {
          const body = options?.body;

          // Check if body contains FormData
          if (body instanceof FormData) {
            // For FormData, don't set Content-Type header
            // Browser will set it automatically with boundary
            return fetch(url, {
              ...options,
              body,
              headers: {
                ...((options?.headers as Record<string, string>) || {}),
                // Remove Content-Type to let browser set it
              },
            });
          }

          // For regular JSON requests
          return fetch(url, options);
        },
        transformer: superjson,
      }),
    ],
  });
}
