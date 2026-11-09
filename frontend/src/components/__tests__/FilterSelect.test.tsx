import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterSelect from "../FilterSelect";

function setup() {
  const change = vi.fn();
  render(<>
    <label id="status-label" htmlFor="status">Status</label>
    <FilterSelect id="status" value="ALL" onChange={change} options={[
      { value: "ALL", label: "Todos" }, { value: "OPEN", label: "Aberto" },
    ]} />
    <button>Fora</button>
  </>);
  return { change, user: userEvent.setup(), trigger: screen.getByRole("button", { name: "Status" }) };
}

describe("FilterSelect", () => {
  it("seleciona uma opção com o mouse e devolve foco ao botão", async () => {
    const { change, user, trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole("listbox", { name: "Status" })).toBeVisible();
    await user.click(screen.getByRole("option", { name: "Aberto" }));
    expect(change).toHaveBeenCalledWith("OPEN");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("permite navegar e selecionar pelo teclado", async () => {
    const { change, user, trigger } = setup();
    trigger.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(change).toHaveBeenCalledWith("OPEN");
  });

  it("fecha com Escape e ao clicar fora sem mudar o valor", async () => {
    const { change, user, trigger } = setup();
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Fora" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(change).not.toHaveBeenCalled();
  });
});
