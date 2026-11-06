import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { config } from '../config/powerPages.config';
import { dataverseService } from '../services/dataverseService';
import type { Language } from '../types/language';
import type { TermsText } from '../types/terms';
import { mapFrontendToDataverse } from '../utils/languageMapper';

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
