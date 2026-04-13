import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { loadCalendarRegistry, loadNormalizedDatasets } from './lib/calendarImport';

type ParsedArgs = {
  datasetIds: string[];
  dryRun: boolean;
  includeInactive: boolean;
};

async function main() {
  loadLocalEnv(process.cwd());
  const args = parseArgs(process.argv.slice(2));
  const importBatchId = `calendar-import-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const rootDir = process.cwd();
  const registry = await loadCalendarRegistry(rootDir);
  const datasets = await loadNormalizedDatasets({
    rootDir,
    registry,
    importBatchId,
    datasetIds: args.datasetIds,
    includeInactive: args.includeInactive
  });

  const summary = {
    importBatchId,
    datasets: datasets.map(({ dataset, events }) => ({
      id: dataset.id,
      label: dataset.label,
      totalEvents: events.length,
      sampleTitles: events.slice(0, 5).map((event) => event.title)
    })),
    totalEvents: datasets.reduce((sum, dataset) => sum + dataset.events.length, 0),
    dryRun: args.dryRun
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  initializeFirebase();
  const firestore = getFirestore();
  const allEvents = datasets.flatMap((dataset) => dataset.events);
  const refs = allEvents.map((event) => firestore.collection('events').doc(event.docId));
  const existingDocs = refs.length > 0 ? await firestore.getAll(...refs) : [];
  const existingById = new Map(existingDocs.map((snapshot) => [snapshot.id, snapshot]));
  const writer = firestore.bulkWriter();

  for (const event of allEvents) {
    const existing = existingById.get(event.docId);
    writer.set(
      firestore.collection('events').doc(event.docId),
      {
        title: event.title,
        description: event.description,
        clubId: event.clubId,
        type: event.type,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
        allDay: event.allDay,
        source: event.source,
        sourceDataset: event.sourceDataset,
        sourceTerm: event.sourceTerm,
        sourceId: event.sourceId,
        importBatchId: event.importBatchId,
        sourceHash: event.sourceHash,
        rsvpCount: existing?.exists ? existing.data()?.rsvpCount ?? 0 : event.rsvpCount,
        createdAt: existing?.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  await writer.close();
  console.log(
    JSON.stringify(
      {
        ...summary,
        applied: true
      },
      null,
      2
    )
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    datasetIds: [],
    dryRun: false,
    includeInactive: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dataset') {
      parsed.datasetIds.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith('--dataset=')) {
      parsed.datasetIds.push(arg.slice('--dataset='.length));
      continue;
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--include-inactive') {
      parsed.includeInactive = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printUsage() {
  console.log(`Usage: npm run calendar:import -- [--dataset <id>] [--dry-run] [--include-inactive]`);
}

function loadLocalEnv(rootDir: string) {
  for (const relativePath of ['.env.local', '.env']) {
    const filePath = path.resolve(rootDir, relativePath);
    try {
      const content = readFileSync(filePath, 'utf8');
      for (const line of content.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const separator = trimmed.indexOf('=');
        const key = trimmed.slice(0, separator).trim();
        if (!key || process.env[key]) continue;
        let value = trimmed.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.replace(/\\n/g, '\n');
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function initializeFirebase() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'demo-convergent';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

  if (useEmulator) {
    initializeApp({ projectId });
    return;
  }

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId
  });
}

main().catch((error) => {
  console.error('[calendar-import] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
