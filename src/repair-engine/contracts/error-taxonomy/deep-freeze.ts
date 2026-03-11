export function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }

    return Object.freeze(value) as Readonly<T>;
  }

  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    const prop = obj[key];
    if (prop && typeof prop === 'object') {
      deepFreeze(prop);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}

