import { useEffect, useState } from "react";
import GoogleMapsLinks from "./GoogleMapsLinks";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import type { Space, Territory, Threat } from "./types";

function GoogleContext({
  selected,
  showStreets,
}: {
  selected: Space | null;
  showStreets: boolean;
}) {
  const map = useMap();
  const [viewport, setViewport] = useState(() => ({
    coordinates: [map.getCenter().wrap().lng, map.getCenter().lat] as [
      number,
      number,
    ],
    zoom: map.getZoom(),
  }));
  useMapEvents({
    moveend() {
      setViewport({
        coordinates: [map.getCenter().wrap().lng, map.getCenter().lat],
        zoom: map.getZoom(),
      });
    },
  });
  return (
    <div
      className="map-google-context"
      ref={(element) => {
        if (element) {
          L.DomEvent.disableClickPropagation(element);
          L.DomEvent.disableScrollPropagation(element);
        }
      }}
    >
      <div>
        <strong>
          {selected
            ? selected.properties.name
            : "Reconoce la zona y sus calles"}
        </strong>
        <span>
          {selected
            ? "Coordenadas del inventario · acceso por verificar"
            : `Base ${showStreets ? "OpenStreetMap" : "vectorial IDESC"} · consulta externa en Google Maps`}
        </span>
      </div>
      <GoogleMapsLinks
        coordinates={
          selected ? selected.properties.coordinates : viewport.coordinates
        }
        zoom={selected ? 18 : viewport.zoom}
        area={!selected}
      />
      {selected && (
        <button
          onClick={() => document.getElementById("space-detail")?.focus()}
        >
          Consultar ficha ↓
        </button>
      )}
    </div>
  );
}
const BASES = {
  calles: {
    nombre: "Calles",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  relieve: {
    nombre: "Relieve",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Datos &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · Estilo &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA</a>)',
    maxZoom: 17,
  },
} as const;
function StreetTiles() {
  const [failed, setFailed] = useState(false);
  const [base, setBase] = useState<keyof typeof BASES>("calles");
  const b = BASES[base];
  return (
    <>
      <TileLayer
        key={base}
        attribution={b.attribution}
        url={b.url}
        maxZoom={b.maxZoom}
        eventHandlers={{ tileerror: () => setFailed(true) }}
      />
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control base-selector">
          <label>
            Mapa base{" "}
            <select
              value={base}
              aria-label="Mapa base"
              onChange={(ev) => {
                setFailed(false);
                setBase(ev.target.value as keyof typeof BASES);
              }}
            >
              {Object.entries(BASES).map(([k, v]) => (
                <option key={k} value={k}>{v.nombre}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {failed && (
        <div className="tile-notice" role="status">
          No se pudieron cargar algunas calles. Las geometrías IDESC siguen
          disponibles.
        </div>
      )}
    </>
  );
}

function Focus({
  spaces,
  selected,
  scope,
}: {
  spaces: Space[];
  selected: Space | null;
  scope: string;
}) {
  const map = useMap();
  useEffect(() => {
    const control = L.control
      .zoom({ zoomInTitle: "Acercar", zoomOutTitle: "Alejar" })
      .addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  useEffect(() => {
    if (spaces.length)
      map.fitBounds(
        L.latLngBounds(
          spaces.map((f) => [
            f.properties.coordinates[1],
            f.properties.coordinates[0],
          ]),
        ),
        {
          paddingTopLeft: [35, 35],
          paddingBottomRight: [35, 130],
          maxZoom: 15,
          animate: false,
        },
      );
  }, [scope, map]); // Scope is the geographic filter, independent of list selection.
  useEffect(() => {
    if (selected)
      map.setView(
        [
          selected.properties.coordinates[1],
          selected.properties.coordinates[0],
        ],
        17,
        { animate: false },
      );
  }, [selected, map]);
  return null;
}
export default function TerritoryMap({
  data,
  spaces,
  selected,
  select,
  threat,
  showHazards,
  showNeighborhoods,
  showStreets,
  scope,
}: {
  data: Territory;
  spaces: Space[];
  selected: Space | null;
  select: (space: Space) => void;
  threat: Threat;
  showHazards: boolean;
  showNeighborhoods: boolean;
  showStreets: boolean;
  scope: string;
}) {
  return (
    <MapContainer
      center={[3.43, -76.52]}
      zoom={12}
      zoomControl={false}
      preferCanvas
      className="territory-map"
      aria-label="Mapa de espacios y amenazas de Cali"
    >
      {showStreets && <StreetTiles />}
      <GeoJSON
        data={data.communes}
        style={{
          color: "#617e77",
          weight: 1.5,
          fillColor: "#e1e9df",
          fillOpacity: showStreets ? 0.08 : 0.75,
        }}
      />
      {showNeighborhoods && (
        <GeoJSON
          data={data.neighborhoods}
          style={{ color: "#6c827e", weight: 0.6, fillOpacity: 0 }}
        />
      )}
      {showHazards && (
        <GeoJSON
          key={threat}
          data={data[threat]}
          style={{
            color: "#c27b32",
            weight: 0.8,
            fillColor: "#edb269",
            fillOpacity: showStreets ? 0.14 : 0.32,
          }}
        />
      )}
      <GeoJSON
        key={`${scope}-${threat}`}
        data={
          { type: "FeatureCollection", features: spaces } as FeatureCollection
        }
        style={(f) => ({
          color: f?.properties[threat].length
            ? "#a84e2b"
            : f?.properties.sourceKey === "sports"
              ? "#2466a1"
              : "#14756e",
          weight: 1.4,
          fillOpacity: showStreets ? 0.22 : 0.6,
        })}
        pointToLayer={(f, latlng) =>
          L.circleMarker(latlng, {
            radius: 4,
            color: f.properties[threat].length ? "#a84e2b" : "#2466a1",
            weight: 1,
            fillOpacity: 0.85,
          })
        }
        onEachFeature={(f, layer) => {
          layer.on("click", () => select(f as Space));
          layer.bindTooltip(() => {
            const el = document.createElement("span");
            el.textContent = f.properties.name;
            return el;
          });
        }}
      />
      {selected && (
        <CircleMarker
          center={[
            selected.properties.coordinates[1],
            selected.properties.coordinates[0],
          ]}
          radius={12}
          pathOptions={{ color: "#132e2c", weight: 3, fillOpacity: 0.1 }}
        >
          <Popup>
            {selected.properties.name}
            <br />
            Disponibilidad por confirmar.
          </Popup>
        </CircleMarker>
      )}
      <GoogleContext selected={selected} showStreets={showStreets} />
      <Focus spaces={spaces} selected={selected} scope={scope} />
      <ScaleControl position="bottomleft" imperial={false} />
    </MapContainer>
  );
}
