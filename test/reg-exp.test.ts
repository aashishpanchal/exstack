import {describe, it, expect} from 'vitest';
import type {ParamStash} from '../src/types';
import {RegExpRouter} from '../src/router/reg-exp';
import {UnsupportedPathError} from '../src/router/errors';

// Tests for the RegExpRouter class
describe('RegExpRouter', () => {
  // Test the return type and structure of the router match
  describe('Return value type', () => {
    it('Should return [[T, ParamIndexMap][], ParamStash]', () => {
      const router = new RegExpRouter<string>();
      router.add('GET', '/posts/:id', 'get post');

      // Match a route and check the returned value
      const [res, stash] = router.match('GET', '/posts/1');
      expect(res.length).toBe(1);
      expect(res).toEqual([['get post', {id: 1}]]);
      expect((stash as ParamStash)[1]).toBe('1');
    });
  });

  // Tests for cases that should throw UnsupportedPathError
  describe('UnsupportedPathError', () => {
    // Ambiguous route matching should throw an error
    describe('Ambiguous', () => {
      const router = new RegExpRouter<string>();

      router.add('GET', '/:user/entries', 'get user entries');
      router.add('GET', '/entry/:name', 'get entry');
      router.add('POST', '/entry', 'create entry');

      it('GET /entry/entries should throw UnsupportedPathError', () => {
        expect(() => {
          router.match('GET', '/entry/entries');
        }).toThrowError(UnsupportedPathError);
      });
    });

    // Multiple dynamic routes with different labels that match the same path should throw an error
    describe('Multiple handlers with different label', () => {
      const router = new RegExpRouter<string>();

      router.add('GET', '/:type/:id', ':type');
      router.add('GET', '/:class/:id', ':class');
      router.add('GET', '/:model/:id', ':model');

      it('GET /entry/123 should throw UnsupportedPathError', () => {
        expect(() => {
          router.match('GET', '/entry/123');
        }).toThrowError(UnsupportedPathError);
      });
    });

    // Parent vs child route conflict
    it('parent route conflict should throw UnsupportedPathError', () => {
      const router = new RegExpRouter<string>();
      router.add('GET', '/:id/:action', 'foo');
      router.add('GET', '/posts/:id', 'bar');
      expect(() => {
        router.match('GET', '/');
      }).toThrowError(UnsupportedPathError);
    });

    it('child route conflict should throw UnsupportedPathError', () => {
      const router = new RegExpRouter<string>();
      router.add('GET', '/posts/:id', 'foo');
      router.add('GET', '/:id/:action', 'bar');
      expect(() => {
        router.match('GET', '/');
      }).toThrowError(UnsupportedPathError);
    });

    // Test static vs dynamic routes
    describe('static and dynamic', () => {
      it('static first should throw UnsupportedPathError', () => {
        const router = new RegExpRouter<string>();
        router.add('GET', '/reg-exp/router', 'foo');
        router.add('GET', '/reg-exp/:id', 'bar');
        expect(() => {
          router.match('GET', '/');
        }).toThrowError(UnsupportedPathError);
      });

      it('long label should throw UnsupportedPathError', () => {
        const router = new RegExpRouter<string>();
        router.add('GET', '/reg-exp/router', 'foo');
        router.add('GET', '/reg-exp/:service', 'bar');
        expect(() => {
          router.match('GET', '/');
        }).toThrowError(UnsupportedPathError);
      });

      it('dynamic first should throw UnsupportedPathError', () => {
        const router = new RegExpRouter<string>();
        router.add('GET', '/reg-exp/:id', 'bar');
        router.add('GET', '/reg-exp/router', 'foo');
        expect(() => {
          router.match('GET', '/');
        }).toThrowError(UnsupportedPathError);
      });
    });

    it('different regular expressions should throw UnsupportedPathError', () => {
      const router = new RegExpRouter<string>();
      router.add('GET', '/:id/:action{create|update}', 'foo');
      router.add('GET', '/:id/:action{delete}', 'bar');
      expect(() => {
        router.match('GET', '/');
      }).toThrowError(UnsupportedPathError);
    });

    // Test complex capture groups in routes
    describe('Capture Group', () => {
      describe('Complex capturing group', () => {
        it('GET /foo/bar should throw UnsupportedPathError', () => {
          const router = new RegExpRouter<string>();
          router.add('GET', '/foo/:capture{ba(r|z)}', 'ok');
          expect(() => {
            router.match('GET', '/foo/bar');
          }).toThrowError(UnsupportedPathError);
        });
      });
    });
  });
});
