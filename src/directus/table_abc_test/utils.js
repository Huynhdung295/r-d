function onLangChange(newLang) {
  clientPublic.setLanguage(newLang);

  // Gọi refetch cho những query đã có key
  ["abc_test", "def_list"].forEach((key) => {
    clientPublic.get(key)?.refetch?.();
  });
}