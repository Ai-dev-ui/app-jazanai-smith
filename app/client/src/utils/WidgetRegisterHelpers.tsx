import React from "react";

import * as Sentry from "@sentry/react";
import store from "store";

import BaseWidget from "widgets/BaseWidget";
import WidgetFactory, { NonSerialisableWidgetConfigs } from "./WidgetFactory";

import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { memoize } from "lodash";
import { WidgetConfiguration } from "widgets/constants";
import withMeta from "widgets/MetaHOC";
import withWidgetProps from "widgets/withWidgetProps";
import { generateReactKey } from "./generators";
import {
  RegisteredWidgetFeatures,
  WidgetFeaturePropertyEnhancements,
  WidgetFeatureProps,
} from "./WidgetFeatures";

const generateWidget = memoize(function getWidgetComponent(
  Widget: typeof BaseWidget,
  needsMeta: boolean,
) {
  let widget = needsMeta ? withMeta(Widget) : Widget;
  //@ts-expect-error: type mismatch
  widget = withWidgetProps(widget);
  return Sentry.withProfiler(
    // @ts-expect-error: Types are not available
    widget,
  );
});

export const registerWidget = (Widget: any, config: WidgetConfiguration) => {
  const ProfiledWidget = generateWidget(Widget, !!config.needsMeta);

  WidgetFactory.registerWidgetBuilder(
    config.type,
    {
      buildWidget(widgetData: any): JSX.Element {
        return <ProfiledWidget {...widgetData} key={widgetData.widgetId} />;
      },
    },
    config.properties.derived,
    config.properties.default,
    config.properties.meta,
    config.properties.config,
    config.properties.contentConfig,
    config.properties.styleConfig,
    config.features,
    config.properties.loadingProperties,
    config.properties.stylesheetConfig,
    config.autoLayout,
  );
  configureWidget(config);
};

export const configureWidget = (config: WidgetConfiguration) => {
  let features: Record<string, unknown> = {};
  if (config.features) {
    Object.keys(config.features).forEach((registeredFeature: string) => {
      features = Object.assign(
        {},
        WidgetFeatureProps[registeredFeature as RegisteredWidgetFeatures],
        WidgetFeaturePropertyEnhancements[
          registeredFeature as RegisteredWidgetFeatures
        ](config),
      );
    });
  }

  const _config = {
    ...config.defaults,
    ...features,
    autoLayout: config.autoLayout,
    searchTags: config.searchTags,
    type: config.type,
    hideCard: !!config.hideCard || !config.iconSVG,
    isDeprecated: !!config.isDeprecated,
    replacement: config.replacement,
    displayName: config.name,
    key: generateReactKey(),
    iconSVG: config.iconSVG,
    isCanvas: config.isCanvas,
    canvasHeightOffset: config.canvasHeightOffset,
  };

  const nonSerialisableWidgetConfigs: Record<string, unknown> = {};
  Object.values(NonSerialisableWidgetConfigs).forEach((entry) => {
    if (_config[entry] !== undefined) {
      nonSerialisableWidgetConfigs[entry] = _config[entry];
    }
    delete _config[entry];
  });

  WidgetFactory.storeNonSerialisablewidgetConfig(
    config.type,
    nonSerialisableWidgetConfigs,
  );
  WidgetFactory.storeWidgetConfig(config.type, _config);

  store.dispatch({
    type: ReduxActionTypes.ADD_WIDGET_CONFIG,
    payload: _config,
  });
};
