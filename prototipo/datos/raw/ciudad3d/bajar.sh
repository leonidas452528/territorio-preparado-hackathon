#!/bin/sh
# Descarga capas IDESC para la maqueta 3D de ciudad. Construcciones: solo códigos de manzana + pisos + área (sin NPN ni predio).
B='https://ws-idesc.cali.gov.co/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326'
set -e
curl -sf -m 600 "$B&typeNames=catastro:cat_bas_manzanas" -o manzanas.json
for s in 0 100000 200000 300000 400000 500000 600000 700000; do
  curl -sf -m 900 "$B&typeNames=catastro:cat_bas_construcciones&propertyName=sector,comuna,barrio,manzana,npisos,shape_area&startIndex=$s&count=100000" -o constr_$s.json
done
curl -sf -m 600 "$B&typeNames=pot_2014:bcs_hid_rios" -o rios.json
curl -sf -m 600 "$B&typeNames=pot_2014:amb_eep_aeie_cobertura_boscosa" -o cobertura_boscosa.json
echo OK
