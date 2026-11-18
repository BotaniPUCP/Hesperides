import type { UserDetail } from '@shared/types';
import { usersApi } from '@/lib/users-api';
import { definePreloadedList } from './preloadedList';

/** Solo las escrituras de usuarios la cambian (SPEC-119 D-03). */
export const usersList = definePreloadedList<UserDetail>('users', () => usersApi.all(), [/^\/users(\/|$)/]);
