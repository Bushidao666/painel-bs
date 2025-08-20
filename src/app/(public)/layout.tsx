export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}