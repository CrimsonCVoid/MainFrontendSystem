"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AddressData {
  address: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  google_place_id: string;
  formatted_address: string;
}

interface AddressInputProps {
  value?: AddressData | null;
  onChange: (address: AddressData | null) => void;
  disabled?: boolean;
  placeholder?: string;
  hideLabel?: boolean;
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

export default function AddressInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Search for an address...",
  hideLabel = false,
}: AddressInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const scriptLoadedRef = useRef(false);

  // Load initial value
  useEffect(() => {
    if (value?.formatted_address) {
      setQuery(value.formatted_address);
    }
  }, [value?.formatted_address]);

  // Load Google Maps script
  useEffect(() => {
    if (scriptLoadedRef.current || typeof window === "undefined") return;
    if ((window as any).google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      geocoderRef.current = new google.maps.Geocoder();
      scriptLoadedRef.current = true;
      return;
    }

    if (!GOOGLE_API_KEY) {
      console.warn("[AddressInput] No Google API key found. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      geocoderRef.current = new google.maps.Geocoder();
      scriptLoadedRef.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const fetchSuggestions = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);

    // Use Google Places Autocomplete if available
    if (autocompleteServiceRef.current) {
      try {
        const request = {
          input: searchText,
          componentRestrictions: { country: "us" },
          types: ["address"],
        };
        autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
          setLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowDropdown(true);
            setSelectedIndex(-1);
          } else {
            setSuggestions([]);
          }
        });
      } catch (error) {
        console.error("Google Places error:", error);
        setLoading(false);
        setSuggestions([]);
      }
      return;
    }

    // Fallback: Google Geocoding API via fetch
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchText)}&components=country:US&key=${GOOGLE_API_KEY}`
      );
      if (!response.ok) throw new Error("Geocode failed");
      const data = await response.json();
      setSuggestions(data.results || []);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Geocode error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => fetchSuggestions(newQuery), 300);
  };

  // Parse Google Places prediction into AddressData using Geocoder
  const selectGooglePlace = async (prediction: google.maps.places.AutocompletePrediction) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(prediction.description);
    setLoading(true);

    try {
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ placeId: prediction.place_id }, (results, status) => {
          setLoading(false);
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            const result = results[0];
            const addressData = parseGoogleResult(result, prediction.place_id);
            console.log("[AddressInput] Selected:", addressData.formatted_address, addressData.latitude, addressData.longitude);
            onChange(addressData);
          }
        });
      }
    } catch (err) {
      console.error("Geocode place error:", err);
      setLoading(false);
    }
  };

  // Parse a Google Geocoder result into AddressData
  const parseGoogleResult = (result: google.maps.GeocoderResult, placeId?: string): AddressData => {
    const components = result.address_components;
    const get = (type: string) => components.find((c) => c.types.includes(type));

    const streetNumber = get("street_number")?.long_name || "";
    const route = get("route")?.long_name || "";
    const city = get("locality")?.long_name || get("sublocality")?.long_name || get("administrative_area_level_2")?.long_name || "";
    const state = get("administrative_area_level_1")?.short_name || "";
    const postalCode = get("postal_code")?.long_name || "";
    const country = get("country")?.short_name || "US";

    return {
      address: `${streetNumber} ${route}`.trim(),
      city,
      state,
      postal_code: postalCode,
      country,
      latitude: result.geometry.location.lat(),
      longitude: result.geometry.location.lng(),
      google_place_id: placeId || result.place_id,
      formatted_address: result.formatted_address,
    };
  };

  // Select from fallback geocode results
  const selectGeocodeFallback = (result: any) => {
    setShowDropdown(false);
    setSuggestions([]);

    const components = result.address_components || [];
    const get = (type: string) => components.find((c: any) => c.types?.includes(type));

    const addressData: AddressData = {
      address: `${get("street_number")?.long_name || ""} ${get("route")?.long_name || ""}`.trim(),
      city: get("locality")?.long_name || get("administrative_area_level_2")?.long_name || "",
      state: get("administrative_area_level_1")?.short_name || "",
      postal_code: get("postal_code")?.long_name || "",
      country: get("country")?.short_name || "US",
      latitude: result.geometry?.location?.lat || 0,
      longitude: result.geometry?.location?.lng || 0,
      google_place_id: result.place_id || "",
      formatted_address: result.formatted_address || "",
    };

    setQuery(addressData.formatted_address);
    onChange(addressData);
  };

  const selectAddress = (suggestion: any) => {
    // Google Places Autocomplete prediction
    if (suggestion.place_id && suggestion.description) {
      selectGooglePlace(suggestion);
      return;
    }
    // Geocode API fallback result
    selectGeocodeFallback(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) selectAddress(suggestions[selectedIndex]);
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get display text for a suggestion
  const getSuggestionText = (suggestion: any) => {
    // Google Places prediction
    if (suggestion.structured_formatting) {
      return {
        main: suggestion.structured_formatting.main_text,
        secondary: suggestion.structured_formatting.secondary_text,
      };
    }
    // Geocode fallback
    return {
      main: suggestion.formatted_address?.split(",")[0] || "",
      secondary: suggestion.formatted_address?.split(",").slice(1).join(",").trim() || "",
    };
  };

  return (
    <div className="relative w-full space-y-2">
      {!hideLabel && (
        <Label htmlFor="address-input" className="text-sm font-medium text-neutral-700">
          Property Address
        </Label>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-cyan-500" />
          ) : value ? (
            <MapPin className="h-4 w-4 text-emerald-500" />
          ) : null}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => {
              const text = getSuggestionText(suggestion);
              return (
                <li
                  key={suggestion.place_id || index}
                  onClick={() => selectAddress(suggestion)}
                  className={`cursor-pointer px-4 py-3 transition-colors duration-150 ${
                    index === selectedIndex ? "bg-cyan-50 text-cyan-900" : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                      index === selectedIndex ? "text-cyan-500" : "text-neutral-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{text.main}</p>
                      <p className="text-xs text-neutral-500 truncate">{text.secondary}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-1.5 border-t border-neutral-100 bg-neutral-50">
            <p className="text-[10px] text-neutral-400">Powered by Google</p>
          </div>
        </div>
      )}

      {value && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-emerald-900">{value.address}</p>
              <p className="text-emerald-700">{value.city}, {value.state} {value.postal_code}</p>
            </div>
            <button
              type="button"
              onClick={() => { setQuery(""); onChange(null); inputRef.current?.focus(); }}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
