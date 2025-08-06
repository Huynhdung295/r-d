// DirectusClient Playground Constants for QueryBuilder Scenarios

import { QueryBuilder } from "./queryBuilder.js"; // Import your QueryBuilder

export const QUERY_SCENARIOS = {
  basicSelect: new QueryBuilder("articles")
    .select(["id", "title"])
    .toGraphQLString(),

  selectWithNestedJoin: new QueryBuilder("articles")
    .select(["id", "title"])
    .join([{ author: ["id", "name"] }])
    .toGraphQLString(),

  withFilter: new QueryBuilder("articles")
    .select(["id"])
    .where({ status: { _eq: "published" } })
    .toGraphQLString(),

  withDynamicInject: new QueryBuilder("translations")
    .select(["id", "content"])
    .inject(() => ({ language: "vi" }))
    .toGraphQLString(),

  withSort: new QueryBuilder("articles")
    .select(["id"])
    .orderBy(["-created_at"])
    .toGraphQLString(),

  withPagination: new QueryBuilder("articles")
    .select(["id"])
    .take(5)
    .skip(10)
    .toGraphQLString(),

  withOrWhere: new QueryBuilder("users")
    .select(["id", "email"])
    .orWhere([
      { status: { _eq: "active" } },
      { status: { _eq: "invited" } },
    ])
    .toGraphQLString(),

  withAlias: new QueryBuilder("articles")
    .select(["id"])
    .as("my_articles")
    .toGraphQLString(),

  nestedJoin: new QueryBuilder("orders")
    .select(["id", "total"])
    .join([
      {
        user: [
          "id",
          "email",
          {
            address: ["street", "city"],
          },
        ],
      },
    ])
    .toGraphQLString(),

  dynamicMultiFieldFilter: new QueryBuilder("items")
    .select(["id"])
    .whereDynamic({ status: "active", featured: true })
    .toGraphQLString(),
};

// Example usage:
// console.log(QUERY_SCENARIOS.basicSelect);
// console.log(QUERY_SCENARIOS.withDynamicInject);
