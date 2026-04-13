import { useCallback, useEffect, useMemo, useState } from 'react';
import { listScheduleDatasets, listScheduleEntries } from '../services/schedulesService';
import type { ScheduleDataset, ScheduleEntry } from '../types/Schedule';

export function useSchedules(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [datasets, setDatasets] = useState<ScheduleDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleEntries, scheduleDatasets] = await Promise.all([listScheduleEntries(), listScheduleDatasets()]);
      setEntries(scheduleEntries);
      setDatasets(scheduleDatasets);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load schedule data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.autoLoad) {
      void refresh();
    }
  }, [options.autoLoad, refresh]);

  const datasetsByType = useMemo(
    () =>
      datasets.reduce<Record<string, ScheduleDataset[]>>((acc, dataset) => {
        const key = dataset.scheduleType;
        acc[key] = [...(acc[key] ?? []), dataset];
        return acc;
      }, {}),
    [datasets]
  );

  return {
    entries,
    datasets,
    datasetsByType,
    loading,
    error,
    refresh
  };
}
