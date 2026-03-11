import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../services/apiClient";

const token = "eyJ0eXAiOiJKV1QiLCJub25jZSI6IjJ6aFdoVUhobWoxMFVoS0VDNm15bVNCNTF0R0JSMlJNUmJzZ1RXQnNXVVEiLCJhbGciOiJSUzI1NiIsImtpZCI6IlFaZ045SHFOa0dORU00R2VLY3pEMDJQY1Z2NCJ9.eyJhdWQiOiIzOTQ4NjZmYy1lZWRiLTRmMDEtODUzNi0zZmY4NGIxNmJlMmEiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vYWQ5YWIzY2EtMTZkNS00OTZkLTg1OTEtYjdmOTFhNTE1MTM1L3YyLjAiLCJpYXQiOjE3NzMyMDM4ODEsIm5iZiI6MTc3MzIwMzg4MSwiZXhwIjoxNzczMjA4Njk3LCJhY2N0IjowLCJhaW8iOiJBWFFBaS84YkFBQUFLK3hrKzk1OHRmb3hlTEpmTnNmZURJOWlQRldyZktXTVBlRittS2haYUNLNWJGNzhzeHpLT0QrK3FaNklCQlI2S0tCUm02d0o0SlMxcGFmSU9IRFozUndVN3VSRHg1cGF3WmprTHY5MFlpcFpFZWcxbjVUWTdoS1Byc2toSTZOWXZicGcySHNQV0IyWlc1V3BEWFg1WlE9PSIsImFwcF9kaXNwbGF5bmFtZSI6IlBvd2VyQXBwcyAtIGFwcHMucG93ZXJhcHBzLmNvbSIsImF6cCI6IjNlNjJmODFlLTU5MGItNDI1Yi05NTMxLWNhZDY2ODM2NTZjZiIsImF6cGFjciI6IjAiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIyYTAyOmYwMDA6ZjgzOmI0MDA6NzM6MWQ1Nzo5ZGM2Ojg0OWIiLCJuYW1lIjoiRGF2aWQgQmFydG_FocOtayIsIm9pZCI6ImRjNmYzMjg2LTIwODktNDYxMy04ZmI5LTNlMDEzNDgxZGNkYyIsInByZWZlcnJlZF91c2VybmFtZSI6ImRhdmlkLmJhcnRvc2lrQGFjdHVtZGlnaXRhbC5jb20iLCJwdWlkIjoiMTAwMzIwMDU2QjE4MzM1RCIsInJoIjoiMS5BVGtBeXJPYXJkVVdiVW1Ga2JmNUdsRlJOZnhtU0RuYjdnRlBoVFlfLUVzV3ZpbzJBVzQ1QUEuIiwic2NwIjoiVXNlci5SZWFkLkFsbCIsInNlY2F1ZCI6eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJzY3AiOiJVc2VyLlJlYWQifSwic2lkIjoiMDAxMzhmZWEtNTlmNS0yYTUxLTg3ZDgtMWE2NzY0YjFhNzljIiwic2lnbmluX3N0YXRlIjpbImttc2kiXSwic3ViIjoiWENMcHllaEpxRVJmSW4zd3BaT200eXF2MFl0ZE1jZ043OWFsWFN5NXRlWSIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJFVSIsInRpZCI6ImFkOWFiM2NhLTE2ZDUtNDk2ZC04NTkxLWI3ZjkxYTUxNTEzNSIsInV0aSI6Ing3QWsxX2RCUkVXSTROWEF2dWtDQUEiLCJ2ZXIiOiIyLjAiLCJ4bXNfYWN0X2ZjdCI6IjMgNSIsInhtc19jYyI6WyJDUDEiXSwieG1zX2ZpbHRlcl9pbmRleCI6WyI1NyJdLCJ4bXNfZnRkIjoicFNMOU81UUZJTU9RanEyM3RWVVRPRHlqZnE5eVpvZGN5OXZlT0JxZ2dxUUJaWFZ5YjNCbGQyVnpkQzFrYzIxeiIsInhtc19pZHJlbCI6IjI2IDEiLCJ4bXNfcmQiOiIwLjQyTGxZQlJpdEFRQSIsInhtc19zc20iOiIxIiwieG1zX3N1Yl9mY3QiOiIzIDYiLCJ4bXNfdGRiciI6IkVVIn0.CFEm6isolbJrXtD2MJefTd1z8Xt5jy0-eOC2uXg-YhzTagraBtaUHTr3BzUwdezb8VpFp_t2LLoCCjQXC1dMKpCXHiWOM1qyDOmNjaP4dpXcmWJis-5Q79q8sbZf4ptBMIJY7UslGJu5wN8X1X115vIzCo2Y7jlRUSxfojkVIGnkLCfQkSWAHuBGFnW3I3oF4-eT1_VXOuDPDARPslRJsbpy375IAATk7JpwpCB5AGO-WkG2oYPVW_Bldk5bqZI1UkafO0dsSRaATfZevyU9hAy3Qrq2IBxj8RhJGN1bwOWu-dsbM51FNOq4R6i1G4cUjijtU2YwIrtd3Dq84unr_w";

const LangHandler = () => {

  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchAndAddTranslations = async (token: string, langKey: string) => {

    const language = langKey === "en-GB" ? "English" : langKey === "fr-FR" ? "French" : "Dutch";

    /*const response = await apiClient.odata<any>(`/data/v9.2/actum_translations?$filter=actum_translationname eq '${language}'`, {
      headers: {
          'Authorization': `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json'
        }
    });*/
    const response = await fetch(
      `/_api/data/v9.2/actum_translations?$filter=actum_translationname eq '${language}'`
    );
    const data = await response.json();
    const translations = data.value.reduce((acc: Record<string, string>, record: any) => {
      acc[record.key] = record.value;
      return acc;
    }, {});
    i18n.addResourceBundle(langKey, 'translation', translations, true, true);
  };

  useEffect(() => {
    const langParam = searchParams.get("lang");
    const language = langParam || i18n.language;

    if (!langParam || langParam !== i18n.language) {
      const newSearchParams = new URLSearchParams(searchParams);

      newSearchParams.set("lang", language);

      i18n.changeLanguage(language);

      navigate(`${window.location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }

    fetchAndAddTranslations("", language)

  }, [searchParams, i18n, navigate]);

  return null;
};

export default LangHandler;
