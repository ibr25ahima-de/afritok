import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function PremiumProfileTheme({ children }: { children: React.ReactNode }) {
  const { data } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });
  useEffect(() => {
    document.documentElement.classList.toggle("afritok-premium-profile", Boolean(data?.isPremium));
    return () => document.documentElement.classList.remove("afritok-premium-profile");
  }, [data?.isPremium]);
  return <div className={data?.isPremium ? "rounded-2xl ring-1 ring-amber-400/20 bg-gradient-to-b from-amber-500/5 via-black to-black" : ""}>{children}</div>;
}
