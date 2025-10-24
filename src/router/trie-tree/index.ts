import {Node} from './node';
import {checkOptionalParameter} from './utils';
import type {Result, Router} from '../../types';

// TrieRouter implements a simple HTTP router using a Trie (prefix tree) structure.
export class TrieRouter<T> implements Router<T> {
  name: string = 'TrieRouter';
  #node: Node<T>;

  constructor() {
    this.#node = new Node();
  }

  add(method: string, path: string, handler: T) {
    // Check if the path contains optional parameters and expand them
    const results = checkOptionalParameter(path);
    if (results) {
      // Insert each expanded path into the trie
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }

    // Insert the route directly if there are no optional parameters
    this.#node.insert(method, path, handler);
  }

  match(method: string, path: string): Result<T> {
    return this.#node.search(method, path);
  }
}
