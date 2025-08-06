// DirectusClient SDK - Final Fully Upgraded Version with Watching, Polling, Refetching, Realtime Store Access

import axios from "axios";
import _ from "lodash";

function shallowEqual(a, b) {
  return _.isEqual(a, b);
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
    this._watchers = new Map();
    this._headerFallback = [];
    this._authHeaderKey = "x-app-user";
  }

  _emit(key, value) {
    const listeners = this._listeners.get(key);
    if (listeners) listeners.forEach((fn) => fn(value));

    const watchers = this._watchers.get(key);
    if (watchers) {
      watchers.forEach(({ prop, cb, deep }) => {
        const val = deep ? _.get(value, prop) : value?.[prop];
        if (val !== undefined) cb(val);
      });
    }
  }

  watch(key, prop, cb) {
    if (!this._watchers.has(key)) this._watchers.set(key, []);
    const list = this._watchers.get(key);
    const item = { prop, cb, deep: false };
    list.push(item);
    return () =>
      this._watchers.set(
        key,
        list.filter((x) => x !== item)
      );
  }

  watchDeep(key, path, cb) {
    if (!this._watchers.has(key)) this._watchers.set(key, []);
    const list = this._watchers.get(key);
    const item = { prop: path, cb, deep: true };
    list.push(item);
    return () =>
      this._watchers.set(
        key,
        list.filter((x) => x !== item)
      );
  }

  setToken(token) {
    this.token = token;
    return this;
  }

  setLanguage(lang) {
    this.language = lang;
    return this;
  }

  autoAuthWithHeader(headerKey, config) {
    this._authHeaderKey = headerKey;
    this._headerFallback = config.backup || [];
    return this;
  }

  _resolveAuthHeader(existingHeaders = {}) {
    let token = _.get(existingHeaders, this._authHeaderKey);
    if (!token && Array.isArray(this._headerFallback)) {
      for (const fallback of this._headerFallback) {
        if (fallback.key === "env") {
          try {
            token = eval(fallback.value);
          } catch (_) {}
        } else if (fallback.key === "header") {
          token = _.get(existingHeaders, fallback.value);
        }
        if (token) break;
      }
    }
    return {
      Authorization: token ? `Bearer ${token}` : undefined,
      [this._authHeaderKey]: token,
    };
  }

  async create(table, payload) {
    const headers = this._resolveAuthHeader();
    return axios.post(`${this.baseURL}/items/${table}`, payload, { headers });
  }

  async updateItem(table, id, payload) {
    const headers = this._resolveAuthHeader();
    return axios.patch(`${this.baseURL}/items/${table}/${id}`, payload, {
      headers,
    });
  }

  async deleteItem(table, id) {
    const headers = this._resolveAuthHeader();
    return axios.delete(`${this.baseURL}/items/${table}/${id}`, { headers });
  }

  invalidate(key) {
    this._store.delete(key);
    return this;
  }

  async withRetry(fn, maxRetries = 3, backoff = 300) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise((res) => setTimeout(res, backoff * Math.pow(2, i)));
      }
    }
  }

  polling(intervalMs = 3000) {
    for (const [key, queryInfo] of this._queries.entries()) {
      if (this._pollingTimers.has(key)) continue;
      const timer = setInterval(
        () => this.query(queryInfo.builder).exec(),
        intervalMs
      );
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

  query(builderInstance) {
    const self = this;
    const ctx = {
      _builder: builderInstance,
      _key: null,
      async exec() {
        const built = this._builder.build();
        if (self.language && built.name.includes("translation")) {
          built.options.filter = {
            ...built.options.filter,
            language: { _eq: self.language },
          };
        }
        const queryStr = this._builder.toGraphQLString();

        const storeKey = self._prefix.get(built.name) || built.name;
        const storeObj = self._store.get(storeKey);
        if (storeObj && !built.options.preserve) {
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

          let result =
            _.get(res, ["data", "data", built.alias || built.name]) || [];
          if (typeof built.options.map === "function")
            result = result.map(built.options.map);

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
        const built = this._builder.build();
        const storeKey = self._prefix.get(built.name) || built.name;
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
              ? this._data.map((r) => _.get(r, source))
              : _.get(this._data, source);
            _.set(storeObj, path, val);
          }
          self._emit(storeKey, storeObj);
        }
        return this;
      },
      prefix(name) {
        const built = this._builder.build();
        self._prefix.set(built.name, name);
        return this;
      },
      key(k) {
        const built = this._builder.build();
        this._key = k;
        self._queries.set(k, {
          builder: this._builder,
        });
        return this;
      },
      refetch(opts = {}) {
        if (this._key) {
          const info = self._queries.get(this._key);
          const built = info.builder.build();
          const storeKey = self._prefix.get(built.name) || built.name;
          const storeObj = self._store.get(storeKey);
          const shouldEmit = !built.options.preserve || opts.force;
          if (storeObj && shouldEmit) {
            storeObj.loading = true;
            self._emit(storeKey, { ...storeObj });
          }
          self
            .query(info.builder)
            .exec()
            .then((res) => {
              const changed = !shallowEqual(res._data, _.get(storeObj, "data"));
              if (changed || !built.options.preserve || opts.force) {
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
      use() {
        const built = this._builder.build();
        const storeKey = self._prefix.get(built.name) || built.name;
        const storeObj = {
          data: this._data || null,
          loading: !this._data,
          error: this._error || null,
          refetch: (opts) => ctx.refetch(opts),
          watch: (prop, cb) => self.watch(storeKey, prop, cb),
          watchDeep: (path, cb) => self.watchDeep(storeKey, path, cb),
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
    _.set(store, path, value);
    this._emit(prefix, store);
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
      return rest.reduce((acc, part) => _.get(acc, part), base);
    }
    return this._store.get(key);
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

  store(table) {
    const tableKey = typeof table === "string" ? table : table.name;
    const prefix = this._prefix.get(tableKey) || tableKey;
    return {
      get: (key) => {
        const storeBase = this._store.get(prefix);
        if (!key) return storeBase;
        return key
          .split(".")
          .reduce((acc, part) => _.get(acc, part), storeBase);
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
