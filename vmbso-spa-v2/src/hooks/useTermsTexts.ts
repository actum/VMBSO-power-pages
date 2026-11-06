import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { config } from '../config/powerPages.config';
import { dataverseService } from '../services/dataverseService';
import type { Language } from '../types/language';
import type { TermsText } from '../types/terms';
import { mapFrontendToDataverse } from '../utils/languageMapper';
import { pickText } from '../utils/termsResolver';

export interface PickedTermsText {
  text: TermsText;
  /** False: the text is not in the UI language; show the "only available in …" note. */
  isUiLanguage: boolean;
  /** Name of the text's language (e.g. "French"), for that note. */
  languageName?: string;
}

const DEV_LANGUAGES: Language[] = [
  { actum_languageid: 'dev-en', actum_name: 'English', actum_code: 'en-GB' },
  { actum_languageid: 'dev-fr', actum_name: 'French', actum_code: 'fr-FR' },
];
const devTexts = (versionIds: string[]): TermsText[] =>
  versionIds.flatMap((id) => [
    { actum_termstextid: `${id}-en`, _actum_termsversionid_value: id, _actum_languageid_value: 'dev-en', actum_body: '<h2>Terms (dev mock)</h2><p>English placeholder text.</p>', createdon: '2026-01-01T00:00:00Z' },
    { actum_termstextid: `${id}-fr`, _actum_termsversionid_value: id, _actum_languageid_value: 'dev-fr', actum_body: '<h2>Conditions (dev mock)</h2><p>Texte de test en français.</p>', createdon: '2026-01-02T00:00:00Z' },
  ]);

export interface TermsTextsState {
  texts: TermsText[];
  languages: Language[];
  /** Dataverse id of the current UI language, if it exists as a language record. */
  uiLanguageId?: string;
  /** Dataverse id of English (en-GB), the fallback language. */
  englishLanguageId?: string;
  loading: boolean;
  error: boolean;
}

/** Texts (all languages) of the given versions, plus what pickText needs to choose one. */
export const useTermsTexts = (versionIds: string[]): TermsTextsState => {
  const { i18n } = useTranslation();
  const [texts, setTexts] = useState<TermsText[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const key = [...versionIds].sort().join(',');

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',') : [];
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [t, l] = config.devMode
          ? [devTexts(ids), DEV_LANGUAGES]
          : await Promise.all([dataverseService.terms.getTexts(ids), dataverseService.languages.getAll()]);
        if (!cancelled) {
          setTexts(t);
          setLanguages(l);
        }
      } catch (e) {
        console.error('[TERMS] Could not load texts:', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const { uiLanguageId, englishLanguageId } = useMemo(() => {
    const byCode = (code: string) => languages.find((l) => l.actum_code?.toLowerCase() === code.toLowerCase())?.actum_languageid;
    return {
      uiLanguageId: i18n.language ? byCode(mapFrontendToDataverse(i18n.language)) : undefined,
      englishLanguageId: byCode('en-GB'),
    };
  }, [languages, i18n.language]);

  return { texts, languages, uiLanguageId, englishLanguageId, loading, error };
};

/**
 * Per version, the text to show (UI language → only text → English → oldest). The same pick is
 * shown in the dialog and recorded on acceptance (language + SHA-256).
 */
export const usePickedTermsTexts = (
  versionIds: string[],
): { picked: Record<string, PickedTermsText>; loading: boolean; error: boolean } => {
  const { texts, languages, uiLanguageId, englishLanguageId, loading, error } = useTermsTexts(versionIds);
  const picked = useMemo(() => {
    const result: Record<string, PickedTermsText> = {};
    for (const id of versionIds) {
      const pick = pickText(texts.filter((t) => t._actum_termsversionid_value === id), uiLanguageId, englishLanguageId);
      if (pick) {
        const languageName = languages.find((l) => l.actum_languageid === pick.text._actum_languageid_value)?.actum_name;
        result[id] = { ...pick, languageName };
      }
    }
    return result;
    // versionIds content is captured by `texts` (loaded per id set)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts, languages, uiLanguageId, englishLanguageId]);
  return { picked, loading, error };
};
