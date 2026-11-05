#!/usr/bin/env bash
# Prueba de humo: las mismas operaciones dan el mismo resultado en los cuatro motores.
# Requiere: docker compose up -d, npm run db:seed y la API corriendo (npm run dev:api).
set -euo pipefail
API=${API:-http://localhost:3000/api}
PASS='RedClinica2026!'
TMP=$(mktemp -d)
fallos=0
ok() { echo "  ✓ $1"; }
mal() { echo "  ✗ $1"; fallos=$((fallos + 1)); }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

for par in aperez:hospital pediatra:pediatrico laboratorio:laboratorio secretaria:odontologia; do
  u=${par%%:*}; inst=${par##*:}; cj="$TMP/$u"
  echo "== $inst ($u)"
  motor=$(curl -sf -c "$cj" -H 'content-type: application/json' \
    -d "{\"username\":\"$u\",\"password\":\"$PASS\",\"institucion\":\"$inst\"}" "$API/auth/login" | json 'd["institucion"]["motor"]')
  ok "login → motor $motor"

  n=$(curl -sf -b "$cj" "$API/pacientes?q=lopez" | json 'd["total"]')
  [[ $n == 1 ]] && ok "búsqueda sin acentos 'lopez' → $n" || mal "búsqueda 'lopez' devolvió $n"
  n=$(curl -sf -b "$cj" "$API/pacientes?q=2210774500101" | json 'd["total"]')
  [[ $n == 1 ]] && ok "búsqueda por CUI → $n" || mal "búsqueda por CUI devolvió $n"
  n=$(curl -sf -b "$cj" "$API/pacientes?sexo=F" | json 'd["total"]')
  [[ $n -ge 3 ]] && ok "filtro sexo=F → $n" || mal "filtro sexo devolvió $n"

  cui="9$(date +%s%N | cut -c1-12)"
  body="{\"cui\":\"$cui\",\"nombres\":\"Prueba\",\"apellidos\":\"Paridad $inst\",\"fechaNacimiento\":\"2020-01-15\",\"sexo\":\"F\",\"telefonos\":[\"55556666\"]"
  [[ $inst == pediatrico ]] && body="$body,\"responsable\":{\"nombreCompleto\":\"Madre Prueba\",\"parentesco\":\"Madre\",\"telefonos\":[\"55557777\"]}"
  # Solo MEDICO o RECEPCION registran; todos los usuarios de prueba lo son.
  id=$(curl -sf -b "$cj" -H 'content-type: application/json' -d "$body}" "$API/pacientes" | json 'd["id"]')
  ok "alta → id $id"
  code=$(curl -s -o /dev/null -w '%{http_code}' -b "$cj" -H 'content-type: application/json' -d "$body}" "$API/pacientes")
  [[ $code == 409 ]] && ok "CUI repetido → 409" || mal "CUI repetido devolvió $code"
  estado=$(curl -sf -b "$cj" "$API/pacientes/$id" | json 'd["estado"]')
  [[ $estado == ACTIVO ]] && ok "ficha → $estado" || mal "ficha estado $estado"

  code=$(curl -s -o /dev/null -w '%{http_code}' -b "$cj" -H 'content-type: application/json' -d '{"motivo":"Traslado a otra institución"}' "$API/pacientes/$id/baja")
  if [[ $u == secretaria ]]; then
    [[ $code == 403 ]] && ok "baja por RECEPCION → 403" || mal "baja por RECEPCION devolvió $code"
  else
    [[ $code == 204 ]] && ok "baja → 204" || mal "baja devolvió $code"
    estado=$(curl -sf -b "$cj" "$API/pacientes/$id" | json 'd["estado"]')
    [[ $estado == BAJA ]] && ok "ficha tras baja → $estado" || mal "estado tras baja $estado"
    code=$(curl -s -o /dev/null -w '%{http_code}' -b "$cj" -H 'content-type: application/json' -d '{"motivo":"otra vez"}' "$API/pacientes/$id/baja")
    [[ $code == 422 ]] && ok "segunda baja → 422" || mal "segunda baja devolvió $code"
  fi
done

echo "== seguridad"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/pacientes")
[[ $code == 401 ]] && ok "sin sesión → 401" || mal "sin sesión devolvió $code"
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' \
  -d "{\"username\":\"aperez\",\"password\":\"$PASS\",\"institucion\":\"pediatrico\"}" "$API/auth/login")
[[ $code == 401 ]] && ok "institución equivocada → 401" || mal "institución equivocada devolvió $code"

for f in aperez pediatra laboratorio secretaria; do unlink "$TMP/$f" 2>/dev/null || true; done
rmdir "$TMP"
echo
[[ $fallos == 0 ]] && echo "Todo bien: los cuatro motores responden igual." || { echo "$fallos fallo(s)."; exit 1; }
