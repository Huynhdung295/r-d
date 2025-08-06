import { DirectusClient } from "@/libs/directusClient";
import { getCurrentLanguage } from "@/utils/i18n"; // hoặc từ pinia/composables/context...

/**
 * Tạo client với lang luôn luôn đồng bộ
 */
export const clientPublic = new DirectusClient("https://your-public-api.com")
  .setLanguage(getCurrentLanguage()); // Luôn set lang mỗi lần init

export const clientAdmin = new DirectusClient("https://admin-api.com");

// ---------------------------------------------
// 🔁 Example: Change language dynamically
// ---------------------------------------------

/**
 * Khi lang thay đổi từ hệ thống (Pinia, Vue, React, etc.)
 */
export function syncClientLanguage() {
  const newLang = getCurrentLanguage();
  clientPublic.setLanguage(newLang);

  const keys = ["abc_test", "def_list", "xyz_item"]; // Hoặc get từ clientPublic._queries
  for (const k of keys) {
    const store = clientPublic.get(k);
    store?.refetch?.(); // Refetch lại dữ liệu với lang mới
  }
}


export function syncClientLanguage() {
  const newLang = getCurrentLanguage();
  clientPublic.setLanguage(newLang);

  // Duyệt toàn bộ keys đang được query
  for (const [key] of clientPublic._queries.entries()) {
    const store = clientPublic.get(key);
    store?.refetch?.();
  }
}

// import { DirectusClient } from "@/libs/directusClient";
// import { getCurrentLanguage } from "@/utils/lang"; // lang có thể đến từ Pinia, i18n, Vue/React store

// export const clientPublic = new DirectusClient("https://api.public.com")
//   .setLanguage(getCurrentLanguage()); // Lang hiện tại

// export const clientAdmin = new DirectusClient("https://api.admin.com");