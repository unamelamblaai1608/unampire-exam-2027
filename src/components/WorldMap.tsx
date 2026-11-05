
"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { Component, useId, useMemo, useState, type ReactNode } from "react";
import worldAtlas from "world-atlas/countries-50m.json";

type MapCountry = {
  name: string;
  owner?: string;
  troops?: number;
  alive?: boolean;
};

type WorldMapProps = {
  countries?: MapCountry[];
  onPick?: (name: string) => void;
  selected?: string;
  ownerOrder?: string[];
};

const PLAYER_COLORS = [
  "#D5AE62",
  "#5D9EBD",
  "#A77BC6",
  "#6EA88C",
  "#D17E6D",
  "#8D9BCB",
  "#B7A36C",
  "#68AEB0",
  "#C17EAA",
  "#9AAB74",
];
const NEUTRAL_COLORS = ["#344857", "#47554C", "#574B45", "#495466", "#594F5E", "#52605A"];
const COUNTRY_ALIASES: Record<string, string> = {
  "united states of america": "united states",
};

function normalizeName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return COUNTRY_ALIASES[normalized] ?? normalized;
}

function neutralColor(name: string) {
  const hash = [...name].reduce((value, character) => value * 31 + character.charCodeAt(0), 0);
  return NEUTRAL_COLORS[Math.abs(hash) % NEUTRAL_COLORS.length];
}

type MapErrorBoundaryProps = { children: ReactNode };
type MapErrorBoundaryState = { hasError: boolean };

class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("World map failed to render.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="map-error" role="alert">
          The world map could not be displayed. Refresh the page to try again.
        </div>
      );
    }

    return this.props.children;
  }
}

export default function WorldMap({
  countries = [],
  onPick,
  selected,
  ownerOrder = [],
}: WorldMapProps) {
  const mapId = useId().replace(/:/g, "");
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [position, setPosition] = useState({
    coordinates: [0, 15] as [number, number],
    zoom: 1,
  });

  const geographyResult = useMemo(() => {
    try {
      const topology = worldAtlas as unknown as Topology;
      const collection = feature(topology, topology.objects.countries);

      if (!("features" in collection) || collection.features.length === 0) {
        throw new Error("The country geography dataset contains no features.");
      }

      return { geographies: collection, error: null };
    } catch (error) {
      console.error("Unable to load the world geography dataset.", error);
      return {
        geographies: null,
        error: "The world map data could not be loaded. Please refresh the page.",
      };
    }
  }, []);

  const countryByName = useMemo(
    () => new Map(countries.map((country) => [normalizeName(country.name), country])),
    [countries],
  );

  return (
    <div className="real-world-map">
      {geographyResult.error ? (
        <div className="map-error" role="alert">
          {geographyResult.error}
        </div>
      ) : (
        <MapErrorBoundary>
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 160, center: [0, 15] }}
            width={960}
            height={500}
            className="world-svg"
          >
            <defs>
              <linearGradient id={`${mapId}-ocean`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0d2942" />
                <stop offset="100%" stopColor="#071725" />
              </linearGradient>
              <pattern
                id={`${mapId}-waves`}
                width="72"
                height="48"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 14c12-6 24 6 36 0s24 6 36 0M-36 38c12-6 24 6 36 0s24 6 36 0 24 6 36 0"
                  fill="none"
                  stroke="#6b8aa2"
                  strokeOpacity=".12"
                  strokeWidth=".7"
                />
              </pattern>
            </defs>
            <rect width="960" height="500" fill={`url(#${mapId}-ocean)`} />
            <rect width="960" height="500" fill={`url(#${mapId}-waves)`} />
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={(position) => {
                if (position.coordinates) {
                  setPosition((previous) => ({
                    coordinates: position.coordinates ?? previous.coordinates,
                    zoom: position.zoom ?? previous.zoom,
                  }));
                }
              }}
              minZoom={1}
              maxZoom={5}
            >
              <Geographies geography={geographyResult.geographies!}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    if (typeof geo.properties?.name !== "string") {
                      return null;
                    }

                    const mapName = geo.properties.name;
                    const country = countryByName.get(normalizeName(mapName));
                    const isSelected =
                      selected !== undefined &&
                      normalizeName(selected) === normalizeName(mapName);
                    const isHovered = hoveredCountry === mapName;
                    const interactive = Boolean(country && onPick);
                    const ownerIndex = country?.owner
                      ? ownerOrder.indexOf(country.owner)
                      : -1;
                    const countryIndex =
                      country?.owner && ownerIndex < 0
                        ? countries.findIndex((item) => item.name === country.owner)
                        : ownerIndex;
                    const fill =
                      country?.owner && country.alive !== false && countryIndex >= 0
                        ? PLAYER_COLORS[countryIndex % PLAYER_COLORS.length]
                        : neutralColor(mapName);
                    const tooltip =
                      country?.owner && typeof country.troops === "number"
                        ? `${country.name} · ${country.owner} · ${country.troops} troops`
                        : country?.name ?? mapName;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredCountry(mapName)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        tabIndex={interactive ? 0 : undefined}
                        role={interactive ? "button" : undefined}
                        aria-label={tooltip}
                        onClick={() => {
                          if (country && onPick) onPick(country.name);
                        }}
                        onKeyDown={(event) => {
                          if (
                            interactive &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            if (country && onPick) onPick(country.name);
                          }
                        }}
                        style={{
                          fill,
                          stroke: isHovered
                            ? "#f0d99c"
                            : isSelected
                              ? "#e6c77d"
                              : "#8293a1",
                          strokeWidth: isHovered
                            ? isSelected
                              ? 1.8
                              : 1
                            : isSelected
                              ? 1.6
                              : 0.55,
                          strokeLinejoin: "round",
                          outline: "none",
                          cursor: interactive ? "pointer" : "default",
                        }}
                      >
                        <title>{tooltip}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </MapErrorBoundary>
      )}
    </div>
  );
}
