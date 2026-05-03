-- Recria a função com search_path correto (fix para Supabase)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nome',
    5
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Garante que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garante permissão de insert na tabela profiles para o trigger
GRANT INSERT ON public.profiles TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
