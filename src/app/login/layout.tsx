import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ログイン | Manufacturing Management System',
  description: 'システムへのログイン',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
