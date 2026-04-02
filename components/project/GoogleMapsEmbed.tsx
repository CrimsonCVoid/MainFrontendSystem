"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface GoogleMapsEmbedProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  className?: string;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyD57RRRjukE-rlfwLcPbUUIVoqWqksndDQ";

/**
 * Google Maps Embed Component
 *
 * Displays an embedded Google Map with satellite view centered on coordinates.
 * Returns null if no valid coordinates are provided.
 */
export function GoogleMapsEmbed({
  latitude,
  longitude,
  address,
  className = "",
}: GoogleMapsEmbedProps) {
  const [loading, setLoading] = useState(true);

  const hasCoordinates = latitude && longitude && latitude !== 0 && longitude !== 0;

  // Debug log - remove after testing
  console.log("[GoogleMapsEmbed] Props:", { latitude, longitude, hasCoordinates });

  // Don't render anything if no coordinates
  if (!hasCoordinates) {
    return null;
  }

  // Generate embed URL with satellite view at coordinates
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=18&maptype=satellite`;

  return (
    <div className={`relative rounded-lg overflow-hidden border border-emerald-200 shadow-sm ${className}`}>
      <div className="aspect-video relative">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoading(false)}
          className="absolute inset-0"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        )}
      </div>
      {address && (
        <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50/50 border-t border-emerald-100">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
      )}
    </div>
  );
}
