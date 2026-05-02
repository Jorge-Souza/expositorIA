export interface Profile {
  id: string
  email: string
  nome: string | null
  credits: number
  stripe_customer_id: string | null
  created_at: string
}

export type GeracaoStatus = "processando" | "concluido" | "erro"

export interface Geracao {
  id: string
  user_id: string
  imagem_original_url: string
  imagens_geradas: string[]
  estilo: string
  quantidade: number
  creditos_usados: number
  status: GeracaoStatus
  erro: string | null
  created_at: string
}

export interface PackCredito {
  id: string
  nome: string
  creditos: number
  preco: number
  stripe_price_id: string
  destaque?: boolean
}

export const PACKS: PackCredito[] = [
  {
    id: "starter",
    nome: "Starter",
    creditos: 15,
    preco: 2900,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? "",
    destaque: false,
  },
  {
    id: "pro",
    nome: "Pro",
    creditos: 50,
    preco: 7900,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    destaque: true,
  },
  {
    id: "studio",
    nome: "Studio",
    creditos: 150,
    preco: 19700,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_STUDIO ?? "",
    destaque: false,
  },
]

export const ESTILOS = [
  { id: "clean_white", label: "Fundo Branco Clean" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "gradient", label: "Gradiente Moderno" },
  { id: "tiktok_shop", label: "TikTok Shop Style" },
  { id: "premium", label: "Premium Dark" },
  { id: "natura", label: "Natural / Orgânico" },
]
