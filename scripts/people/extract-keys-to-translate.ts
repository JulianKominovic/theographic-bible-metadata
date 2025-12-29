import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { slice } from "../utils/slices";
import assert from "assert";

const people: { fields: KeysToTranslate }[] = JSON.parse(
  readFileSync(join("json", "people.json"), "utf8")
);
const processedPeople: { fields: KeysToTranslate }[] = [];

type KeysToTranslate = {
  name: string;
  // dictionaryText?: string;
  dictText?: string[]|undefined;
  alsoCalled?: string;
  "Disambiguation (temp)"?: string;
  surname?: string;
  events?: string;
};

// Check key types

for (const person of people) {
  assert(typeof person.fields.name === "string", person.fields.name);

  assert(
    person.fields.dictText ? Array.isArray(person.fields.dictText) : true,
    person.fields.name
  );

  assert(
    person.fields.alsoCalled
      ? typeof person.fields.alsoCalled === "string"
      : true,
    person.fields.name
  );

  assert(
    person.fields["Disambiguation (temp)"]
      ? typeof person.fields["Disambiguation (temp)"] === "string"
      : true,
    person.fields.name
  );

  assert(
    person.fields.surname ? typeof person.fields.surname === "string" : true,
    person.fields.name
  );

  assert(
    person.fields.events ? typeof person.fields.events === "string" : true,
    person.fields.name
  );
}

for (let i = 0; i < people.length; i++) {
  const person = people[i] as { fields: KeysToTranslate };
  console.log(
    "Processing person ",
    i,
    person.fields.name,
    " of ",
    people.length
  );

  //   const values = [
  //     person.fields.name,
  //     person.fields.dictText,
  //     person.fields.alsoCalled,
  //     person.fields["Disambiguation (temp)"],
  //     person.fields.surname,
  //     person.fields.events,
  //   ];

  const name =
    Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${person.fields.name}"`.text();
  const dictText =
    person.fields.dictText && person.fields.dictText.length > 0 ?
    person.fields.dictText?.map(async (text) => {
      return await Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${text}"`.text();
    }) : undefined;
  const alsoCalled = person.fields.alsoCalled
    ? await Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${person.fields.alsoCalled}"`.text()
    : undefined;
  const disambiguation = person.fields["Disambiguation (temp)"]
    ? await Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${person.fields["Disambiguation (temp)"]}"`.text()
    : undefined;
  const surname = person.fields.surname
    ? await Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${person.fields.surname}"`.text()
    : undefined;
  const events = person.fields.events
    ? await Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${person.fields.events}"`.text()
    : undefined;

  const [
    awaitedName,
    awaitedDictText,
    awaitedAlsoCalled,
    awaitedDisambiguation,
    awaitedSurname,
    awaitedEvents,
  ] = await Promise.all([
    name,
    dictText ? Promise.all(dictText) : undefined,
    alsoCalled,
    disambiguation,
    surname,
    events,
  ]);

  person.fields.name = awaitedName;
  person.fields.dictText = awaitedDictText;
  person.fields.alsoCalled = awaitedAlsoCalled;
  person.fields["Disambiguation (temp)"] = awaitedDisambiguation;
  person.fields.surname = awaitedSurname;
  person.fields.events = awaitedEvents;

  processedPeople.push(person);
  writeFileSync(
    join(__dirname, "people-processed.json"),
    JSON.stringify(processedPeople),
    "utf8"
  );
}

console.log(people);
