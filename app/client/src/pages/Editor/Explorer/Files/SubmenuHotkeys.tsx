import React from "react";
import { Hotkey, Hotkeys, HotkeysTarget } from "@blueprintjs/core";
import type { SelectEvent } from "components/editorComponents/GlobalSearch/utils";

interface Props {
  handleUpKey: () => void;
  handleDownKey: () => void;
  handleSubmitKey: (e: SelectEvent) => void;
  children: React.ReactNode;
}

@HotkeysTarget
class SubmenuHotKeys extends React.Component<Props> {
  get hotKeysConfig() {
    return [
      {
        combo: "up",
        onKeyDown: () => {
          this.props.handleUpKey();
        },
        allowInInput: true,
        label: "Move up the list",
      },
      {
        combo: "down",
        onKeyDown: this.props.handleDownKey,
        allowInInput: true,
        label: "Move down the list",
      },
      {
        combo: "return",
        onKeyDown: this.props.handleSubmitKey,
        allowInInput: true,
        label: "Submit",
      },
    ];
  }

  renderHotkeys() {
    return (
      <Hotkeys>
        {this.hotKeysConfig.map(
          ({ allowInInput, combo, label, onKeyDown }, index) => (
            <Hotkey
              allowInInput={allowInInput}
              combo={combo}
              global={false}
              key={index}
              label={label}
              onKeyDown={onKeyDown}
            />
          ),
        )}
      </Hotkeys>
    );
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}

export default SubmenuHotKeys;
