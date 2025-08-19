export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row h-screen">
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
