-- Registro público (correo / Google): permite elegir docente al crear perfil.
-- Admin sigue reservado a service_role; cambios de rol posteriores solo admin.

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and app_role in ('particular', 'estudiante', 'docente')
  );

create or replace function public.guard_profiles_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'insert' then
      if new.app_role not in ('particular', 'estudiante', 'docente') then
        raise exception 'Solo se permite registrar roles particular, estudiante o docente.';
      end if;
    elsif tg_op = 'update' then
      if new.app_role is distinct from old.app_role then
        raise exception 'El rol solo puede cambiarlo un administrador.';
      end if;
    end if;
  end if;

  return new;
end;
$$;
