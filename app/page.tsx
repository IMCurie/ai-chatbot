import Chat from "@/components/chat";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const id = uuidv4();

  return <Chat key={id} id={id} />;
}
