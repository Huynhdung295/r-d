import { builderAbc } from "./builder";
import { clientPublic } from "@/directus";

/**
 * Instance query từ DirectusClient đã khởi tạo
 */
const abc = clientPublic.query(builderAbc).key("abc_test");

export { abc };


// import { builderAbc } from "./builder";
// import { clientPublic } from "@/directus";

// const abc = clientPublic.query(builderAbc).key("abc_test");

// export { abc };