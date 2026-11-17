// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Boundary from "@/components/Boundary";

const Boom = () => {
  throw new Error("bad record shape");
};

describe("error boundary", () => {
  it("contains a failing panel and keeps the rest of the page mounted", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <Boundary label="Overview">
          <Boom />
        </Boundary>
        <p>the rest of the workspace</p>
      </div>,
    );

    expect(screen.getByText(/failed to render/i)).toBeTruthy();
    expect(screen.getByText("the rest of the workspace")).toBeTruthy();
    expect(screen.getByText(/bad record shape/)).toBeTruthy();
    // The promise the copy makes: nothing was written.
    expect(screen.getByText(/Nothing was saved or deleted/i)).toBeTruthy();
  });

  it("renders its children when nothing throws", () => {
    render(
      <Boundary label="Overview">
        <p>fine</p>
      </Boundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
  });
});
