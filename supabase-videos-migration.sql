-- Tabela para vídeos gerados com Higgsfield
CREATE TABLE IF NOT EXISTS videos_gerados (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  imagem_original_url  TEXT NOT NULL,
  video_url            TEXT,
  higgsfield_job_id    TEXT,
  prompt               TEXT NOT NULL DEFAULT '',
  modelo               TEXT NOT NULL DEFAULT 'dop-lite',
  aspecto              TEXT NOT NULL DEFAULT '9:16',
  duracao              INTEGER NOT NULL DEFAULT 5,
  creditos_usados      INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'processando'
                         CHECK (status IN ('processando', 'concluido', 'erro')),
  erro                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: usuário só acessa seus próprios vídeos
ALTER TABLE videos_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios veem seus videos" ON videos_gerados
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuarios inserem seus videos" ON videos_gerados
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios atualizam seus videos" ON videos_gerados
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role ignora RLS (usado nas API routes com adminClient)
CREATE POLICY "service role acessa tudo" ON videos_gerados
  USING (true)
  WITH CHECK (true);
