// DirectusClient Playground Testing QueryBuilder Scenarios

import { QueryBuilder } from "./queryBuilder.js"; // Import your QueryBuilder

// Simulate all major GraphQL SQL cases
function runAllQueryTests() {
  const scenarios = [];

  // 1. Basic select
  scenarios.push({
    label: "Basic select",
    query: new QueryBuilder("articles")
      .select(["id", "title"])
      .toGraphQLString(),
  });

  // 2. Select with nested join
  scenarios.push({
    label: "Select with nested join",
    query: new QueryBuilder("articles")
      .select(["id", "title"])
      .join([{ author: ["id", "name"] }])
      .toGraphQLString(),
  });

  // 3. With filter
  scenarios.push({
    label: "With filter",
    query: new QueryBuilder("articles")
      .select(["id"])
      .where({ status: { _eq: "published" } })
      .toGraphQLString(),
  });

  // 4. With dynamic filter injection (e.g. language)
  scenarios.push({
    label: "With dynamic inject (language)",
    query: new QueryBuilder("translations")
      .select(["id", "content"])
      .inject(() => ({ language: "vi" }))
      .toGraphQLString(),
  });

  // 5. With sort
  scenarios.push({
    label: "With sort",
    query: new QueryBuilder("articles")
      .select(["id"])
      .orderBy(["-created_at"])
      .toGraphQLString(),
  });

  // 6. With pagination
  scenarios.push({
    label: "With pagination",
    query: new QueryBuilder("articles")
      .select(["id"])
      .take(5)
      .skip(10)
      .toGraphQLString(),
  });

  // 7. With orWhere
  scenarios.push({
    label: "With orWhere",
    query: new QueryBuilder("users")
      .select(["id", "email"])
      .orWhere([
        { status: { _eq: "active" } },
        { status: { _eq: "invited" } },
      ])
      .toGraphQLString(),
  });

  // 8. Alias
  scenarios.push({
    label: "With alias",
    query: new QueryBuilder("articles")
      .select(["id"])
      .as("my_articles")
      .toGraphQLString(),
  });

  // 9. Complex join with nested join
  scenarios.push({
    label: "Nested join",
    query: new QueryBuilder("orders")
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
  });

  // 10. Dynamic filter (multi-field)
  scenarios.push({
    label: "Dynamic filter",
    query: new QueryBuilder("items")
      .select(["id"])
      .whereDynamic({ status: "active", featured: true })
      .toGraphQLString(),
  });

  // Log all cases
  scenarios.forEach(({ label, query }, i) => {
    console.log(`\n[Query ${i + 1}] - ${label}`);
    console.log(query);
  });
}

runAllQueryTests();
