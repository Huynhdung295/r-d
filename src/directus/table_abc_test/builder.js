import { QueryBuilder } from "@/libs/queryBuilder";

export const builderAbc = new QueryBuilder("abc_test")
  .select(["id", "title", { author: ["id", "name"] }])
  .where({ status: { _eq: "active" } })
  .orderBy(["-created_at"])
  .limit(20);



//   import { QueryBuilder } from "@/libs/queryBuilder";
// import { getCurrentLanguage } from "@/utils/lang";

// export const builderAbc = new QueryBuilder("table_abc")
//   .select(["id", "title", "slug"])
//   .whereDynamic({ status: "published" })
//   .inject(() => ({ lang: getCurrentLanguage() })) // auto apply lang
//   .as("abc_data");