import { Button, Text } from "design-system";
import styles from "./styles.module.css";
import React from "react";
import {
  CUSTOM_WIDGET_FEATURE,
  createMessage,
} from "@appsmith/constants/messages";

export default function Help() {
  return (
    <div>
      <Text
        color="#6A7585"
        renderAs="p"
        style={{
          lineHeight: "18px",
        }}
      >
        {createMessage(CUSTOM_WIDGET_FEATURE.referrences.help.message)}
      </Text>
      <Button
        className={styles.marginTop}
        kind="secondary"
        size="md"
        startIcon="book"
      >
        {createMessage(CUSTOM_WIDGET_FEATURE.referrences.help.buttonCTA)}
      </Button>
    </div>
  );
}