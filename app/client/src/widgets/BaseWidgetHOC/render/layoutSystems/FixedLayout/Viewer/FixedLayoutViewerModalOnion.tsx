import React from "react";
import type { BaseWidgetProps } from "widgets/BaseWidgetHOC/withBaseWidgetHOC";
import { ModalOverlayLayer } from "../../common/ModalOverlayLayer";
import { FixedLayoutWigdetComponent } from "../common/FixedLayoutWidgetComponent";
import ErrorBoundary from "components/editorComponents/ErrorBoundry";
import { Classes } from "@blueprintjs/core";

export const FixedLayoutViewerModalOnion = (props: BaseWidgetProps) => {
  return (
    <ErrorBoundary>
      <FixedLayoutWigdetComponent {...props}>
        <ModalOverlayLayer {...props} isEditMode={false}>
          <div className={Classes.OVERLAY_CONTENT}>{props.children}</div>
        </ModalOverlayLayer>
      </FixedLayoutWigdetComponent>
    </ErrorBoundary>
  );
};