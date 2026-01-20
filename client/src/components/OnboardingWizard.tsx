import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<StepProps>;
}

interface StepProps {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface OnboardingWizardProps {
  steps: OnboardingStep[];
  onComplete: (data: Record<string, any>) => void;
}

export function OnboardingWizard({ steps, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep]?.component;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdate = (data: Record<string, any>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Get Started with Restaurant AI</h1>
            <span className="text-sm text-slate-600">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    index < currentStep
                      ? "bg-green-500 border-green-500 text-white"
                      : index === currentStep
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center ${
                    index <= currentStep ? "text-slate-900 font-medium" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    index < currentStep ? "bg-green-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {steps[currentStep]?.title}
            </h2>
            <p className="text-slate-600">{steps[currentStep]?.description}</p>
          </div>

          {CurrentStepComponent && (
            <CurrentStepComponent
              data={formData}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button onClick={handleNext} className="flex items-center gap-2">
              {currentStep === steps.length - 1 ? (
                "Complete Setup"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Help Text */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Need help? Contact us at support@restaurantai.com
        </p>
      </div>
    </div>
  );
}

export type { StepProps };
