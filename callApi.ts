import axios, { AxiosRequestConfig, Method } from 'axios'
import { unref } from "vue";
import useUserStore from "@/core/store/userStore";
import { notifyBackendDown } from "@/core/services/errors/backendDownManager";

/**
 * Méthode générique qui s'occupera de tous les appels API
 *
 * @param path - Chemin api, ex: `/pets`
 * @param method - Méthode HTTP
 * @param config - Config optionnelle d'axios
 * @returns Retourne une promesse du type passé en Generic TS
 */
export const callAPI = async <R>(path: string, method: Method, config: Partial<AxiosRequestConfig> = {}): Promise<R> => {
  config = config ?? {};

  const store = useUserStore();
  const hasAccessToken = Boolean(unref(store.hasAccessToken));
  const accessToken = unref(store.accessToken);

  if (hasAccessToken && accessToken) {
    config.headers = {
      ...(config.headers ?? {}),
      'Authorization': `Bearer ${accessToken}`
    }
  }


  try {
    const res = await axios({
      url: `${import.meta.env.VITE_BACKEND_FULL_URL}${path}`,
      method,
      ...config
    });
    return res.data;
  } catch (err: any) {
    // On récupère le chemin de la requête qui a échoué
    const failedPath = (err.config && err.config.url) ? err.config.url : "";

    const data = err.response?.data;
    const status = err.response?.status;
    const isDbDown =
      data &&
      data.exception === "Illuminate\\Database\\QueryException" &&
      typeof data.message === "string" &&
      data.message.includes("SQLSTATE[HY000] [2002]");

    const isCancelledRequest = err.code === "ERR_CANCELED";
    const isGatewayOrUnavailable = status && [502, 503, 504].includes(status);
    const isNetworkError = !isCancelledRequest && (
      err.code === "ERR_NETWORK" ||
      err.code === "ECONNABORTED" ||
      (typeof err.message === "string" && err.message.toLowerCase().includes("network error")) ||
      !err.response
    );

    if (isDbDown || isNetworkError || isGatewayOrUnavailable) {
      // Backend indisponible (DB HS, serveur injoignable, gateway timeout, etc.)
      notifyBackendDown();
      throw { type: "backend-down", message: "Backend indisponible" };
    }

    // Gestion centralisée des erreurs
    if (err.response && err.response.status === 500 && !failedPath.includes('/errors')) {
      const userId = hasAccessToken ? store.user?.id : undefined;

      // Import dynamique pour éviter une dépendance circulaire directe entre callApi et api
      const { $api } = await import("./api");

      await $api.error.logError({
        message: JSON.stringify(err.response?.data) || "Erreur serveur 500",
        code: "500",
        userId,
      });
      // Tu peux aussi throw une erreur custom ou retourner un objet spécial
      throw { type: "server", message: "Un problème est survenu, veuillez réessayer plus tard" };
    }
    // Pour les autres erreurs, tu peux les gérer ici ou les relancer
    throw err;
  }
}

export const api = {
  //   getPets() {
  //     return callAPI<Profile[]>(`/pets`, 'GET')
  //   },

  //   updatePet(petID: number, data: Partial<Profile>) {
  //     return callAPI<Profile>(`/pets/${petID}`, 'PATCH', { data })
  //   },

  getAdsByCategory(adType: string, category: string) {
    return callAPI<any>(`/categories/${adType}/${category}?media=api&tenant=${import.meta.env.VITE_TENANT}`, 'GET')
  },

  //   createPet(data: Omit<Profile, 'id'>) {
  //     return callAPI<Profile>(`/pets`, 'POST', { data })
  //   },

  //   deletePet(petID: number) {
  //     return callAPI<void>(`/pets/${petID}`, 'DELETE')
  //   }
}
