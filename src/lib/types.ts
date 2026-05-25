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
export type ModeloIA = "gemini-2.5-flash-image" | "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview" | "nano-banana-pro-preview"

export const MODELOS_IA: { id: ModeloIA; label: string; desc: string; badge?: string }[] = [
  { id: "gemini-2.5-flash-image",       label: "Flash 2.5",       desc: "Rápido e equilibrado",          badge: "Recomendado" },
  { id: "gemini-3.1-flash-image-preview",label: "Flash 3.1",      desc: "Mais recente, maior qualidade"  },
  { id: "gemini-3-pro-image-preview",    label: "Pro 3",           desc: "Alta fidelidade, detalhes ricos"},
  { id: "nano-banana-pro-preview",       label: "Nano Banana Pro", desc: "Modelo experimental exclusivo", badge: "Beta"       },
]
export type TipoProduto = "moda" | "calcados" | "acessorios" | "beleza" | "eletronicos" | "casa" | "alimentos" | "outros"
export type TipoGeracao = "produto_unico" | "conjunto"
export type FormatoFoto = "1:1" | "9:16" | "4:5" | "3:4" | "16:9" | "4:3"
export type Qualidade = "1K" | "2K" | "4K"
export type QuantidadeImagens = 1 | 3 | 5
export type Cenario = "marmore" | "natureza" | "premium" | "minimalista" | "colorido" | "urbano"
export type Iluminacao = "estudio_neutro" | "natural_suave" | "dramatica" | "golden_hour"
export type AnguloCamera = "flat_lay" | "frontal" | "45_graus" | "perspectiva"

// Custo em créditos por qualidade × quantidade
export const CREDITOS_TABELA: Record<Qualidade, Record<QuantidadeImagens, number>> = {
  "1K": { 1: 1,  3: 3,  5: 5  },
  "2K": { 1: 2,  3: 5,  5: 8  },
  "4K": { 1: 3,  3: 9,  5: 14 },
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

// --- Geração de vídeo ---

export type ModeloVideo = "dop-lite" | "dop-standard"
export type AspectRatioVideo = "9:16" | "1:1" | "4:5" | "16:9"
export type DuracaoVideo = 5 | 10

export interface ModeloInspiracao {
  id: string
  label: string
  genero: "feminino" | "masculino"
  descricao: string
  foto: string
}

export interface MovimentoVideo {
  id: string
  label: string
  desc: string
  motionId: string
}

export const MODELOS_INSPIRACAO: ModeloInspiracao[] = [
  { id: "f1", genero: "feminino", label: "Estilo 1", descricao: "young Brazilian woman, casual chic style, natural makeup, confident pose",        foto: "/referencias/feminino-1.jpg" },
  { id: "f2", genero: "feminino", label: "Estilo 2", descricao: "Brazilian woman, editorial fashion look, bold makeup, high fashion pose",          foto: "/referencias/feminino-2.jpg" },
  { id: "f3", genero: "feminino", label: "Estilo 3", descricao: "young Brazilian woman, street style urban fashion, trendy look",                   foto: "/referencias/feminio-3.jpg" },
  { id: "f4", genero: "feminino", label: "Estilo 4", descricao: "Brazilian woman, elegant and sophisticated style, graceful posture",                foto: "/referencias/feminino-4.jpg" },
  { id: "f5", genero: "feminino", label: "Estilo 5", descricao: "young Brazilian woman, sporty active style, athletic and energetic look",           foto: "/referencias/feminino-5.jpg" },
  { id: "f6", genero: "feminino", label: "Estilo 6", descricao: "Brazilian woman, glamorous style, confident and elegant look",                     foto: "/referencias/feminino-6.jpg" },
  { id: "f7", genero: "feminino", label: "Estilo 7", descricao: "young Brazilian woman, modern lifestyle style, fresh and vibrant look",             foto: "/referencias/feminino-7.jpg" },
  { id: "m1", genero: "masculino", label: "Estilo 1", descricao: "young Brazilian man, casual cool style, relaxed confident look",                  foto: "/referencias/masculino-1.jpg" },
  { id: "m2", genero: "masculino", label: "Estilo 2", descricao: "Brazilian man, executive business style, sharp and professional look",            foto: "/referencias/masculino-2.jpg" },
  { id: "m3", genero: "masculino", label: "Estilo 3", descricao: "young Brazilian man, street style urban fashion, modern trendy look",             foto: "/referencias/masculino-3.jpg" },
  { id: "m4", genero: "masculino", label: "Estilo 4", descricao: "young Brazilian man, sporty athletic style, fit and energetic look",              foto: "/referencias/masculino-4.jpg" },
  { id: "m5", genero: "masculino", label: "Estilo 5", descricao: "Brazilian man, high fashion editorial style, bold and stylish look",              foto: "/referencias/masculino-5.jpg" },
  { id: "m6", genero: "masculino", label: "Estilo 6", descricao: "Brazilian man, relaxed lifestyle style, approachable and confident look",         foto: "/referencias/masculino-6.jpg" },
  { id: "m7", genero: "masculino", label: "Estilo 7", descricao: "young Brazilian man, urban modern style, dynamic and energetic look",             foto: "/referencias/masculino-7.jpg" },
]

export const MOVIMENTOS_VIDEO: MovimentoVideo[] = [
  { id: "catwalk",   label: "Passarela",      desc: "Modelo caminha como em um desfile de moda",       motionId: "0e339850-d8f1-4c9d-be3a-97fc2cdb628e" },
  { id: "orbit",     label: "Órbita 360°",    desc: "Câmera circula ao redor do look completo",         motionId: "ea035f68-b350-40f1-b7f4-7dff999fdd67" },
  { id: "glam",      label: "Glamour",        desc: "Movimento glamouroso estilo editorial de moda",    motionId: "a2046ff7-26fc-4d97-aab7-54bbb55fca97" },
  { id: "dolly",     label: "Zoom no produto",desc: "Aproximação cinematográfica no produto",           motionId: "81ca2cd2-05db-4222-9ba0-a32e5185adfb" },
  { id: "paparazzi", label: "Paparazzi",      desc: "Flash de paparazzi, estilo celebridade",          motionId: "556ab276-23b1-4604-a501-2513a71e2eea" },
]

export interface VideoGerado {
  id: string
  user_id: string
  imagem_original_url: string
  video_url: string | null
  higgsfield_job_id: string | null
  prompt: string
  modelo: ModeloVideo
  aspecto: AspectRatioVideo
  duracao: DuracaoVideo
  creditos_usados: number
  status: "processando" | "concluido" | "erro"
  erro: string | null
  created_at: string
}

export const CREDITOS_VIDEO: Record<ModeloVideo, Record<DuracaoVideo, number>> = {
  "dop-lite":     { 5: 8,  10: 14 },
  "dop-standard": { 5: 15, 10: 25 },
}


export const FORMATOS_VIDEO: { id: AspectRatioVideo; label: string; desc: string }[] = [
  { id: "9:16", label: "9:16 Vertical", desc: "TikTok, Reels, Stories" },
  { id: "1:1",  label: "1:1 Quadrado", desc: "Feed, TikTok Shop" },
  { id: "4:5",  label: "4:5 Instagram", desc: "Feed Instagram" },
  { id: "16:9", label: "16:9 Horizontal", desc: "YouTube, site" },
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
