import {
  LayoutComponentTypes,
  type LayoutProps,
} from "layoutSystems/anvil/utils/anvilTypes";
import { generateReactKey } from "utils/generators";

export const sectionPreset = (): LayoutProps[] => {
  return [
    {
      isDropTarget: true,
      isPermanent: false,
      layout: [],
      layoutId: generateReactKey(),
      layoutStyle: {},
      layoutType: LayoutComponentTypes.SECTION,
      maxChildLimit: 4,
    },
  ];
};
