export type Pattern = readonly [string, string, RegExp | true] | '*';

const patternCache: {[key: string]: Pattern} = {};
export const getPattern = (label: string, next?: string): Pattern | null => {
  // *            => wildcard
  // :id{[0-9]+}  => ([0-9]+)
  // :id          => (.+)

  if (label === '*') {
    return '*';
  }

  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] =
          next && next[0] !== ':' && next[0] !== '*'
            ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)]
            : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }

    return patternCache[cacheKey];
  }

  return null;
};

const extractGroupsFromPath = (path: string): {groups: [string, string][]; path: string} => {
  const groups: [string, string][] = [];

  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });

  return {groups, path};
};

export const splitRoutingPath = (routePath: string): string[] => {
  const {groups, path} = extractGroupsFromPath(routePath);

  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};

const replaceGroupMarks = (paths: string[], groups: [string, string][]): string[] => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];

    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }

  return paths;
};

export const splitPath = (path: string): string[] => {
  const paths = path.split('/');
  if (paths[0] === '') {
    paths.shift();
  }
  return paths;
};

export const checkOptionalParameter = (path: string): string[] | null => {
  /*
    If path is `/api/animals/:type?` it will return:
    [`/api/animals`, `/api/animals/:type`]
    in other cases it will return null
  */

  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(':')) {
    return null;
  }

  const segments = path.split('/');
  const results: string[] = [];
  let basePath = '';

  segments.forEach(segment => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === '') {
          results.push('/');
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace('?', '');
        basePath += '/' + optionalSegment;
        results.push(basePath);
      } else {
        basePath += '/' + segment;
      }
    }
  });

  return results.filter((v, i, a) => a.indexOf(v) === i);
};
