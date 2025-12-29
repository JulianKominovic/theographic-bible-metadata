import { Database } from "bun:sqlite";
import { readFile } from "fs/promises";
import { join } from "path";

// Database configuration
const DB_PATH = "./theographic-bible-metadata.sqlite";
const JSON_DIR = join(__dirname, "..", "..", "json");

// Table field definitions based on documentation
const TABLE_SCHEMAS: Record<string, Record<string, string>> = {
  books: {
    osisName: "TEXT",
    bookName: "TEXT",
    chapterCount: "INTEGER",
    bookDiv: "TEXT",
    shortName: "TEXT",
    bookOrder: "INTEGER",
    verseCount: "INTEGER",
    testament: "TEXT",
    slug: "TEXT",
    peopleCount: "INTEGER",
    placeCount: "INTEGER",
  },
  chapters: {
    osisRef: "TEXT",
    chapterNum: "INTEGER",
    slug: "TEXT",
    peopleCount: "INTEGER",
    placesCount: "INTEGER",
    modified: "TEXT",
    "writer count": "INTEGER",
  },
  verses: {
    osisRef: "TEXT",
    verseNum: "TEXT",
    verseText: "TEXT",
    peopleCount: "INTEGER",
    placesCount: "INTEGER",
    yearNum: "INTEGER",
    status: "TEXT",
    mdText: "TEXT",
    richText: "TEXT",
    verseID: "TEXT",
    modified: "TEXT",
  },
  people: {
    personLookup: "TEXT",
    personID: "INTEGER",
    name: "TEXT",
    surname: "TEXT",
    isProperName: "INTEGER",
    gender: "TEXT",
    dictionaryLink: "TEXT",
    dictionaryText: "TEXT",
    verseCount: "INTEGER",
    events: "TEXT",
    minYear: "INTEGER",
    maxYear: "INTEGER",
    displayTitle: "TEXT",
    status: "TEXT",
    alphaGroup: "TEXT",
    slug: "TEXT",
    alsoCalled: "TEXT",
    ambiguous: "INTEGER",
    "Disambiguation (temp)": "TEXT",
    "Easton's Count": "INTEGER",
    modified: "TEXT",
  },
  places: {
    placeLookup: "TEXT",
    openBibleLat: "TEXT",
    openBibleLong: "TEXT",
    kjvName: "TEXT",
    esvName: "TEXT",
    comment: "TEXT",
    precision: "TEXT",
    featureType: "TEXT",
    aliases: "TEXT",
    dictionaryLink: "TEXT",
    dictionaryText: "TEXT",
    verseCount: "INTEGER",
    placeID: "INTEGER",
    recogitoUri: "TEXT",
    recogitoLat: "TEXT",
    recogitoLon: "TEXT",
    recogitoStatus: "TEXT",
    recogitoType: "TEXT",
    recogitoComments: "TEXT",
    recogitoLabel: "TEXT",
    recogitoUID: "TEXT",
    hasBeenHere: "TEXT",
    latitude: "TEXT",
    longitude: "TEXT",
    status: "TEXT",
    displayTitle: "TEXT",
    alphaGroup: "TEXT",
    slug: "TEXT",
    ambiguous: "INTEGER",
    modified: "TEXT",
    featureSubType: "TEXT",
  },
  events: {
    title: "TEXT",
    startDate: "TEXT",
    duration: "TEXT",
    notes: "TEXT",
    verseSort: "TEXT",
    modified: "TEXT",
    sortKey: "REAL",
    rangeFlag: "INTEGER",
    lag: "TEXT",
    lagType: "TEXT",
    eventID: "INTEGER",
  },
  periods: {
    yearNum: "TEXT",
    events: "TEXT",
    isoYear: "INTEGER",
    "BC-AD": "TEXT",
    formattedYear: "TEXT",
    modified: "TEXT",
  },
  peopleGroups: {
    groupName: "TEXT",
    events: "TEXT",
    modified: "TEXT",
  },
  easton: {
    dictLookup: "TEXT",
    termID: "TEXT",
    termLabel: "TEXT",
    def_id: "TEXT",
    has_list: "TEXT",
    itemNum: "INTEGER",
    matchType: "TEXT",
    matchSlugs: "TEXT",
    dictText: "TEXT",
    index: "INTEGER",
  },
};

// Junction table definitions: [tableName, [id1Column, id1Type, id2Column, id2Type]]
const JUNCTION_TABLES: Array<[string, string, string, string, string]> = [
  // Books relationships
  ["book_verses", "book_id", "TEXT", "verse_id", "TEXT"],
  ["book_chapters", "book_id", "TEXT", "chapter_id", "TEXT"],
  ["book_year_written", "book_id", "TEXT", "period_id", "TEXT"],
  ["book_place_written", "book_id", "TEXT", "place_id", "TEXT"],
  // Chapters relationships
  ["chapter_books", "chapter_id", "TEXT", "book_id", "TEXT"],
  ["chapter_verses", "chapter_id", "TEXT", "verse_id", "TEXT"],
  ["chapter_writers", "chapter_id", "TEXT", "person_id", "TEXT"],
  // Easton relationships
  ["easton_person_lookup", "easton_id", "TEXT", "person_id", "TEXT"],
  ["easton_place_lookup", "easton_id", "TEXT", "place_id", "TEXT"],
  // Events relationships
  ["event_participants", "event_id", "TEXT", "person_id", "TEXT"],
  ["event_locations", "event_id", "TEXT", "place_id", "TEXT"],
  ["event_verses", "event_id", "TEXT", "verse_id", "TEXT"],
  ["event_predecessor", "event_id", "TEXT", "predecessor_event_id", "TEXT"],
  ["event_part_of", "event_id", "TEXT", "parent_event_id", "TEXT"],
  ["event_places_from_verses", "event_id", "TEXT", "place_id", "TEXT"],
  ["event_people_from_verses", "event_id", "TEXT", "person_id", "TEXT"],
  ["event_groups", "event_id", "TEXT", "people_group_id", "TEXT"],
  // People relationships
  ["people_birth_year", "person_id", "TEXT", "event_id", "TEXT"],
  ["people_death_year", "person_id", "TEXT", "event_id", "TEXT"],
  ["people_member_of", "person_id", "TEXT", "people_group_id", "TEXT"],
  ["people_birth_place", "person_id", "TEXT", "place_id", "TEXT"],
  ["people_death_place", "person_id", "TEXT", "place_id", "TEXT"],
  ["people_verses", "person_id", "TEXT", "verse_id", "TEXT"],
  ["people_siblings", "person_id", "TEXT", "sibling_id", "TEXT"],
  ["people_half_siblings_same_mother", "person_id", "TEXT", "sibling_id", "TEXT"],
  ["people_half_siblings_same_father", "person_id", "TEXT", "sibling_id", "TEXT"],
  ["people_chapters_written", "person_id", "TEXT", "chapter_id", "TEXT"],
  ["people_mother", "person_id", "TEXT", "mother_id", "TEXT"],
  ["people_father", "person_id", "TEXT", "father_id", "TEXT"],
  ["people_children", "person_id", "TEXT", "child_id", "TEXT"],
  ["people_partners", "person_id", "TEXT", "partner_id", "TEXT"],
  ["people_eastons", "person_id", "TEXT", "easton_id", "TEXT"],
  ["people_timeline", "person_id", "TEXT", "event_id", "TEXT"],
  // PeopleGroups relationships
  ["people_groups_members", "group_id", "TEXT", "person_id", "TEXT"],
  ["people_groups_verses", "group_id", "TEXT", "verse_id", "TEXT"],
  ["people_groups_events", "group_id", "TEXT", "event_id", "TEXT"],
  ["people_groups_part_of", "group_id", "TEXT", "parent_group_id", "TEXT"],
  // Periods relationships
  ["periods_people_born", "period_id", "TEXT", "person_id", "TEXT"],
  ["periods_people_died", "period_id", "TEXT", "person_id", "TEXT"],
  ["periods_books_written", "period_id", "TEXT", "book_id", "TEXT"],
  // Places relationships
  ["places_people_born", "place_id", "TEXT", "person_id", "TEXT"],
  ["places_people_died", "place_id", "TEXT", "person_id", "TEXT"],
  ["places_books_written", "place_id", "TEXT", "book_id", "TEXT"],
  ["places_verses", "place_id", "TEXT", "verse_id", "TEXT"],
  ["places_duplicate_of", "place_id", "TEXT", "duplicate_place_id", "TEXT"],
  ["places_eastons", "place_id", "TEXT", "easton_id", "TEXT"],
  ["places_events_here", "place_id", "TEXT", "event_id", "TEXT"],
  ["places_root_id", "place_id", "TEXT", "root_place_id", "TEXT"],
  // Verses relationships
  ["verse_books", "verse_id", "TEXT", "book_id", "TEXT"],
  ["verse_people", "verse_id", "TEXT", "person_id", "TEXT"],
  ["verse_places", "verse_id", "TEXT", "place_id", "TEXT"],
  ["verse_chapters", "verse_id", "TEXT", "chapter_id", "TEXT"],
  ["verse_people_groups", "verse_id", "TEXT", "people_group_id", "TEXT"],
  ["verse_events", "verse_id", "TEXT", "event_id", "TEXT"],
];

// Special junction tables that use personLookup string instead of person_id
const SPECIAL_JUNCTION_TABLES: Array<[string, string, string, string, string]> = [
  ["book_writers", "book_id", "TEXT", "person_lookup", "TEXT"],
  ["places_has_been_here", "place_id", "TEXT", "person_lookup", "TEXT"],
];

// Field mappings: JSON field name -> relationship info [junctionTable, targetField, isArray]
const RELATIONSHIP_MAPPINGS: Record<string, Record<string, [string, string, boolean]>> = {
  books: {
    verses: ["book_verses", "verse_id", true],
    chapters: ["book_chapters", "chapter_id", true],
    writers: ["book_writers", "person_lookup", true], // Special: uses personLookup string
    yearWritten: ["book_year_written", "period_id", true],
    placeWritten: ["book_place_written", "place_id", true],
  },
  chapters: {
    book: ["chapter_books", "book_id", true],
    writer: ["chapter_writers", "person_id", true],
    verses: ["chapter_verses", "verse_id", true],
  },
  verses: {
    book: ["verse_books", "book_id", true],
    people: ["verse_people", "person_id", true],
    places: ["verse_places", "place_id", true],
    chapter: ["verse_chapters", "chapter_id", true],
    peopleGroups: ["verse_people_groups", "people_group_id", true],
    event: ["verse_events", "event_id", true],
  },
  people: {
    birthYear: ["people_birth_year", "event_id", true],
    deathYear: ["people_death_year", "event_id", true],
    memberOf: ["people_member_of", "people_group_id", true],
    birthPlace: ["people_birth_place", "place_id", true],
    deathPlace: ["people_death_place", "place_id", true],
    verses: ["people_verses", "verse_id", true],
    siblings: ["people_siblings", "sibling_id", true],
    halfSiblingsSameMother: ["people_half_siblings_same_mother", "sibling_id", true],
    halfSiblingsSameFather: ["people_half_siblings_same_father", "sibling_id", true],
    chaptersWritten: ["people_chapters_written", "chapter_id", true],
    mother: ["people_mother", "mother_id", true],
    father: ["people_father", "father_id", true],
    children: ["people_children", "child_id", true],
    partners: ["people_partners", "partner_id", true],
    eastons: ["people_eastons", "easton_id", true],
    timeline: ["people_timeline", "event_id", true],
  },
  places: {
    peopleBorn: ["places_people_born", "person_id", true],
    peopleDied: ["places_people_died", "person_id", true],
    booksWritten: ["places_books_written", "book_id", true],
    verses: ["places_verses", "verse_id", true],
    hasBeenHere: ["places_has_been_here", "person_lookup", true], // Special: uses personLookup string
    duplicate_of: ["places_duplicate_of", "duplicate_place_id", true],
    eastons: ["places_eastons", "easton_id", true],
    eventsHere: ["places_events_here", "event_id", true],
    rootID: ["places_root_id", "root_place_id", true],
  },
  events: {
    participants: ["event_participants", "person_id", true],
    locations: ["event_locations", "place_id", true],
    verses: ["event_verses", "verse_id", true],
    predecessor: ["event_predecessor", "predecessor_event_id", true],
    partOf: ["event_part_of", "parent_event_id", true],
    "places (from verses)": ["event_places_from_verses", "place_id", true],
    "people (from verses)": ["event_people_from_verses", "person_id", true],
    groups: ["event_groups", "people_group_id", true],
  },
  periods: {
    peopleBorn: ["periods_people_born", "person_id", true],
    peopleDied: ["periods_people_died", "person_id", true],
    booksWritten: ["periods_books_written", "book_id", true],
  },
  peopleGroups: {
    members: ["people_groups_members", "person_id", true],
    verses: ["people_groups_verses", "verse_id", true],
    events_dev: ["people_groups_events", "event_id", true],
    partOf: ["people_groups_part_of", "parent_group_id", true],
  },
  easton: {
    personLookup: ["easton_person_lookup", "person_id", true],
    placeLookup: ["easton_place_lookup", "place_id", true],
  },
};

// Escape SQL identifiers (column/table names) with double quotes
function escapeIdentifier(identifier: string): string {
  return `"${identifier}"`;
}

function createTableSchema(tableName: string, fields: Record<string, string>): { dropSql: string; createSql: string } {
  const columns = [
    `"id" TEXT PRIMARY KEY`,
    `"createdTime" TEXT`,
    ...Object.entries(fields).map(([name, type]) => `${escapeIdentifier(name)} ${type}`),
  ];
  return {
    dropSql: `DROP TABLE IF EXISTS ${escapeIdentifier(tableName)}`,
    createSql: `CREATE TABLE ${escapeIdentifier(tableName)} (${columns.join(", ")})`,
  };
}

function createJunctionTableSchema(
  tableName: string,
  id1Column: string,
  id1Type: string,
  id2Column: string,
  id2Type: string
): string {
  return `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(tableName)} (
    ${escapeIdentifier(id1Column)} ${id1Type},
    ${escapeIdentifier(id2Column)} ${id2Type},
    PRIMARY KEY (${escapeIdentifier(id1Column)}, ${escapeIdentifier(id2Column)})
  )`;
}

function getScalarValue(value: any, fieldType: string): any {
  if (value === null || value === undefined) return null;
  
  if (fieldType === "INTEGER") {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "number") return Math.floor(value);
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    }
  }
  
  if (fieldType === "REAL") {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
  }
  
  return String(value);
}

async function insertTableData(
  db: Database,
  tableName: string,
  records: any[],
  schema: Record<string, string>
): Promise<void> {
  const fieldNames = Object.keys(schema);
  const escapedFieldNames = fieldNames.map(escapeIdentifier);
  const placeholders = fieldNames.map(() => "?").join(", ");
  const insertSql = `INSERT OR REPLACE INTO ${escapeIdentifier(tableName)} ("id", "createdTime", ${escapedFieldNames.join(", ")}) VALUES (?, ?, ${placeholders})`;
  const stmt = db.prepare(insertSql);

  try {
    const insertMany = db.transaction((records: any[]) => {
      let successCount = 0;
      let errorCount = 0;
      for (const record of records) {
        try {
          if (!record.id) {
            console.warn(`  Warning: Skipping record without id in ${tableName}`);
            errorCount++;
            continue;
          }

          const values = [
            record.id,
            record.createdTime || null,
            ...fieldNames.map((field) => {
              const value = record.fields?.[field];
              const fieldType = schema[field] || "TEXT";
              return getScalarValue(value, fieldType);
            }),
          ];
          stmt.run(...values);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`  Error inserting record ${record.id} into ${tableName}:`, error);
        }
      }
      return { successCount, errorCount };
    });

    const result = insertMany(records);
    console.log(`  Inserted ${result.successCount} records into ${tableName}${result.errorCount > 0 ? ` (${result.errorCount} errors)` : ""}`);
  } catch (error) {
    console.error(`  Failed to insert data into ${tableName}:`, error);
    throw error;
  }
}

// Map table names to their ID column names
const TABLE_ID_FIELDS: Record<string, string> = {
  books: "book_id",
  chapters: "chapter_id",
  verses: "verse_id",
  people: "person_id",
  places: "place_id",
  events: "event_id",
  periods: "period_id",
  peopleGroups: "group_id",
  easton: "easton_id",
};

async function insertJunctionData(
  db: Database,
  junctionTable: string,
  sourceRecords: any[],
  sourceIdField: string,
  relationshipField: string,
  targetIdField: string,
  usePersonLookup: boolean = false,
  isCommaSeparated: boolean = false
): Promise<void> {
  const insertSql = `INSERT OR IGNORE INTO ${escapeIdentifier(junctionTable)} (${escapeIdentifier(sourceIdField)}, ${escapeIdentifier(targetIdField)}) VALUES (?, ?)`;
  const stmt = db.prepare(insertSql);

  try {
    const insertMany = db.transaction((records: any[]) => {
      let count = 0;
      let skippedCount = 0;
      for (const record of records) {
        if (!record.id) {
          skippedCount++;
          continue;
        }

        const sourceId = record.id;
        let relationships = record.fields?.[relationshipField];
        
        if (!relationships) {
          continue;
        }

        // Handle comma-separated string (for hasBeenHere)
        if (isCommaSeparated && typeof relationships === "string") {
          relationships = relationships.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }

        if (!Array.isArray(relationships) || relationships.length === 0) {
          continue;
        }

        for (const targetId of relationships) {
          try {
            if (!targetId) {
              skippedCount++;
              continue;
            }

            if (usePersonLookup && typeof targetId === "string") {
              // For personLookup fields, the value is already a string
              stmt.run(sourceId, targetId);
              count++;
            } else if (targetId) {
              stmt.run(sourceId, targetId);
              count++;
            }
          } catch (error) {
            skippedCount++;
            // Silently skip invalid relationships
          }
        }
      }
      return { count, skippedCount };
    });

    const result = insertMany(sourceRecords);
    if (result.count > 0) {
      console.log(`  Inserted ${result.count} relationships into ${junctionTable}${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}`);
    }
  } catch (error) {
    console.error(`  Failed to insert relationships into ${junctionTable}:`, error);
    throw error;
  }
}

async function processTable(
  db: Database,
  tableName: string,
  jsonPath: string
): Promise<void> {
  console.log(`\nProcessing ${tableName}...`);
  
  try {
    // Read and parse JSON
    const jsonContent = await readFile(jsonPath, "utf-8");
    const records = JSON.parse(jsonContent);
    
    if (!Array.isArray(records)) {
      throw new Error(`Expected array in ${jsonPath}`);
    }

    console.log(`  Loaded ${records.length} records from ${jsonPath}`);

    // Create main table
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) {
      throw new Error(`No schema defined for table ${tableName}`);
    }

    const { dropSql, createSql } = createTableSchema(tableName, schema);
    db.exec(dropSql);
    db.exec(createSql);
    console.log(`  Created table ${tableName}`);

    // Insert main data
    await insertTableData(db, tableName, records, schema);

    // Process relationships
    const relationships = RELATIONSHIP_MAPPINGS[tableName];
    if (relationships) {
      const sourceIdField = TABLE_ID_FIELDS[tableName];
      if (!sourceIdField) {
        throw new Error(`No ID field mapping for table ${tableName}`);
      }

      for (const [fieldName, [junctionTable, targetField, isArray]] of Object.entries(relationships)) {
        if (!isArray) continue;

        const usePersonLookup = 
          (tableName === "books" && fieldName === "writers") ||
          (tableName === "places" && fieldName === "hasBeenHere");

        const isCommaSeparated = 
          (tableName === "places" && fieldName === "hasBeenHere");

        await insertJunctionData(
          db,
          junctionTable,
          records,
          sourceIdField,
          fieldName,
          targetField,
          usePersonLookup,
          isCommaSeparated
        );
      }
    }
  } catch (error) {
    console.error(`  Error processing ${tableName}:`, error);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  console.log("Starting migration from JSON to SQLite...");
  console.log(`Database: ${DB_PATH}`);
  console.log(`JSON directory: ${JSON_DIR}`);

  let db: Database | null = null;

  try {
    // Create/open database
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.exec("PRAGMA foreign_keys = ON");
    console.log("Enabled foreign keys");

    // Create all junction tables first
    console.log("\nCreating junction tables...");
    for (const [tableName, id1Col, id1Type, id2Col, id2Type] of JUNCTION_TABLES) {
      try {
        const sql = createJunctionTableSchema(tableName, id1Col, id1Type, id2Col, id2Type);
        db.exec(sql);
      } catch (error) {
        console.error(`  Error creating junction table ${tableName}:`, error);
        throw error;
      }
    }
    
    for (const [tableName, id1Col, id1Type, id2Col, id2Type] of SPECIAL_JUNCTION_TABLES) {
      try {
        const sql = createJunctionTableSchema(tableName, id1Col, id1Type, id2Col, id2Type);
        db.exec(sql);
      } catch (error) {
        console.error(`  Error creating special junction table ${tableName}:`, error);
        throw error;
      }
    }
    console.log(`Created ${JUNCTION_TABLES.length + SPECIAL_JUNCTION_TABLES.length} junction tables`);

    // Process tables in dependency order
    const tableOrder = [
      "books",
      "chapters", 
      "verses",
      "people",
      "places",
      "periods",
      "peopleGroups",
      "events",
      "easton",
    ];

    for (const tableName of tableOrder) {
      const jsonPath = join(JSON_DIR, `${tableName}.json`);
      await processTable(db, tableName, jsonPath);
    }

    // Process special case: chapter_books relationships
    // chapters.book is already handled by RELATIONSHIP_MAPPINGS, but we also need to
    // ensure verse_books is populated from chapter relationships
    console.log("\nProcessing derived relationships...");
    try {
      const chaptersJson = await readFile(join(JSON_DIR, "chapters.json"), "utf-8");
      const chapters = JSON.parse(chaptersJson);
      
      const verseBooksStmt = db.prepare(`INSERT OR IGNORE INTO ${escapeIdentifier("verse_books")} (${escapeIdentifier("verse_id")}, ${escapeIdentifier("book_id")}) VALUES (?, ?)`);
      
      let derivedCount = 0;
      for (const chapter of chapters) {
        const bookIds = chapter.fields?.book || [];
        const verses = chapter.fields?.verses || [];
        for (const bookId of bookIds) {
          for (const verseId of verses) {
            verseBooksStmt.run(verseId, bookId);
            derivedCount++;
          }
        }
      }
      if (derivedCount > 0) {
        console.log(`  Derived ${derivedCount} verse-book relationships from chapters`);
      }
    } catch (error) {
      console.error("  Error processing derived relationships:", error);
      throw error;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nMigration completed successfully in ${duration} seconds!`);
  } catch (error) {
    console.error("\nMigration failed:", error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
