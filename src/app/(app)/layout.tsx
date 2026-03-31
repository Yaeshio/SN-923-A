import { FileUp, FilePlus, LayoutDashboard, Factory, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-md p-1">
              <Factory className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-lg">SN-923 System</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium ml-4">
            <Link href="/projects" className="flex items-center gap-1 hover:text-primary transition-colors text-muted-foreground">
              <LayoutDashboard className="h-4 w-4" />
              <span>プロジェクト</span>
            </Link>
            <Link href="/master" className="flex items-center gap-1 hover:text-primary transition-colors text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>マスタ管理</span>
            </Link>
          </nav>
          <div className="ml-auto flex items-center">
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-md"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                <span>ログアウト</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        {children}
      </main>
    </>
  );
}
