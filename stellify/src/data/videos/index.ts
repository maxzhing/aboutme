import type { SkillId } from '@/lib/types';
import { MATH_VIDEOS } from './math';
import { RW_VIDEOS } from './rw';
import type { Video } from './types';

export type { Video, Scene } from './types';
export const VIDEOS: Video[] = [...MATH_VIDEOS, ...RW_VIDEOS];
export const VIDEO: Partial<Record<SkillId, Video>> = Object.fromEntries(VIDEOS.map((v) => [v.skill, v]));
