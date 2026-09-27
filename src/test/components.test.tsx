import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PhiSankey } from "@/components/PhiSankey";
import { RiskMatrix } from "@/components/RiskMatrix";
import { ChartSkeleton, ErrorState, EmptyState } from "@/components/ui-bits";
import { toSankeyData, toMatrixRisks } from "@/lib/mappers";
import type { ApiDataFlow, ApiRisk } from "@/lib/apiTypes";

/** A miniature of the seeded shape: two ingress systems, a core, one leak. */
const FLOWS: ApiDataFlow[] = [
  { source: "Patient Portal", target: "Epic EHR Core", phiType: "Demographics", recordsPerDay: 12400, encrypted: true },
  { source: "Pharmacy System", target: "Epic EHR Core", phiType: "Medication", recordsPerDay: 38900, encrypted: true },
  { source: "Epic EHR Core", target: "Billing Engine", phiType: "Claims", recordsPerDay: 87100, encrypted: false },
  { source: "Billing Engine", target: "Insurance Gateway", phiType: "Claims", recordsPerDay: 71300, encrypted: false },
];

const mkRisk = (id: number, assetName: string, L: number, I: number, band: ApiRisk["band"]): ApiRisk => ({
  id, assetId: id, assetName, likelihood: L, impact: I, exposure: 3, controlGap: 3,
  score: 50, band, computedAt: "2026-01-01T00:00:00.000Z",
});

const RISKS: ApiRisk[] = [
  mkRisk(1, "Billing Engine DB", 5, 5, "EXTREME"),
  mkRisk(5, "Clinical Analytics Lake", 3, 5, "MODERATE"),
  mkRisk(11, "Pharmacy System", 2, 4, "LOW"),
  mkRisk(12, "Patient Portal", 3, 3, "LOW"),
];

describe("PhiSankey fed by mapper output", () => {
  it("renders every mapped system", () => {
    const { nodes, links } = toSankeyData(FLOWS);
    render(<PhiSankey nodes={nodes} links={links} onSelect={vi.fn()} />);
    ["Patient Portal", "Pharmacy System", "Epic EHR Core", "Billing Engine", "Insurance Gateway"]
      .forEach(name => expect(screen.getByText(name)).toBeInTheDocument());
  });

  it("sizes node height proportionally to throughput", () => {
    const { nodes, links } = toSankeyData(FLOWS);
    const { container } = render(<PhiSankey nodes={nodes} links={links} onSelect={vi.fn()} />);

    /** Node boxes carry a <title>; the group's first <rect> is the box itself. */
    const heightOf = (name: string) => {
      const title = [...container.querySelectorAll("title")]
        .find(t => t.textContent?.startsWith(name));
      const rect = title?.parentElement?.querySelector("rect");
      return parseFloat(rect?.getAttribute("height") ?? "0");
    };

    const core = heightOf("Epic EHR Core");      // 87,100 rec/day throughput
    const portal = heightOf("Patient Portal");   // 12,400 rec/day
    expect(core).toBeGreaterThan(0);
    expect(portal).toBeGreaterThan(0);
    expect(core).toBeGreaterThan(portal * 2);
  });

  it("labels an unencrypted system as a violation", () => {
    const { nodes, links } = toSankeyData(FLOWS);
    render(<PhiSankey nodes={nodes} links={links} onSelect={vi.fn()} />);
    expect(screen.getAllByText("UNENCRYPTED").length).toBeGreaterThan(0);
  });
});

describe("RiskMatrix fed by mapper output", () => {
  it("names every scored asset without needing a hover", () => {
    render(<RiskMatrix risks={toMatrixRisks(RISKS)} onSelect={vi.fn()} />);
    ["Billing Engine DB", "Clinical Analytics Lake", "Pharmacy System", "Patient Portal"]
      .forEach(name => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
    // One dot per asset in the grid, each carrying its own band.
    const dots = screen.getAllByTestId("band-dot").map(d => d.getAttribute("data-band"));
    expect(dots.sort()).toEqual(["extreme", "low", "low", "moderate"]);
  });

  it("lists the worst asset first", () => {
    render(<RiskMatrix risks={toMatrixRisks(RISKS)} onSelect={vi.fn()} />);
    const pills = screen.getAllByTestId("band-pill").map(p => p.getAttribute("data-band"));
    expect(pills[0]).toBe("extreme");
    expect(pills.at(-1)).toBe("low");
  });

  it("narrows the list to a square when it is selected, and back", () => {
    render(<RiskMatrix risks={toMatrixRisks(RISKS)} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByTestId("matrix-cell-3-3"));
    expect(screen.getByTestId("matrix-list-title")).toHaveTextContent("Possible · Moderate");
    expect(screen.getAllByTestId("band-pill")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getAllByTestId("band-pill")).toHaveLength(4);
  });

  it("opens a record from the list", () => {
    const onSelect = vi.fn();
    render(<RiskMatrix risks={toMatrixRisks(RISKS)} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByText("Billing Engine DB").at(-1)!.closest("button")!);
    expect(onSelect).toHaveBeenCalledWith("R-001");
  });

  it("gives each occupied square a spoken summary", () => {
    render(<RiskMatrix risks={toMatrixRisks(RISKS)} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Almost certain likelihood, Catastrophic impact: 1 asset, worst Extreme" }))
      .toBeInTheDocument();
  });

  it("renders an empty grid without crashing when there are no risks", () => {
    const { container } = render(<RiskMatrix risks={[]} onSelect={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

describe("data-state primitives", () => {
  it("exposes the skeleton to assistive tech while loading", () => {
    render(<ChartSkeleton label="Loading PHI flows" />);
    expect(screen.getByRole("status", { name: "Loading PHI flows" })).toBeInTheDocument();
  });

  it("surfaces a retry affordance on error", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Backend unreachable" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders an empty state distinct from an error", () => {
    render(<EmptyState title="No PHI flows recorded" message="Run the seed script." />);
    expect(screen.getByText("No PHI flows recorded")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("risk band colour ramp", () => {
  /**
   * Pins the fix for the inverted ramp: Critical rendered amber while High
   * rendered orange, so High read as the more severe of the two. The app's
   * severity tokens are inverted against their own names (--sem-solid-high is
   * amber #F59E0B, --sem-solid-medium is orange #EA580C), so this asserts the
   * classes that actually produce an escalating green -> red ramp.
   */
  const chipClassFor = (band: ApiRisk["band"]) => {
    const { container } = render(
      <RiskMatrix risks={toMatrixRisks([mkRisk(1, "Asset", 3, 3, band)])} onSelect={vi.fn()} />,
    );
    return container.querySelector('[data-testid="band-dot"]')?.className ?? "";
  };

  it("escalates Low -> Moderate -> High -> Critical -> Extreme", () => {
    expect(chipClassFor("LOW")).toContain("bg-band-low");             // green
    expect(chipClassFor("MODERATE")).toContain("bg-band-moderate");   // amber
    expect(chipClassFor("HIGH")).toContain("bg-band-high");           // orange
    expect(chipClassFor("CRITICAL")).toContain("bg-band-critical");   // red
    expect(chipClassFor("EXTREME")).toContain("bg-band-extreme");     // deep red
  });

  it("never gives two bands the same fill", () => {
    expect(chipClassFor("HIGH")).not.toBe(chipClassFor("CRITICAL"));
    expect(chipClassFor("CRITICAL")).not.toBe(chipClassFor("EXTREME"));
  });
});
