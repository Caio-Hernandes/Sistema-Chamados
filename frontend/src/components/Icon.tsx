type IconName = "sidebar" | "home" | "tickets" | "plus" | "moon" | "sun" | "logout" | "left" | "right";
const paths: Record<IconName, string> = {
  sidebar: "M4 4h16v16H4ZM9 4v16",
  home: "m3 10 9-7 9 7v10H6V10m3 10v-7h6v7",
  tickets: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  logout: "M9 4H4v16h5m5-12 4 4-4 4m-6-4h13",
  left: "m14 6-6 6 6 6M8 12h13",
  right: "m10 6 6 6-6 6",
};
export default function Icon({ name }: { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}><path d={paths[name]} /></svg>;
}
