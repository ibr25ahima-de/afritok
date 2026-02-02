import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ⚠️ SAFE DEPLOY MODE
// En production (Render) on peut désactiver temporairement TRPC / React Query
const isSafeDeploy = import.meta.env.VITE_SAFE_DEPLOY === "true";

// ==============================
// MODE SAFE (build stable)
// ==============================
if (isSafeDeploy) {
  createRoot(document.getElementById("root")!).render(<App />);
} else {
  // ==============================
  // MODE COMPLET (local / normal)
  // ==============================
  import("@/lib/trpc").then(({ trpc }) => {
    import("@tanstack/react-query").then(({ QueryClient, QueryClientProvider }) => {
      import("@trpc/client").then(({ httpBatchLink, TRPCClientError }) => {
        import("superjson").then(({ default: superjson }) => {
          import("@shared/const").then(({ UNAUTHED_ERR_MSG }) => {
            const queryClient = new QueryClient();

            const redirectToLoginIfUnauthorized = (error: unknown) => {
              if (!(error instanceof TRPCClientError)) return;
              if (typeof window === "undefined") return;

              if (error.message === UNAUTHED_ERR_MSG) {
                window.location.href = "/";
              }
            };

            queryClient.getQueryCache().subscribe(event => {
              if (event.type === "updated" && event.action.type === "error") {
                redirectToLoginIfUnauthorized(event.query.state.error);
              }
            });

            queryClient.getMutationCache().subscribe(event => {
              if (event.type === "updated" && event.action.type === "error") {
                redirectToLoginIfUnauthorized(event.mutation.state.error);
              }
            });

            const trpcClient = trpc.createClient({
              links: [
                httpBatchLink({
                  url: "/api/trpc",
                  transformer: superjson,
                  fetch(input, init) {
                    return globalThis.fetch(input, {
                      ...(init ?? {}),
                      credentials: "include",
                    });
                  },
                }),
              ],
            });

            createRoot(document.getElementById("root")!).render(
              <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                  <App />
                </QueryClientProvider>
              </trpc.Provider>
            );
          });
        });
      });
    });
  });
            }
