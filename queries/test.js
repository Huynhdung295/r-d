import { DirectusClient } from "../directusSdk/directusSDK.js";
/**
 * @typedef {import('../types.js').TestApg} TestApg
 * @typedef {import('../types.js').RefetchFn} RefetchFn
 */

const client = new DirectusClient("https://countries.trevorblades.com");

const testApgDef = {
  name: "test_apg",
  fields: ["id", "name", "created_at", "updated_at", "user_created"],
};

export function useTestApgQuery(
  filter = {},
  key = "testApg",
  prefix = "testApg"
) {
  /** @type {{ data: TestApg[], loading: boolean, error: any, refetch: RefetchFn  }} */

  const state = client
    .query(testApgDef, { filter })
    .key(key)
    .prefix(prefix)
    .use();
  state.data?.[0]?.name;


  return state;
}
