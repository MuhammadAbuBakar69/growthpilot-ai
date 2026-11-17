"use client";

import { Component, type ReactNode } from "react";

/**
 * A failed panel should fail alone.
 *
 * React unmounts the whole tree when a render throws, so a malformed record, a bad date or a parser
 * surprise in one panel used to blank the entire workspace and leave the user with a white page and no
 * explanation. This boundary contains the damage: the rest of the workspace keeps working, the failing
 * section says so in place, and the data on disk is untouched because nothing was written.
 *
 * A class component, not a hook: error boundaries still require componentDidCatch.
 */
export default class Boundary extends Component<
  { label: string; children: ReactNode },
  { failed: boolean; reason: string | null }
> {
  state: { failed: boolean; reason: string | null } = { failed: false, reason: null };

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, reason: error instanceof Error ? error.message : "Unknown render error" };
  }

  componentDidCatch(error: unknown) {
    // Kept in the console for a developer; shown in place for the person using the tool.
    console.error(`[${this.props.label}] failed to render`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="panel">
          <div className="panel-head">
            <span className="label">{this.props.label}</span>
          </div>
          <p className="note">
            This section failed to render. Nothing was saved or deleted, so your answers are intact. Try again,
            or reload the page if it repeats.
          </p>
          {this.state.reason ? <p className="note muted">Detail: {this.state.reason}</p> : null}
          <div className="right">
            <button
              className="btn btn-sm"
              onClick={() => this.setState({ failed: false, reason: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
