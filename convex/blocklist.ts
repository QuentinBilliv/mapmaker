const BLOCKED_TERMS = [
  "porn", "porno", "pornography", "xxx", "xvideos", "pornhub",
  "xhamster", "redtube", "youporn", "brazzers", "onlyfans",
  "hentai", "milf", "creampie", "gangbang", "bukkake",
  "anal sex", "blowjob", "handjob", "deepthroat",
  "nude", "nudes", "naked", "nudity",
  "sex tape", "sextape", "sexcam", "camgirl",
  "escort", "prostitution", "brothel",
  "child porn", "cp", "csam", "pedophil", "pédophil",
  "lolicon", "shotacon",
  "nigger", "nigga", "faggot", "kike", "spic", "chink",
  "wetback", "towelhead", "raghead", "gook",
  "nègre", "négro", "bougnoule", "youpin",
  "enculé", "fils de pute", "fdp", "ntm", "nique ta mère",
  "salope", "putain de", "pute",
  "nazi", "heil hitler", "sieg heil", "white power",
  "white supremacy", "kill all", "death to",
  "jihad", "allahu akbar",
  "buy now", "click here", "free money", "make money fast",
  "casino online", "bitcoin profit", "forex signal",
  "telegram channel", "whatsapp group", "join my",
];

const BLOCKED_REGEX = BLOCKED_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
);

export function screenText(text: string): string | null {
  for (let i = 0; i < BLOCKED_REGEX.length; i++) {
    if (BLOCKED_REGEX[i].test(text)) {
      return BLOCKED_TERMS[i];
    }
  }
  return null;
}

export function screenMapContent(map: {
  title: string;
  description: string;
  tags: string[];
}): string | null {
  const fields = [map.title, map.description, ...map.tags];
  for (const field of fields) {
    const match = screenText(field);
    if (match) return match;
  }
  return null;
}
