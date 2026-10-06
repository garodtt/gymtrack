-- GymTrack — migração 006: ficha dos modelos (para filtrar)
alter table public.routines_gymtrack add column if not exists level text;          -- iniciante | intermediario | avancado
alter table public.routines_gymtrack add column if not exists goal text;           -- hipertrofia | forca | emagrecimento | condicionamento | gluteos | core
alter table public.routines_gymtrack add column if not exists days_per_week int;
alter table public.routines_gymtrack add column if not exists session_minutes int;