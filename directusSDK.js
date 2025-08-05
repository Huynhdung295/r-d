/**
 * DirectusClient SDK - A minimal, flexible GraphQL client for Directus
 * Author: Senior Tech Lead level
 *
 * Supports:
 * - Chainable config: setToken, setLanguage
 * - GraphQL Query Builder (basic)
 * - Auto language filter injection (e.g. translation.language = lang)
 * - Data mapping (map result to flat structure)
 * - Internal store for caching/querying results
 * - Nested field access, .get('abc.img') style
 * - Controlled save: save('img', 'abc.text', ...) for fine-grain caching
 * - Scoped store via .prefix(), preventing collision from same-table queries
 * - .key(id) tracking for future mutation/query updates
 * - .polling(interval) to auto-refetch queries
 * - .stopPolling(conditionFn) to cancel polling by condition
 * - .update(table, path, value) to update data in store manually
 * - .use() like hooks-style object { data, loading, error, refetch }
 * - .listen(key, fn) & .unlisten(key, fn) for reactive subscriptions
 */

import axios from "axios";



/**
 * @typedef {Object} RefetchOptions
 * @property {boolean} [force]
 * @property {Function} [onSuccess]
 * @property {Function} [onError]
 * @property {Function} [onFinally]
 */

/**
 * @typedef {Object} QueryResult
 * @property {any[]} data
 * @property {boolean} loading
 * @property {any} error
 * @property {(opts?: RefetchOptions) => void} refetch
 */


function buildGraphQLQuery(operation, fields = [], args = {}) {
  const buildFields = (f) =>
    f
      .map((field) => {
        if (typeof field === "string") return field;
        if (typeof field === "object") {
          const key = Object.keys(field)[0];
          return `${key} { ${buildFields(field[key])} }`;
        }
      })
      .join(" ");

  const buildArgs = (a) => {
    const entries = Object.entries(a).filter(([_, v]) => v !== undefined);
    if (!entries.length) return "";
    const str = entries
      .map(
        ([k, v]) => `${k}: ${JSON.stringify(v).replace(/"([^("]+)":/g, "$1:")}`
      )
      .join(", ");
    return `(${str})`;
  };

  return `query { ${operation}${buildArgs(args)} { ${buildFields(fields)} } }`;
}

function setDeep(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export class DirectusClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
    this.language = null;
    this._store = new Map();
    this._prefix = new Map();
    this._queries = new Map();
    this._pollingTimers = new Map();
    this._listeners = new Map();
  }

  setToken(token) {
    this.token = token;
    return this;
  }

  setLanguage(lang) {
    this.language = lang;
    return this;
  }

  prefix(name) {
    this._prefix.set(this._currentTable, name);
    return this;
  }

  _emit(key, value) {
    const listeners = this._listeners.get(key);
    if (listeners) listeners.forEach((fn) => fn(value));
  }

  listen(key, callback) {
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push(callback);
  }

  unlisten(key, callback) {
    const arr = this._listeners.get(key);
    if (!arr) return;
    this._listeners.set(
      key,
      arr.filter((fn) => fn !== callback)
    );
  }

  query(tableDef, options = {}) {
    const self = this;
    const ctx = {
      _table: typeof tableDef === "string" ? tableDef : tableDef.name,
      _fields: typeof tableDef === "string" ? ["id"] : tableDef.fields,
      _options: options,
      _key: null,
      async exec() {
        const { filter = {}, sort, limit, offset, map, preserve } = this._options;
        const finalFilter = {
          ...filter,
          ...(self.language && this._table.includes("translation")
            ? { language: { _eq: self.language } }
            : {}),
        };

        const queryStr = buildGraphQLQuery(this._table, this._fields, {
          filter: finalFilter,
          sort,
          limit,
          offset,
        });

        const storeKey = self._prefix.get(this._table) || this._table;
        const storeObj = self._store.get(storeKey);
        if (storeObj && !preserve) {
          storeObj.loading = true;
          self._emit(storeKey, { ...storeObj });
        }

        try {
          const res = await axios.post(
            `${self.baseURL}/graphql`,
            { query: queryStr },
            {
              headers: {
                "Content-Type": "application/json",
                ...(self.token && { Authorization: `Bearer ${self.token}` }),
              },
            }
          );

          let result = res.data?.data?.[this._table] || [];
          if (typeof map === "function") {
            result = result.map(map);
          }

          this._data = result;
          this._error = null;

          return this;
        } catch (err) {
          this._error = err;
          this._data = null;
          return this;
        }
      },
      save(...args) {
        const prefix = self._prefix.get(this._table);
        const storeKey = prefix || this._table;
        if (!self._store.has(storeKey)) self._store.set(storeKey, {});

        const storeObj = self._store.get(storeKey);

        if (args.length === 0) {
          self._store.set(storeKey, { data: this._data });
          self._emit(storeKey, { data: this._data });
        } else {
          for (let i = 0; i < args.length; i += 2) {
            const source = args[i];
            const path = args[i + 1];
            const val = Array.isArray(this._data)
              ? this._data.map((r) => r?.[source])
              : this._data?.[source];
            setDeep(storeObj, path, val);
          }
          self._emit(storeKey, storeObj);
        }
        return this;
      },
      prefix(name) {
        self._prefix.set(this._table, name);
        return this;
      },
      key(k) {
        this._key = k;
        self._queries.set(k, {
          table: { name: this._table, fields: this._fields },
          options: this._options,
        });
        return this;
      },
      /**
       * @param {RefetchOptions} opts
       */
      /** @type {(opts?: RefetchOptions) => QueryResult}*/
      refetch(opts = {}) {
        if (this._key) {
          const info = self._queries.get(this._key);
          const storeKey = self._prefix.get(info.table.name) || info.table.name;
          const storeObj = self._store.get(storeKey);

          const shouldEmitLoading = !info.options.preserve || opts.force;

          if (storeObj && shouldEmitLoading) {
            storeObj.loading = true;
            self._emit(storeKey, { ...storeObj });
          }

          self
            .query(info.table, info.options)
            .exec()
            .then((res) => {
              const dataChanged = !shallowEqual(res._data, storeObj?.data);
              if (dataChanged || !info.options.preserve || opts.force) {
                if (storeObj) {
                  storeObj.data = res._data;
                  storeObj.error = res._error;
                  storeObj.loading = false;
                  self._emit(storeKey, storeObj);
                }
              }
              if (res._error && opts.onError) opts.onError(res._error);
              else if (opts.onSuccess) opts.onSuccess(res._data);
              if (opts.onFinally) opts.onFinally();
            });
        }
        return this;
      },
      /** @returns {QueryResult} */
      use() {
        const prefix = self._prefix.get(this._table);
        const storeKey = prefix || this._table;

        const storeObj = {
          data: this._data || null,
          loading: !this._data,
          error: this._error || null,
          refetch: (opts) => ctx.refetch(opts),
        };

        self._store.set(storeKey, storeObj);
        self._emit(storeKey, storeObj);
        return storeObj;
      },
    };
    
    return ctx;
  }

  update(table, path, value) {
    const prefix = this._prefix.get(table) || table;
    const store = this._store.get(prefix);
    if (!store) return;
    setDeep(store, path, value);
    this._emit(prefix, store);
  }

  polling(intervalMs = 3000) {
    for (const [key, queryInfo] of this._queries.entries()) {
      if (this._pollingTimers.has(key)) continue;
      const timer = setInterval(() => {
        this.query(queryInfo.table, queryInfo.options).exec();
      }, intervalMs);
      this._pollingTimers.set(key, timer);
    }
    return this;
  }

  stopPolling(conditionFn) {
    for (const [key, timer] of this._pollingTimers.entries()) {
      const currentData = this.get(key);
      if (conditionFn(currentData)) {
        clearInterval(timer);
        this._pollingTimers.delete(key);
      }
    }
    return this;
  }

  save(key, value) {
    this._store.set(key, value);
    this._emit(key, value);
  }

  get(key) {
    if (!key) return Object.fromEntries(this._store);
    if (key.includes(".")) {
      const [root, ...rest] = key.split(".");
      const base = this._store.get(root);
      return rest.reduce((acc, part) => acc?.[part], base);
    }
    return this._store.get(key);
  }

  store(table) {
    const tableKey = typeof table === "string" ? table : table.name;
    const prefixFromTable = this._prefix.get(tableKey);
    let prefix = prefixFromTable || tableKey;

    return {
      prefix(name) {
        prefix = name;
        return this;
      },
      get: (key) => {
        const storeBase = this._store.get(prefix);
        if (!key) return storeBase;
        if (key.includes(".")) {
          return key.split(".").reduce((acc, part) => acc?.[part], storeBase);
        }
        return storeBase?.[key];
      },
    };
  }

  clone() {
    const c = new DirectusClient(this.baseURL);
    c.setToken(this.token);
    c.setLanguage(this.language);
    return c;
  }
}
