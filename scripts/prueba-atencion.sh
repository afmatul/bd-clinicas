#!/usr/bin/env bash
# Prueba de humo de agenda, atención y prescripción: mismo flujo, mismo resultado en los cuatro motores.
#   agendar → choque de horario → confirmar → cancelar libera el horario → abrir consulta
#   → cierre rechazado sin dejar nada a medias → cierre con receta → cita ATENDIDA → historial y recetas.
# Requiere: docker compose up -d, npm run db:seed (con medicamentos) y la API corriendo.
# USUARIOS="usuario:institucion …" para elegir los médicos de prueba (deben tener id_personal).
set -euo pipefail
API=${API:-http://localhost:3000/api}
PASS=${PASS:-'RedClinica2026!'}
USUARIOS=${USUARIOS:-"aperez:hospital pediatra:pediatrico laboratorio:laboratorio secretaria:odontologia"}
TMP=$(mktemp -d)
fallos=0
ok() { echo "  ✓ $1"; }
mal() { echo "  ✗ $1"; fallos=$((fallos + 1)); }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }
# Próximo día hábil (lunes a sábado) a partir de mañana.
FECHA=$(python3 -c "import datetime as t; d=t.date.today()+t.timedelta(days=1); d+=t.timedelta(days=1) if d.weekday()==6 else t.timedelta(0); print(d)")

for par in $USUARIOS; do
  u=${par%%:*}; inst=${par##*:}; cj="$TMP/$u"
  echo "== $inst ($u)"
  perfil=$(curl -sf -c "$cj" -H 'content-type: application/json' \
    -d "{\"username\":\"$u\",\"password\":\"$PASS\",\"institucion\":\"$inst\"}" "$API/auth/login")
  medico=$(echo "$perfil" | json 'd["usuario"]["idPersonal"] or ""')
  rol=$(echo "$perfil" | json 'd["usuario"]["rol"]')
  if [[ -z $medico || $rol != MEDICO ]]; then echo "  (omitido: $u no es un médico con id_personal)"; continue; fi
  get() { curl -sf -b "$cj" "$API$1"; }
  send() { curl -s -o "$TMP/r" -w '%{http_code}' -b "$cj" -X "$1" -H 'content-type: application/json' -d "$3" "$API$2"; }

  pacientes=$(get "/pacientes?estado=ACTIVO&porPagina=2")
  p1=$(echo "$pacientes" | json 'd["items"][0]["id"]'); p2=$(echo "$pacientes" | json 'd["items"][1]["id"]')

  hora=$(get "/agenda/disponibilidad?idMedico=$medico&fecha=$FECHA" | json 'd["libres"][-1]')
  ok "disponibilidad $FECHA → último libre $hora"
  code=$(send POST /agenda/citas "{\"idPaciente\":\"$p1\",\"idMedico\":\"$medico\",\"fecha\":\"$FECHA\",\"hora\":\"$hora\",\"motivo\":\"Prueba de paridad\"}")
  cita=$(json 'd["id"]' < "$TMP/r")
  [[ $code == 200 || $code == 201 ]] && ok "agendar → $cita" || mal "agendar devolvió $code $(cat "$TMP/r")"
  code=$(send POST /agenda/citas "{\"idPaciente\":\"$p2\",\"idMedico\":\"$medico\",\"fecha\":\"$FECHA\",\"hora\":\"$hora\",\"motivo\":\"Choque\"}")
  [[ $code == 409 ]] && ok "mismo horario → 409" || mal "mismo horario devolvió $code"
  n=$(get "/agenda?idMedico=$medico&desde=$FECHA" | json "len([c for c in d['citas'] if c['hora']=='$hora' and c['estado']=='PROGRAMADA'])")
  [[ $n == 1 ]] && ok "agenda del día la muestra" || mal "agenda del día tiene $n citas a las $hora"

  code=$(send PATCH "/agenda/citas/$cita/estado" '{"estado":"CONFIRMADA"}')
  [[ $code == 200 ]] && ok "confirmar → $(json 'd["estado"]' < "$TMP/r")" || mal "confirmar devolvió $code"
  code=$(send PATCH "/agenda/citas/$cita/estado" '{"estado":"CANCELADA"}')
  [[ $code == 200 ]] && ok "cancelar → 200" || mal "cancelar devolvió $code"
  code=$(send PATCH "/agenda/citas/$cita/estado" '{"estado":"CONFIRMADA"}')
  [[ $code == 422 ]] && ok "confirmar una cancelada → 422" || mal "confirmar una cancelada devolvió $code"
  code=$(send POST /agenda/citas "{\"idPaciente\":\"$p2\",\"idMedico\":\"$medico\",\"fecha\":\"$FECHA\",\"hora\":\"$hora\",\"motivo\":\"Horario liberado\"}")
  cita2=$(json 'd["id"]' < "$TMP/r")
  [[ $code == 200 || $code == 201 ]] && ok "el horario cancelado se vuelve a agendar → $cita2" || mal "reagendar devolvió $code $(cat "$TMP/r")"

  med=$(get "/medicamentos?q=" | json 'd[0]["id"] if d else ""')
  [[ -n $med ]] && ok "catálogo de medicamentos" || { mal "catálogo de medicamentos vacío"; continue; }

  code=$(send POST /consultas "{\"idPaciente\":\"$p2\",\"idCita\":\"$cita2\"}")
  consulta=$(json 'd["id"]' < "$TMP/r")
  [[ $code == 200 || $code == 201 ]] && ok "abrir consulta → $consulta" || mal "abrir consulta devolvió $code $(cat "$TMP/r")"
  [[ $(get "/agenda/citas/$cita2" | json 'd["estado"]') == EN_CONSULTA ]] && ok "cita EN_CONSULTA" || mal "la cita no pasó a EN_CONSULTA"
  send POST /consultas "{\"idPaciente\":\"$p2\",\"idCita\":\"$cita2\"}" > /dev/null
  [[ $(json 'd["id"]' < "$TMP/r") == "$consulta" ]] && ok "abrir otra vez retoma la misma" || mal "abrir otra vez creó otra consulta"

  dx='"diagnosticos":[{"tipo":"DEFINITIVO","enfermedadDetectada":"Hipertensión arterial esencial (I10)","tratamientos":[{"tipo":"Farmacológico","descripcion":"Antihipertensivo","receta":{"renglones":[{"idMedicamento":"'$med'","dosis":"1 tableta","viaAdministracion":"Oral","frecuenciaHoras":24,"duracionDias":90}]}}]}]'
  code=$(send POST "/consultas/$consulta/cierre" "{\"motivo\":\"Control\",\"signos\":{\"presionSistolica\":80,\"presionDiastolica\":90},$dx}")
  [[ $code == 422 ]] && ok "cierre con diastólica ≥ sistólica → 422" || mal "cierre inválido devolvió $code"
  [[ $(get "/consultas/$consulta" | json 'len(d["diagnosticos"])') == 0 ]] && ok "nada quedó a medias" || mal "el cierre rechazado dejó diagnósticos"

  code=$(send POST "/consultas/$consulta/cierre" "{\"motivo\":\"Control de hipertensión\",\"signos\":{\"presionSistolica\":132,\"presionDiastolica\":84,\"temperaturaC\":36.7},\"confirmarAlergias\":true,$dx}")
  if [[ $code == 200 || $code == 201 ]]; then
    ok "cierre → cerrada=$(json 'd["cerrada"]' < "$TMP/r"), cantidad=$(json 'd["diagnosticos"][0]["tratamientos"][0]["receta"]["renglones"][0]["cantidad"]' < "$TMP/r")"
  else mal "cierre devolvió $code $(cat "$TMP/r")"; fi
  code=$(send POST "/consultas/$consulta/cierre" "{\"motivo\":\"Otra vez\",$dx}")
  [[ $code == 422 ]] && ok "segundo cierre → 422" || mal "segundo cierre devolvió $code"
  [[ $(get "/agenda/citas/$cita2" | json 'd["estado"]') == ATENDIDA ]] && ok "cita ATENDIDA" || mal "la cita no quedó ATENDIDA"
  n=$(get "/recetas?paciente=$p2&vigentes=true" | json 'len(d)')
  [[ $n -ge 1 ]] && ok "recetas vigentes → $n" || mal "recetas vigentes devolvió $n"
  n=$(get "/consultas?paciente=$p2" | json 'len([c for c in d if c["cerrada"]])')
  [[ $n -ge 1 ]] && ok "historial → $n cerrada(s)" || mal "historial devolvió $n"
done

for f in "$TMP"/*; do unlink "$f" 2>/dev/null || true; done
rmdir "$TMP"
echo
[[ $fallos == 0 ]] && echo "Todo bien: agenda, atención y prescripción responden igual en los cuatro motores." || { echo "$fallos fallo(s)."; exit 1; }
