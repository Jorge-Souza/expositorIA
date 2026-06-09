export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo-expositorIA.png" alt="expositorIA" className="h-44 w-auto object-contain" />
          </div>
          <p className="text-muted-foreground text-sm">Imagens profissionais para seus produtos</p>
        </div>
        {children}
      </div>
    </div>
  )
}
