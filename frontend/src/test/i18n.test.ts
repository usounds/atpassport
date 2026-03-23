import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const messagesDir = path.resolve(__dirname, '../../messages');
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

const contents = files.map(file => {
  const filePath = path.join(messagesDir, file);
  return {
    name: file,
    data: JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  };
});

function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getEntries(obj: any, prefix = ''): Record<string, string> {
  let entries: Record<string, string> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(entries, getEntries(obj[key], fullKey));
    } else {
      entries[fullKey] = obj[key];
    }
  }
  return entries;
}

describe('i18n sanity checks', () => {
  const allKeysPerFile = contents.map(c => ({
    name: c.name,
    keys: new Set(getAllKeys(c.data))
  }));

  const unionOfKeys = new Set<string>();
  allKeysPerFile.forEach(f => {
    f.keys.forEach(k => unionOfKeys.add(k));
  });

  const entriesPerFile = contents.map(c => ({
    name: c.name,
    entries: getEntries(c.data)
  }));

  it('should have the same keys across all languages', () => {
    allKeysPerFile.forEach(f => {
      const missing = [...unionOfKeys].filter(k => !f.keys.has(k));
      const extra = [...f.keys].filter(k => {
        return allKeysPerFile.every(other => other.name === f.name || !other.keys.has(k));
      });

      expect(missing, `[${f.name}] is missing keys`).toEqual([]);
      expect(extra, `[${f.name}] has extra keys not found in any other file`).toEqual([]);
    });

    // Also check that all files have the same number of keys
    const counts = allKeysPerFile.map(f => f.keys.size);
    const uniqueCounts = new Set(counts);
    expect(uniqueCounts.size, 'All files should have the same number of keys').toBe(1);
  });

  it('should have consistent interpolation variables across all languages', () => {
    const allKeys = Array.from(unionOfKeys);
    
    allKeys.forEach(key => {
      const varsPerFile = entriesPerFile.map(f => {
        const value = f.entries[key];
        const matches = value.match(/\{[^}]+\}/g) || [];
        return { name: f.name, vars: matches.sort() };
      });

      const firstVars = JSON.stringify(varsPerFile[0].vars);
      varsPerFile.slice(1).forEach(v => {
        expect(JSON.stringify(v.vars), `Key [${key}] has inconsistent interpolation variables in ${v.name} compared to ${varsPerFile[0].name}`)
          .toBe(firstVars);
      });
    });
  });

  it('should not have empty values', () => {
    entriesPerFile.forEach(f => {
      Object.entries(f.entries).forEach(([key, value]) => {
        expect(value, `[${f.name}] Key [${key}] is empty`).not.toBe("");
        expect(value, `[${f.name}] Key [${key}] is null or undefined`).not.toBeNull();
      });
    });
  });
});
