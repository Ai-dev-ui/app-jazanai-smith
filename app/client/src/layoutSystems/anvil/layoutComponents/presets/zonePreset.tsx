import {
  LayoutComponentTypes,
  type LayoutProps,
} from "layoutSystems/anvil/utils/anvilTypes";
import { generateReactKey } from "utils/generators";

export const zonePreset = (): LayoutProps[] => {
  return [
    {
      isDropTarget: true,
      isPermanent: false,
      layout: [],
      layoutId: generateReactKey(),
      layoutStyle: {
        height: "100%",
      },
      layoutType: LayoutComponentTypes.ZONE,
    },
  ];
};
