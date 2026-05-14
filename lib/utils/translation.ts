import { useEffect, useState } from "react";

type TranslationCache = Record<string, string>;

const STORAGE_KEY = "mupi_translation_cache_v1";
const memoryCache: TranslationCache = {};
const pendingPromises: Record<string, Promise<string>> = {};
let cacheLoaded = false;

function getCacheKey(text: string, targetLang = "pt") {
  return `${targetLang}:${text}`;
}

function loadCacheFromStorage() {
  if (cacheLoaded) return;
  cacheLoaded = true;

  if (typeof window === "undefined") return;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as TranslationCache;
    Object.assign(memoryCache, parsed);
  } catch {
    // ignore invalid cache
  }
}

function saveCacheToStorage() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
  } catch {
    // ignore write failures
  }
}

const TRANSLATION_API_URLS = [
  "https://libretranslate.de/translate",
  "https://api.mymemory.translated.net/get",
];

async function tryLibreTranslateAPI(text: string, targetLang: string) {
  try {
    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text",
      }),
    });

    if (!response.ok) throw new Error("LibreTranslate failed");
    const data = (await response.json()) as any;
    return String(data.translatedText || "").trim();
  } catch (err) {
    console.warn("LibreTranslate error:", err);
    return null;
  }
}

async function tryMyMemoryAPI(text: string, targetLang: string) {
  try {
    const langMap: Record<string, string> = { pt: "pt-BR", en: "en-US" };
    const lang = langMap[targetLang] || "pt-BR";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error("MyMemory failed");
    const data = (await response.json()) as any;
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return String(data.responseData.translatedText).trim();
    }
    throw new Error("MyMemory returned no translation");
  } catch (err) {
    console.warn("MyMemory error:", err);
    return null;
  }
}

export function getCachedTranslation(text: string, targetLang = "pt") {
  if (!text) return undefined;
  loadCacheFromStorage();
  return memoryCache[getCacheKey(text, targetLang)];
}

export async function translateText(text: string, targetLang = "pt") {
  if (!text || !text.trim()) return text;

  const key = getCacheKey(text, targetLang);
  loadCacheFromStorage();

  if (memoryCache[key]) {
    return memoryCache[key];
  }

  if (key in pendingPromises) {
    return pendingPromises[key];
  }

  const translationPromise = (async () => {
    try {
      console.log(`[Translation] Translating to ${targetLang}: "${text.substring(0, 50)}..."`);
      
      // Try LibreTranslate first, then fallback to MyMemory
      let translated = await tryLibreTranslateAPI(text, targetLang);
      
      if (!translated) {
        translated = await tryMyMemoryAPI(text, targetLang);
      }

      // If both APIs fail, use original text but still cache it
      if (!translated) {
        translated = text;
      }

      memoryCache[key] = translated;
      saveCacheToStorage();
      console.log(`[Translation] Cached: "${translated.substring(0, 50)}..."`);
      return translated;
    } catch (err) {
      console.error(`[Translation] Error translating:`, err);
      memoryCache[key] = text;
      saveCacheToStorage();
      return text;
    } finally {
      delete pendingPromises[key];
    }
  })();

  pendingPromises[key] = translationPromise;
  return translationPromise;
}

export function useTranslatedText(original: string, targetLang = "pt") {
  const [translated, setTranslated] = useState<string>(() => {
    return getCachedTranslation(original, targetLang) ?? original;
  });
  const [isLoading, setIsLoading] = useState(!getCachedTranslation(original, targetLang));

  useEffect(() => {
    let isMounted = true;

    const loadTranslation = async () => {
      if (!original || !original.trim()) {
        setTranslated(original);
        setIsLoading(false);
        return;
      }

      const cached = getCachedTranslation(original, targetLang);
      if (cached) {
        setTranslated(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await translateText(original, targetLang);
      if (isMounted) {
        setTranslated(result);
        setIsLoading(false);
      }
    };

    loadTranslation();
    return () => {
      isMounted = false;
    };
  }, [original, targetLang]);

  return translated;
}
