-- GymTrack — apaga os amigos de teste (e tudo deles: perfil, amizades, treinos).
delete from auth.users where email like '%@teste.gymtrack.local';