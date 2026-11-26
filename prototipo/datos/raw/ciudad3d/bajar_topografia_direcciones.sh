#!/bin/sh
# Curvas de nivel (POT 2014, cada 10 m) y nomenclatura domiciliaria (solo dirección, barrio y comuna:
# sin NPN, predio ni identificadores; minimización, Ley 1581 de 2012).
B='https://ws-idesc.cali.gov.co/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326'
set -e
[ -s curvas_nivel.json ] || curl -sf --retry 3 -m 1200 "$B&typeNames=pot_2014:bcs_curvas_nivel" -o curvas_nivel.json
echo "curvas ok"
mkdir -p direcciones
for s in $(seq 0 100000 700000); do
  [ -s direcciones/d_$s.json ] || curl -sf --retry 3 -m 1200 "$B&typeNames=dapm:pdt_nmc_nomenclatura_domiciliaria&propertyName=nddirecc,ndbarrio,ndcomuna,the_geom&sortBy=gid&startIndex=$s&count=100000" -o direcciones/d_$s.json
  echo "direcciones $s ok"
done
echo FIN
