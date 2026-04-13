from __future__ import annotations

from collections import defaultdict
import json
import re
import unicodedata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = ROOT / "data" / "backup" / "cities5000.txt"
COUNTRIES_PATH = ROOT / "data" / "countries.json"
OUTPUT_PATH = ROOT / "data" / "cities_all.json"
ISO3166_PATHS = (
    Path("/usr/share/zoneinfo/iso3166.tab"),
    Path("/usr/share/zoneinfo.default/iso3166.tab"),
)

WORLD_ALLOWED_FEATURE_CODES = {"PPLC", "PPLA", "PPLA2", "PPLA3", "PPL"}
CHINA_ALWAYS_KEEP_FEATURE_CODES = {"PPLC", "PPLA"}
CHINA_MAYBE_KEEP_FEATURE_CODES = {"PPLA2", "PPLA3", "PPL"}
CHINA_FALLBACK_POPULATION = 150_000
OTHER_COUNTRY_LIMIT = 20
OTHER_COUNTRY_SCORE_BONUS = {
    "PPLC": 400_000,
    "PPLA": 150_000,
    "PPLA2": 50_000,
    "PPLA3": 20_000,
    "PPL": 0,
}
OTHER_COUNTRY_EXCLUDED_PRIMARY_NAMES = {
    "US": {"Brooklyn", "Queens", "Manhattan", "The Bronx", "Staten Island"},
}
LOWER_LEVEL_ENGLISH_MARKERS = (
    "district",
    "residential district",
    "subdistrict",
    "town",
    "township",
    "village",
    "neighborhood",
)
LOWER_LEVEL_CHINESE_SUFFIXES = (
    "区",
    "镇",
    "乡",
    "街道",
    "村",
    "苏木",
    "旗",
    "盟",
    "地区",
    "自治州",
    "开发区",
    "新区",
    "居委会",
)
LOWER_LEVEL_PINYIN_SUFFIXES = (
    " qu",
    " zhen",
    " xiang",
    " jiedao",
    " cun",
    " sumu",
    " qi",
    " meng",
    " diqu",
    " zizhizhou",
    " kaifaqu",
    " xinqu",
    " juweihui",
)
CITY_LEVEL_CHINESE_SUFFIXES = ("市", "特别行政区")


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


def collect_country_codes() -> set[str]:
    country_codes: set[str] = set()

    with SOURCE_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            parts = line.rstrip("\n").split("\t")
            if len(parts) > 8 and parts[8]:
                country_codes.add(parts[8])

    return country_codes


def split_aliases(value: str) -> list[str]:
    return [alias.strip() for alias in value.split(",") if alias.strip()]


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", without_marks.lower())


def contains_cjk(value: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in value)


def has_lower_level_alias(aliases: list[str]) -> bool:
    lower_aliases = [alias.lower() for alias in aliases]
    if any(any(marker in alias for marker in LOWER_LEVEL_ENGLISH_MARKERS) for alias in lower_aliases):
        return True
    if any(normalize_name(alias).endswith(normalize_name(suffix)) for alias in aliases for suffix in LOWER_LEVEL_PINYIN_SUFFIXES):
        return True

    chinese_aliases = [alias for alias in aliases if contains_cjk(alias)]
    return any(alias.endswith(LOWER_LEVEL_CHINESE_SUFFIXES) for alias in chinese_aliases)


def has_matching_city_alias(primary_name: str, aliases: list[str]) -> bool:
    normalized_primary = normalize_name(primary_name)
    if not normalized_primary:
        return False

    for alias in aliases:
        alias_lower = alias.lower()
        candidates: list[str] = []

        if alias_lower.endswith(" shi"):
            candidates.append(alias_lower.removesuffix(" shi"))
        if alias_lower.endswith(" city"):
            candidates.append(alias_lower.removesuffix(" city"))
        if alias.endswith(CITY_LEVEL_CHINESE_SUFFIXES):
            candidates.append(alias[:-1])

        for candidate in candidates:
            if normalize_name(candidate) == normalized_primary:
                return True

    return False


def build_record(parts: list[str], country_lookup: dict[str, str]) -> dict[str, Any] | None:
    if len(parts) < 19:
        return None

    name = parts[1].strip()
    ascii_name = parts[2].strip() or name
    country_code = parts[8].strip()
    country_name = country_lookup.get(country_code, country_code)

    try:
        latitude = float(parts[4])
        longitude = float(parts[5])
        population = int(parts[14] or 0)
    except ValueError:
        return None

    return {
        "ascii_name": ascii_name,
        "aliases": [ascii_name, name, *split_aliases(parts[3].strip())],
        "country_code": country_code,
        "country_name": country_name,
        "feature_code": parts[7].strip(),
        "admin2_code": parts[11].strip(),
        "population": population,
        "city": {
            "name": f"{ascii_name}, {country_name}",
            "countryCode": country_code,
            "coordinates": [latitude, longitude],
            "visitDate": "",
            "stayLength": "",
            "description": "",
            "notes": "",
            "photos": [],
        },
    }


def should_keep_china_record(record: dict[str, Any]) -> bool:
    feature_code = str(record["feature_code"])
    if feature_code in CHINA_ALWAYS_KEEP_FEATURE_CODES:
        return True

    if feature_code not in CHINA_MAYBE_KEEP_FEATURE_CODES:
        return False

    ascii_name = str(record["ascii_name"])
    aliases = list(record["aliases"])
    if has_matching_city_alias(ascii_name, aliases):
        return True

    return (
        int(record["population"]) >= CHINA_FALLBACK_POPULATION
        and len(str(record["admin2_code"])) == 4
        and not has_lower_level_alias(aliases)
    )


def get_other_country_score(record: dict[str, Any]) -> tuple[int, int, str]:
    feature_code = str(record["feature_code"])
    population = int(record["population"])
    return (
        population + OTHER_COUNTRY_SCORE_BONUS.get(feature_code, 0),
        population,
        str(record["ascii_name"]).lower(),
    )


def select_other_country_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for record in sorted(records, key=get_other_country_score, reverse=True):
        excluded_names = OTHER_COUNTRY_EXCLUDED_PRIMARY_NAMES.get(str(record["country_code"]), set())
        if str(record["ascii_name"]) in excluded_names:
            continue

        city_name = str(record["city"]["name"])
        if city_name in seen_names:
            continue

        seen_names.add(city_name)
        selected.append(record)
        if len(selected) >= OTHER_COUNTRY_LIMIT:
            break

    return selected


def parse_cities(country_lookup: dict[str, str]) -> list[dict[str, Any]]:
    china_records: list[dict[str, Any]] = []
    other_country_records: dict[str, list[dict[str, Any]]] = defaultdict(list)

    with SOURCE_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            parts = line.rstrip("\n").split("\t")

            record = build_record(parts, country_lookup)
            if not record:
                continue

            feature_code = str(record["feature_code"])
            if feature_code not in WORLD_ALLOWED_FEATURE_CODES:
                continue

            country_code = str(record["country_code"])
            if country_code == "CN":
                if should_keep_china_record(record):
                    china_records.append(record)
                continue

            other_country_records[country_code].append(record)

    selected_records = dedupe_records(china_records)
    for country_code in sorted(other_country_records):
        selected_records.extend(select_other_country_records(other_country_records[country_code]))

    selected_records.sort(
        key=lambda record: (
            str(record["country_name"]),
            str(record["city"]["name"]),
        )
    )

    return [record["city"] for record in selected_records]


def dedupe_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for record in records:
        city_name = str(record["city"]["name"])
        if city_name in seen_names:
            continue

        seen_names.add(city_name)
        deduped.append(record)

    return deduped


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
