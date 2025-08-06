/**
 * QueryBuilder: Universal GraphQL query builder for Directus and general use.
 * Supports nested fields, filters, joins, sorting, aliasing, limits, offsets, and fully stringified output.
 * All types are documented for autocompletion and IDE support.
 */

/**
 * @typedef {object} QueryFilter - Filter object (e.g. { status: { _eq: "active" } })
 * @typedef {object} QueryOptions
 * @property {QueryFilter=} filter - Filter object for WHERE conditions
 * @property {string[]=} sort - Sorting fields (e.g. ["-created_at"])
 * @property {number=} limit - Limit result count
 * @property {number=} offset - Offset for pagination
 * @property {boolean=} preserve - Optional preserve state
 * @property {(item: any) => any=} map - Optional transformation map function
 *
 * @typedef {object} QueryDefinition
 * @property {string} name - Table or operation name
 * @property {any[]} fields - Fields to fetch (flat or nested)
 * @property {QueryOptions} options - Query options (filter, sort, etc.)
 * @property {string} alias - Optional alias for result
 */

export class QueryBuilder {
  /** @param {string} name */
  constructor(name) {
    /** @type {QueryDefinition} */
    this.query = {
      name,
      fields: [],
      options: {},
      alias: 'data',
    };

    this.dynamicSources = {}; // for shared state injection
  }

  select(fields) {
    this.query.fields = fields;
    return this;
  }

  join(nestedFields) {
    this.query.fields.push(...nestedFields);
    return this;
  }

  where(filter) {
    this.query.options.filter = filter;
    return this;
  }

  /**
   * Automatically convert flat object to _eq-based filters
   * Example: { lang: 'en' } => { lang: { _eq: 'en' } }
   * @param {Record<string, any>} inputFilter
   */
  whereDynamic(inputFilter) {
    const converted = {};
    for (const [key, val] of Object.entries(inputFilter)) {
      if (val === undefined || val === null) continue;
      converted[key] = { _eq: val };
    }
    return this.where(converted);
  }

  /**
   * Merge shared values (e.g. from DirectusClient) into query definition
   * Example: q.inject(() => ({ lang: 'en' }))
   * @param {() => Record<string, any>} fn
   */
  inject(fn) {
    this.dynamicSources.inject = fn;
    return this;
  }

  /**
   * Use injected values from external sources (like DirectusClient lang)
   */
  applyInjected() {
    if (typeof this.dynamicSources.inject === 'function') {
      const shared = this.dynamicSources.inject();
      this.whereDynamic(shared);
    }
    return this;
  }

  orWhere(conditions) {
    this.query.options.filter = {
      _or: conditions,
    };
    return this;
  }

  orderBy(sort) {
    this.query.options.sort = sort;
    return this;
  }

  take(limit) {
    this.query.options.limit = limit;
    return this;
  }

  skip(offset) {
    this.query.options.offset = offset;
    return this;
  }

  as(alias) {
    this.query.alias = alias;
    return this;
  }

  map(mapFn) {
    this.query.options.map = mapFn;
    return this;
  }

  preserve(preserve = true) {
    this.query.options.preserve = preserve;
    return this;
  }

  build() {
    this.applyInjected();
    return this.query;
  }

  toGraphQLString() {
    this.applyInjected();
    const { name, fields, options, alias } = this.query;

    const buildFields = (fields) =>
      fields
        .map((f) => {
          if (typeof f === 'string') return f;
          const key = Object.keys(f)[0];
          return `${key} { ${buildFields(f[key])} }`;
        })
        .join(' ');

    const buildArgs = (args) => {
      const validEntries = Object.entries(args || {}).filter(([_, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null
      );
      if (!validEntries.length) return '';
      return (
        '(' +
        validEntries
          .map(([k, v]) => `${k}: ${JSON.stringify(v).replace(/\"([^\"]+)\":/g, '$1:')}`)
          .join(', ') +
        ')'
      );
    };

    const args = buildArgs({
      filter: options.filter,
      sort: options.sort,
      limit: options.limit,
      offset: options.offset,
    });

    return `query { ${alias}: ${name}${args} { ${buildFields(fields)} } }`;
  }
}