import type { WidgetProps } from "widgets/BaseWidget";
import type {
  AnvilHighlightInfo,
  LayoutProps,
  WidgetLayoutProps,
} from "../../anvilTypes";
import { generateReactKey } from "utils/generators";
import { RenderModes } from "constants/WidgetConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import { zonePreset } from "layoutSystems/anvil/layoutComponents/presets/zonePreset";
import type BaseLayoutComponent from "layoutSystems/anvil/layoutComponents/BaseLayoutComponent";
import LayoutFactory from "layoutSystems/anvil/layoutComponents/LayoutFactory";
import { isLargeWidget } from "../widgetUtils";
import type { CanvasWidgetsReduxState } from "reducers/entityReducers/canvasWidgetsReducer";

export function createZoneAndAddWidgets(
  allWidgets: CanvasWidgetsReduxState,
  draggedWidgets: WidgetLayoutProps[],
  highlight: AnvilHighlightInfo,
  parentId: string,
): { canvasWidgets: CanvasWidgetsReduxState; zone: WidgetProps } {
  /**
   * Step 1: Create Zone widget.
   */
  const zoneProps: WidgetProps = {
    bottomRow: 10,
    children: [],
    isLoading: false,
    leftColumn: 0,
    parentColumnSpace: 1,
    parentId,
    parentRowSpace: 10,
    renderMode: RenderModes.CANVAS, // TODO: Remove hard coding.
    responsiveBehavior: ResponsiveBehavior.Fill,
    rightColumn: 64,
    topRow: 0,
    type: "ZONE_WIDGET",
    version: 1,
    widgetId: generateReactKey(),
    widgetName: "Zone" + getRandomInt(1, 100), // TODO: Need the function to logically add the number.
  };

  /**
   * Step 2: Create Canvas widget and add to Zone.
   */
  const preset: LayoutProps[] = zonePreset();
  let zoneLayout: LayoutProps = preset[0];
  const canvasProps: WidgetProps = {
    bottomRow: 10,
    children: [],
    isLoading: false,
    layout: preset,
    leftColumn: 0,
    parentId: zoneProps.widgetId,
    parentColumnSpace: 1,
    parentRowSpace: 10,
    renderMode: RenderModes.CANVAS, // TODO: Remove hard coding.
    responsiveBehavior: ResponsiveBehavior.Fill,
    rightColumn: 64,
    topRow: 0,
    type: "CANVAS_WIDGET",
    version: 1,
    widgetId: generateReactKey(),
    widgetName: "Canvas" + getRandomInt(1, 100), // TODO: Need the function to logically add the number.
  };

  /**
   * Step 3: Split new widgets based on type.
   * This is needed because small and large widgets can't coexist in the same row.
   * So we need to create separate rows for each large widget.
   */
  const [smallWidgets, largeWidgets] = splitWidgets(draggedWidgets);

  /**
   * Step 4: Add small widgets to the zone layout.
   */
  const zoneComp: typeof BaseLayoutComponent = LayoutFactory.get(
    zoneLayout.layoutType,
  );

  zoneLayout = addWidgetsToChildTemplate(
    zoneLayout,
    zoneComp,
    smallWidgets,
    highlight,
  );

  /**
   * Step 5: Add large widgets to the zone layout.
   */
  largeWidgets.forEach((widget: WidgetLayoutProps) => {
    zoneLayout = addWidgetsToChildTemplate(
      zoneLayout,
      zoneComp,
      [widget],
      highlight,
    );
  });

  /**
   * Step 6: Update zone preset with the updated zone layout.
   */
  preset[0] = zoneLayout;

  /**
   * Step 7: Update canvas widget with the updated preset.
   */
  canvasProps.layout = preset;

  /**
   * Step 8: Add new widgetIds to children of canvas widget.
   */
  canvasProps.children = draggedWidgets.map(
    (widget: WidgetLayoutProps) => widget.widgetId,
  );

  /**
   * Step 9: Establish relationship between zone and canvas widgets.
   */
  zoneProps.children = [canvasProps.widgetId];
  canvasProps.parentId = zoneProps.widgetId;

  /**
   * Step 10: Revert the relationships that were originally established while creating the dragged widgets.
   */
  draggedWidgets.forEach((widget: WidgetLayoutProps) => {
    allWidgets[widget.widgetId] = {
      ...allWidgets[widget.widgetId],
      parentId: canvasProps.widgetId,
    };
  });
  return {
    canvasWidgets: {
      ...allWidgets,
      [canvasProps.widgetId]: canvasProps,
      [zoneProps.widgetId]: zoneProps,
    },
    zone: zoneProps,
  };
}

function splitWidgets(widgets: WidgetLayoutProps[]): WidgetLayoutProps[][] {
  const smallWidgets: WidgetLayoutProps[] = [];
  const largeWidgets: WidgetLayoutProps[] = [];
  widgets.forEach((widget: WidgetLayoutProps) => {
    if (isLargeWidget(widget.widgetType)) largeWidgets.push(widget);
    else smallWidgets.push(widget);
  });
  return [smallWidgets, largeWidgets];
}

function addWidgetsToChildTemplate(
  zoneLayout: LayoutProps,
  zoneComp: typeof BaseLayoutComponent,
  draggedWidgets: WidgetLayoutProps[],
  highlight: AnvilHighlightInfo,
): LayoutProps {
  /**
   * Get the child template from the zone component.
   */
  let template: LayoutProps | null | undefined = zoneComp.getChildTemplate(
    zoneLayout,
    draggedWidgets,
  );

  if (template) {
    template = { ...template, layoutId: generateReactKey() };
    /**
     * There is a template.
     * => use the template to create the child layout.
     * => add widgets to the child layout.
     * => add child layout to the zone layout.
     */
    const Comp: typeof BaseLayoutComponent = LayoutFactory.get(
      template.layoutType,
    );
    /**
     * If template has insertChild === true, then add the widgets to the layout.
     */
    if (template.insertChild) {
      template = Comp.addChild(template, draggedWidgets, highlight);
      return zoneComp.addChild(zoneLayout, [template], highlight);
    }
  }
  /**
   * If no template is available, then add widgets directly to layout.
   */
  return zoneComp.addChild(zoneLayout, draggedWidgets, highlight);
}

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
