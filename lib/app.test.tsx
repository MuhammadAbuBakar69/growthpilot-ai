// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "@/app/page";

beforeEach(() => localStorage.clear());

describe("first run", () => {
  it("opens straight into setting up a business, with no sign-in anywhere", async () => {
    render(<Page />);
    expect(await screen.findByText(/Find what is limiting this business/i)).toBeTruthy();
    // The whole pitch: no account wall.
    expect(screen.queryByText(/sign in/i)).toBeNull();
    expect(screen.queryByText(/password/i)).toBeNull();
  });

  it("creates a business, scores it from answers, and shows findings and a plan", async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.type(await screen.findByPlaceholderText("Stitch Co"), "Stitch Co");
    await user.type(screen.getByPlaceholderText("https://stitch.co"), "https://stitch.example");
    await user.click(screen.getByRole("button", { name: /start analysis/i }));

    // Lands in Questions, which is the only honest place to start: no data, no score.
    expect(await screen.findByText(/Answer what you know/i)).toBeTruthy();

    // Answer the first question of the first three groups with the lowest option.
    const groups = document.querySelectorAll(".qbody");
    expect(groups.length).toBeGreaterThan(2);
    for (const group of Array.from(groups).slice(0, 3)) {
      const first = within(group as HTMLElement).getAllByRole("button")[0];
      await user.click(first);
    }
    await waitFor(() => {
      expect(document.querySelectorAll('.opt[aria-pressed="true"]').length).toBeGreaterThanOrEqual(3);
    });

    await user.click(screen.getByRole("button", { name: "Overview" }));
    const big = await waitFor(() => document.querySelector(".score-big"));
    expect(big?.textContent).toMatch(/\d/);
    expect(big?.textContent).not.toBe("—");

    // The score is a real number, and findings exist because answers were weak.
    await user.click(screen.getByRole("button", { name: "Findings" }));
    await waitFor(() => expect(document.querySelectorAll(".finding").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Plan" }));
    await waitFor(() => expect(document.querySelectorAll(".stage").length).toBe(3));
  });

  it("contradicts a claim the pasted page does not support", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.type(await screen.findByPlaceholderText("Stitch Co"), "Stitch Co");
    await user.click(screen.getByRole("button", { name: /start analysis/i }));

    // Claim strong testimonials, then supply a page with none.
    await user.click(await screen.findByRole("button", { name: "Questions" }));
    const group = Array.from(document.querySelectorAll(".qgroup")).find((g) =>
      /Trust/i.test(g.querySelector("summary")?.textContent ?? ""),
    ) as HTMLElement;
    const options = within(group).getAllByRole("button", { name: /^Yes, clearly$/ });
    await user.click(options[0]);
    await waitFor(() => expect(group.querySelectorAll('.opt[aria-pressed="true"]').length).toBe(1));

    await user.click(screen.getByRole("button", { name: "Site audit" }));
    const box = await screen.findByPlaceholderText(/paste your page source/i);
    await user.click(box);
    await user.paste("<html><head><title>Stitch Co</title></head><body><h1>Embroidery</h1><p>We embroider uniforms.</p></body></html>");
    await user.click(screen.getByRole("button", { name: /read the page/i }));

    // The contradiction panel is the product: claim vs measured page.
    expect(await screen.findByText(/Where your answers and your page disagree/i)).toBeTruthy();
    expect(screen.getAllByText(/You said testimonials exist/i).length).toBeGreaterThan(0);
  });

  it("keeps skipped questions as missing rather than scoring them zero", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.type(await screen.findByPlaceholderText("Stitch Co"), "Solo Trader");
    await user.click(screen.getByRole("button", { name: /start analysis/i }));

    await user.click(await screen.findByRole("button", { name: "Overview" }));
    // No answers at all: the score panel must say nothing is scored, not show 0.
    expect(await screen.findByText(/Nothing scored yet/i)).toBeTruthy();
    expect(document.querySelector(".score-big")).toBeNull();
  });
});
