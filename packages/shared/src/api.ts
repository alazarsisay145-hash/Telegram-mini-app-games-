import type { ApiErrorShape, ApiResponse } from './types';

export const ok = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
});

export const fail = (error: ApiErrorShape): ApiResponse<null> => ({
  success: false,
  data: null,
  error,
});
