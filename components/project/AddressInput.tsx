"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Google Places-style address data structure
 * Contains all parsed address components from the selected place
 */
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
}

/**
 * ADDRESS INPUT - Geoapify Address Autocomplete Component
 *
 * Real-time address search and selection powered by Geoapify API.
 * Returns structured address data with lat/lng coordinates.
 *
 * KY - HOW IT WORKS:
 * 1. User types in input field (debounced 300ms)
 * 2. fetchSuggestions() calls Geoapify API with search text
 * 3. Dropdown shows up to 5 address matches
 * 4. User selects address or uses keyboard (arrow keys, enter)
 * 5. selectAddress() parses result into AddressData format
 * 6. onChange callback fires with complete address object including lat/lng
 *
 * KY - AddressData STRUCTURE:
 * {
 *   address: "123 Main St",
 *   city: "Austin",
 *   state: "TX",
 *   postal_code: "78701",
 *   latitude: 30.2672,
 *   longitude: -97.7431,
 *   google_place_id: "geo_30.2672_-97.7431",
 *   formatted_address: "123 Main St, Austin, TX 78701"
 * }
 *
 * KY - INTEGRATION:
 * After user selects address, parent component receives AddressData via onChange.
 * Use latitude/longitude to trigger your roof rendering algorithm.
 * See dashboard-client.tsx line 237-248 for example integration point.
 */
export default function AddressInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Search for an address...",
}: AddressInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Load initial value into query field
  useEffect(() => {
    if (value?.formatted_address) {
      setQuery(value.formatted_address);
    }
  }, [value?.formatted_address]);

  /**
   * Fetch address suggestions from Geoapify API
   * Debounced to avoid excessive API calls
   */
  const fetchSuggestions = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "5f038b5c7ffb4e569e9d7a22539de590";
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          searchText
        )}&apiKey=${apiKey}&limit=5&format=json`
      );

      if (!response.ok) throw new Error("Failed to fetch suggestions");

      const data = await response.json();
      setSuggestions(data.results || []);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Address autocomplete error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle input changes with debouncing
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce API call by 300ms
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newQuery);
    }, 300);
  };

  /**
   * Parse Geoapify result into our AddressData format
   */
  const parseAddressData = (result: any): AddressData => {
    return {
      address: result.address_line1 || result.street || "",
      address_line2: result.address_line2 || "",
      city: result.city || "",
      state: result.state || result.state_code || "",
      postal_code: result.postcode || "",
      country: result.country_code || "US",
      latitude: result.lat,
      longitude: result.lon,
      google_place_id: result.place_id || `geo_${result.lat}_${result.lon}`,
      formatted_address: result.formatted || "",
    };
  };

  /**
   * Handle address selection from dropdown
   */
  const selectAddress = (result: any) => {
    const addressData = parseAddressData(result);
    setQuery(addressData.formatted_address);
    onChange(addressData);
    setShowDropdown(false);
    setSuggestions([]);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectAddress(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full space-y-2">
      <Label htmlFor="address-input" className="text-sm font-medium text-neutral-700">
        Property Address
      </Label>

      <div className="relative">
        {/* Search Icon */}
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

        {/* Input Field */}
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/20"
        />

        {/* Loading Spinner or Location Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-cyan-500" />
          ) : value ? (
            <MapPin className="h-4 w-4 text-emerald-500" />
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.place_id || index}
                onClick={() => selectAddress(suggestion)}
                className={`
                  cursor-pointer px-4 py-3 transition-colors duration-150
                  ${
                    index === selectedIndex
                      ? "bg-cyan-50 text-cyan-900"
                      : "hover:bg-neutral-50"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                    index === selectedIndex ? "text-cyan-500" : "text-neutral-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {suggestion.address_line1 || suggestion.street}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {[suggestion.city, suggestion.state, suggestion.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected Address Display */}
      {value && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-emerald-900">{value.address}</p>
              <p className="text-emerald-700">
                {value.city}, {value.state} {value.postal_code}
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                📍 {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onChange(null);
                inputRef.current?.focus();
              }}
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
