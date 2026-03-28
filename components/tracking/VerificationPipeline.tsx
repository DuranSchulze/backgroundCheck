import PipelineStep from "@/components/tracking/PipelineStep";

type StepStatus = "completed" | "in-progress" | "queued";

export interface PipelineStepData {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
}

interface VerificationPipelineProps {
  steps: PipelineStepData[];
}

export default function VerificationPipeline({
  steps,
}: VerificationPipelineProps) {
  return (
    <div className="flex flex-col gap-5">
      {steps.map((step, index) => (
        <PipelineStep
          key={step.id}
          stepNumber={index + 1}
          title={step.title}
          description={step.description}
          status={step.status}
        />
      ))}
    </div>
  );
}
