import chroma from "chroma-js";

export function pxToRem(number, baseNumber = 16) {
  return `${number / baseNumber}rem`;
}

export function hexToRgb(color) {
  return chroma(color).rgb().join(", ");
}

export function rgba(color, opacity) {
  return `rgba(${hexToRgb(color)}, ${opacity})`;
}

export function linearGradient(color, colorState, angle = 310) {
  return `linear-gradient(${angle}deg, ${color}, ${colorState})`;
}

export function boxShadow(offset = [], radius = [], color, opacity, inset = "") {
  const [x, y] = offset;
  const [blur, spread] = radius;

  return `${inset} ${pxToRem(x)} ${pxToRem(y)} ${pxToRem(blur)} ${pxToRem(spread)} ${rgba(
    color,
    opacity
  )}`;
}
