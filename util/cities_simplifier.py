from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from opencc import OpenCC  # type: ignore[import-not-found]
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: install opencc-python-reimplemented with "
        "`python3 -m pip install --user opencc-python-reimplemented`"
    ) from exc


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE_PATH = ROOT / "data" / "cities_new.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert Chinese text in cities JSON to Simplified Chinese."
    )
    parser.add_argument(
        "--source",
        default=str(DEFAULT_SOURCE_PATH),
        help="Source JSON path. Defaults to data/cities_new.json",
    )
    parser.add_argument(
        "--output",
        help="Output JSON path. Defaults to overwrite the source file.",
    )
    return parser.parse_args()


def convert_value(value: object, converter: OpenCC) -> object:
    if isinstance(value, str):
        return converter.convert(value)

    if isinstance(value, list):
        return [convert_value(item, converter) for item in value]

    if isinstance(value, dict):
        return {
            key: convert_value(item, converter)
            for key, item in value.items()
        }

    return value


def main() -> None:
    args = parse_args()
    source_path = Path(args.source).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve() if args.output else source_path

    with source_path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    converter = OpenCC("t2s")
    converted = convert_value(data, converter)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")

    with temp_path.open("w", encoding="utf-8") as file:
        json.dump(converted, file, ensure_ascii=False, indent=2)
        file.write("\n")

    temp_path.replace(output_path)
    print(f"Wrote simplified JSON to {output_path}")


if __name__ == "__main__":
    main()
