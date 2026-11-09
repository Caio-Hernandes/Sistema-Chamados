import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    --page-bg: #f1eff5;
    --card-bg: #fcf9ff;
    --input-bg: #eeedef;
    --text: #27242d;
    --muted: #68646f;
    --border: #d5d2da;
    --focus: #39353f;
    --accent-bg: #dfd9e9;
    --accent-border: #b1a8bf;
    --hover-bg: #e7e1ef;
    --shadow-color: #39353f;
    --radius-control: 8px;
    --radius-card: 12px;
    --content-width: 1120px;
    --card-shadow: 2px 2px 0 #39353f0d;
    --status-open-bg: #f7f1e3;
    --status-open-border: #e8ddc5;
    --status-open-text: #75613a;
    --status-in_progress-bg: #eaf0f8;
    --status-in_progress-border: #d7e1ee;
    --status-in_progress-text: #4c6585;
    --status-resolved-bg: #eaf3ed;
    --status-resolved-border: #d4e5da;
    --status-resolved-text: #4c705a;
    --status-closed-bg: #efedf2;
    --status-closed-border: #dfdbe5;
    --status-closed-text: #686171;
    color-scheme: light;
  }
  :root[data-theme="dark"] {
    --page-bg: #0f0e14;
    --card-bg: #1c1921;
    --input-bg: #272828;
    --text: #f4f4f5;
    --muted: #a3a0aa;
    --border: #34313a;
    --focus: #f4f4f5;
    --accent-bg: #302e35;
    --accent-border: #625e6b;
    --hover-bg: #2b2831;
    --shadow-color: #000;
    --card-shadow: 2px 2px 0 #0004;
    --status-open-bg: #302a21;
    --status-open-border: #4c4131;
    --status-open-text: #d4c3a0;
    --status-in_progress-bg: #242a35;
    --status-in_progress-border: #384354;
    --status-in_progress-text: #b1c3dd;
    --status-resolved-bg: #232e28;
    --status-resolved-border: #36493d;
    --status-resolved-text: #afcdb9;
    --status-closed-bg: #2b2831;
    --status-closed-border: #423c4a;
    --status-closed-text: #c4bccd;
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    font-family: "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    background: var(--page-bg);
    color: var(--text);
    transition: background 0.2s, color 0.2s;
  }

  button, input, select, textarea {
    font: inherit;
  }

  h1, h2, h3 { letter-spacing: -0.025em; line-height: 1.25; }
  button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }

  :focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }
  }

  a {
    color: inherit;
  }
`;
