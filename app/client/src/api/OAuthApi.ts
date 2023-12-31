import Api from "./Api";
import type { AxiosPromise } from "axios";
import type { ApiResponse } from "api/ApiResponses";
import type { Datasource } from "entities/Datasource";

class OAuthApi extends Api {
  static url = "v1/saas";

  // Api endpoint to get "Appsmith token" from server
  static async getAppsmithToken(
    datasourceId: string,
    pageId: string,
    isImport?: boolean,
  ): Promise<AxiosPromise<ApiResponse<string>>> {
    const isImportQuery = isImport ? "?importForGit=true" : "";
    return Api.post(
      `${OAuthApi.url}/${datasourceId}/pages/${pageId}/oauth${isImportQuery}`,
    );
  }

  // Api endpoint to get access token for datasource authorization
  static async getAccessToken(
    datasourceId: string,
    token: string,
  ): Promise<AxiosPromise<ApiResponse<Datasource>>> {
    return Api.post(
      `${OAuthApi.url}/${datasourceId}/token?appsmithToken=${token}`,
    );
  }
}

export default OAuthApi;
