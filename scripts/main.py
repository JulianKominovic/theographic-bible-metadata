import argostranslate.package
import argostranslate.translate
import json
from pathlib import Path

from_code = "en"
to_code = "es"

# Download and install Argos Translate package
argostranslate.package.update_package_index()
available_packages = argostranslate.package.get_available_packages()
package_to_install = next(
    filter(
        lambda x: x.from_code == from_code and x.to_code == to_code, available_packages
    )
)
argostranslate.package.install_from_path(package_to_install.download())

def translate(text: str) -> str:
    return argostranslate.translate.translate(text, from_code, to_code)

# Get the script directory and project root
script_dir = Path(__file__).parent
project_root = script_dir.parent
json_dir = project_root / "json"
people_output_dir = script_dir / "people"
people_output_dir.mkdir(exist_ok=True)

# Read people.json
people_json_path = json_dir / "people.json"
with open(people_json_path, "r", encoding="utf8") as f:
    people = json.load(f)

processed_people = []

# Type validation
for person in people:
    assert isinstance(person["fields"]["name"], str), person["fields"]["name"]
    
    if "dictText" in person["fields"] and person["fields"]["dictText"] is not None:
        assert isinstance(person["fields"]["dictText"], list), person["fields"]["name"]
    
    if "alsoCalled" in person["fields"] and person["fields"]["alsoCalled"] is not None:
        assert isinstance(person["fields"]["alsoCalled"], str), person["fields"]["name"]
    
    if "Disambiguation (temp)" in person["fields"] and person["fields"]["Disambiguation (temp)"] is not None:
        assert isinstance(person["fields"]["Disambiguation (temp)"], str), person["fields"]["name"]
    
    if "surname" in person["fields"] and person["fields"]["surname"] is not None:
        assert isinstance(person["fields"]["surname"], str), person["fields"]["name"]
    
    if "events" in person["fields"] and person["fields"]["events"] is not None:
        assert isinstance(person["fields"]["events"], str), person["fields"]["name"]

# Process each person
for i, person in enumerate(people):
    print(f"Processing person {i} {person['fields']['name']} of {len(people)}")
    
    # Translate name
    translated_name = translate(person["fields"]["name"])
    
    # Translate dictText array if present
    translated_dict_text = None
    if "dictText" in person["fields"] and person["fields"]["dictText"] and len(person["fields"]["dictText"]) > 0:
        translated_dict_text = [translate(text) for text in person["fields"]["dictText"]]
    
    # Translate optional fields
    translated_also_called = None
    if "alsoCalled" in person["fields"] and person["fields"]["alsoCalled"]:
        translated_also_called = translate(person["fields"]["alsoCalled"])
    
    translated_disambiguation = None
    if "Disambiguation (temp)" in person["fields"] and person["fields"]["Disambiguation (temp)"]:
        translated_disambiguation = translate(person["fields"]["Disambiguation (temp)"])
    
    translated_surname = None
    if "surname" in person["fields"] and person["fields"]["surname"]:
        translated_surname = translate(person["fields"]["surname"])
    
    translated_events = None
    if "events" in person["fields"] and person["fields"]["events"]:
        translated_events = translate(person["fields"]["events"])
    
    # Update person fields with translated values
    person["fields"]["name"] = translated_name
    if "dictText" in person["fields"]:
        person["fields"]["dictText"] = translated_dict_text
    if "alsoCalled" in person["fields"]:
        person["fields"]["alsoCalled"] = translated_also_called
    if "Disambiguation (temp)" in person["fields"]:
        person["fields"]["Disambiguation (temp)"] = translated_disambiguation
    if "surname" in person["fields"]:
        person["fields"]["surname"] = translated_surname
    if "events" in person["fields"]:
        person["fields"]["events"] = translated_events
    
    processed_people.append(person)
    
    # Save incrementally
    output_path = people_output_dir / "people-processed.json"
    with open(output_path, "w", encoding="utf8") as f:
        json.dump(processed_people, f, ensure_ascii=False, indent=2)

print(f"Processed {len(people)} people")