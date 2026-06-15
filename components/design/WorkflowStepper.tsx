"use client";

interface Step {
  label: string;
  state: "complete" | "active" | "upcoming";
}

interface WorkflowStepperProps {
  steps: Step[];
}

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isComplete = step.state === "complete";
        const isActive = step.state === "active";

        return (
          <div
            key={step.label}
            className="flex items-center gap-2"
          >
            <div
              className={[
                "h-6 min-w-6 rounded-full border px-2 text-xs font-medium flex items-center justify-center",
                isComplete
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-100"
                  : isActive
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground",
              ].join(" ")}
            >
              {index + 1}
            </div>
            <span className={isActive ? "text-sm font-medium" : "text-xs text-muted-foreground"}>
              {step.label}
            </span>
            {index < steps.length - 1 ? <span className="h-px w-8 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}
