import React from "react";

interface TextStyle {
  textColor?: string;
}

export interface TextDisplayProps {
  text: string;
  topY: number;
  leftX: number;
  textStyle?: TextStyle;
  shouldGlow: boolean;
  id: string;
}

export default function TextDisplay(props: TextDisplayProps) {
  const textStyle = props.textStyle ? props.textStyle : {};
  console.log('shouldGlow', props.shouldGlow);

  return (
    <div
      style={{
        position: "absolute",
        top: props.topY,
        left: props.leftX,
        color: textStyle.textColor ? textStyle.textColor : "black",
        boxShadow: props.shouldGlow
          ? "inset 0 0 8px rgba(253, 224, 71, 0.8), inset 0 0 16px rgba(253, 224, 71, 0.6)"
          : "none"
      }}
      // className={`${props.shouldGlow ? 'ring-blue-500 shadow-lg shadow-blue-500/50' : ''}`}
      className={`${props.shouldGlow ? "bg-yellow-100 animate-pulse" : ""}`}
      id={props.id}
    >
      {props.text}
    </div>
  );
}
