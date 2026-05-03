import { NextResponse, type NextRequest } from "next/server"

// Verifica presença do cookie de sessão do Supabase (sem chamada de rede)
// A verificação real acontece nos Server Components via supabase.auth.getUser()
function hasSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && !!c.value
  )
}

export function updateSession(request: NextRequest) {
  const isLoggedIn = hasSession(request)

  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/cadastro"

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/gerar") ||
    request.nextUrl.pathname.startsWith("/historico") ||
    request.nextUrl.pathname.startsWith("/creditos")

  if (!isLoggedIn && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
