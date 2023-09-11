import React from "react";
import { connect } from "react-redux";
import {
  getFormInitialValues,
  getFormValues,
  initialize,
  isDirty,
  reset,
} from "redux-form";
import type { AppState } from "@appsmith/reducers";
import { get, isEmpty, isEqual, memoize, merge } from "lodash";
import {
  getPluginImages,
  getDatasource,
  getPlugin,
  getDatasourceFormButtonConfig,
} from "selectors/entitiesSelector";
import {
  switchDatasource,
  setDatasourceViewMode,
  removeTempDatasource,
  deleteTempDSFromDraft,
  toggleSaveActionFlag,
  toggleSaveActionFromPopupFlag,
  createTempDatasourceFromForm,
  resetDefaultKeyValPairFlag,
  initializeDatasourceFormDefaults,
  datasourceDiscardAction,
  setDatasourceViewModeFlag,
} from "actions/datasourceActions";
import {
  DATASOURCE_DB_FORM,
  DATASOURCE_REST_API_FORM,
} from "@appsmith/constants/forms";
import type { Datasource, DatasourceStorage } from "entities/Datasource";
import { ToastMessageType } from "entities/Datasource";
import type { RouteComponentProps } from "react-router";
import EntityNotFoundPane from "pages/Editor/EntityNotFoundPane";
import { DatasourceComponentTypes } from "api/PluginApi";
import {
  getCurrentApplicationId,
  getPagePermissions,
  selectURLSlugs,
} from "selectors/editorSelectors";
import {
  createMessage,
  REST_API_AUTHORIZATION_APPSMITH_ERROR,
  REST_API_AUTHORIZATION_FAILED,
  REST_API_AUTHORIZATION_SUCCESSFUL,
  TEST_DATASOURCE_ERROR,
  TEST_DATASOURCE_SUCCESS,
} from "@appsmith/constants/messages";
import { isDatasourceInViewMode } from "selectors/ui";
import { getQueryParams } from "utils/URLUtils";
import { TEMP_DATASOURCE_ID } from "constants/Datasource";
import {
  hasCreateDatasourceActionPermission,
  hasDeleteDatasourcePermission,
  hasManageDatasourcePermission,
} from "@appsmith/utils/permissionHelpers";

import { toast, Callout, ModalBody, ModalFooter } from "design-system";
import styled from "styled-components";
import { isDatasourceAuthorizedForQueryCreation } from "utils/editorContextUtils";
import { showDebuggerFlag } from "selectors/debuggerSelectors";
import {
  getConfigInitialValues,
  getIsFormDirty,
  getTrimmedData,
  normalizeValues,
  validate,
} from "components/formControls/utils";
import type { ControlProps } from "components/formControls/BaseControl";
import type { ApiDatasourceForm } from "entities/Datasource/RestAPIForm";
import type { PluginType } from "entities/Action";
import { PluginPackageName } from "entities/Action";
import DSDataFilter from "@appsmith/components/DSDataFilter";
import { DEFAULT_ENV_ID } from "@appsmith/api/ApiUtils";
import {
  isStorageEnvironmentCreated,
  onUpdateFilterSuccess,
} from "@appsmith/utils/Environments";
import type { CalloutKind } from "design-system";
import { FEATURE_FLAG } from "@appsmith/entities/FeatureFlag";
import { selectFeatureFlagCheck } from "@appsmith/selectors/featureFlagsSelectors";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { DATASOURCES_ALLOWED_FOR_PREVIEW_MODE } from "constants/QueryEditorConstants";
import RestAPIDatasourceForm from "../../Editor/DataSourceEditor/RestAPIDatasourceForm";
import {
  ResizerContentContainer,
  ResizerMainContainer,
} from "../../Editor/DataSourceEditor/Debugger";
import DataSourceEditorForm from "../../Editor/DataSourceEditor/DBForm";
import DatasourceAuth from "../../common/datasourceAuth";
import { formValuesToDatasource } from "../../../transformers/RestAPIDatasourceFormTransformer";
import history from "utils/history";
import { builderURL } from "RouteBuilder";
import { IDEAppState } from "../ideReducer";

interface ReduxStateProps {
  canCreateDatasourceActions: boolean;
  canDeleteDatasource: boolean;
  canManageDatasource: boolean;
  datasourceButtonConfiguration: string[] | undefined;
  datasourceId: string;
  formData: Datasource | ApiDatasourceForm;
  formName: string;
  isSaving: boolean;
  isTesting: boolean;
  formConfig: any[];
  isDeleting: boolean;
  isNewDatasource: boolean;
  isPluginAuthorized: boolean;
  pageId: string;
  pluginImage: string;
  pluginId: string;
  viewMode: boolean;
  pluginType: string;
  pluginName: string;
  pluginDatasourceForm: string;
  pluginPackageName: string;
  applicationId: string;
  applicationSlug: string;
  pageSlug: string;
  // isInsideReconnectModal: indicates that the datasource form is rendering inside reconnect modal
  isInsideReconnectModal?: boolean;
  isDatasourceBeingSaved: boolean;
  triggerSave: boolean;
  isFormDirty: boolean;
  datasource: Datasource | ApiDatasourceForm | undefined;
  defaultKeyValueArrayConfig: Array<string>;
  initialValue: Datasource | ApiDatasourceForm | undefined;
  showDebugger: boolean;
  isEnabledForDSViewModeSchema: boolean;
  isPluginAllowedToPreviewData: boolean;
}

const Form = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  flex: 1;
`;

type Props = ReduxStateProps &
  DatasourcePaneFunctions &
  RouteComponentProps<{
    dataId: string;
  }>;

export const DSEditorWrapper = styled.div`
  height: 50vh;
  overflow: hidden;
  display: flex;
  flex-direction: row;
`;

export const CalloutContainer = styled.div<{
  isSideBarPresent: boolean;
}>`
  width: 30vw;
  margin-top: 24px;
  margin-left ${(props) => (props.isSideBarPresent ? "24px" : "0px")}
`;

export type DatasourceFilterState = {
  id: string;
  name: string;
  userPermissions: string[];
};

/*
  **** State Variables Description ****
  showDialog: flag used to show/hide the datasource discard popup
  routesBlocked: flag used to identity if routes are blocked or not
  readUrlParams: flag used to identity if url params are read or not
  requiredFields: object containing the required fields for the datasource form
  configDetails: object containing the details of the datasource form
  filterParams: object containing the details of the datasource filter
  unblock: on blocking routes using history.block, it returns a function which can be used to unblock the routes
  navigation: function that navigates to path that we want to transition to, after discard action on datasource discard dialog popup
*/
type State = {
  showDialog: boolean;
  routesBlocked: boolean;
  switchFilterBlocked: boolean;
  readUrlParams: boolean;
  requiredFields: Record<string, ControlProps>;
  configDetails: Record<string, string>;
  filterParams: DatasourceFilterState;
};

export interface DatasourcePaneFunctions {
  switchDatasource: (id: string) => void;
  setDatasourceViewMode: (payload: {
    datasourceId: string;
    viewMode: boolean;
  }) => void;
  setDatasourceViewModeFlag: (viewMode: boolean) => void;
  discardTempDatasource: () => void;
  deleteTempDSFromDraft: () => void;
  toggleSaveActionFlag: (flag: boolean) => void;
  toggleSaveActionFromPopupFlag: (flag: boolean) => void;
  reinitializeForm: (formName: string, value: any) => void;
  createTempDatasource: (data: any) => void;
  resetDefaultKeyValPairFlag: () => void;
  resetForm: (formName: string) => void;
  initializeFormWithDefaults: (pluginType: string) => void;
  datasourceDiscardAction: (pluginId: string) => void;
}

class DatasourceEditorRouter extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showDialog: false,
      routesBlocked: false,
      switchFilterBlocked: false,
      readUrlParams: false,
      requiredFields: {},
      configDetails: {},
      filterParams: {
        id: DEFAULT_ENV_ID,
        name: "",
        userPermissions: [],
      },
    };
    this.onSave = this.onSave.bind(this);
    this.onDiscard = this.onDiscard.bind(this);
  }

  componentDidUpdate(prevProps: Props) {
    //Fix to prevent restapi datasource from being set in DatasourceDBForm in view mode
    if (
      this.props.pluginDatasourceForm !==
        DatasourceComponentTypes.RestAPIDatasourceForm &&
      this.props.datasourceId &&
      this.props.datasourceId !== prevProps.datasourceId
    ) {
      this.props.switchDatasource(this.props.datasourceId);
    }

    this.setViewModeFromQueryParams();

    if (
      !isEqual(
        this.props.defaultKeyValueArrayConfig,
        prevProps.defaultKeyValueArrayConfig,
      )
    ) {
      this.props.initializeFormWithDefaults(this.props.pluginType);
    }

    // if the datasource id changes, we need to reset the required fields and configDetails
    if (this.props.datasourceId !== prevProps.datasourceId) {
      this.setState({
        requiredFields: {},
        configDetails: {},
      });
    }
  }

  getEnvironmentId = () => {
    if (
      this.props.isInsideReconnectModal &&
      this.state.filterParams.id.length === 0 &&
      !!this.props.datasource
    ) {
      return Object.keys(
        (this.props.datasource as Datasource).datasourceStorages,
      )[0];
    }
    return this.state.filterParams.id;
  };

  componentDidMount() {
    const urlObject = new URL(window.location.href);
    const pluginId = urlObject?.searchParams.get("pluginId");
    // Create Temp Datasource on component mount,
    // if user hasnt saved datasource for the first time and refreshed the page
    if (
      !this.props.datasource &&
      this.props.match.params.dataId === TEMP_DATASOURCE_ID
    ) {
      this.props.createTempDatasource({
        pluginId,
      });
    }

    // In case of Rest API forms, we need to set view mode from query params
    if (
      this.props.pluginDatasourceForm ===
      DatasourceComponentTypes.RestAPIDatasourceForm
    ) {
      this.setViewModeFromQueryParams();
    }

    //Fix to prevent restapi datasource from being set in DatasourceDBForm in datasource view mode
    //TODO: Needs cleanup
    if (
      this.props.datasourceId &&
      this.props.pluginDatasourceForm !==
        DatasourceComponentTypes.RestAPIDatasourceForm
    ) {
      this.props.switchDatasource(this.props.datasourceId);
    }

    if (
      this.props.pluginDatasourceForm ===
        DatasourceComponentTypes.RestAPIDatasourceForm &&
      this.props.location
    ) {
      const search = new URLSearchParams(this.props.location.search);
      const responseStatus = search.get("response_status");
      const responseMessage = search.get("display_message");
      if (responseStatus) {
        // Set default error message
        let message = REST_API_AUTHORIZATION_FAILED;
        if (responseStatus === "success") {
          message = REST_API_AUTHORIZATION_SUCCESSFUL;
        } else if (responseStatus === "appsmith_error") {
          message = REST_API_AUTHORIZATION_APPSMITH_ERROR;
        }
        toast.show(responseMessage || createMessage(message));
      }
    }
  }

  // To move to edit state for new datasources and when we want to move to edit state
  // from outside the datasource route
  setViewModeFromQueryParams() {
    const params = getQueryParams();
    if (this.props.viewMode) {
      if (
        (params.viewMode === "false" && !this.state.readUrlParams) ||
        this.props.isNewDatasource
      ) {
        // We just want to read the query params once. Cannot remove query params
        // here as this triggers history.block
        this.setState(
          {
            readUrlParams: true,
          },
          () => {
            this.props.setDatasourceViewModeFlag(false);
          },
        );
      }
    }
  }

  // updates the configDetails and requiredFields objects in the state
  setupConfig = (config: ControlProps) => {
    const { configProperty, controlType, isRequired } = config;
    const configDetails = this.state.configDetails;
    const requiredFields = this.state.requiredFields;
    configDetails[configProperty] = controlType;
    if (isRequired) requiredFields[configProperty] = config;
    this.setState({
      configDetails,
      requiredFields,
    });
  };

  componentWillUnmount() {
    this.props.discardTempDatasource();
    this.props.deleteTempDSFromDraft();
    this.props.resetDefaultKeyValPairFlag();
  }

  onSave() {
    this.props.toggleSaveActionFromPopupFlag(true);
  }

  onDiscard() {
    this.props.resetForm(this.props.formName);
    if (this.state.switchFilterBlocked) {
      //unblock switch filter
      this.setState({ switchFilterBlocked: false });
    } else {
      this.props.discardTempDatasource();
      this.props.deleteTempDSFromDraft();
      this.props.datasourceDiscardAction(this.props?.pluginId);
    }
    this.props.datasourceDiscardAction(this.props?.pluginId);

    if (!this.props.viewMode && !this.state.switchFilterBlocked) {
      this.props.setDatasourceViewMode({
        datasourceId: this.props.datasourceId,
        viewMode: true,
      });
    }

    if (this.props.isFormDirty) {
      this.props.resetForm(this.props.formName);
    }
  }

  updateFilter = (id: string, name: string, userPermissions: string[]) => {
    if (id.length > 0 && this.state.filterParams.id !== id) {
      if (
        !isEmpty(this.props.formData) &&
        this.props.isFormDirty &&
        this.state.filterParams.id.length > 0
      ) {
        this.setState({
          showDialog: true,
          switchFilterBlocked: true,
        });
        return false;
      } else {
        this.props.resetForm(this.props.formName);
      }
      return this.updateFilterSuccess(id, name, userPermissions);
    } else if (
      !isStorageEnvironmentCreated(this.props.formData as Datasource, id)
    ) {
      return this.updateFilterSuccess(id, name, userPermissions);
    }
    return true;
  };

  updateFilterSuccess = (
    id: string,
    name: string,
    userPermissions: string[],
  ) => {
    onUpdateFilterSuccess(id);
    const { datasourceStorages } = this.props.datasource as Datasource;
    // check all datasource storages and remove the ones which do not have an id object
    const datasourceStoragesWithId = Object.keys(datasourceStorages).reduce(
      (acc: Record<string, DatasourceStorage>, envId: string) => {
        if (
          datasourceStorages[envId].hasOwnProperty("id") ||
          datasourceStorages[envId].hasOwnProperty("datasourceId")
        ) {
          acc[envId] = datasourceStorages[envId];
        }
        return acc;
      },
      {},
    );
    const initialValues = merge(getConfigInitialValues(this.props.formConfig), {
      properties: [],
    });
    if (!datasourceStoragesWithId.hasOwnProperty(id)) {
      // Create the new datasource storage object
      const newDsStorageObject: DatasourceStorage = {
        datasourceId: this.props.datasourceId,
        environmentId: id,
        isValid: false,
        datasourceConfiguration: initialValues.datasourceConfiguration,
        toastMessage: ToastMessageType.EMPTY_TOAST_MESSAGE,
      };

      // // Add the new datasource storage object to the datasource storages
      this.props.reinitializeForm(this.props.formName, {
        ...this.props.formData,
        datasourceStorages: {
          ...datasourceStoragesWithId,
          [id]: newDsStorageObject,
        },
      });
    } else if (
      !datasourceStoragesWithId[id].hasOwnProperty("datasourceConfiguration")
    ) {
      // Add the new datasource storage object to the datasource storages
      this.props.reinitializeForm(this.props.formName, {
        ...this.props.formData,
        datasourceStorages: {
          ...datasourceStoragesWithId,
          [id]: {
            ...datasourceStoragesWithId[id],
            datasourceConfiguration: initialValues.datasourceConfiguration,
          },
        },
      });
    }
    AnalyticsUtil.logEvent("SWITCH_ENVIRONMENT", {
      fromEnvId: this.state.filterParams.id,
      toEnvId: id,
      fromEnvName: this.state.filterParams.name,
      toEnvName: name,
      mode: "CONFIGURATION",
    });
    // This is the event that changes the filter and updates the datasource
    this.setState({
      filterParams: {
        id,
        name,
        userPermissions,
      },
    });
    return true;
  };

  //based on type of toast message, return the message and kind.
  decodeToastMessage(
    messageType: string,
    datasourceName: string,
    environmentId: string | null,
  ): { message: string; kind: string } {
    switch (messageType) {
      case ToastMessageType.TEST_DATASOURCE_ERROR:
        return { message: createMessage(TEST_DATASOURCE_ERROR), kind: "error" };
      case ToastMessageType.TEST_DATASOURCE_SUCCESS:
        return {
          message: createMessage(
            TEST_DATASOURCE_SUCCESS,
            datasourceName,
            environmentId,
          ),
          kind: "success",
        };
      default:
        return { message: "", kind: "" };
    }
  }

  // function to render toast message.
  renderToast() {
    const { datasource } = this.props;
    const environmentId = this.getEnvironmentId() || "";
    const path = `datasourceStorages.${environmentId}.toastMessage`;
    const toastMessage = this.decodeToastMessage(
      get(datasource, path),
      (datasource as Datasource).name,
      this.state.filterParams.name,
    );
    if (toastMessage.message)
      return (
        <CalloutContainer isSideBarPresent={!!this.state.filterParams.name}>
          <Callout
            isClosable
            kind={toastMessage.kind as CalloutKind}
            onClose={() => {
              this.props.setDatasourceViewMode({
                datasourceId: this.props.datasourceId,
                viewMode: false,
              });
            }}
          >
            {toastMessage.message}
          </Callout>
        </CalloutContainer>
      );
    return null;
  }

  renderForm() {
    const {
      datasource,
      datasourceId,
      formConfig,
      formData,
      formName,
      isFormDirty,
      isInsideReconnectModal,
      isSaving,
      location,
      pageId,
      pluginDatasourceForm,
      pluginName,
      pluginPackageName,
      pluginType,
      viewMode,
    } = this.props;

    const shouldViewMode = viewMode && !isInsideReconnectModal;
    // Check for specific form types first
    if (
      pluginDatasourceForm === DatasourceComponentTypes.RestAPIDatasourceForm &&
      !shouldViewMode
    ) {
      return (
        <RestAPIDatasourceForm
          applicationId={this.props.applicationId}
          currentEnvironment={this.state.filterParams.id}
          datasource={datasource}
          datasourceId={datasourceId}
          formData={formData}
          formName={formName}
          hiddenHeader={isInsideReconnectModal}
          isFormDirty={isFormDirty}
          isSaving={isSaving}
          location={location}
          pageId={pageId}
          pluginName={pluginName}
          pluginPackageName={pluginPackageName}
        />
      );
    }

    // Default to DB Editor Form
    return (
      <DataSourceEditorForm
        applicationId={this.props.applicationId}
        currentEnvironment={this.getEnvironmentId()}
        datasourceId={datasourceId}
        formConfig={formConfig}
        formData={formData}
        formName={DATASOURCE_DB_FORM}
        hiddenHeader={isInsideReconnectModal}
        isEnabledForDSViewModeSchema={this.props.isEnabledForDSViewModeSchema}
        isPluginAllowedToPreviewData={this.props.isPluginAllowedToPreviewData}
        isSaving={isSaving}
        pageId={pageId}
        pluginType={pluginType}
        setupConfig={this.setupConfig}
        viewMode={viewMode && !isInsideReconnectModal}
      />
    );
  }

  render() {
    const {
      datasource,
      datasourceButtonConfiguration,
      datasourceId,
      formData,
      isInsideReconnectModal,
      isSaving,
      isTesting,
      pluginId,
      pluginName,
      pluginPackageName,
      pluginType,
      triggerSave,
      viewMode,
    } = this.props;

    if (!pluginId && datasourceId) {
      return <EntityNotFoundPane />;
    }

    return (
      <>
        <ModalBody>
          <Form
            className="t--json-to-form-wrapper"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <ResizerMainContainer>
              <ResizerContentContainer className="db-form-resizer-content">
                <DSEditorWrapper>
                  <DSDataFilter
                    filterId={this.state.filterParams.id}
                    isInsideReconnectModal={!!isInsideReconnectModal}
                    pluginName={pluginName}
                    pluginType={pluginType}
                    updateFilter={this.updateFilter}
                    viewMode={viewMode}
                  />
                  <div className="db-form-content-container">
                    {this.renderToast()}
                    {this.renderForm()}
                  </div>
                </DSEditorWrapper>
              </ResizerContentContainer>
            </ResizerMainContainer>
          </Form>
        </ModalBody>
        <ModalFooter>
          <DatasourceAuth
            currentEnvironment={this.getEnvironmentId()}
            datasource={datasource as Datasource}
            datasourceButtonConfiguration={datasourceButtonConfiguration}
            formData={formData}
            formName={this.props.formName}
            getSanitizedFormData={memoize(this.getSanitizedData)}
            isFormDirty={this.props.isFormDirty}
            isInsideReconnectModal={isInsideReconnectModal}
            isInvalid={this.validateForm()}
            isSaving={isSaving}
            isTesting={isTesting}
            onCancel={() => this.onCancel()}
            pluginName={pluginName}
            pluginPackageName={pluginPackageName}
            pluginType={pluginType as PluginType}
            setDatasourceViewMode={setDatasourceViewMode}
            triggerSave={triggerSave}
            viewMode={viewMode}
          />
        </ModalFooter>
      </>
    );
  }
  onCancel() {
    this.props.setDatasourceViewMode({
      datasourceId: this.props.datasourceId,
      viewMode: true,
    });
    history.push(
      builderURL({
        ideState: IDEAppState.Data,
        pageId: this.props.pageId,
      }),
    );
  }
  getSanitizedData = () => {
    if (
      this.props.pluginDatasourceForm ===
      DatasourceComponentTypes.RestAPIDatasourceForm
    )
      return formValuesToDatasource(
        this.props.datasource as Datasource,
        this.props.formData as ApiDatasourceForm,
      );
    else
      return getTrimmedData({
        ...normalizeValues(
          { ...this.props.formData },
          this.state.configDetails,
        ),
        name: this.props.datasource?.name || "",
      });
  };
  validateForm(): boolean {
    const {
      canManageDatasource,
      datasourceId,
      formData,
      pluginDatasourceForm,
    } = this.props;
    if (
      pluginDatasourceForm === DatasourceComponentTypes.RestAPIDatasourceForm
    ) {
      const createMode = datasourceId === TEMP_DATASOURCE_ID;
      if (!formData) return true;
      return (
        !(formData as ApiDatasourceForm).url ||
        (!createMode && !canManageDatasource)
      );
    }
    return validate(
      this.state.requiredFields,
      formData,
      this.state.filterParams.id,
    );
  }
}

const mapStateToProps = (state: AppState, props: any): ReduxStateProps => {
  const datasourceId = props.datasourceId ?? props.match?.params?.datasourceId;
  const { datasourcePane } = state.ui;
  const { datasources, plugins } = state.entities;
  const viewMode = isDatasourceInViewMode(state);
  const datasource = getDatasource(state, datasourceId) as
    | Datasource
    | ApiDatasourceForm;
  const { formConfigs } = plugins;
  const pluginId = get(datasource, "pluginId", "");
  const plugin = getPlugin(state, pluginId);
  const { applicationSlug, pageSlug } = selectURLSlugs(state);
  const formName =
    plugin?.type === "API" ? DATASOURCE_REST_API_FORM : DATASOURCE_DB_FORM;
  const formData = getFormValues(formName)(state) as
    | Datasource
    | ApiDatasourceForm;
  const isNewDatasource = datasourcePane.newDatasource === TEMP_DATASOURCE_ID;
  const pluginDatasourceForm =
    plugin?.datasourceComponent ?? DatasourceComponentTypes.AutoForm;
  const isFormDirty = getIsFormDirty(
    isDirty(formName)(state),
    formData,
    isNewDatasource,
    pluginDatasourceForm === DatasourceComponentTypes.RestAPIDatasourceForm,
  );
  const initialValue = getFormInitialValues(formName)(state) as
    | Datasource
    | ApiDatasourceForm;
  const defaultKeyValueArrayConfig =
    datasourcePane?.defaultKeyValueArrayConfig as any;

  const datasourcePermissions = datasource?.userPermissions || [];

  const canManageDatasource = hasManageDatasourcePermission(
    datasourcePermissions,
  );

  const canDeleteDatasource = hasDeleteDatasourcePermission(
    datasourcePermissions,
  );

  const pagePermissions = getPagePermissions(state);
  const canCreateDatasourceActions = hasCreateDatasourceActionPermission([
    ...datasourcePermissions,
    ...pagePermissions,
  ]);
  // Debugger render flag
  const showDebugger = showDebuggerFlag(state);
  const pluginPackageName = plugin?.packageName ?? "";

  const isPluginAuthorized =
    pluginPackageName === PluginPackageName.GOOGLE_SHEETS
      ? plugin &&
        isDatasourceAuthorizedForQueryCreation(formData as Datasource, plugin)
      : true;

  const datasourceButtonConfiguration = getDatasourceFormButtonConfig(
    state,
    pluginId,
  );

  //   A/B feature flag for datasource view mode preview data.
  const isEnabledForDSViewModeSchema = selectFeatureFlagCheck(
    state,
    FEATURE_FLAG.ab_gsheet_schema_enabled,
  );

  // should plugin be able to preview data
  const isPluginAllowedToPreviewData =
    DATASOURCES_ALLOWED_FOR_PREVIEW_MODE.includes(plugin?.name || "");

  return {
    canCreateDatasourceActions,
    canDeleteDatasource,
    canManageDatasource,
    datasourceButtonConfiguration,
    datasourceId,
    pluginImage: getPluginImages(state)[pluginId],
    formData,
    formName,
    isInsideReconnectModal: props.isInsideReconnectModal ?? false,
    pluginId,
    isSaving: datasources.loading,
    isDeleting: !!(datasource as Datasource)?.isDeleting,
    isPluginAuthorized: !!isPluginAuthorized,
    isTesting: datasources.isTesting,
    formConfig: formConfigs[pluginId] || [],
    isNewDatasource,
    isEnabledForDSViewModeSchema,
    isPluginAllowedToPreviewData,
    pageId: props.pageId ?? props.match?.params?.pageId,
    viewMode,
    pluginType: plugin?.type ?? "",
    pluginName: plugin?.name ?? "",
    pluginDatasourceForm,
    pluginPackageName,
    applicationId: props.applicationId ?? getCurrentApplicationId(state),
    applicationSlug,
    pageSlug,
    isDatasourceBeingSaved: datasources.isDatasourceBeingSaved,
    triggerSave: datasources.isDatasourceBeingSavedFromPopup,
    isFormDirty,
    datasource,
    defaultKeyValueArrayConfig,
    initialValue,
    showDebugger,
  };
};

const mapDispatchToProps = (
  dispatch: any,
  ownProps: any,
): DatasourcePaneFunctions => ({
  switchDatasource: (id: string) => {
    // on reconnect data modal, it shouldn't be redirected to datasource edit page
    dispatch(switchDatasource(id, ownProps.isInsideReconnectModal));
  },
  setDatasourceViewMode: (payload: {
    datasourceId: string;
    viewMode: boolean;
  }) => dispatch(setDatasourceViewMode(payload)),
  setDatasourceViewModeFlag: (viewMode: boolean) =>
    dispatch(setDatasourceViewModeFlag(viewMode)),
  discardTempDatasource: () => dispatch(removeTempDatasource()),
  deleteTempDSFromDraft: () => dispatch(deleteTempDSFromDraft()),
  toggleSaveActionFlag: (flag) => dispatch(toggleSaveActionFlag(flag)),
  toggleSaveActionFromPopupFlag: (flag) =>
    dispatch(toggleSaveActionFromPopupFlag(flag)),
  reinitializeForm: (formName: string, value: any) =>
    dispatch(initialize(formName, value, false)),
  createTempDatasource: (data: any) =>
    dispatch(createTempDatasourceFromForm(data)),
  resetForm: (formName: string) => dispatch(reset(formName)),
  resetDefaultKeyValPairFlag: () => dispatch(resetDefaultKeyValPairFlag()),
  initializeFormWithDefaults: (pluginType: string) =>
    dispatch(initializeDatasourceFormDefaults(pluginType)),
  datasourceDiscardAction: (pluginId) =>
    dispatch(datasourceDiscardAction(pluginId)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DatasourceEditorRouter);