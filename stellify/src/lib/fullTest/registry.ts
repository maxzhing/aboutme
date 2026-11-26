import { PACK_TESTS, type PackTest } from '@/data/pack';

/**
 * Official full practice tests the student has: from a private pack (personal builds) or imported
 * in the app. Each keeps the College Board's module order, timing and raw-score conversion table.
 */
export type FullTest = PackTest;
export const FULL_TESTS: FullTest[] = [...PACK_TESTS];
export const fullTestById = (id: string) => FULL_TESTS.find((t) => t.id === id);
export function registerFullTests(tests: FullTest[]) {
  for (const t of tests) { const i = FULL_TESTS.findIndex((x) => x.id === t.id); if (i >= 0) FULL_TESTS[i] = t; else FULL_TESTS.push(t); }
}
export function unregisterFullTests(ids: string[]) {
  for (let i = FULL_TESTS.length - 1; i >= 0; i--) if (ids.includes(FULL_TESTS[i].id) && FULL_TESTS[i].imported) FULL_TESTS.splice(i, 1);
}
/** "ft-pt4" is the mock-exam form id of the full test "pt4". */
export const FULL_FORM = 'ft-';
export const isFullTestForm = (formId: string) => formId.startsWith(FULL_FORM);
export const fullTestOfForm = (formId: string) => (isFullTestForm(formId) ? fullTestById(formId.slice(FULL_FORM.length)) : undefined);
