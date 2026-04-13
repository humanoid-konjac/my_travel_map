from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = ROOT / "cities5000.txt"
COUNTRIES_PATH = ROOT / "data" / "countries.json"
OUTPUT_PATH = ROOT / "data" / "cities_new.json"
ISO3166_PATHS = (
    Path("/usr/share/zoneinfo/iso3166.tab"),
    Path("/usr/share/zoneinfo.default/iso3166.tab"),
)

HAN_CHAR_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def load_country_overrides() -> dict[str, str]:
    with COUNTRIES_PATH.open("r", encoding="utf-8") as file:
        countries = json.load(file)

    return {
        country["code"]: country["name"]
        for country in countries
        if country.get("code") and country.get("name")
    }


def build_country_lookup(country_codes: set[str]) -> dict[str, str]:
    overrides = load_country_overrides()
    resolved = load_system_country_names()

    lookup = {**resolved, **overrides}
    for code in country_codes:
        lookup.setdefault(code, code)

    return lookup


def load_system_country_names() -> dict[str, str]:
    for path in ISO3166_PATHS:
        if path.exists():
            with path.open("r", encoding="utf-8") as file:
                names: dict[str, str] = {}
                for line in file:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#"):
                        continue

                    code, name = stripped.split("\t", maxsplit=1)
                    names[code] = name

                return names

    return {}


def contains_han(value: str) -> bool:
    return bool(HAN_CHAR_RE.search(value))


def is_preferred_chinese_name(value: str) -> bool:
    if not value or not contains_han(value):
        return False

    for char in value.strip():
        if HAN_CHAR_RE.match(char) or char in " -()（）·・．/－":
            continue
        return False

    return True


def extract_chinese_name(name: str, alternate_names: str) -> str:
    candidates: list[str] = []

    for candidate in [part.strip() for part in alternate_names.split(",") if part.strip()]:
        if is_preferred_chinese_name(candidate) and candidate not in candidates:
            candidates.append(candidate)

    if is_preferred_chinese_name(name) and name not in candidates:
        candidates.append(name)

    if not candidates:
        return ""

    return min(candidates, key=lambda value: (len(value.replace(" ", "")), value))


def collect_country_codes() -> set[str]:
    country_codes: set[str] = set()

    with SOURCE_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            parts = line.rstrip("\n").split("\t")
            if len(parts) > 8 and parts[8]:
                country_codes.add(parts[8])

    return country_codes


def parse_cities(country_lookup: dict[str, str]) -> list[dict[str, object]]:
    cities: list[dict[str, object]] = []

    with SOURCE_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            parts = line.rstrip("\n").split("\t")

            if len(parts) < 19:
                continue

            name = parts[1].strip()
            ascii_name = parts[2].strip() or name
            alternate_names = parts[3].strip()
            latitude = float(parts[4])
            longitude = float(parts[5])
            country_code = parts[8].strip()
            country_name = country_lookup.get(country_code, country_code)

            city = {
                "name": f"{ascii_name}, {country_name}",
                "nameEn": ascii_name,
                "nameZh": extract_chinese_name(name, alternate_names),
                "countryName": country_name,
                "countryCode": country_code,
                "coordinates": [latitude, longitude],
                "visitDate": "",
                "stayLength": "",
                "description": "",
                "notes": "",
                "photos": [],
            }
            cities.append(city)

    return cities


def main() -> None:
    country_lookup = build_country_lookup(collect_country_codes())
    cities = parse_cities(country_lookup)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(cities, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Wrote {len(cities)} cities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
