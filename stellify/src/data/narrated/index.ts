import MANIFESTS from './manifests.json';
import APPROVALS from '../../../content/lessons/approvals.json';
import { VIDEO_HOST } from '@/components/LessonVideo';
export { WALKTHROUGHS, walkthroughFor, type Walkthrough } from './content';

/** Written by scripts/lessons/build.mjs for every built lesson (never edited by hand). */
export interface LessonManifest {
  id: string; skill: string; kind: 'skill-video' | 'walkthrough'; voice: string; duration: number; starts: number[];
  audio: string; bytes: number; sha256: string; scriptHash: string; built: string;
}
export const manifestOf = (id: string) => (MANIFESTS as Record<string, LessonManifest>)[id];
/** Only a Critic SHIP verdict sets this (content/lessons/approvals.json). */
export const approved = (id: string) => !!(APPROVALS as Record<string, { criticApproved?: boolean } | string>)[id] && ((APPROVALS as Record<string, { criticApproved?: boolean }>)[id].criticApproved === true);
/** The narration file: next to the page on the website; from the website when running the offline file. */
export const audioSrc = (path: string) => (typeof location !== 'undefined' && location.protocol === 'file:' ? VIDEO_HOST : '') + path;
