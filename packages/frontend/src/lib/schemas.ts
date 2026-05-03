import { z } from 'zod';

export const didSchema = z.string().regex(/^did:[a-z]+:[a-zA-Z0-9._:%-]+$/);
export const handleSchema = z.string().regex(/^[a-zA-Z0-9.-]+$/);
export const domainSchema = z.string().regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/);
