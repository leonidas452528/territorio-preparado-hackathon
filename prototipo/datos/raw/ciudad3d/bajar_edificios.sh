#!/bin/sh
# Huellas de construcciones del catastro (IDESC) con número de pisos. Solo geometría, npisos y área:
# sin NPN, predio ni códigos prediales (minimización, Ley 1581 de 2012).
B='https://ws-idesc.cali.gov.co/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326'
set -e
mkdir -p edificios
for s in $(seq 0 50000 700000); do
  [ -s edificios/e_$s.json ] || curl -sf --retry 3 -m 1200 "$B&typeNames=catastro:cat_bas_construcciones&propertyName=npisos,shape_area,the_geom&startIndex=$s&count=50000" -o edificios/e_$s.json
  echo "pagina $s ok"
done
echo FIN
