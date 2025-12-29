import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { slice } from "../utils/slices";
import assert from "assert";

const books: { fields: KeysToTranslate }[] = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "json", "books.json"), "utf8")
);
const processedBooks: { fields: KeysToTranslate }[] = [];

type KeysToTranslate = {
  bookName: string;
  bookDiv: string;
  testament?: string;
};

// Check key types

for (const book of books) {
  assert(typeof book.fields.bookName === "string", book.fields.bookName);

  assert(
    typeof book.fields.bookDiv === "string",
    book.fields.bookName
  );

  assert(
    book.fields.testament
      ? typeof book.fields.testament === "string"
      : true,
    book.fields.bookName
  );
}

for (let i = 0; i < books.length; i++) {
  const book = books[i] as { fields: KeysToTranslate };
  console.log(
    "Processing book ",
    i,
    book.fields.bookName,
    " of ",
    books.length
  );

  const bookName =
    Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${book.fields.bookName}"`.text();
  const bookDiv =
    Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${book.fields.bookDiv}"`.text();
  const testament = book.fields.testament
    ? Bun.$`ARGOS_DEVICE_TYPE=auto argos-translate --from-lang en --to-lang es "${book.fields.testament}"`.text()
    : undefined;

  const [
    awaitedBookName,
    awaitedBookDiv,
    awaitedTestament,
  ] = await Promise.all([
    bookName,
    bookDiv,
    testament,
  ]);

  book.fields.bookName = awaitedBookName.trim();
  book.fields.bookDiv = awaitedBookDiv.trim();
  if (awaitedTestament) {
    book.fields.testament = awaitedTestament.trim();
  }

  processedBooks.push(book);
  writeFileSync(
    join(__dirname, "books-processed.json"),
    JSON.stringify(processedBooks),
    "utf8"
  );
}

console.log(books);

// console.log(keysToTranslate.length)

// const slicedKeys = slice(keysToTranslate,100);

// console.log(JSON.stringify(slicedKeys[0]))
// const translatedKeys = await Promise.all(keysToTranslate.slice(0,100).map(async (key: KeyToTranslate) => {
//     const translated = await translate();
//     return {
//         ...key,
//         translated
//     }
// }));
// console.log(translatedKeys)
// writeFileSync(join(__dirname,"people-keys-to-translate.json"),JSON.stringify(keysToTranslate),"utf8");
