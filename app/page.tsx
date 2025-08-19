import Chat from "@/components/chat";
import { v4 as uuidv4 } from "uuid";

export default async function HomePage() {
  const id = uuidv4();

  return <Chat id={id} />;
}
