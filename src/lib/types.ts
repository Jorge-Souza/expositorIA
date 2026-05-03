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
  },
]

// --- Geração de imagem ---

export type EstiloFoto = "fundo_branco" | "ambientada" | "com_modelo"
export type TipoProduto = "moda" | "calcados" | "acessorios" | "beleza" | "eletronicos" | "casa" | "alimentos" | "outros"
export type TipoGeracao = "produto_unico" | "conjunto"
export type FormatoFoto = "1:1" | "9:16" | "4:5" | "3:4" | "16:9" | "4:3"
export type Qualidade = "1K" | "2K" | "4K"
export type QuantidadeImagens = 3 | 5 | 9
export type Cenario = "marmore" | "natureza" | "premium" | "minimalista" | "colorido" | "urbano"
export type Iluminacao = "estudio_neutro" | "natural_suave" | "dramatica" | "golden_hour"
export type AnguloCamera = "flat_lay" | "frontal" | "45_graus" | "perspectiva"

// Custo em créditos por qualidade × quantidade
export const CREDITOS_TABELA: Record<Qualidade, Record<QuantidadeImagens, number>> = {
  "1K": { 3: 3,  5: 5,  9: 9  },
  "2K": { 3: 5,  5: 8,  9: 14 },
  "4K": { 3: 9,  5: 14, 9: 24 },
}

export const TIPOS_PRODUTO: { id: TipoProduto; label: string; emoji: string }[] = [
  { id: "moda",       label: "Moda / Roupas",    emoji: "👕" },
  { id: "calcados",   label: "Calçados",          emoji: "👟" },
  { id: "acessorios", label: "Acessórios",        emoji: "👜" },
  { id: "beleza",     label: "Beleza / Skincare", emoji: "✨" },
  { id: "eletronicos",label: "Eletrônicos",       emoji: "📱" },
  { id: "casa",       label: "Casa / Decoração",  emoji: "🏡" },
  { id: "alimentos",  label: "Alimentos",         emoji: "🍃" },
  { id: "outros",     label: "Outros",            emoji: "📦" },
]

export const CENARIOS: { id: Cenario; label: string }[] = [
  { id: "marmore",     label: "Mármore clean" },
  { id: "natureza",    label: "Natureza / Flores" },
  { id: "premium",     label: "Premium escuro" },
  { id: "minimalista", label: "Minimalista" },
  { id: "colorido",    label: "Colorido / Vibrante" },
  { id: "urbano",      label: "Urbano / Street" },
]

export const ILUMINACOES: { id: Iluminacao; label: string }[] = [
  { id: "estudio_neutro", label: "Estúdio neutro" },
  { id: "natural_suave",  label: "Luz natural suave" },
  { id: "dramatica",      label: "Dramática" },
  { id: "golden_hour",    label: "Golden hour" },
]

export const ANGULOS: { id: AnguloCamera; label: string }[] = [
  { id: "flat_lay",    label: "Flat lay (de cima)" },
  { id: "frontal",     label: "Frontal" },
  { id: "45_graus",    label: "45° (diagonal)" },
  { id: "perspectiva", label: "Perspectiva" },
]

export const FORMATOS: { id: FormatoFoto; label: string; desc: string; grupo: string }[] = [
  { id: "1:1",  label: "1:1 Quadrado",     desc: "TikTok Shop, catálogo",  grupo: "QUADRADO"   },
  { id: "9:16", label: "9:16 Stories",     desc: "TikTok, Reels",          grupo: "VERTICAL"   },
  { id: "4:5",  label: "4:5 Instagram",    desc: "Feed Instagram",         grupo: "VERTICAL"   },
  { id: "3:4",  label: "3:4 Retrato",      desc: "Retrato clássico",       grupo: "VERTICAL"   },
  { id: "16:9", label: "16:9 Banner",      desc: "YouTube, site",          grupo: "HORIZONTAL" },
  { id: "4:3",  label: "4:3 Clássico",     desc: "Apresentações",          grupo: "HORIZONTAL" },
]

// ESTILOS legado (mantido para compatibilidade com histórico antigo)
export const ESTILOS = [
  { id: "clean_white", label: "Fundo Branco Clean" },
  { id: "lifestyle",   label: "Lifestyle" },
  { id: "gradient",    label: "Gradiente Moderno" },
  { id: "tiktok_shop", label: "TikTok Shop Style" },
  { id: "premium",     label: "Premium Dark" },
  { id: "natura",      label: "Natural / Orgânico" },
]
