-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nome text,
  credits integer NOT NULL DEFAULT 5,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "user can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Cria perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, nome, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nome',
    5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Gerações
CREATE TABLE IF NOT EXISTS geracoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imagem_original_url text NOT NULL,
  imagens_geradas text[] NOT NULL DEFAULT '{}',
  estilo text NOT NULL,
  quantidade integer NOT NULL,
  creditos_usados integer NOT NULL,
  status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  erro text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE geracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own geracoes"
  ON geracoes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user can insert own geracoes"
  ON geracoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket para fotos de produtos (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated can upload produtos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produtos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public can read produtos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'produtos');
