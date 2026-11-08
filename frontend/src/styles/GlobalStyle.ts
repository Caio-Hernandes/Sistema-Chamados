import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    --page-bg: #e9f2f7;
    --card-bg: #b9def6;
    --input-bg: #fff8e7;
    --text: #252525;
    --muted: #666666;
    --border: #252525;
    --focus: #2d8cf0;
  }

  :root[data-theme="dark"] {
    --page-bg: #151d28;
    --card-bg: #24374a;
    --input-bg: #1c2938;
    --text: #f4f7fb;
    --muted: #c4cfdd;
    --border: #e3eaf4;
    --focus: #77b8ff;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: Inter, system-ui, sans-serif;
    background: var(--page-bg);
    color: var(--text);
    transition: background 0.2s, color 0.2s;
  }

  button, input {
    font: inherit;
  }

  a {
    color: inherit;
  }
`;