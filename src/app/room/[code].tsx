import { Redirect, useLocalSearchParams } from "expo-router";

/** weightrank://room/ABC123 (or the web link) opens a live friend duel. */
export default function RoomLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: "/duel/[exercise]", params: { exercise: "pushup", mode: "room", room: String(code ?? "").toUpperCase() } }} />;
}
