# Calendar Import

## Dataset layout
- Add each term under `data/calendar/datasets/<dataset-id>/`.
- Put `activities_guess.json` in that folder.
- Keep `activities_guess.csv` only as a reference copy.
- Keep `calendar_lines.json` only as an optional date-enrichment fallback when the JSON has no explicit date.
- Keep `calendar_ocr_raw.txt` only as an archive/debug artifact.

## Registry
- Register each dataset in `data/calendar/datasetsRegistry.json`.
- Set `active: true` when that dataset should be included by the importer.
- The `file` path must point to the checked-in `activities_guess.json`.
- `lineFile` is optional, but it is useful for OCR-derived calendars like the current Autumn 2025 dataset where the JSON omits the day number and month.

## Running the import
- Dry run the active datasets:

```bash
npm run calendar:import -- --dry-run
```

- Import one dataset into Firestore:

```bash
npm run calendar:import -- --dataset 2025_autumn
```

- Import every active dataset:

```bash
npm run calendar:import
```

## Credentials
- For production Firestore, provide admin credentials through `.env.local` or environment variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- If `FIRESTORE_EMULATOR_HOST` is set, the script writes to the emulator instead.
- If Application Default Credentials are already configured, the script can use them as a fallback.

## Duplicate handling
- Every normalized event gets a deterministic `sourceHash`.
- Firestore document IDs are derived from `sourceDataset + sourceHash`.
- Re-importing the same dataset updates the same `events` documents instead of creating duplicates.
- Existing `rsvpCount` and `createdAt` values are preserved on re-import.

## How the current dataset is normalized
- `activities_guess.json` is the source of truth.
- The importer reads the real item fields discovered in the file: `term`, `name`, `day`, `time`, `venue`, `inCharge`, `boyInCharge`, and `googleClassroomLink`.
- Because the current JSON does not carry full dates, the importer optionally reads `calendar_lines.json` to recover the day number and month for matching rows.
- If time is missing, the importer stores the event as `allDay: true`.

## Adding the next term
1. Create `data/calendar/datasets/<new-dataset-id>/`.
2. Drop in the new `activities_guess.json`.
3. Optionally keep the matching CSV, line map, and raw OCR files in the same folder for reference/debugging.
4. Add the dataset entry to `data/calendar/datasetsRegistry.json`.
5. Run `npm run calendar:import -- --dataset <new-dataset-id>`.
