import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Force UTC so date-fns `format` and `new Date(Date.UTC(...))` stay
// timezone-stable across contributor machines & CI. Some time-math in the
// app (e.g. month boundaries in useFinance.replicateRecurringToNextMonth)
// is sensitive to local-TZ shifts, and a deterministic TZ keeps tests stable.
process.env.TZ = 'UTC';

// RTL's built-in auto-cleanup only runs when `globals: true` (it looks for a
// global `afterEach`). Our config uses `globals: false`, so we register the
// cleanup explicitly here — runs after every test, in every file.
afterEach(() => {
  cleanup();
});
