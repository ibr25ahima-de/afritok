export const LIVE_LAYOUTS = [
  { id: "spotlight", label: "Plein écran", description: "Une personne mise en avant", icon: "▣" },
  { id: "split", label: "Côte à côte", description: "Deux grandes vidéos", icon: "◫" },
  { id: "grid", label: "Grille", description: "Plusieurs personnes visibles", icon: "▦" },
  { id: "focus", label: "Hôte + invités", description: "Hôte principal avec invités", icon: "▤" },
  { id: "host-center", label: "Hôte au centre", description: "10 invités à gauche et 10 à droite pour une capacité de 20", icon: "◉" },
] as const;

export type LiveLayoutId = (typeof LIVE_LAYOUTS)[number]["id"];

export function isLiveLayoutId(value: string): value is LiveLayoutId {
  return LIVE_LAYOUTS.some((layout) => layout.id === value);
}
