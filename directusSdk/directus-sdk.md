# DirectusClient SDK

A fully dynamic, high-performance JavaScript/React SDK for Directus GraphQL APIs with state management, reactive updates, and full control over data flow.

---

## 🔧 Install

```bash
npm install axios lodash
```

---

## ⚙️ Initialize

```js
import { DirectusClient } from './sdk/DirectusClient';

const directus = new DirectusClient('https://your-directus-url.com')
  .setToken('your_token')
  .setLanguage('en');
```

Optional auth fallback:

```js
directus.autoAuthWithHeader('x-auth-token', {
  backup: [
    { key: 'env', value: 'process.env.TOKEN' },
    { key: 'header', value: 'authorization' },
  ],
});
```

---

## 🔍 Query Example (React)

```js
const state = directus
  .query({ name: 'articles', fields: ['id', 'title'] }, {
    filter: { status: { _eq: 'published' } },
  })
  .key('stateArticles')
  .prefix('articles')
  .use();

// In component
state.data      // array of articles
state.loading   // boolean
state.error     // error object
state.refetch() // manual reload
```

---

## 🧠 Access & Control

```js
// Manual store access
const data = directus.store('stateArticles').get();
const refetch = directus.store('stateArticles').get('refetch');
refetch?.();
```

---

## 🔄 Watch & Reactivity

```js
// Watch flat key
const stop = directus.watch('stateArticles', 'loading', val => console.log(val));

// Watch nested path
const stopDeep = directus.watchDeep('stateArticles', 'data[0].title', val => console.log(val));
```

---

## ♻️ Save / Update

```js
// Save entire data
.query(...).save();

// Save partial
.save('title', 'articlesTitleArray');

// Manual update
directus.update('stateArticles', 'loading', true);
directus.save('customKey', { user: 123 });
```

---

## ⏱ Polling

```js
directus.polling(3000); // every 3s

directus.stopPolling((state) => state?.loading === false);
```

---

## 📘 API

| Method                        | Description             |
| ----------------------------- | ----------------------- |
| `.query(tableDef, options)`   | Start query definition  |
| `.key(name)`                  | Set refetchable key     |
| `.prefix(name)`               | Rename store key        |
| `.exec()`                     | Manual fetch            |
| `.use()`                      | Return live state       |
| `.refetch(opts)`              | Reload data             |
| `.save()`                     | Store/save query result |
| `.get(key)`                   | Retrieve state          |
| `.update(table, path, value)` | Update data manually    |
| `.watch(key, prop, cb)`       | Watch flat changes      |
| `.watchDeep(key, path, cb)`   | Watch nested changes    |
| `.store(key).get(path?)`      | Access from store       |

---

## 🧩 Recommended Structure

```
src/
├── sdk/
│   └── DirectusClient.js
├── services/
│   └── api.js
├── hooks/
│   └── useArticles.js
└── components/
    └── ArticleList.jsx
```

---

## ✅ Summary

* `.query().use()` = Live state
* `.store().get()` = Access manually
* `.watch()` = Realtime updates
* `.polling()` = Auto-refresh
* `.refetch()` = Manual reload

Production-ready, extensible, compatible across frameworks.

---

Feel free to fork, enhance, and contribute 🚀
