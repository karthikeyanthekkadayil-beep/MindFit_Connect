import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  event_type: string;
  start_time: string;
}

interface EventsMapProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export function EventsMap({ events, onEventClick }: EventsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [needsToken, setNeedsToken] = useState(false);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        
        if (error || !data?.token) {
          setNeedsToken(true);
          return;
        }
        
        setMapboxToken(data.token);
        setNeedsToken(false);
      } catch (error) {
        setNeedsToken(true);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-98.5795, 39.8283],
        zoom: 3,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      return () => {
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
        map.current?.remove();
      };
    } catch (error) {
      console.error("Error initializing map:", error);
      toast.error("Failed to load map. Please check your Mapbox token.");
    }
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const eventsWithLocation = events.filter(
      (event) => event.location_lat && event.location_lng
    );

    if (eventsWithLocation.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    eventsWithLocation.forEach((event) => {
      const el = document.createElement("div");
      el.className = "cursor-pointer";
      el.innerHTML = `
        <div class="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform">
          ${event.event_type[0]}
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([event.location_lng!, event.location_lat!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-sm mb-1">${event.title}</h3>
              <p class="text-xs text-muted-foreground">${event.location}</p>
              <p class="text-xs text-muted-foreground mt-1">${new Date(event.start_time).toLocaleDateString()}</p>
            </div>
          `)
        )
        .addTo(map.current!);

      el.addEventListener("click", () => onEventClick(event.id));

      markers.current.push(marker);
      bounds.extend([event.location_lng!, event.location_lat!]);
    });

    if (eventsWithLocation.length > 0) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [events, onEventClick]);

  if (needsToken) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg p-8">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Mapbox Token Required</h3>
            <p className="text-sm text-muted-foreground">
              To display the events map, please add your Mapbox public token to the Supabase Edge Function secrets.
            </p>
            <p className="text-sm text-muted-foreground">
              Get your token at{" "}
              <a
                href="https://mapbox.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temp-token">Temporary Token (for testing)</Label>
            <Input
              id="temp-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add MAPBOX_PUBLIC_TOKEN to Supabase secrets for production
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full" />;
}
