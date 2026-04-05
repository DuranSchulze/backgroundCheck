import PipelineStep from "@/components/tracking/PipelineStep";
import type { PipelineStepData } from "@/lib/tracking/types";

interface VerificationPipelineProps {
  steps: PipelineStepData[];
}

export default function VerificationPipeline({
  steps,
}: VerificationPipelineProps) {
  return (
    <div className="max-w-md mx-auto space-y-0">
      {steps.map((step, index) => (
        <PipelineStep
          key={step.id}
          title={step.title}
          description={step.description}
          status={step.status}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
