import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import styled from "styled-components";

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = {
  id: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export default function FilterSelect<T extends string>({ id, value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(0, options.findIndex(option => option.value === value));

  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, selected]);

  function choose(next: T) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }

  function handleKeys(event: KeyboardEvent, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      items.current[next]?.focus();
    }
  }

  return <Wrapper ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <Trigger id={id} ref={trigger} type="button" aria-haspopup="listbox"
      aria-expanded={open} aria-controls={`${id}-options`}
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
      }}>
      <span>{options[selected].label}</span>
      <Chevron width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" $open={open}><path d="m6 9 6 6 6-6" /></Chevron>
    </Trigger>
    {open && <Menu id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <Item key={option.value} type="button" role="option"
        ref={element => { items.current[index] = element; }}
        aria-selected={option.value === value} tabIndex={-1}
        onKeyDown={event => handleKeys(event, index)} onClick={() => choose(option.value)}>
        {option.label}
      </Item>)}
    </Menu>}
  </Wrapper>;
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
`;
const Trigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  box-shadow: var(--card-shadow);
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  &[aria-expanded="true"] { border-color: var(--focus); }
`;
const Chevron = styled.svg<{ $open: boolean }>`
  flex-shrink: 0;
  transform: ${({ $open }) => $open ? "rotate(180deg)" : "none"};
  transition: transform 150ms;
`;
const Menu = styled.div`
  position: absolute;
  z-index: 30;
  inset: calc(100% + 8px) 0 auto;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--input-bg);
  box-shadow: 0 8px 24px #0003;
  max-height: 280px;
  overflow-y: auto;
`;
const Item = styled.button`
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  &[aria-selected="true"] { background: var(--accent-bg); }
  &:hover, &:focus-visible { background: var(--accent-bg); border-color: var(--accent-border); outline: none; }
`;
