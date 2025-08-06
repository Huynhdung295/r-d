# QueryBuilder

**Universal GraphQL query builder** for Directus and any GraphQL-compatible APIs.

This class helps you construct nested, dynamic GraphQL queries programmatically with a readable, chainable interface. It also returns type-safe query definitions for client-side SDKs.

---

## Features

* ✅ Chainable builder API
* ✅ Flat and nested fields support
* ✅ Filtering (`where`) using Directus syntax
* ✅ Sorting, limits, and offsets
* ✅ Relation joins
* ✅ Aliasing (return consistent result key like `data`)
* ✅ Typed for IDE autocompletion
* ✅ Output as GraphQL string or structured object

---

## Installation

Just copy the `QueryBuilder.js` file into your project.
No external dependencies.

---

## Usage

### 1. Basic Query

```js
import { QueryBuilder } from './QueryBuilder.js';

const q = new QueryBuilder('posts')
  .select(['id', 'title'])
  .take(5);

console.log(q.toGraphQLString());
```

**Resulting GraphQL**:

```graphql
query {
  data: posts(limit: 5) {
    id title
  }
}
```

---

### 2. With Filters and Sorting

```js
const q = new QueryBuilder('users')
  .select(['id', 'email'])
  .where({ status: { _eq: 'active' } })
  .orderBy(['-created_at'])
  .as('activeUsers');

console.log(q.toGraphQLString());
```

**GraphQL Output**:

```graphql
query {
  activeUsers: users(filter: {status: {_eq: "active"}}, sort: ["-created_at"]) {
    id email
  }
}
```

---

### 3. Nested Joins

```js
const q = new QueryBuilder('articles')
  .select(['id', 'title'])
  .join([{ author: ['id', 'name'] }, { tags: ['name'] }]);

console.log(q.toGraphQLString());
```

**Output**:

```graphql
query {
  data: articles {
    id title
    author { id name }
    tags { name }
  }
}
```

---

### 4. Use with DirectusClient

```js
const def = q.build();
client.query(def, def.options).use();
```

---

## API Reference

### Constructor

```ts
new QueryBuilder(tableName: string)
```

### Methods

| Method               | Description                                |
| -------------------- | ------------------------------------------ |
| `.select()`          | Set flat fields                            |
| `.join()`            | Add nested fields (relations)              |
| `.where()`           | Apply filters                              |
| `.orderBy()`         | Sort fields                                |
| `.take()`            | Limit results                              |
| `.skip()`            | Offset results                             |
| `.as()`              | Set alias for result key                   |
| `.map()`             | (Optional) transform function for results  |
| `.preserve()`        | Set preserve flag for DirectusClient state |
| `.build()`           | Get `QueryDefinition` object               |
| `.toGraphQLString()` | Generate raw GraphQL string                |

---
